/**
 * Probe BE local — xác minh bản BE đang chạy đã có các thay đổi B1-B10 chưa.
 * Chạy: node scripts/probe_b10_be.cjs
 */
const https = require('https');

const BASE = 'https://localhost:7169/api';

function request(path, { method = 'GET', token, body } = {}) {
  return new Promise((resolve, reject) => {
    const req = https.request(
      BASE + path,
      {
        method,
        rejectUnauthorized: false,
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        timeout: 10000,
      },
      (res) => {
        let data = '';
        res.on('data', (c) => (data += c));
        res.on('end', () => resolve({ status: res.statusCode, body: data }));
      }
    );
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function login(username, password = '123456') {
  const res = await request('/auth/login', { method: 'POST', body: { username, password } });
  if (res.status !== 200) return null;
  try {
    const j = JSON.parse(res.body);
    return j.token;
  } catch {
    return null;
  }
}

(async () => {
  const tokens = {};
  for (const u of ['admin@etr.com', 'instructor@etr.com', 'qa@etr.com', 'academic@etr.com', 'manager@etr.com', 'audit@etr.com', 'student@etr.com']) {
    const t = await login(u);
    tokens[u] = t;
    console.log(`login ${u}: ${t ? 'OK' : 'FAIL'}`);
  }
  if (!tokens['admin@etr.com']) {
    console.log('Admin login thất bại — không probe tiếp được.');
    return;
  }
  const admin = tokens['admin@etr.com'];
  const instructor = tokens['instructor@etr.com'];
  const qa = tokens['qa@etr.com'];
  const academic = tokens['academic@etr.com'];
  const manager = tokens['manager@etr.com'];

  const checks = [
    ['B2 Instructor GET /courses', request('/courses', { token: instructor })],
    ['B2 Instructor GET /classes', request('/classes', { token: instructor })],
    ['B2 Instructor GET /subjects', request('/subjects', { token: instructor })],
    ['B3 QA GET /enrollments', request('/enrollments', { token: qa })],
    ['B3 Instructor GET /enrollments', request('/enrollments', { token: instructor })],
    ['B4 QA GET /userprofiles', request('/userprofiles', { token: qa })],
    ['B4 Instructor GET /userprofiles/learners', request('/userprofiles/learners', { token: instructor })],
    ['B5 QA GET /audit', request('/audit?page=1&pageSize=5', { token: qa })],
    ['B5 Academic GET /audit', request('/audit?page=1&pageSize=5', { token: academic })],
    ['B6 Instructor GET /evidencetypes', request('/evidencetypes', { token: instructor })],
    ['B1 Academic GET /etr', request('/etr', { token: academic })],
    ['B1 Manager GET /etr', request('/etr', { token: manager })],
    ['B8 Academic GET /evidences', request('/evidences', { token: academic })],
    ['B7 PUT /accounts/3/department (Admin)', request('/accounts/3/department', { method: 'PUT', token: admin, body: { departmentId: 2 } })],
    ['B10 Admin GET /search/classes?query=a', request('/search/classes?query=a', { token: admin })],
    ['B10 Admin GET /search/etrs?query=Completed', request('/search/etrs?query=Completed', { token: admin })],
  ];

  // B9: GET /etr/1 với Admin — kiểm tra field score
  const etrRes = await request('/etr/1', { token: admin });
  let hasScore = false;
  try {
    const j = JSON.parse(etrRes.body);
    const srs = j.subjectResults || j.subjectResultsList || [];
    hasScore = srs.length > 0 ? srs.some((s) => 'score' in s) : 'no-subject-results';
  } catch {}
  checks.push(['B9 GET /etr/1 có field score', Promise.resolve({ status: etrRes.status, body: hasScore })]);

  for (const [label, p] of checks) {
    try {
      const r = await p;
      let note = '';
      if (label.startsWith('B10')) {
        try {
          const arr = JSON.parse(r.body);
          note = ` fields=${arr.length > 0 ? Object.keys(arr[0]).join(',') : '(empty)'}`;
        } catch { note = ` raw=${String(r.body).slice(0, 80)}`; }
      } else if (label.startsWith('B9')) {
        note = ` score=${r.body}`;
      }
      console.log(`${r.status === 200 || r.status === 204 ? '✅' : '❌'} [${r.status}] ${label}${note}`);
    } catch (e) {
      console.log(`❌ [ERR] ${label}: ${e.message}`);
    }
  }
})();
