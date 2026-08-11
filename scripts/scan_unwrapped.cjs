const fs = require('fs');
const path = require('path');

function getFiles(dir) {
  let subdirs = fs.readdirSync(dir);
  let files = [];
  for (let file of subdirs) {
    let fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      files = files.concat(getFiles(fullPath));
    } else if (fullPath.endsWith('.jsx')) {
      files.push(fullPath);
    }
  }
  return files;
}

const files = getFiles(path.join(__dirname, '../src'));
const vnRegex = /[àáảãạâầấẩẫậăằắẳẵặèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđĐ]/i;

let results = {};

for (let file of files) {
  if (file.includes(path.join('src', 'test'))) continue;
  let content = fs.readFileSync(file, 'utf8');
  let lines = content.split('\n');
  let relPath = path.relative(path.join(__dirname, '../src'), file);
  
  lines.forEach((line, idx) => {
    let trimmed = line.trim();
    // Skip imports, comments, console, styling, empty lines
    if (!trimmed || trimmed.startsWith('import ') || trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*') || trimmed.startsWith('console.')) return;
    
    // Check if line contains Vietnamese text
    if (vnRegex.test(trimmed)) {
      // Check if it's wrapped in tr/trEn/trt/t
      if (!trimmed.includes('tr(') && !trimmed.includes('trEn(') && !trimmed.includes('trt(') && !trimmed.includes('t(')) {
        if (!results[relPath]) results[relPath] = [];
        results[relPath].push({ line: idx + 1, text: trimmed });
      }
    }
  });
}

console.log(`Found ${Object.keys(results).length} files with unwrapped Vietnamese strings:\n`);
for (let [file, items] of Object.entries(results)) {
  console.log(`=== ${file} (${items.length} lines) ===`);
  items.slice(0, 15).forEach(i => console.log(`  L${i.line}: ${i.text}`));
  if (items.length > 15) console.log(`  ... and ${items.length - 15} more`);
}
