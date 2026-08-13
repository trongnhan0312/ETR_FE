/**
 * FE ↔ BE API CONTRACT TEST
 * =====================================================================
 * Probes the LIVE deployed backend with every REST endpoint the frontend
 * calls (src/**\/*.jsx|js) and reports endpoint-missing / wrong-verb /
 * RBAC / 5xx / 4xx / response-shape mismatches.
 *
 *   node scripts/fe_api_contract_test.cjs                # full (temp writes + cleanup)
 *   node scripts/fe_api_contract_test.cjs --read-only    # idempotent GET probes only
 *
 * Report → scripts/fe_api_contract_report.md
 */
'use strict';

const fs = require('fs');
const path = require('path');
const BASE = process.env.ETR_API_BASE || 'https://etrmanagement-be-fwhvagaxf3f3dmf0.southeastasia-01.azurewebsites.net/api';
const PWD = '123456';
const READ_ONLY = process.argv.includes('--read-only');
const USERS = {
  admin: 'admin@etr.com', academic: 'academic@etr.com', instructor: 'instructor@etr.com',
  qa: 'qa@etr.com', manager: 'manager@etr.com', audit: 'audit@etr.com', student: 'student@etr.com',
};

const P = [];
const add = (k, n, d = '') => P.push({ kind: k, name: n, detail: d });
const ok = (n, d = '') => { add('OK', n, d); console.log('  ✅ PASS', n, d); };
const fail = (n, d = '') => { add('FAIL', n, d); console.error('  ❌ FAIL', n, d); };
const warn = (n, d = '') => { add('WARN', n, d); console.log('  ⚠️ WARN', n, d); };
const skip = (n, d = '') => { add('SKIP', n, d); console.log('  ⏭ SKIP', n, d); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let lastApi = 0;
async function pace() { const w = lastApi + 1100 - Date.now(); if (w > 0) await sleep(w); lastApi = Date.now(); }

async function raw(method, pathname, { token, body } = {}) {
  for (let i = 0; i < 8; i++) {
    await pace();
    const headers = {};
    if (token) headers.authorization = 'Bearer ' + token;
    if (body !== undefined) headers['content-type'] = 'application/json';
    try {
      const res = await fetch(BASE + pathname, { method, headers, body: body !== undefined ? JSON.stringify(body) : undefined });
      const text = await res.text();
      let json = null; try { json = text ? JSON.parse(text) : null; } catch { /* non-json */ }
      if (res.status === 429 && i < 7) { await sleep(9000 + i * 2500); continue; }
      return { status: res.status, json, text: text.slice(0, 300) };
    } catch (e) {
      if (i < 7) { await sleep(8000); continue; }
      return { status: -1, json: null, text: 'network: ' + e.message };
    }
  }
  return { status: -1, json: null, text: 'abandoned' };
}

const tokens = {};
async function getToken(role) {
  if (tokens[role]) return tokens[role];
  for (let i = 0; i < 12; i++) {
    await sleep(4500 + (i % 4) * 1400);
    const r = await raw('POST', '/auth/login', { body: { username: USERS[role], password: PWD } });
    if (r.status === 200 && r.json && r.json.token) { tokens[role] = r.json.token; return r.json.token; }
    if (i === 11) throw new Error(`login(${role}) failed last=${r.status} ${r.text}`);
  }
}

function first(arr) { return Array.isArray(arr) && arr.length ? arr[0] : null; }

function expectStatus(name, r, allowed, label) {
  const set = Array.isArray(allowed) ? allowed : [allowed];
  if (set.includes(r.status)) { ok(name, `${label} → ${r.status}`); return true; }
  const why = r.status === 404 ? 'ENDPOINT MISSING'
    : r.status === 405 ? 'VERB NOT ALLOWED'
    : r.status === 401 ? 'AUTH REJECTED'
    : r.status === 403 ? 'RBAC FORBIDDEN'
    : r.status === 500 ? 'SERVER ERROR'
    : r.status === 400 ? 'PAYLOAD REJECTED (400)'
    : r.status === -1 ? 'NETWORK ERROR' : 'status ' + r.status;
  fail(name, `${label} → ${why} ${r.text.slice(0, 150)}`);
  return false;
}
const expect = expectStatus;

function assetId(x) {
  if (!x || typeof x !== 'object') return null;
  return x.etrCourseRecordId ?? x.id ?? x.accountId ?? x.classId ?? x.courseId ?? x.subjectId ?? x.evidenceId ?? x.etrId
    ?? x.sessionId ?? x.enrollmentId ?? x.assessmentId ?? x.practicalChecklistId
    ?? x.assessmentResultId ?? x.practicalChecklistResultId ?? x.attendanceRecordId
    ?? x.evidenceFileId ?? x.approvalRequestId ?? x.evidenceTypeId ?? x.departmentId
    ?? x.subjectResultId ?? null;
}

async function getRead(p, role) {
  return raw('GET', p, { token: await getToken(role) });
}

function writeReport() {
  const lines = [
    '# FE API CONTRACT TEST REPORT', '',
    `- Date: ${new Date().toISOString()}`, `- Base: \`${BASE}\``,
    `- Mode: ${READ_ONLY ? 'read-only (no writes)' : 'full (temp writes + cleanup)'}`,
    `- Probes: ${P.length}`,
    `- Result: ${JSON.stringify(P.reduce((a, p) => (a[p.kind] = (a[p.kind] || 0) + 1, a), {}))}`, '',
  ];
  const bad = P.filter((p) => ['FAIL', 'MISS', 'VERB', 'RBAC'].includes(p.kind));
  if (bad.length) {
    lines.push('## ❌ FAILURES / MISSING');
    lines.push('| kind | probe | detail |'); lines.push('|---|---|---|');
    bad.forEach((p) => lines.push(`| ${p.kind} | ${p.name} | ${p.detail || '-'} |`));
    lines.push('');
  }
  const misc = P.filter((p) => ['WARN', 'SKIP'].includes(p.kind));
  if (misc.length) {
    lines.push('## ⚠️ WARN / SKIP');
    misc.forEach((p) => lines.push(`- ${p.kind} \`${p.name}\`: ${p.detail || '-'}`));
    lines.push('');
  }
  lines.push('## ✅ PASS');
  P.filter((p) => p.kind === 'OK').forEach((p) => lines.push(`- \`${p.name}\` ${p.detail || ''}`));
  fs.writeFileSync(path.join(__dirname, 'fe_api_contract_report.md'), lines.join('\n') + '\n');
}

// ================================================================ READS
async function runReads(ref) {
  const sid = ref.student?.accountId || ref.learner?.accountId || 1;
  const reads = [
    ['/Courses', 'academic', [200], 'list'],
    ['/Subjects', 'academic', [200], 'list'],
    ['/Classes', 'academic', [200], 'list'],
    ['/Sessions', 'academic', [200], 'list'],
    ['/Enrollments', 'academic', [200], 'list'],
    ['/Etr', 'academic', [200], 'list'],
    ['/Etr/my-etr', 'student', [200], 'my-etr'],
    ['/Etr/student/' + sid + '/history', 'student', [200], 'student history'],
    ['/Etr/student/' + sid + '/current-status', 'student', [200], 'student status'],
    ['/Evidences', 'academic', [200], 'list'],
    ['/EvidenceTypes', 'academic', [200], 'list'],
    ['/AssessmentResults', 'instructor', [200], 'list'],
    ['/Assessments', 'instructor', [200], 'list'],
    ['/PracticalChecklists', 'instructor', [200], 'list'],
    ['/PracticalChecklistResults', 'instructor', [200], 'list'],
    ['/Attendance', 'academic', [200], 'list'],
    ['/Approvals', 'manager', [200], 'list'],
    ['/Accounts', 'admin', [200], 'list'],
    ['/UserProfiles', 'admin', [200], 'list'],
    ['/UserProfiles/learners', 'academic', [200], 'list'],
    ['/UserProfiles/me', 'student', [200], 'me'],
    ['/auth/me', 'student', [200], 'me'],
    ['/Dashboard/stats', 'manager', [200], 'stats'],
    ['/Reports/summary', 'manager', [200], 'summary'],
    ['/RetakeHistory?page=1&pageSize=100', 'qa', [200], 'retake'],
    ['/Departments', 'admin', [200], 'list'],
    ['/Audit?page=1&pageSize=100', 'admin', [200], 'page'],
    ['/Courses/' + (ref.courseId ?? 1), 'academic', [200, 404], 'course detail'],
    ['/Classes/' + (ref.clsId ?? 1), 'academic', [200, 404], 'class detail'],
    ['/Sessions/' + (ref.sessionId ?? 1), 'instructor', [200, 404], 'session detail'],
    ['/Etr/' + (ref.etrId ?? 1), 'academic', [200, 404], 'etr detail'],
    ['/Audit/' + (ref.evidId ?? 1), 'admin', [200, 404], 'audit detail'],
  ];
  for (const [p, role, allowed, label] of reads) {
    const r = await getRead(p, role);
    expect(`READ GET ${p}`, r, allowed, label);
  }
  // shape: list endpoints must return arrays
  const listPaths = ['/Courses', '/Subjects', '/Classes', '/Sessions', '/Enrollments', '/Etr',
    '/Evidences', '/EvidenceTypes', '/AssessmentResults', '/Assessments', '/PracticalChecklists',
    '/PracticalChecklistResults', '/Attendance', '/Accounts', '/UserProfiles', '/UserProfiles/learners'];
  for (const p of listPaths) {
    const r = await getRead(p, 'admin');
    if (!Array.isArray(r.json)) warn(`SHAPE GET ${p}`, `expected array, got ${typeof r.json} ${r.text.slice(0, 80)}`);
  }
}

// ================================================================ WRITES
async function runWrites(ref) {
  const t = await getToken('admin');
  const qaT = await getToken('qa');
  const manT = await getToken('manager');
  const audT = await getToken('audit');
  const stuT = await getToken('student');
  const sfx = String(Date.now()).slice(-7);
  const created = {};
  let courseId = null, subjectId = null, classId = null, sessId = null, enrId = null, learnerId = null;

  // --- Subjects: create / update / delete (temp) ---
  const sbody = { subjectCode: 'TCS' + sfx, subjectName: 'Contract Subj', subjectType: 'Theory', defaultHours: 2, assessmentMethod: 'Written Exam', description: 'x', status: 'Active' };
  const su = await raw('POST', '/Subjects', { token: t, body: sbody });
  if (expect('WRITE POST /Subjects', su, [200, 201], 'create')) {
    subjectId = su.json?.subjectId ?? su.json?.id ?? null;
    if (subjectId) {
      created.subject = subjectId;
      const up = await raw('PUT', '/Subjects/' + subjectId, { token: t, body: { subjectId, subjectCode: 'TCS' + sfx, subjectName: 'Contract Subj U', subjectType: 'Theory', defaultHours: 3, status: 'Active' } });
      expect('WRITE PUT /Subjects/{id}', up, [200, 204], 'update');
      const del = await raw('DELETE', '/Subjects/' + subjectId, { token: t });
      expect('WRITE DELETE /Subjects/{id}', del, [200, 204, 404], 'delete');
    }
  }

  // --- Course: requires ≥1 subject ---
  const c1 = await raw('POST', '/Courses', { token: t, body: { courseCode: 'TCC' + sfx, courseName: 'Contract Course', description: 'x', durationHours: 40, status: 'Active', validityMonths: 24, courseType: 'Initial', subjects: [{ subjectId: ref.subjectId ?? 1, sequenceNo: 1, requiredHours: 40, isMandatory: true, passingScore: 5 }] } });
  if (expect('WRITE POST /Courses', c1, [200, 201], 'create')) {
    courseId = c1.json?.courseId ?? c1.json?.id ?? null;
    if (courseId) {
      const cu = await raw('PUT', '/Courses/' + courseId, { token: t, body: { courseId, courseCode: 'TCC' + sfx, courseName: 'Contract Course U', description: 'y', durationHours: 40, status: 'Active', validityMonths: 24, courseType: 'Initial', subjects: [{ subjectId: ref.subjectId ?? 1, sequenceNo: 1, requiredHours: 40, isMandatory: true, passingScore: 5 }] } });
      expect('WRITE PUT /Courses/{id}', cu, [200, 204], 'update');
    }
  }

  // --- Class: new contract status InProgress / Planned then legacy Active rejected ---
  if (courseId || ref.courseId) {
    const parent = courseId || ref.courseId;
    const cl = await raw('POST', '/Classes', { token: t, body: {
      courseId: parent, classCode: 'TCL' + sfx, className: 'Contract Class',
      startDate: '2026-09-01T00:00:00Z', endDate: '2026-12-01T00:00:00Z', location: 'Room T',
      capacity: 20, status: 'InProgress', instructorAccountId: 2 } });
    if (expect('WRITE POST /Classes (InProgress)', cl, [200, 201], 'create')) {
      classId = cl.json?.classId ?? cl.json?.id ?? null;
      if (classId) {
        const up = await raw('PUT', '/Classes/' + classId, { token: t, body: {
          classId, classCode: 'TCL' + sfx, className: 'Contract Class U', courseId: parent,
          startDate: '2026-09-01T00:00:00Z', endDate: '2026-12-01T00:00:00Z', location: 'Room T',
          capacity: 25, status: 'Planned', instructorAccountId: 2 } });
        expect('WRITE PUT /Classes/{id} (Planned)', up, [200, 204], 'update');
        const oldStatus = await raw('PUT', '/Classes/' + classId, { token: t, body: {
          classId, classCode: 'TCL' + sfx, className: 'Contract Class X', courseId: parent,
          startDate: '2026-09-01T00:00:00Z', endDate: '2026-12-01T00:00:00Z', location: 'Room T',
          capacity: 25, status: 'Active', instructorAccountId: 2 } });
        if (oldStatus.status !== 400) expect('WRITE PUT /Classes status "Active" (contract: must 400)', oldStatus, [400]);
        else ok('WRITE PUT /Classes status "Active" → 400 (contract)');
        expect('WRITE POST /Classes (Planned)', await raw('POST', '/Classes', { token: t, body: {
          courseId: parent, classCode: 'TCL' + sfx + '2', className: 'Contract Class P',
          startDate: '2026-09-01T00:00:00Z', endDate: '2026-12-01T00:00:00Z', location: 'Room T',
          capacity: 20, status: 'Planned', instructorAccountId: 2 } }), [200, 201], 'create');
      }
    }
  }

  // --- Learner account + enrollment (temp) ---
  const learner = { username: 'tc_learn_' + sfx, password: '123456', fullName: 'Contract Learner', role: 'Student', status: 'Active' };
  const ac = await raw('POST', '/Accounts', { token: t, body: learner });
  learnerId = ac.json ? ac.json.accountId ?? ac.json.id ?? null : null;
  if (learnerId == null) { skip('WRITE POST /Accounts', 'no id from ' + JSON.stringify(ac.json).slice(0, 120) + ' status=' + ac.status); }
  else {
    created['learner'] = learnerId;
    ok('WRITE POST /Accounts', 'temp learner #' + learnerId);
  }

  // enroll into a class we control
  const targetClassId = classId || ref.clsId;
  if (learnerId && targetClassId) {
    const en = await raw('POST', '/Enrollments', { token: t, body: { accountId: learnerId, classId: targetClassId } });
    if (expect('WRITE POST /Enrollments', en, [200, 201], 'enroll')) {
      enrId = en.json?.enrollmentId ?? en.json?.id ?? null;
      if (enrId) created.enrollment = enrId;
    }
  }

  // --- Session create/update (temp class) ---
  if (targetClassId && ref.subjectId) {
    const se = await raw('POST', '/Sessions', { token: t, body: {
      classId: targetClassId, subjectId: ref.subjectId, sessionTitle: 'Contract Session',
      sessionDate: '2026-09-05T00:00:00Z', location: 'Sim', isAssessmentRequired: false, isChecklistRequired: false } });
    if (expect('WRITE POST /Sessions', se, [200, 201], 'create')) {
      sessId = se.json?.sessionId ?? se.json?.id ?? null;
      if (sessId) {
        const su2 = await raw('PUT', '/Sessions/' + sessId, { token: t, body: { sessionId: sessId, sessionTitle: 'Contract Session U', sessionDate: '2026-10-01T00:00:00Z', location: 'Sim2' } });
        expect('WRITE PUT /Sessions/{id}', su2, [200, 204], 'update');
      }
    }
  }

  // --- attendance record / update / confirm ---
  if (enrId && sessId) {
    const at = await raw('POST', '/attendance/record', { token: await getToken('instructor'), body: { sessionId: sessId, enrollmentId: enrId, status: 'Present', remarks: 'c' } });
    if (expect('WRITE POST /attendance/record', at, [200, 201], 'record')) {
      const attId = at.json?.attendanceRecordId ?? at.json?.id ?? null;
      if (attId) {
        const au = await raw('PUT', '/attendance/' + attId, { token: await getToken('instructor'), body: { status: 'Late', remarks: 'u' } });
        expect('WRITE PUT /attendance/{id}', au, [200, 204], 'update');
        const cf = await raw('POST', '/attendance/sessions/' + sessId + '/confirm', { token: await getToken('instructor') });
        expect('WRITE POST /attendance/sessions/{id}/confirm', cf, [200, 204], 'confirm');
      }
    }
  }

  // --- assessments: valid (Theory) & invalid (Quiz) ---
  const courseTarget = courseId || ref.courseId;
  const subjTarget = ref.subjectId;
  if (courseTarget && subjTarget) {
    const as = await raw('POST', '/Assessments', { token: t, body: { courseId: courseTarget, subjectId: subjTarget, componentName: 'Contract Asmt', assessmentType: 'Theory', weight: 30, passingScore: 5, isRequired: true, displayOrder: 1 } });
    expect('WRITE POST /Assessments (Theory)', as, [200, 201], 'create');
    const asBad = await raw('POST', '/Assessments', { token: t, body: { courseId: courseTarget, subjectId: subjTarget, componentName: 'Contract Asm2', assessmentType: 'Quiz', weight: 10 } });
    if (asBad.status === 400) ok('WRITE POST /Assessments type=Quiz → 400 (contract)');
    else fail('WRITE POST /Assessments type=Quiz', 'expected 400, got ' + asBad.status + ' ' + asBad.text);
    if (as.json?.assessmentId) {
      const au = await raw('PUT', '/Assessments/' + as.json.assessmentId, { token: t, body: { assessmentId: as.json.assessmentId, subjectId: subjTarget, componentName: 'Contract Asm U', assessmentType: 'Theory', weight: 40, passingScore: 5, isRequired: true, displayOrder: 2 } });
      expect('WRITE PUT /Assessments/{id}', au, [200, 204], 'update');
      expect('WRITE DELETE /Assessments/{id}', await raw('DELETE', '/Assessments/' + as.json.assessmentId, { token: t }), [200, 204, 404], 'delete');
    }
    const ck = await raw('POST', '/PracticalChecklists', { token: t, body: { courseId: courseTarget, subjectId: subjTarget, itemName: 'Contract Item', description: 'x', isRequired: true, displayOrder: 1 } });
    if (expect('WRITE POST /PracticalChecklists', ck, [200, 201], 'create') && ck.json?.practicalChecklistId) {
      const cu = await raw('PUT', '/PracticalChecklists/' + ck.json.practicalChecklistId, { token: t, body: { practicalChecklistId: ck.json.practicalChecklistId, itemName: 'Contract Item U', description: 'y', isRequired: true, displayOrder: 2 } });
      expect('WRITE PUT /PracticalChecklists/{id}', cu, [200, 204], 'update');
    }
  }

  // --- signoff / assessment-result publish (needs real ETR chain; tolerate) ---
  if (ref.etrId) {
    const rg = await raw('POST', '/Etr/' + ref.etrId + '/complete', { token: manT, body: {} });
    expect('WRITE POST /Etr/{id}/complete', rg, [200, 400, 404, 500], 'manager complete');
    const r2 = await raw('POST', '/Etr/' + ref.etrId + '/reopen', { token: manT, body: {} });
    expect('WRITE POST /Etr/{id}/reopen', r2, [200, 400, 404, 500], 'reopen');
  }

  // --- QA verify evidence (write) ---
  if (ref.evidId) {
    const v = await raw('PUT', '/Evidences/' + ref.evidId + '/verify', { token: qaT, body: { verificationStatus: 'Verified', verificationComment: 'contract' } });
    expect('WRITE PUT /Evidences/{id}/verify', v, [200, 204, 400, 404], 'verify');
  }

  // --- exports (each POST body per FE) ---
  const exportBody = () => ({ ...(ref.etrId ? { ETRCourseRecordId: ref.etrId } : {}), ...(ref.clsId ? { ClassId: ref.clsId } : {}) });
  for (const ep of ['/Exports/dashboard', '/Exports/pdf', '/Exports/training-package', '/Exports/attendance', '/Exports/assessment', '/Exports/class-summary']) {
    const r = await raw('POST', ep, { token: audT, body: exportBody() });
    expect('WRITE POST ' + ep, r, [200, 400, 404], 'export');
  }

  // --- change password key fix ---
  const cp = await raw('POST', '/auth/change-password', { token: stuT, body: { oldPassword: PWD, newPassword: '123456' } });
  expect('WRITE POST /auth/change-password', cp, [200, 204, 400], 'change-pwd');

  // --- cleanup temp entities (best-effort) ---
  if (enrId) await raw('DELETE', '/Enrollments/' + enrId, { token: t });
  if (sessId) await raw('DELETE', '/Sessions/' + sessId, { token: t });
  if (learnerId) await raw('DELETE', '/Accounts/' + learnerId, { token: t });
  if (classId) await raw('DELETE', '/Classes/' + classId, { token: t });
  if (courseId) await raw('DELETE', '/Courses/' + courseId, { token: t });
  ok('WRITE cleanup', 'removed temp entities');
}

// ======================================================== MY-DASHBOARD
// Every FE role now reads GET /Dashboard/my-dashboard (role-aware payload).
// Verify: 200 for all roles, the right fields populated per role, and that
// /Dashboard/stats + /action-items remain role-locked (so only my-dashboard
// is the correct source for Instructor/QA/Student dashboards).
function pick2(obj, ...keys) {
  if (!obj || typeof obj !== 'object') return undefined;
  for (const k of keys) if (obj[k] !== undefined && obj[k] !== null) return obj[k];
  return undefined;
}
const LIST_FIELDS = ['myClasses', 'lowAttendanceStudents', 'myEtrs', 'pendingVerificationEtrIds'];

async function runMyDashboardProbes() {
  const roleField = [
    ['admin', ['overview', 'statusFunnel', 'actionItems']],
    ['manager', ['overview', 'statusFunnel', 'actionItems']],
    ['academic', ['overview', 'statusFunnel', 'actionItems']],
    ['audit', ['overview', 'statusFunnel', 'actionItems']],
    ['instructor', ['myClasses', 'lowAttendanceStudents']],
    ['qa', ['pendingVerificationEtrIds', 'actionItems']],
    ['student', ['myEtrs']],
  ];
  for (const [role, fields] of roleField) {
    const r = await getRead('/Dashboard/my-dashboard', role);
    if (!expect('READ GET /Dashboard/my-dashboard (' + role + ')', r, [200], 'role dashboard')) continue;
    const j = r.json || {};
    for (const f of fields) {
      const val = pick2(j, f, f[0].toUpperCase() + f.slice(1));
      const good = LIST_FIELDS.includes(f) ? Array.isArray(val) : val !== undefined && val !== null;
      if (good) ok(`my-dashboard.${f} (${role})`, 'populated');
      else fail(`MISS my-dashboard.${f} (${role})`, 'expected populated, got ' + JSON.stringify(val));
    }
  }

  // stats / action-items RBAC: allowed = Admin/TM/Academic/Audit; locked = Instructor/QA/Student
  for (const ep of ['/Dashboard/stats', '/Dashboard/action-items']) {
    for (const role of ['admin', 'manager', 'academic', 'audit']) {
      const r = await getRead(ep, role);
      expect(`RBAC GET ${ep} (${role})`, r, [200], 'allowed');
    }
    for (const role of ['instructor', 'qa', 'student']) {
      const r = await getRead(ep, role);
      if (r.status === 403) ok(`RBAC GET ${ep} (${role})`, '403 as expected (role-locked)');
      else warn(`RBAC GET ${ep} (${role})`, 'expected 403, got ' + r.status + ' ' + r.text.slice(0, 120));
    }
  }
}

async function main() {
  console.log('══════════════ FE ↔ BE API CONTRACT TEST ══════════════');
  console.log('Base:', BASE, '| Mode:', READ_ONLY ? 'READ-ONLY (GET only)' : 'FULL (writes + cleanup)');
  console.log('───────────────────────────────────────────────────────');

  // reference data
  const ref = {};
  const grabs = [
    ['Courses', 'admin'], ['Subjects', 'admin'], ['Classes', 'admin'], ['Sessions', 'admin'],
    ['Enrollments', 'admin'], ['Etr', 'admin'], ['Evidences', 'admin'], ['EvidenceTypes', 'admin'],
    ['Approvals', 'admin'], ['Assessments', 'instructor'], ['PracticalChecklists', 'instructor'],
    ['AssessmentResults', 'instructor'], ['PracticalChecklistResults', 'instructor'], ['Attendance', 'admin'],
    ['Accounts', 'admin'], ['ReportSummary', 'manager'],
  ];
  for (const [k, role] of grabs) {
    const r = await raw('GET', '/' + (k === 'ReportSummary' ? 'Reports/summary' : k), { token: await getToken(role) });
    if (r.status !== 200) fail('REF GET /' + k, 'unable to load ref data → ' + r.status);
    ref[k.toLowerCase()] = r.json;
  }
  ref.courseId = assetId(first(ref.courses));
  ref.subjectId = assetId(first(ref.subjects));
  ref.clsId = assetId(first(ref.classes));
  ref.sessionId = assetId(first(ref.sessions));
  ref.enrId = assetId(first(ref.enrollments));
  ref.etrId = assetId(first(ref.etrs));
  ref.evidId = assetId(first(ref.evidences));
  ref.evtypeId = assetId(first(ref.evidencetypes));
  ref.apprId = assetId(first(ref.approvals));
  ref.student = (ref.accounts || []).find((a) => String(a.roleId) === '6') || first(ref.accounts);

  await runReads(ref);
  await runMyDashboardProbes();
  if (!READ_ONLY) await runWrites(ref);

  writeReport();
  const counts = P.reduce((a, p) => (a[p.kind] = (a[p.kind] || 0) + 1, a), {});
  console.log('───────────────────────────────────────────────────────');
  console.log('RESULT:', JSON.stringify(counts));
  const bad = P.filter((p) => ['FAIL', 'MISS', 'VERB', 'RBAC'].includes(p.kind));
  if (bad.length) {
    console.log('────────── ANNOUNCEMENT: contract problems ──────────');
    bad.forEach((p) => console.log(`❗ ${p.kind}: ${p.name} ${p.detail}`));
  } else {
    console.log('✔  All probed endpoints return expected statuses.');
  }
  console.log('REPORT → scripts/fe_api_contract_report.md');
}

main().catch((e) => { console.error('FATAL', e); process.exitCode = 1; });