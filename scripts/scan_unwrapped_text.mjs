import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

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
  (f) => !f.includes('translate.js') && !f.includes('/test/') && !f.includes('LanguageContext') && !f.includes('scan_unwrapped')
);

const trRe = /\b(tr|trEn|trt|t)\(/;

// 1) JSX single-line text nodes: >text</ or >text<
const re1 = />([^<>{}\n]*[A-Za-zÀ-ỹ][^<>{}\n]*)<\//g;
// 2) User-facing attribute/string contexts
const re2 = /(placeholder|title|aria-label|alt|label)\s*=\s*["'`]([A-Za-zÀ-ỹ][^"'`]*?)["'`]/g;
const re3 = /\b(toast\.(success|error|info)|alert|confirm|prompt)\(["'`]([A-Za-zÀ-ỹ][^"'`]*?)(?:\s*["'`]\s*[+)]|\s*["'`]\))/g;
// 3) Standalone text lines (likely JSX text on its own line or JS strings)
const re4 = /^\s*([A-Za-zÀ-ỹ][A-Za-z0-9À-ỹ\s\.,:;\-–—'’()&/•!?%$@+\u2019]*?)\s*$/;

const skipWordy = /^(import|export|const|let|var|return|function|className|http|www\.|from|require|\*|export default|useState|useEffect|onClick)/;

let total1 = 0, total2 = 0, total3 = 0;
const results = [];
for (const f of files) {
  const src = readFileSync(f, 'utf8');
  const lines = src.split('\n');
  let c1 = 0, c2 = 0, c3 = 0;
  const samples = [];
  lines.forEach((ln) => {
    if (trRe.test(ln)) { /* line already has tr() — skip for all */ }
    if (ln.trim().startsWith('//') || ln.trim().startsWith('/*') || ln.trim().startsWith('*')) return;
    let m1 = ln.match(re1);
    if (m1 && !trRe.test(ln)) {
      m1.forEach((x) => {
        const t = x.replace(/^>/, '').replace(/<\/*$/, '').trim();
        if (t.length >= 2 && !/^[\s\-–—•·|()]+$/.test(t)) { c1++; if (samples.length < 5) samples.push('T1: ' + t.slice(0, 80)); }
      });
    }
    let m2 = ln.match(re2);
    if (m2 && !trRe.test(ln)) {
      m2.forEach((x) => { const t = x.split('=')[1]?.replace(/["'`]/g, '').trim(); if (t && t.length >= 2 && !/^(http|#|\/)/.test(t)) { c2++; if (samples.length < 5) samples.push('T2: ' + t.slice(0, 80)); } });
    }
    if (!trRe.test(ln)) {
      const t = ln.match(re4);
      if (t && t[1].length >= 3 && !skipWordy.test(t[1]) && !/^[A-Z\s.]+$/.test(t[1])) {
        const words = t[1].split(/\s+/).length;
        if (words >= 2 && words <= 14) { c3++; if (samples.length < 5) samples.push('T3: ' + t[1].slice(0, 80)); }
      }
    }
  });
  const tot = c1 + c2 + c3;
  if (tot > 0) {
    total1 += c1; total2 += c2; total3 += c3;
    results.push({ f, tot, c1, c2, c3, samples });
  }
}
results.sort((a, b) => b.tot - a.tot);
for (const r of results) {
  console.log(`${String(r.tot).padStart(4)}  (t1:${r.c1} t2:${r.c2} t3:${r.c3})  ${r.f}`);
  r.samples.forEach((s) => console.log(`        ${s}`));
}
console.log(`\nTOTALS  text:${total1}  attrs:${total2}  standalone:${total3}  = ${total1 + total2 + total3}`);
