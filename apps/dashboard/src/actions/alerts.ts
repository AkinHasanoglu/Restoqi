'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createServiceRoleClient } from '@stockalert/database/server'
import { logAudit } from '@stockalert/database/audit'
import { isChannelAllowed } from '@stockalert/plans'
import { isAllowedSmsDestination } from '@stockalert/notifications'
import { requireAuth, getPrimaryTeam, getSubscriptionLockError, SUBSCRIPTION_LOCKED_MESSAGE, type ActionResult } from '../lib/auth-guard'
import { PLAN_LIMITS, checkLimit, refreshUsageMetrics, getPlanContext } from '../lib/plan-limits'
import { toClientError } from '../lib/errors'

// Channel model: a rule points at specific `notification_channels` rows
// (channelIds), not at raw channel-type enum values. A bare channel type
// (e.g. "slack") can't carry delivery config (webhook URL, bot token,
// recipient) — that config lives on the notification_channels row, so an
// enum-only rule would be undeliverable. See schema_completion migration's
// D1 note.
const AlertRuleSchema = z.object({
  name: z.string().min(1).max(100),
  thresholdType: z.enum(['absolute', 'percentage', 'days_of_supply']),
  thresholdValue: z.number().positive(),
  channelIds: z.array(z.string().uuid()).min(1, 'Select at least one notification channel'),
  storeIds: z.array(z.string().uuid()).default([]),
  productIds: z.array(z.string().uuid()).default([]),
  tags: z.array(z.string()).default([]),
  silenceWindowMinutes: z.number().min(0).default(0),
  // 240 (4h) matches the DB column default — see D5.
  cooldownMinutes: z.number().min(0).default(240),
  isActive: z.boolean().default(true),
})

export async function createAlertRule(formData: FormData): Promise<ActionResult> {
  try {
    const { supabase, user } = await requireAuth()
    const membership = await getPrimaryTeam(supabase, user.id)

    if (!membership || !['admin', 'owner', 'editor'].includes(membership.role)) {
      return { success: false, error: 'Insufficient permissions' }
    }

    const raw = {
      name: formData.get('name'),
      thresholdType: formData.get('thresholdType'),
      thresholdValue: Number(formData.get('thresholdValue')),
      channelIds: JSON.parse(formData.get('channelIds') as string ?? '[]') as string[],
      storeIds: JSON.parse(formData.get('storeIds') as string ?? '[]') as string[],
      productIds: JSON.parse(formData.get('productIds') as string ?? '[]') as string[],
      tags: JSON.parse(formData.get('tags') as string ?? '[]') as string[],
      silenceWindowMinutes: Number(formData.get('silenceWindowMinutes') ?? '0'),
      cooldownMinutes: Number(formData.get('cooldownMinutes') ?? '240'),
      isActive: formData.get('isActive') !== 'false',
    }

    const parsed = AlertRuleSchema.safeParse(raw)
    if (!parsed.success) return { success: false, error: parsed.error.errors[0]?.message ?? 'Invalid input' }

    // Every channel id must exist and belong to this team — otherwise a
    // rule could silently reference another team's channel or a typo'd id.
    const db = createServiceRoleClient()
    const { data: ownedChannels } = await db
      .from('notification_channels')
      .select('id')
      .eq('team_id', membership.team_id)
      .in('id', parsed.data.channelIds)

    if ((ownedChannels?.length ?? 0) !== parsed.data.channelIds.length) {
      return { success: false, error: 'One or more selected channels are invalid' }
    }

    const ctx = await getPlanContext(db, membership.team_id)
    if (!ctx.isAccessAllowed) return { success: false, error: SUBSCRIPTION_LOCKED_MESSAGE }
    const limitError = checkLimit(ctx.usage.rule_count, PLAN_LIMITS[ctx.effectivePlan].rules, ctx.effectivePlan, 'alert rules')
    if (limitError) return { success: false, error: limitError }

    // Empty scope arrays = applies to all products (schema convention:
    // null/empty scope_* columns mean unscoped). No separate boolean needed.
    const { data: rule, error } = await db.from('alert_rules').insert({
      team_id: membership.team_id,
      name: parsed.data.name,
      threshold_type: parsed.data.thresholdType,
      threshold_value: parsed.data.thresholdValue,
      channel_ids: parsed.data.channelIds,
      scope_store_ids: parsed.data.storeIds,
      scope_product_ids: parsed.data.productIds,
      scope_tags: parsed.data.tags,
      silence_window_minutes: parsed.data.silenceWindowMinutes,
      cooldown_minutes: parsed.data.cooldownMinutes,
      is_active: parsed.data.isActive,
    }).select('id').single()

    if (error) return { success: false, error: 'Failed to create rule' }

    await logAudit(supabase, {
      teamId: membership.team_id, userId: user.id, actorEmail: user.email ?? null,
      action: 'rule.created', entityType: 'alert_rules', entityId: rule?.id, metadata: { name: parsed.data.name },
    })
    await refreshUsageMetrics(db, membership.team_id)

    revalidatePath('/alerts/rules')
    return { success: true, data: undefined }
  } catch (e) {
    return { success: false, error: toClientError(e) }
  }
}

export async function toggleAlertRule(ruleId: string, enabled: boolean): Promise<ActionResult> {
  try {
    const { supabase, user } = await requireAuth()
    const membership = await getPrimaryTeam(supabase, user.id)
    if (!membership) return { success: false, error: 'No team' }
    if (!['admin', 'owner', 'editor'].includes(membership.role)) {
      return { success: false, error: 'Insufficient permissions' }
    }

    const lockError = await getSubscriptionLockError(supabase, membership.team_id)
    if (lockError) return { success: false, error: lockError }

    const db = createServiceRoleClient()
    const { error } = await db
      .from('alert_rules')
      .update({ is_active: enabled })
      .eq('id', ruleId)
      .eq('team_id', membership.team_id)

    if (error) return { success: false, error: 'Failed to update rule' }

    await logAudit(supabase, {
      teamId: membership.team_id, userId: user.id, actorEmail: user.email ?? null,
      action: 'rule.toggled', entityType: 'alert_rules', entityId: ruleId, metadata: { enabled },
    })

    revalidatePath('/alerts/rules')
    return { success: true, data: undefined }
  } catch (e) {
    return { success: false, error: toClientError(e) }
  }
}

export async function deleteAlertRule(ruleId: string): Promise<ActionResult> {
  try {
    const { supabase, user } = await requireAuth()
    const membership = await getPrimaryTeam(supabase, user.id)
    if (!membership) return { success: false, error: 'No team' }
    if (!['admin', 'owner', 'editor'].includes(membership.role)) {
      return { success: false, error: 'Insufficient permissions' }
    }

    const lockError = await getSubscriptionLockError(supabase, membership.team_id)
    if (lockError) return { success: false, error: lockError }

    const db = createServiceRoleClient()
    const { error } = await db
      .from('alert_rules')
      .delete()
      .eq('id', ruleId)
      .eq('team_id', membership.team_id)

    if (error) return { success: false, error: 'Failed to delete rule' }

    await logAudit(supabase, {
      teamId: membership.team_id, userId: user.id, actorEmail: user.email ?? null,
      action: 'rule.deleted', entityType: 'alert_rules', entityId: ruleId,
    })
    await refreshUsageMetrics(db, membership.team_id)

    revalidatePath('/alerts/rules')
    return { success: true, data: undefined }
  } catch (e) {
    return { success: false, error: toClientError(e) }
  }
}

const AlertChannelTypeSchema = z.enum(['email', 'slack', 'telegram', 'sms', 'webhook', 'n8n'])

// Must stay in sync with dispatcher.ts, the module that actually reads
// config[url key] at send time (packages/notifications/src/dispatcher.ts).
// Validating the shape here is defense-in-depth on top of the runtime
// SSRF check in safeFetch (packages/integrations/core/src/http.ts): this
// catches malformed/non-https URLs at save time with a clear error,
// before a private/loopback address ever reaches a fetch.
const URL_CONFIG_KEY: Partial<Record<z.infer<typeof AlertChannelTypeSchema>, string>> = {
  slack: 'webhookUrl',
  webhook: 'url',
  n8n: 'webhookUrl',
}

const NotificationChannelSchema = z.object({
  name: z.string().min(1),
  type: AlertChannelTypeSchema,
  config: z.record(z.string()),
}).superRefine((data, ctx) => {
  const key = URL_CONFIG_KEY[data.type]
  if (key) {
    const value = data.config[key]
    if (!value || !/^https:\/\/.+/.test(value)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: `${data.type} channel requires an https:// ${key}` })
    }
  }

  // `to` was previously unvalidated for sms — any string reached Twilio's
  // API directly. See 2nd security audit item 6.
  if (data.type === 'sms') {
    const to = data.config['to']
    if (!to || !isAllowedSmsDestination(to)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'sms channel requires a valid E.164 phone number in an allowed country' })
    }
    // TCPA/carrier-required explicit opt-in, separate from just entering a
    // phone number — the UI must surface this as its own checkbox, not
    // imply consent from filling in the field. See compliance audit rule
    // 21; STOP handling is api/webhooks/twilio-sms's inbound webhook, and
    // sms.ts's message body itself always carries "Reply STOP to opt out".
    if (data.config['smsConsentAccepted'] !== 'true') {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'sms channel requires explicit consent to receive SMS alerts' })
    }
  }
})

export async function createNotificationChannel(formData: FormData): Promise<ActionResult> {
  try {
    const { supabase, user } = await requireAuth()
    const membership = await getPrimaryTeam(supabase, user.id)

    if (!membership || !['admin', 'owner'].includes(membership.role)) {
      return { success: false, error: 'Insufficient permissions' }
    }

    const raw = {
      name: formData.get('name'),
      type: formData.get('type'),
      config: JSON.parse(formData.get('config') as string ?? '{}') as Record<string, string>,
    }

    const parsed = NotificationChannelSchema.safeParse(raw)
    if (!parsed.success) return { success: false, error: parsed.error.errors[0]?.message ?? 'Invalid input' }

    const db = createServiceRoleClient()
    const ctx = await getPlanContext(db, membership.team_id)
    if (!ctx.isAccessAllowed) return { success: false, error: SUBSCRIPTION_LOCKED_MESSAGE }
    if (!isChannelAllowed(ctx.effectivePlan, parsed.data.type)) {
      return { success: false, error: `The ${parsed.data.type} channel isn't available on your ${ctx.effectivePlan} plan. Upgrade to enable it.` }
    }

    const { data: channel, error } = await db.from('notification_channels').insert({
      team_id: membership.team_id,
      name: parsed.data.name,
      channel_type: parsed.data.type,
      config: parsed.data.config,
      is_active: true,
    }).select('id').single()

    if (error) return { success: false, error: 'Failed to create channel' }

    await logAudit(supabase, {
      teamId: membership.team_id, userId: user.id, actorEmail: user.email ?? null,
      action: 'channel.created', entityType: 'notification_channels', entityId: channel?.id,
      metadata: { name: parsed.data.name, type: parsed.data.type },
    })

    revalidatePath('/alerts/rules')
    return { success: true, data: undefined }
  } catch (e) {
    return { success: false, error: toClientError(e) }
  }
}
