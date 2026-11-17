// Phase 2: matching + classification. All money is handled in integer paise.
// Sign convention: gap.amount = (effect on platform total) - (effect on bank total),
// so the gaps always sum to (platform total - bank total).

export const TOLERANCE = 1; // paise; a per-item difference this small counts as rounding
const P = (x) => Math.round(x * 100);
const group = (rows) => rows.reduce((m, r) => ((m[r.id] ??= []).push(r), m), {});
const sum = (rows) => rows.reduce((s, r) => s + P(r.amount), 0);

export function reconcile(platform, bank, { month = '2026-10' } = {}) {
  const pRows = platform.filter((p) => p.timestamp.slice(0, 7) === month);
  const bRows = bank.filter((b) => b.settled_date.slice(0, 7) === month);
  const later = bank.filter((b) => b.settled_date.slice(0, 7) > month);
  const pBy = group(pRows), bBy = group(bRows), lBy = group(later);

  const gaps = [];
  const round = { n: 0, total: 0 };
  let matched = 0;

  for (const id in pBy) {
    const [p, ...pExtra] = pBy[id];
    pExtra.forEach((d) => gaps.push({ type: 'duplicate', id, amount: P(d.amount),
      reason: `Platform lists ${id} ${pBy[id].length} times; the extra entry inflates the platform total` }));

    const b = bBy[id];
    if (!b) {
      if (lBy[id]) gaps.push({ type: 'timing', id, amount: P(p.amount),
        reason: `Settled ${lBy[id][0].settled_date}, after month end` });
      else gaps.push({ type: 'unexplained', id, amount: P(p.amount), reason: 'No settlement found in any bank file' });
      continue;
    }
    const [b0, ...bExtra] = b;
    bExtra.forEach((d) => gaps.push({ type: 'duplicate', id, amount: -P(d.amount),
      reason: `Bank settled ${id} ${b.length} times; the extra payout inflates the bank total` }));

    const diff = P(p.amount) - P(b0.amount);
    if (diff === 0) matched++;
    else if (Math.abs(diff) <= TOLERANCE) { round.n++; round.total += diff; }
    else gaps.push({ type: 'unexplained', id, amount: diff, reason: 'Amount differs by more than the rounding tolerance' });
  }

  if (round.n) gaps.push({ type: 'rounding', id: `${round.n} settlements`, amount: round.total,
    reason: `${round.n} settlements are off by ₹0.01 each. No single item looks wrong, but together they differ by the total shown` });

  for (const id in bBy) {
    if (pBy[id]) continue;
    bBy[id].forEach((b) => gaps.push(P(b.amount) < 0
      ? { type: 'orphan_refund', id, amount: -P(b.amount), reason: 'Bank paid a refund with no matching original transaction on the platform' }
      : { type: 'unexplained', id, amount: -P(b.amount), reason: 'Bank credit with no platform record' }));
  }

  gaps.sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount));
  const platformTotal = sum(pRows), bankTotal = sum(bRows);
  const difference = platformTotal - bankTotal;
  const explained = gaps.reduce((s, g) => s + g.amount, 0);
  return { platformTotal, bankTotal, difference, explained, unexplained: difference - explained, matched, gaps };
}
