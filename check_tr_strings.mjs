// Tạm thời — kiểm tra các chuỗi tr('...') trong các file đã sửa có nằm trong từ điển dịch không.
import fs from 'fs';
import { translateVn } from './src/utils/translate.js';

const files = [
  'src/Academic/CreateClass.jsx',
  'src/Academic/UpdateClassStatusModal.jsx',
  'src/Academic/CourseClassManagement.jsx',
  'src/Academic/CreateCourse.jsx',
  'src/Academic/UpdateCourseModal.jsx',
  'src/Academic/SubjectManagement.jsx',
  'src/TrainingManager/ClassStatus.jsx',
  'src/Auditor/auditorApi.js',
  'src/Instructor/InstructorClasses.jsx',
  'src/Instructor/InstructorSchedule.jsx',
  'src/Instructor/InstructorAttendance.jsx',
  'src/Instructor/InstructorAssessments.jsx',
  'src/Academic/ClassAttendanceHistory.jsx',
];

const isVietnamese = (s) => /[àáảãạăằắẳẵặâầấẩẫậđèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵ]/i.test(s);

const results = [];
const seen = new Set();

for (const file of files) {
  const content = fs.readFileSync(file, 'utf8');
  const re = /tr\(\s*['"`]([^'"`]+)['"`]\s*\)/g;
  let m;
  while ((m = re.exec(content)) !== null) {
    const s = m[1];
    if (!isVietnamese(s)) continue;
    if (seen.has(s)) continue;
    seen.add(s);
    const translated = translateVn(s);
    const translatedIsSame = translated === undefined || translated === s;
    results.push({ file, text: s, translated: translatedIsSame ? '(KHÔNG dịch được)' : translated });
  }
}

const untranslated = results.filter((r) => r.translated === '(KHÔNG dịch được)');
console.log('=== CÁC CHUỖI VIỆT KHÔNG CÓ TRONG TỪ ĐIỂN translateVn ===');
if (untranslated.length === 0) {
  console.log('(không có — tất cả đều dịch được)');
} else {
  for (const r of untranslated) {
    console.log(`- [${r.file}] ${r.text}`);
  }
}
console.log('\n=== TỔNG CHUỖI VIỆT KIỂM TRA:', results.length, '===');
