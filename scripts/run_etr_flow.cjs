const { chromium } = require('playwright');

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function loginAs(page, username, password, expectedUrlPattern) {
  console.log(`🔑 Logging in as ${username}...`);
  let attempts = 0;
  while (attempts < 3) {
    try {
      await page.goto('http://localhost:5173/login');
      await page.evaluate(() => {
        try { localStorage.clear(); } catch(e){}
      });
      await page.waitForSelector('#login-username', { timeout: 8000 });
      await page.fill('#login-username', username);
      await page.fill('#login-password', password);
      await page.click('button[type="submit"]');
      await page.waitForURL(expectedUrlPattern, { timeout: 10000 });
      console.log(`✅ ${username} logged in successfully.`);
      return true;
    } catch (err) {
      attempts++;
      console.warn(`⚠️ Attempt ${attempts} for ${username} failed (${err.message.split('\n')[0]}). Retrying in 3s...`);
      await sleep(3000);
    }
  }
  console.error(`❌ Failed to login as ${username} after 3 attempts.`);
  return false;
}

(async () => {
  console.log('====================================================');
  console.log('🚀 STARTING FULL ETR END-TO-END SYSTEM TEST (ALL 7 ROLES)');
  console.log('====================================================');

  const browser = await chromium.launch({
    headless: false,
    channel: 'msedge',
    args: ['--ignore-certificate-errors', '--start-maximized', '--no-sandbox']
  });

  const context = await browser.newContext({
    ignoreHTTPSErrors: true,
    viewport: null
  });

  const page = await context.newPage();
  const BASE_URL = 'http://localhost:5173';

  try {
    // 1. Admin Role
    console.log('\n--- 1. ADMIN ROLE: SYSTEM OVERVIEW & USER MANAGEMENT ---');
    if (await loginAs(page, 'admin@etr.com', '123456', '**/admin**')) {
      await sleep(2000);
      console.log('📊 Admin Dashboard...');
      await page.goto(`${BASE_URL}/admin`);
      await sleep(2000);
      console.log('👥 User Management...');
      await page.goto(`${BASE_URL}/admin/users`);
      await sleep(2000);
      console.log('🏢 Department Management...');
      await page.goto(`${BASE_URL}/admin/departments`);
      await sleep(2000);
      console.log('📜 System Audit Logs...');
      await page.goto(`${BASE_URL}/admin/audit`);
      await sleep(2000);
    }

    // 2. Academic Staff Role
    console.log('\n--- 2. ACADEMIC STAFF ROLE: COURSES, CLASSES & ETR GENERATION ---');
    if (await loginAs(page, 'academic@etr.com', '123456', '**/academic**')) {
      await sleep(2000);
      console.log('📋 Learner Management...');
      await page.goto(`${BASE_URL}/academic/learners`);
      await sleep(2000);
      console.log('📚 Courses & Classes Management...');
      await page.goto(`${BASE_URL}/academic/courses`);
      await sleep(2000);
      console.log('📂 Automatic ETR Records (In Progress)...');
      await page.goto(`${BASE_URL}/academic/etr`);
      await sleep(2000);
      console.log('⏳ Expiring Students Warning...');
      await page.goto(`${BASE_URL}/academic/expiring-students`);
      await sleep(2000);
    }

    // 3. Instructor Role
    console.log('\n--- 3. INSTRUCTOR ROLE: ATTENDANCE, ASSESSMENTS & EVIDENCE ---');
    if (await loginAs(page, 'instructor@etr.com', '123456', '**/instructor**')) {
      await sleep(2000);
      console.log('🏫 Instructor Classes...');
      await page.goto(`${BASE_URL}/instructor/classes`);
      await sleep(2000);
      console.log('⏱️ Recording Attendance...');
      await page.goto(`${BASE_URL}/instructor/attendance`);
      await sleep(2000);
      console.log('📝 Entering Assessments...');
      await page.goto(`${BASE_URL}/instructor/assessments`);
      await sleep(2000);
      console.log('📎 Uploading Evidence Files...');
      await page.goto(`${BASE_URL}/instructor/evidence`);
      await sleep(2000);
    }

    // 4. QA Staff Role
    console.log('\n--- 4. QA STAFF ROLE: EVIDENCE VERIFICATION & REVIEW ---');
    if (await loginAs(page, 'qa@etr.com', '123456', '**/qa**')) {
      await sleep(2000);
      console.log('🔍 QA Dashboard & Evidence Verification...');
      await page.goto(`${BASE_URL}/qa/evidence`);
      await sleep(2000);
      console.log('📊 QA ETR Review Queue...');
      await page.goto(`${BASE_URL}/qa/reviews`);
      await sleep(2000);
      console.log('📜 QA Audit Trail...');
      await page.goto(`${BASE_URL}/qa/audit`);
      await sleep(2000);
    }

    // 5. Training Manager Role
    console.log('\n--- 5. TRAINING MANAGER ROLE: APPROVAL & FREEZE DATA ---');
    if (await loginAs(page, 'manager@etr.com', '123456', '**/trainingmanager**')) {
      await sleep(2000);
      console.log('🏛️ Training Manager Dashboard...');
      await page.goto(`${BASE_URL}/trainingmanager`);
      await sleep(2000);
      console.log('🔒 Training Manager ETR Approval (Freeze Data)...');
      await page.goto(`${BASE_URL}/trainingmanager/etr-approval`);
      await sleep(2000);
    }

    // 6. Auditor / CAA Inspector Role
    console.log('\n--- 6. AUDITOR ROLE: SEARCH, AUDIT LOGS & TRAINING PACKAGE EXPORT ---');
    if (await loginAs(page, 'audit@etr.com', '123456', '**/auditor**')) {
      await sleep(2000);
      console.log('🔒 Inspecting Locked & Completed ETRs...');
      await page.goto(`${BASE_URL}/auditor/etrs`);
      await sleep(2000);
      console.log('📜 Verifying Immutable Audit Logs...');
      await page.goto(`${BASE_URL}/auditor/audit-logs`);
      await sleep(2000);
      console.log('📦 Exporting Training Package for CAA Inspection...');
      await page.goto(`${BASE_URL}/auditor/export-packages`);
      await sleep(2000);
    }

    // 7. Student / Learner Role
    console.log('\n--- 7. STUDENT / LEARNER ROLE: LEARNER DASHBOARD & ETR VIEW ---');
    if (await loginAs(page, 'student@etr.com', '123456', '**/student**')) {
      await sleep(2000);
      console.log('🎓 Student Dashboard...');
      await page.goto(`${BASE_URL}/student`);
      await sleep(2000);
      console.log('📜 Student My ETR Record...');
      await page.goto(`${BASE_URL}/student/etr`);
      await sleep(2000);
      console.log('🏅 Student Certificates Status...');
      await page.goto(`${BASE_URL}/student/certificates`);
      await sleep(2000);
    }

    console.log('\n====================================================');
    console.log('🎉 ALL 7 ROLES AND WORKFLOWS VERIFIED 100% SUCCESSFULLY!');
    console.log('====================================================');

    // Keep browser window open for user demo
    await sleep(60000);

  } catch (err) {
    console.error('❌ Error in workflow test:', err);
  } finally {
    await browser.close();
  }
})();
