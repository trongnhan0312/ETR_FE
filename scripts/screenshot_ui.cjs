/**
 * Capture clean UI screenshots of the ETR app for the SEP490 presentation.
 *
 * Prereqs (already running):
 *   - FE dev:      http://localhost:5173   (npm run dev)
 *   - BE API:      https://localhost:7169  (dotnet run --launch-profile https)
 *
 * Run: node scripts/screenshot_ui.cjs
 * Output: F:/DoAnETR/ui_screenshots/*.png
 */
const { chromium } = require('playwright');
const fs = require('fs');

const OUT = 'F:/DoAnETR/ui_screenshots';
const BASE = 'http://localhost:5173';
const PASSWORD = '123456';
const AUTH_PACE_MS = 13000; // BE rate-limits auth: 5 logins/min/IP

fs.mkdirSync(OUT, { recursive: true });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// user -> list of [route, filename]
const PLANS = [
  { user: null, shots: [['/login', '01_login.png']] },
  {
    user: 'academic@etr.com',
    shots: [
      ['/academic', '02_academic_dashboard.png'],
      ['/academic/courses', '03_academic_courses.png'],
      ['/academic/learners', '04_academic_learners.png'],
      ['/academic/etr', '05_academic_etr.png'],
    ],
  },
  {
    user: 'instructor@etr.com',
    shots: [
      ['/instructor', '06_instructor_dashboard.png'],
      ['/instructor/classes', '07_instructor_classes.png'],
      ['/instructor/attendance', '08_instructor_attendance.png'],
      ['/instructor/assessments', '09_instructor_assessments.png'],
      ['/instructor/evidence', '10_instructor_evidence.png'],
    ],
  },
  {
    user: 'qa@etr.com',
    shots: [
      ['/qa', '11_qa_dashboard.png'],
      ['/qa/evidence', '12_qa_evidence.png'],
      ['/qa/reviews', '13_qa_etr_review.png'],
    ],
  },
  {
    user: 'manager@etr.com',
    shots: [
      ['/trainingmanager', '14_manager_dashboard.png'],
      ['/trainingmanager/etr-approval', '15_manager_etr_approval.png'],
    ],
  },
  {
    user: 'admin@etr.com',
    shots: [
      ['/admin', '16_admin_dashboard.png'],
      ['/admin/users', '17_admin_users.png'],
      ['/admin/audit', '18_admin_audit.png'],
    ],
  },
  {
    user: 'audit@etr.com',
    shots: [['/auditor/search', '19_auditor_search.png']],
  },
];

async function login(page, username) {
  await page.goto(`${BASE}/login`);
  await page.evaluate(() => {
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch (e) {}
  });
  await page.waitForSelector('#login-username', { timeout: 15000 });
  await page.fill('#login-username', username);
  await page.fill('#login-password', PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 20000 });
  await sleep(1800);
}

async function shoot(page, route, file) {
  await page.goto(`${BASE}${route}`, { waitUntil: 'load', timeout: 30000 });
  await sleep(2600);
  const textLen = await page.evaluate(() => document.body.innerText.length);
  await page.screenshot({ path: `${OUT}/${file}`, fullPage: false });
  console.log(`  📸 ${file}  (text: ${textLen} chars)${textLen < 200 ? '  ⚠️ possibly empty' : ''}`);
}

(async () => {
  const browser = await chromium.launch({ ignoreHTTPSErrors: true });
  const context = await browser.newContext({
    viewport: { width: 1600, height: 900 },
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();

  for (const plan of PLANS) {
    if (plan.user) {
      await sleep(AUTH_PACE_MS);
      console.log(`🔑 ${plan.user}`);
      await login(page, plan.user);
    } else {
      console.log('🔓 login page');
      await page.goto(`${BASE}/login`, { waitUntil: 'load' });
      await sleep(1500);
      await page.screenshot({ path: `${OUT}/01_login.png` });
      console.log('  📸 01_login.png');
      continue;
    }
    for (const [route, file] of plan.shots) {
      await shoot(page, route, file);
    }
  }
  await browser.close();
  console.log('✅ done ->', OUT);
})().catch((e) => {
  console.error('❌', e);
  process.exit(1);
});
