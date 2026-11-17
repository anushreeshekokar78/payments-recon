export const toCSV = (rows, cols) =>
  [cols.join(','), ...rows.map((r) => cols.map((c) => (c === 'amount' ? r[c].toFixed(2) : r[c])).join(','))].join('\n') + '\n';

export function parseCSV(text) {
  const [head, ...lines] = text.trim().split(/\r?\n/);
  const cols = head.split(',');
  return lines.map((l) => {
    const v = l.split(',');
    return Object.fromEntries(cols.map((c, i) => [c, c === 'amount' ? Number(v[i]) : v[i]]));
  });
}
