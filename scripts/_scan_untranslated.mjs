// TẠM THỜI — quét toàn bộ src/ tìm chuỗi tr()/trt() không có trong từ điển dịch.
import fs from 'fs';
import path from 'path';
import { translateVn, translateEn, DICTIONARY } from '../src/utils/translate.js';

const VIET = /[àáảãạăằắẳẵặâầấẩẫậđèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵÀÁẢÃẠĂẰẮẲẴẶÂẦẤẨẪẬĐÈÉẺẼẸÊỀẾỂỄỆÌÍỈĨỊÒÓỎÕỌÔỒỐỔỖỘƠỜỚỞỠỢÙÚỦŨỤƯỪỨỬỮỰỲÝỶỸỴ]/;

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (!['node_modules', 'dist', '.git', 'test'].includes(e.name)) walk(p, out);
    } else if (/\.(jsx?|tsx?)$/.test(e.name) && !p.endsWith('translate.js')) {
      out.push(p);
    }
  }
  return out;
}

const lineOf = (content, idx) => content.slice(0, idx).split('\n').length;

const missingVn = []; // tiếng Việt → không có bản EN (sẽ hiện tiếng Việt khi giao diện EN)
const missingEn = []; // tiếng Anh → không có bản VN (sẽ hiện tiếng Anh khi giao diện VI)
const missingKeys = []; // key trt()/t() không có trong DICTIONARY
const seenVn = new Set(), seenEn = new Set(), seenKey = new Set();

const files = walk('src');
for (const file of files) {
  const content = fs.readFileSync(file, 'utf8');
  const re = /\b(tr|trt|t|trEn)\s*\(\s*(['"`])((?:\\[\s\S]|(?!\2)[^\\\n])*)\2/g;
  let m;
  while ((m = re.exec(content)) !== null) {
    const fn = m[1];
    let s = m[3];
    if (s.includes('${')) continue; // chuỗi động — bỏ qua
    s = s.replace(/\\'/g, "'").replace(/\\"/g, '"');
    const ln = lineOf(content, m.index);
    if (fn === 'trt' || fn === 't') {
      const has = (DICTIONARY.vi && DICTIONARY.vi[s] !== undefined) || (DICTIONARY.en && DICTIONARY.en[s] !== undefined);
      if (!has && !seenKey.has(s)) { seenKey.add(s); missingKeys.push({ file, ln, s }); }
      continue;
    }
    if (VIET.test(s)) {
      if (translateVn(s) === s && !seenVn.has(s)) { seenVn.add(s); missingVn.push({ file, ln, s }); }
    } else {
      if (translateEn(s) === s && !seenEn.has(s)) { seenEn.add(s); missingEn.push({ file, ln, s }); }
    }
  }
}

const rel = (p) => p.replace(/\\/g, '/');

console.log('════════ CHUỖI TIẾNG VIỆT KHÔNG CÓ TRONG TỪ ĐIỂN (hiện tiếng Việt khi giao diện EN) ════════');
if (missingVn.length === 0) console.log('(không có)');
else missingVn.forEach((r) => console.log(`- [${rel(r.file)}:${r.ln}] ${r.s}`));

console.log('\n════════ CHUỖI TIẾNG ANH KHÔNG CÓ BẢN VIỆT (hiện tiếng Anh khi giao diện VI) ════════');
if (missingEn.length === 0) console.log('(không có)');
else missingEn.forEach((r) => console.log(`- [${rel(r.file)}:${r.ln}] ${r.s}`));

console.log('\n════════ KEY trt()/t() KHÔNG CÓ TRONG DICTIONARY ════════');
if (missingKeys.length === 0) console.log('(không có)');
else missingKeys.forEach((r) => console.log(`- [${rel(r.file)}:${r.ln}] ${r.s}`));

console.log(`\nTỔNG: ${files.length} files · ${missingVn.length} chuỗi VN thiếu · ${missingEn.length} chuỗi EN thiếu · ${missingKeys.length} key thiếu`);
