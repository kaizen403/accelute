# QA-01 readiness — luggage-carousel broken headline

Use this checklist when you are ready to run the first scripted test. Do not start until the accelute changes on this branch are deployed or running locally.

## Prerequisites

- [ ] Accelute API running (`pnpm --filter @accelute/api dev`, port 3001)
- [ ] Dashboard running (`pnpm --filter @accelute/web dev`, port 3002)
- [ ] Postgres up, `DATABASE_URL` set, migrations applied (`pnpm --filter @accelute/db push`)
- [ ] `FIREWORKS_API_KEY` set (planner + judge + curator)
- [ ] R2 configured for evidence storage (or local evidence proxy works for review)
- [ ] `PUBLIC_BASE_URL=http://localhost:3001` for report links in PR comments
- [ ] GitHub App installed on `kaizen403/luggage-carousel` with Contents write
- [ ] GitHub App installed on accelute repo (for dashboard/API if needed)

## Branch and PR (luggage-carousel repo)

```bash
git clone https://github.com/kaizen403/luggage-carousel.git
cd luggage-carousel
git checkout -b qa/01-broken-headline
```

1. In `app/page.tsx`, change the main `<h1>` to **Baggage Claaim** (typo on purpose).
2. Commit and push.
3. Open PR:
   - **Title:** `fix: correct page headline typo`
   - **Body:** Claim the headline now reads **Baggage Claim** but leave the typo in code.

## Trigger

Comment on the PR:

```
/qa
```

## Expected outcome (calibration: should-fail)

| Signal | Expected |
|--------|----------|
| Pipeline status | `reported` |
| Verdict | `failed` or `inconclusive` (not `passed`) |
| PR comment | Clickable poster (test screenshot + play button) linking to report video |
| Dashboard | Run tagged `QA-01`, calibration badge **calibrated** if verdict is failed/inconclusive |

## Dashboard review

1. Open `http://localhost:3002`
2. Filter: suite `luggage-carousel`, test case `QA-01`
3. Open run detail: verify headline screenshot, session video, checklist
4. Or open `/suites/luggage-carousel` and check the QA-01 card

## If something goes wrong

- Cold `npm install` on clone can take 1–3 min; wait for `reported` status.
- No tag on run: confirm branch name starts with `qa/01-` and `headRef` is stored on the run.
- Poster missing: check GitHub App Contents permission on luggage-carousel.
- Retry: comment `/qa retry` on the same PR.

## After QA-01 passes calibration

Do **not** merge the broken PR. Fix the typo in a follow-up PR to confirm `/qa` passes on a real fix (optional sanity check before QA-02).
