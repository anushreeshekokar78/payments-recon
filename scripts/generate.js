import { writeFileSync } from 'node:fs';
import { generate } from '../src/generate.js';
import { toCSV } from '../src/io.js';

const seed = Number(process.argv[2]) || 42;
const { platform, bank, planted } = generate({ seed });
writeFileSync('data/platform_transactions.csv', toCSV(platform, ['id', 'amount', 'timestamp', 'type']));
writeFileSync('data/bank_settlements.csv', toCSV(bank, ['id', 'amount', 'settled_date']));
writeFileSync('data/planted_gaps.json', JSON.stringify(planted, null, 2));
console.log(`seed ${seed}: ${platform.length} platform rows, ${bank.length} bank rows -> data/`);
