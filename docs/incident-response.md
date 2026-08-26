# Incident response — data breach runbook

Compliance audit rule 17 (GDPR's 72-hour breach notification requirement).
This is a manual runbook, not automated tooling — check items off as
they're done, same convention as `deployment-checklist.md`.

## What counts as a personal-data breach here

Any of the following, whether caused by an attacker, a misconfiguration,
or an internal mistake:

- Unauthorized access to or exfiltration of the Supabase database (rows
  from `teams`, `team_members`, `products`, `connected_stores`,
  `store_secrets`, `api_keys`, `audit_logs`, etc.)
- A leaked or stolen credential with production access: `SUPABASE_SERVICE_ROLE_KEY`,
  `SUPABASE_ENCRYPTION_KEY`, `PADDLE_API_KEY`, `RESEND_API_KEY`,
  `TWILIO_AUTH_TOKEN`, or any marketplace OAuth client secret
- Row-level security failing open (a query returning another team's rows)
- An email/SMS/webhook delivery sent to the wrong recipient at scale
- A Sentry/PostHog/Hub event accidentally carrying unscrubbed PII (see
  `packages/config/src/sentry-scrub.ts` — if scrubbing itself is what
  broke, that's the incident)

Not every security bug is a "breach" under this runbook — this is
specifically about personal data of identified/identifiable people being
accessed, altered, or lost without authorization. A DoS or an
availability-only incident with no data exposure follows normal incident
handling, not this notification clock.

## Severity ladder

| Severity | Definition | Example |
|---|---|---|
| **Critical** | Confirmed unauthorized access to production data at scale, or a leaked service-role/encryption key | `SUPABASE_SERVICE_ROLE_KEY` found in a public repo or log |
| **High** | Confirmed unauthorized access to a bounded set of records, or a credential leak with unclear scope | RLS bypass affecting one team's data |
| **Medium** | Suspected but unconfirmed exposure; a fixed bug that *could* have leaked data before the fix | A since-patched IDOR with no confirmed exploitation in logs |
| **Low** | A near-miss with no data ever exposed | A misconfigured but never-deployed environment |

Critical/High start the clock below immediately on discovery, not on
confirmation — GDPR's 72 hours runs from when the controller becomes
*aware*, not when the investigation concludes.

## The 72-hour clock

1. **Hour 0 — Discovery.** Whoever finds it (engineer, Sentry alert,
   customer report, security researcher via `/.well-known/security.txt`)
   immediately notifies the on-call owner. Do not wait for a full
   investigation before starting this runbook.
2. **Hour 0–4 — Contain.** Rotate the leaked credential (see
   `packages/database/scripts/rotate-credentials.ts` for the encryption
   key; Supabase/Paddle/Resend/Twilio dashboards for their own keys),
   revoke affected sessions (`supabase.auth.admin.signOut` per user, or a
   bulk revoke if scope is unclear), and disable the affected code path
   if a bug is the root cause.
3. **Hour 4–24 — Assess scope.** Query `audit_logs` and Supabase's own
   query logs for the affected time window. Identify: which tables, which
   teams/users, what data categories (see legal/privacy §1's list),
   whether card data was ever involved (it shouldn't be — Paddle is
   Merchant of Record and never gives us raw card numbers).
4. **Within 72 hours of Hour 0 — Notify the supervisory authority**, if
   the breach is likely to result in a risk to people's rights and
   freedoms (the GDPR default assumption unless you can show otherwise).
   For EU/UK teams this is the relevant Data Protection Authority (e.g.
   the ICO for the UK, or the lead authority for wherever the company is
   established). Notification must cover: nature of the breach, categories
   and approximate number of people/records affected, likely
   consequences, and measures taken/proposed.
5. **Without undue delay after that — Notify affected users**, if the
   breach is likely to result in a *high* risk to them (a stricter bar
   than the authority-notification trigger). Use
   `packages/notifications/src/channels/transactional.ts`'s pattern — a
   new dedicated template, not `PolicyUpdateEmail` (that's for policy
   text changes, not incidents) — sent directly to affected users'
   `auth.users.email`, describing what happened, what data was involved,
   and what they should do.
6. **After containment — Post-mortem.** Document root cause, timeline,
   and the fix, and check whether it changes anything in this runbook,
   `legal/privacy`, or `legal/dpa`.

## Roles

| Role | Responsibility |
|---|---|
| Incident owner | Runs the runbook end to end; single point of accountability |
| Engineering | Containment, scope assessment, the actual fix |
| Whoever holds the DPA relationship | Drafts/sends the authority and customer notifications |

(This is currently a small team — one person may hold multiple roles.
The point of naming them is so nobody assumes "someone else" is doing the
notification.)

## Escalation contacts

- **Supabase**: support ticket via the dashboard; for an active
  active-exploitation emergency, their status page / support escalation
  path takes priority over a normal ticket.
- **Vercel**: support ticket via the dashboard.
- **Paddle**: Merchant of Record — if the incident involves payment data
  at all (it shouldn't, per §1), Paddle's own incident process applies
  first; they hold the card data, not us.
- **Resend**: support ticket, and check whether the sending domain's
  reputation needs addressing if the incident involved mass mis-delivery.
- **Twilio**: support ticket if the incident involves SMS delivery.

Fill in actual account/ticket URLs here once Track U (see
`deployment-checklist.md`) is complete and these are real accounts.

## Notification templates

**To the supervisory authority** (adapt per their specific web form —
most EU DPAs have one):

> Organization: [legal name]. Nature of breach: [what happened]. Data
> categories affected: [from legal/privacy §1's list]. Approximate number
> of data subjects affected: [count]. Likely consequences: [assessment].
> Measures taken: [containment steps]. Contact: [DPO/incident owner email].

**To affected users** (plain language, not legalese):

> Subject: Important security notice about your StockAlert account
>
> We're writing to let you know about a security incident that affected
> [what data]. Here's what happened: [plain description]. Here's what we
> did: [containment/fix]. Here's what you should do: [password reset /
> re-authenticate a marketplace connection / nothing, as applicable].
> Questions: reply to this email or contact [support address].
