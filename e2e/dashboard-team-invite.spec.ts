import { test, expect } from '@playwright/test'
import { createAdminClient, createConfirmedUser, uniqueTestEmail } from './helpers/supabase-admin'

// Exercises the "members_self_join" RLS policy end to end (schema_completion
// migration, Faz 4) — before it existed, an invitee could never insert
// their own team_members row on accept because the pre-existing
// members_insert policy required the caller to already be an admin.
//
// The invitation row itself is seeded via the admin client (its exact
// token isn't surfaced anywhere in the UI to scrape reliably); acceptance
// goes through the real page + acceptInvite Server Action, running as the
// invitee under normal RLS, not service-role.
test.describe('Team invite', () => {
  test('invited user accepts and appears in the team member list', async ({ page, browser }) => {
    const ownerEmail = uniqueTestEmail('invite-owner')
    const inviteeEmail = uniqueTestEmail('invite-member')
    const password = 'Sup3r-Secret-Passw0rd!'

    const owner = await createConfirmedUser(ownerEmail, password, 'Team Owner')
    await createConfirmedUser(inviteeEmail, password, 'New Teammate')

    const admin = createAdminClient()
    const { data: membership } = await admin
      .from('team_members')
      .select('team_id')
      .eq('user_id', owner.id)
      .single()
    const teamId = membership!.team_id

    const token = crypto.randomUUID()
    const { error: inviteError } = await admin.from('team_invitations').insert({
      team_id: teamId,
      email: inviteeEmail,
      role: 'editor',
      token,
      invited_by: owner.id,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    })
    expect(inviteError).toBeNull()

    // Accept as the invitee, in a separate browser context (own cookie jar).
    const inviteeContext = await browser.newContext()
    const inviteePage = await inviteeContext.newPage()
    await inviteePage.goto('/login')
    await inviteePage.getByLabel(/email/i).fill(inviteeEmail)
    await inviteePage.getByLabel(/password/i).fill(password)
    await inviteePage.getByRole('button', { name: /sign in/i }).click()
    await inviteePage.waitForURL(/\/(tr|en)\/overview/)

    await inviteePage.goto(`/en/accept-invite?token=${token}`)
    await inviteePage.getByRole('button', { name: /accept invitation/i }).click()
    await expect(inviteePage.getByText(/joined the team/i)).toBeVisible({ timeout: 10_000 })
    await inviteeContext.close()

    // Verify via DB (authoritative) and via the owner's team page (UI).
    const { data: newMembership } = await admin
      .from('team_members')
      .select('role')
      .eq('team_id', teamId)
      .eq('user_id', (await admin.auth.admin.listUsers()).data.users.find((u) => u.email === inviteeEmail)!.id)
      .maybeSingle()
    expect(newMembership?.role).toBe('editor')

    await page.goto('/login')
    await page.getByLabel(/email/i).fill(ownerEmail)
    await page.getByLabel(/password/i).fill(password)
    await page.getByRole('button', { name: /sign in/i }).click()
    await page.waitForURL(/\/(tr|en)\/overview/)
    await page.goto('/en/settings/team')
    await expect(page.getByText(inviteeEmail)).toBeVisible({ timeout: 10_000 })
  })
})
