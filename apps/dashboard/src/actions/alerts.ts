'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createServerSupabaseClient, createServiceRoleClient } from '@stockalert/database/server'
import { requireAuth, requireTeamRole } from '../lib/auth-guard'

const AlertRuleSchema = z.object({
  name: z.string().min(1).max(100),
  thresholdType: z.enum(['absolute', 'percentage', 'days_of_supply']),
  thresholdValue: z.number().positive(),
  channels: z.array(z.enum(['email', 'slack', 'telegram', 'sms', 'webhook', 'n8n'])).min(1),
  allProducts: z.boolean().default(true),
  storeIds: z.array(z.string().uuid()).default([]),
  productIds: z.array(z.string().uuid()).default([]),
  tags: z.array(z.string()).default([]),
  silenceWindowMinutes: z.number().min(0).default(0),
  throttleMinutes: z.number().min(0).default(60),
  notificationChannelIds: z.array(z.string().uuid()).default([]),
  enabled: z.boolean().default(true),
})

export async function createAlertRule(formData: FormData) {
  const user = await requireAuth()
  const supabase = await createServerSupabaseClient()

  const { data: membership } = await supabase
    .from('team_members')
    .select('team_id, role')
    .eq('user_id', user.id)
    .order('joined_at')
    .limit(1)
    .single()

  if (!membership || !['admin', 'owner', 'editor'].includes(membership.role)) {
    return { error: 'Insufficient permissions' }
  }

  const raw = {
    name: formData.get('name'),
    thresholdType: formData.get('thresholdType'),
    thresholdValue: Number(formData.get('thresholdValue')),
    channels: JSON.parse(formData.get('channels') as string ?? '[]') as string[],
    allProducts: formData.get('allProducts') === 'true',
    storeIds: JSON.parse(formData.get('storeIds') as string ?? '[]') as string[],
    productIds: JSON.parse(formData.get('productIds') as string ?? '[]') as string[],
    tags: JSON.parse(formData.get('tags') as string ?? '[]') as string[],
    silenceWindowMinutes: Number(formData.get('silenceWindowMinutes') ?? '0'),
    throttleMinutes: Number(formData.get('throttleMinutes') ?? '60'),
    notificationChannelIds: JSON.parse(formData.get('notificationChannelIds') as string ?? '[]') as string[],
    enabled: formData.get('enabled') !== 'false',
  }

  const parsed = AlertRuleSchema.safeParse(raw)
  if (!parsed.success) return { error: parsed.error.errors[0]?.message ?? 'Invalid input' }

  const db = createServiceRoleClient()
  const { error } = await db.from('alert_rules').insert({
    team_id: membership.team_id,
    name: parsed.data.name,
    threshold_type: parsed.data.thresholdType,
    threshold_value: parsed.data.thresholdValue,
    channels: parsed.data.channels,
    all_products: parsed.data.allProducts,
    store_ids: parsed.data.storeIds,
    product_ids: parsed.data.productIds,
    tags: parsed.data.tags,
    silence_window_minutes: parsed.data.silenceWindowMinutes,
    throttle_minutes: parsed.data.throttleMinutes,
    notification_channel_ids: parsed.data.notificationChannelIds,
    enabled: parsed.data.enabled,
  })

  if (error) return { error: 'Failed to create rule' }

  revalidatePath('/alerts/rules')
  return { success: true }
}

export async function toggleAlertRule(ruleId: string, enabled: boolean) {
  const user = await requireAuth()
  await requireTeamRole(user.id, 'editor')

  const supabase = await createServerSupabaseClient()
  const { data: membership } = await supabase
    .from('team_members')
    .select('team_id')
    .eq('user_id', user.id)
    .order('joined_at')
    .limit(1)
    .single()

  if (!membership) return { error: 'No team' }

  const db = createServiceRoleClient()
  await db.from('alert_rules').update({ enabled }).eq('id', ruleId).eq('team_id', membership.team_id)

  revalidatePath('/alerts/rules')
  return { success: true }
}

export async function deleteAlertRule(ruleId: string) {
  const user = await requireAuth()
  await requireTeamRole(user.id, 'editor')

  const supabase = await createServerSupabaseClient()
  const { data: membership } = await supabase
    .from('team_members')
    .select('team_id')
    .eq('user_id', user.id)
    .order('joined_at')
    .limit(1)
    .single()

  if (!membership) return { error: 'No team' }

  const db = createServiceRoleClient()
  await db.from('alert_rules').delete().eq('id', ruleId).eq('team_id', membership.team_id)

  revalidatePath('/alerts/rules')
  return { success: true }
}

const NotificationChannelSchema = z.object({
  name: z.string().min(1),
  type: z.enum(['email', 'slack', 'telegram', 'sms', 'webhook', 'n8n']),
  config: z.record(z.string()),
})

export async function createNotificationChannel(formData: FormData) {
  const user = await requireAuth()
  const supabase = await createServerSupabaseClient()

  const { data: membership } = await supabase
    .from('team_members')
    .select('team_id, role')
    .eq('user_id', user.id)
    .order('joined_at')
    .limit(1)
    .single()

  if (!membership || !['admin', 'owner'].includes(membership.role)) {
    return { error: 'Insufficient permissions' }
  }

  const raw = {
    name: formData.get('name'),
    type: formData.get('type'),
    config: JSON.parse(formData.get('config') as string ?? '{}') as Record<string, string>,
  }

  const parsed = NotificationChannelSchema.safeParse(raw)
  if (!parsed.success) return { error: parsed.error.errors[0]?.message ?? 'Invalid input' }

  const db = createServiceRoleClient()
  const { error } = await db.from('notification_channels').insert({
    team_id: membership.team_id,
    name: parsed.data.name,
    type: parsed.data.type,
    config: parsed.data.config,
    enabled: true,
  })

  if (error) return { error: 'Failed to create channel' }

  revalidatePath('/alerts/rules')
  return { success: true }
}
