import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';
import { translateVn, translateEn } from '../src/utils/translate.js';

const walk = (dir, out = []) => {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) {
      if (!p.includes('/test')) walk(p, out);
    } else if (p.endsWith('.jsx') || p.endsWith('.js')) out.push(p);
  }
  return out;
};

const files = walk('src').filter(
  (f) => !f.includes('translate.js') && !f.includes('/test/')
);

// Keys present in the dictionaries (identity or real) are considered covered.
const tsrc = readFileSync('src/utils/translate.js', 'utf8');
const keyRe = /^\s*'((?:[^'\\]|\\.)*)'\s*:/gm;
const knownKeys = new Set();
let m;
while ((m = keyRe.exec(tsrc))) knownKeys.add(m[1]);

const trCallRe = /\b(?:tr|trEn)\(\s*(['"`])((?:\\.|(?!\1).)*)\1\s*\)/g;

const missing = new Map();
for (const f of files) {
  const src = readFileSync(f, 'utf8');
  let mm;
  while ((mm = trCallRe.exec(src))) {
    const str = mm[2].replace(/\\'/g, "'").replace(/\\"/g, '"').replace(/\\\\/g, '\\');
    if (!str || str.length < 2) continue;
    if (str.includes('${')) continue; // template with interpolation - skip
    if (knownKeys.has(str)) continue; // already has a dictionary entry
    const toEn = translateVn(str);
    const toVn = translateEn(str);
    if (toEn === str && toVn === str) {
      if (!missing.has(str)) missing.set(str, []);
      missing.get(str).push(f);
    }
  }
}

const list = [...missing.keys()].sort((a, b) => b.length - a.length);
console.log('MISSING DICTIONARY ENTRIES:', list.length);
for (const s of list) {
  const vn = /[àáảãạăắằẳẵặâấầẩẫậđèéẻẽẹêếềểễệìíỉĩịòóỏõọôốồổỗộơớờởỡợùúủũụưứừửữựỳýỷỹỵ]/.test(s);
  console.log(`${vn ? 'VN→EN' : 'EN→VN'}  ${s}`);
}
