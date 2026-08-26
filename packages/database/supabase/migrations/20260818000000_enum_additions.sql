-- ============================================================
-- Enum additions
-- `alter type ... add value` cannot run in the same transaction as a
-- statement that references the new value, and Supabase applies each
-- migration file as its own transaction — hence this lives in its own
-- file, ahead of the migration that will use these values.
-- ============================================================

-- Needed by the notes actions (packages: apps/dashboard/src/actions/notes.ts)
-- and the sync worker/audit logging work landing in a later migration.
alter type audit_action add value 'note.created';
alter type audit_action add value 'note.updated';
alter type audit_action add value 'note.deleted';
alter type audit_action add value 'store.synced';
alter type audit_action add value 'alert.dispatched';
