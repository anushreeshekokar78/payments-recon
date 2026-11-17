# Payments Reconciliation

Compares a platform's transaction ledger with the bank's settlement file, finds every gap between them, and explains each one. The dashboard is a static page, so it runs on GitHub Pages with no backend.

## Quick start

```bash
npm run generate     # writes data/*.csv (seed optional: npm run generate -- 7)
npm run reconcile    # prints totals and the gap table
npm test             # one test per gap type + a "nothing unexplained" check
npm run serve        # open the dashboard at http://localhost:3000
```

Requires Node 20+. No dependencies.

## Deploy to GitHub Pages

Push to GitHub, then **Settings → Pages → Deploy from a branch → `main` / root**. The dashboard (`index.html`) imports the engine from `src/` directly, and the in-browser generator uses the same code as the CLI.

## Project layout

| Path | Purpose |
|---|---|
| `src/generate.js` | Phase 1: seeded fake data with four planted gaps |
| `src/reconcile.js` | Phase 2: matching and classification engine |
| `src/io.js` | Tiny CSV reader/writer |
| `index.html` | Phase 3: dashboard |
| `test/reconcile.test.js` | Phase 4: tests |
| `scripts/` | CLI wrappers for generating data and reconciling CSVs |

## Data

- `platform_transactions.csv`: `id, amount, timestamp, type` (`type` is `sale` or `refund`)
- `bank_settlements.csv`: `id, amount, settled_date`

About 500 platform rows for October 2026 (484 sales, 15 refunds, plus 1 planted sale on 31 Oct).

## Planted gaps

| # | Gap | How it is planted | How it is classified |
|---|---|---|---|
| 1 | Timing | A sale on 31 Oct settles on 2 Nov | Platform row with no in-month settlement, but one dated after month end |
| 2 | Rounding | 30 settlements are ₹0.01 short each (₹0.30 in total) | Matched by ID, differs by ≤ 1 paisa, reported as **one** summed gap |
| 3 | Duplicate | One settlement appears twice in the bank file | An ID appearing more than once in either dataset; the extra row is the gap |
| 4 | Orphan refund | Bank pays a refund (`RF-9001`) the platform never recorded | Negative bank line with no platform record |

Anything that fits none of these is reported as `unexplained`. In the generated data that count is zero.

## Assumptions

1. Currency is INR, amounts have 2 decimals. All arithmetic uses integer paise to avoid floating-point error.
2. Reconciliation period is one calendar month. Platform side: transactions with a timestamp in the month. Bank side: settlements with a `settled_date` in the month.
3. Settlement takes T+1 or T+2 **calendar** days (weekends and bank holidays are not modelled).
4. Timestamps are local time (IST) with no timezone suffix; only the date part is used.
5. Transactions are matched by `id`, then by amount.
6. The bank file uses the platform transaction `id` as its reference. In practice a bank reference is often different, which would need a mapping step.
7. Refunds are negative amounts, on both the platform and bank sides. The spec has no `original_id` column, so "refund with no matching original" is detected as a bank refund with no platform record at all. A stricter check (refund points to a known sale) would need an extra column.
8. Rounding tolerance is 1 paisa per item. A larger difference is `unexplained`, not rounding.
9. Fees are ignored: bank amount equals platform amount.
10. Sign convention: `gap.amount` is its effect on (platform total − bank total), so the gaps sum exactly to the difference.
11. Planted gaps are deterministic for a given seed, and tests use seed 42.

## Roadmap ideas

CSV upload in the dashboard, configurable tolerance, fees and net settlements, batch (one-to-many) settlement matching, multi-month support, export of the gap table.
