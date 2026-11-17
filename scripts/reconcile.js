import { readFileSync } from 'node:fs';
import { parseCSV } from '../src/io.js';
import { reconcile } from '../src/reconcile.js';

const inr = (p) => (p / 100).toLocaleString('en-IN', { style: 'currency', currency: 'INR' });
const r = reconcile(
  parseCSV(readFileSync('data/platform_transactions.csv', 'utf8')),
  parseCSV(readFileSync('data/bank_settlements.csv', 'utf8')),
);
console.log(`Platform ${inr(r.platformTotal)} | Bank ${inr(r.bankTotal)} | Difference ${inr(r.difference)} | Unexplained ${inr(r.unexplained)}`);
console.table(r.gaps.map((g) => ({ type: g.type, id: g.id, amount: inr(g.amount), reason: g.reason })));
