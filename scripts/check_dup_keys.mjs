import { readFileSync } from 'fs';

const s = readFileSync('src/utils/translate.js', 'utf8');
const lines = s.split(/\r?\n/);
const enStart = lines.findIndex((l) => l.includes('export const EN_TO_VN'));
const dictStart = lines.findIndex((l) => l.includes('export const DICTIONARY'));

// Track per-block: key -> { firstVal, lastVal }
const blocks = { VN: new Map(), EN: new Map() };
const re = /^\s*'((?:[^'\\]|\\.)*)'\s*:\s*'((?:[^'\\]|\\.)*)'\s*,?\s*$/;

lines.forEach((l, i) => {
  if (i >= dictStart) return;
  const m = l.match(re);
  if (!m) return;
  const k = m[1];
  const v = m[2];
  const block = i < enStart ? 'VN' : 'EN';
  const map = blocks[block];
  if (map.has(k)) {
    map.get(k).lastVal = v;
    map.get(k).lastLine = i + 1;
  } else {
    map.set(k, { firstVal: v, firstLine: i + 1, lastVal: v, lastLine: i + 1 });
  }
});

let withinConflicts = 0;
for (const block of ['VN', 'EN']) {
  for (const [k, info] of blocks[block]) {
    if (info.firstLine !== info.lastLine && info.firstVal !== info.lastVal) {
      withinConflicts++;
      console.log(
        `${block} block: "${k}" L${info.firstLine}="${info.firstVal}" vs L${info.lastLine}="${info.lastVal}"`
      );
    }
  }
}
console.log('\nWithin-block conflicting duplicates:', withinConflicts);
