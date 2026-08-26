import { describe, it, expect, vi } from 'vitest'
import { logAudit } from './audit'

function mockDb(insertResult: { error: { message: string } | null }) {
  const insert = vi.fn().mockResolvedValue(insertResult)
  const from = vi.fn().mockReturnValue({ insert })
  return { db: { from } as never, insert }
}

describe('logAudit', () => {
  it('inserts with the expected shape, defaulting optional fields', async () => {
    const { db, insert } = mockDb({ error: null })
    await logAudit(db, { teamId: 'team-1', userId: 'user-1', actorEmail: 'a@b.com', action: 'store.connected' })

    expect(insert).toHaveBeenCalledWith(expect.objectContaining({
      team_id: 'team-1',
      user_id: 'user-1',
      actor_email: 'a@b.com',
      action: 'store.connected',
      entity_type: null,
      entity_id: null,
      metadata: {},
      ip_address: null,
      user_agent: null,
    }))
  })

  it('passes through provided optional fields', async () => {
    const { db, insert } = mockDb({ error: null })
    await logAudit(db, {
      teamId: 'team-1',
      userId: null,
      actorEmail: null,
      action: 'rule.deleted',
      entityType: 'alert_rules',
      entityId: 'rule-1',
      metadata: { name: 'Low stock' },
      ipAddress: '1.2.3.4',
      userAgent: 'test-agent',
    })

    expect(insert).toHaveBeenCalledWith(expect.objectContaining({
      entity_type: 'alert_rules',
      entity_id: 'rule-1',
      metadata: { name: 'Low stock' },
      ip_address: '1.2.3.4',
      user_agent: 'test-agent',
    }))
  })

  it('does not throw when the insert returns an error', async () => {
    const { db } = mockDb({ error: { message: 'insert failed' } })
    await expect(
      logAudit(db, { teamId: 'team-1', userId: 'user-1', actorEmail: null, action: 'note.created' }),
    ).resolves.toBeUndefined()
  })

  it('does not throw when the client itself throws', async () => {
    const from = vi.fn().mockImplementation(() => { throw new Error('connection lost') })
    const db = { from } as never
    await expect(
      logAudit(db, { teamId: 'team-1', userId: 'user-1', actorEmail: null, action: 'note.created' }),
    ).resolves.toBeUndefined()
  })
})
