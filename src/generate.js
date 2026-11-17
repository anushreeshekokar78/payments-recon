// Phase 1: synthetic data with four planted gaps. Deterministic for a given seed.
// Amounts are rupees with 2 decimals. Planted amounts are reported in paise (integers).

const pad = (n) => String(n).padStart(2, '0');

function rng(a) {
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function addDays(date, n) {
  const d = new Date(Date.UTC(+date.slice(0, 4), +date.slice(5, 7) - 1, +date.slice(8, 10) + n));
  return d.toISOString().slice(0, 10);
}

export function generate({ seed = 42, sales = 484, refunds = 15, month = '2026-10' } = {}) {
  const r = rng(seed);
  const ri = (a, b) => a + Math.floor(r() * (b - a + 1));
  const platform = [];
  const bank = [];

  // Normal flow: every row settles T+1 or T+2 (calendar days), inside the month.
  const add = (id, paise, type, day) => {
    const date = `${month}-${pad(day)}`;
    const timestamp = `${date}T${pad(ri(8, 21))}:${pad(ri(0, 59))}:${pad(ri(0, 59))}`;
    platform.push({ id, amount: paise / 100, timestamp, type });
    bank.push({ id, amount: paise / 100, settled_date: addDays(date, ri(1, 2)) });
  };
  for (let i = 0; i < sales; i++) add(`TX-${1001 + i}`, ri(10000, 2500000), 'sale', ri(1, 29));
  for (let i = 0; i < refunds; i++) add(`RF-${String(i + 1).padStart(4, '0')}`, -ri(10000, 500000), 'refund', ri(1, 27));

  // Gap 1: timing. Sale on the 31st, settled T+2 in the next month.
  const lateId = `TX-${1001 + sales}`;
  const lateP = ri(10000, 2500000);
  platform.push({ id: lateId, amount: lateP / 100, timestamp: `${month}-31T11:20:45`, type: 'sale' });
  bank.push({ id: lateId, amount: lateP / 100, settled_date: addDays(`${month}-31`, 2) });

  // Gap 2: rounding. 30 settlements are 1 paisa short each: invisible per item, visible in the total.
  // Gap 3: duplicate. One settlement appears twice in the bank file.
  const idx = [...Array(sales).keys()].sort(() => r() - 0.5);
  const dupIdx = idx[0];
  const roundIdx = idx.slice(1, 31);
  roundIdx.forEach((i) => { bank[i].amount = (Math.round(bank[i].amount * 100) - 1) / 100; });
  bank.push({ ...bank[dupIdx] });

  // Gap 4: orphan refund. Bank paid out a refund the platform has no record of.
  bank.push({ id: 'RF-9001', amount: -1249.5, settled_date: `${month}-20` });

  return {
    platform, bank,
    planted: {
      timing: { id: lateId, amount: lateP },
      rounding: { ids: roundIdx.map((i) => platform[i].id), count: roundIdx.length, total: roundIdx.length },
      duplicate: { id: platform[dupIdx].id, amount: Math.round(platform[dupIdx].amount * 100) },
      orphanRefund: { id: 'RF-9001', amount: -124950 },
    },
  };
}
