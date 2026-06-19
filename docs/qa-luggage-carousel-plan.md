# QA test plan — `kaizen403/luggage-carousel`

Six scripted tasks for exercising the Accelute QA agent end-to-end on a real Next.js app (carousel, drag-and-drop, 3×3 storage, LIFO unload).

**Target repo:** https://github.com/kaizen403/luggage-carousel  
**Trigger:** comment `/qa` on each PR (clone-and-run; no preview URL required)  
**Status:** tackle one task at a time, in order

---

## Keywords (for tracking)

`luggage-carousel` · `clone-and-run` · `easy` · `medium` · `hard` · `bug` · `feature` · `should-fail` · `should-pass` · `ui-copy` · `carousel` · `drag-drop` · `storage` · `unload` · `lifo` · `regression`

---

## QA-01 · Easy · Bug · should-fail

| Field | Value |
|-------|--------|
| **Branch** | `qa/01-broken-headline` |
| **Type** | Introduce flaw → open “fix” PR that does **not** actually fix it |
| **Intent** | Verify QA catches a visible copy regression |

### What to do

1. On a branch off `main`, change the main page heading in `app/page.tsx` (or the primary `<h1>`) to something wrong, e.g. **“Baggage Claaim”** (typo).
2. Open PR titled: `fix: correct page headline typo`
3. In the PR body, claim the headline now reads **“Baggage Claim”** — but **leave the typo in the code**.

### Expected QA behavior

- **Verdict:** `failed` or `inconclusive` (not `passed`)
- **Should catch:** visible text does not match claimed fix / PR acceptance criteria
- **Evidence:** screenshot of headline; session recording shows page load
- **Keywords:** `easy` `bug` `should-fail` `ui-copy`

---

## QA-02 · Easy · Feature · should-pass

| Field | Value |
|-------|--------|
| **Branch** | `qa/02-terminal-footer` |
| **Type** | Small, real UI feature |
| **Intent** | Verify QA passes a straightforward visible change |

### What to do

1. Add a footer below the main layout in `app/page.tsx`:
   - Text: **“Terminal B — Arrivals”**
   - Styled subtly (muted color, centered).
2. Open PR titled: `feat: add terminal footer label`

### Expected QA behavior

- **Verdict:** `passed`
- **Should catch:** page loads, footer visible, no console errors
- **Evidence:** poster + screenshot of footer; full video on report page
- **Keywords:** `easy` `feature` `should-pass` `ui-copy`

---

## QA-03 · Medium · Bug · should-fail

| Field | Value |
|-------|--------|
| **Branch** | `qa/03-broken-drag` |
| **Type** | Introduce interaction bug → PR claims drag-and-drop works |
| **Intent** | Verify QA exercises UI beyond “page loads” |

### What to do

1. In `components/Bag.tsx` or `components/Carousel.tsx`, break drag initiation, e.g.:
   - `pointer-events: none` on bag buttons, **or**
   - `onPointerDown` handler removed / early `return`.
2. Open PR titled: `fix: restore luggage drag from carousel to storage`
3. PR body: “Users can drag bags from the carousel into the storage grid.” — **bug still present**.

### Expected QA behavior

- **Verdict:** `failed`
- **Should catch:** drag-and-drop cannot be completed (or no bag lands in storage)
- **Evidence:** screenshot after attempted interaction; session video shows failure
- **Keywords:** `medium` `bug` `should-fail` `drag-drop` `carousel` `storage`

---

## QA-04 · Medium · Feature · should-pass

| Field | Value |
|-------|--------|
| **Branch** | `qa/04-storage-count` |
| **Type** | Feature with observable state |
| **Intent** | Verify QA checks dynamic UI, not static text only |

### What to do

1. In `app/page.tsx`, show a live counter, e.g. **“Bags in storage: N”** where `N` = number of occupied cells in the 3×3 grid (use existing `storage` state).
2. Place it near `StorageArea` in `components/StorageArea.tsx` or parent.
3. Open PR titled: `feat: show bags-in-storage counter`

### Expected QA behavior

- **Verdict:** `passed`
- **Should catch:** counter visible at `0` on load; ideally increments after a successful drop (if plan includes that step)
- **Evidence:** screenshot showing counter; video of session
- **Keywords:** `medium` `feature` `should-pass` `storage`

---

## QA-05 · Hard · Bug · should-fail

| Field | Value |
|-------|--------|
| **Branch** | `qa/05-wrong-unload-order` |
| **Type** | Subtle logic regression |
| **Intent** | Verify QA fails when behavior breaks but page still “looks fine” |

### What to do

1. In `lib/storage.ts`, break unload ordering, e.g.:
   - Swap priority LIFO vs normal LIFO in the unload path, **or**
   - Pop from wrong end of the stack.
2. UI unchanged — carousel and drag still work.
3. Open PR titled: `fix: unload uses priority LIFO then normal LIFO`
4. PR body describes correct behavior per README — **code still wrong**.

### How to validate manually

1. Drag 2–3 bags into storage (one in dotted priority row if possible).
2. Click **Unload** — order of items in `UnloadedList` should be wrong vs spec.

### Expected QA behavior

- **Verdict:** `failed`
- **Should catch:** unload order does not match PR / README acceptance criteria
- **Evidence:** screenshots before/after unload; video showing wrong order
- **Keywords:** `hard` `bug` `should-fail` `unload` `lifo` `regression`

---

## QA-06 · Hard · Feature · should-pass

| Field | Value |
|-------|--------|
| **Branch** | `qa/06-unload-button-state` |
| **Type** | Multi-step UX feature |
| **Intent** | Verify QA handles flows that need click → assert → click |

### What to do

1. Disable the **Unload** button when storage is empty; enable when at least one cell is occupied.
   - Wire in `app/page.tsx` using `storage` state.
   - Update button in the unload control (wherever unload is triggered).
2. Optional: add `aria-disabled` and visual muted style when disabled.
3. Open PR titled: `feat: disable unload when storage is empty`

### Expected QA behavior

- **Verdict:** `passed`
- **Should catch:**
  - Unload disabled on initial load
  - After dropping a bag, unload becomes enabled (if plan includes drag step)
  - No console errors
- **Evidence:** screenshots of disabled vs enabled states; session video
- **Keywords:** `hard` `feature` `should-pass` `unload` `storage` `drag-drop`

---

## Suggested order

```
QA-01 → QA-02 → QA-03 → QA-04 → QA-05 → QA-06
 easy     easy    medium   medium   hard     hard
 fail     pass    fail     pass     fail     pass
```

Alternating **should-fail** and **should-pass** makes it obvious when the agent regresses.

---

## Per-task checklist (repeat each time)

- [ ] GitHub App installed on `kaizen403/luggage-carousel`
- [ ] Branch pushed; PR opened with clear acceptance criteria in description
- [ ] Comment `/qa` on PR
- [ ] Confirm pipeline: `cloning` → `starting_app` → `running` → `reported`
- [ ] PR comment: poster + curated screenshots + [Full report](PUBLIC_BASE_URL/reports/:runId)
- [ ] Verdict matches **Expected QA behavior** column
- [ ] Log run ID and result in PR comment or this doc

---

## Notes

- Repo uses **npm** (`package-lock.json`); clone-and-run should detect Next.js on port auto-assigned.
- Cold `npm install` may take 1–3 min; warm runs are faster.
- For bug tasks (01, 03, 05): **do not merge** until QA correctly fails; then fix for real in a follow-up PR to confirm `/qa retry` passes.
- Set `PUBLIC_BASE_URL` in prod so report links are not `localhost`.
