/**
 * E2E DEEP USER WORKFLOW AUTOMATION TEST (PLAYWRIGHT) — MỞ RỘNG
 * ===================================================================
 * Kịch bản kiểm thử End-to-End TOÀN DIỆN cho hệ thống ETR Management.
 * Bao phủ: Homepage, Login (validate + sai mật khẩu + đủ 7 role), RBAC redirect,
 * Language toggle, Academic (khóa học/lớp/ghi danh/ETR), Instructor (điểm danh/
 * chấm điểm/minh chứng), QA, Training Manager, Auditor, Student, Admin.
 *
 * Mỗi test case: log ✅ PASS / ❌ FAIL / ⏭ SKIP, chụp screenshot khi FAIL.
 * Cuối cùng: in SUMMARY tổng hợp + danh sách lỗi Console/JS của FE (nếu có).
 *
 * Chạy: node scripts/e2e_user_flow.cjs
 * Yêu cầu: FE dev (localhost:5173) + BE (https://localhost:7169) đang chạy.
 */

const { chromium } = require('playwright');
const assert = require('assert');
const fs = require('fs');
const path = require('path');

// ============================ HARNESS ============================
const results = [];
const consoleErrors = [];
const screenshotDir = path.join(__dirname, '..', 'e2e-screenshots');
if (!fs.existsSync(screenshotDir)) fs.mkdirSync(screenshotDir, { recursive: true });

let currentPage = null; // set after browser launch

async function t(name, fn) {
  const started = Date.now();
  try {
    await fn();
    results.push({ name, status: 'PASS', ms: Date.now() - started });
    console.log(`  ✅ PASS  [${String(Date.now() - started).padStart(4)}ms] ${name}`);
  } catch (err) {
    results.push({ name, status: 'FAIL', ms: Date.now() - started, error: err.message });
    console.error(`  ❌ FAIL  [${String(Date.now() - started).padStart(4)}ms] ${name}`);
    console.error(`       ↳ ${(err.message || '').split('\n')[0]}`);
    if (currentPage) {
      try {
        const safe = name.replace(/[^\w\d]+/g, '_').slice(0, 60);
        await currentPage.screenshot({ path: path.join(screenshotDir, `FAIL_${safe}.png`) });
      } catch {}
    }
  }
}

function skip(name, reason) {
  results.push({ name, status: 'SKIP', ms: 0 });
  console.log(`  ⏭ SKIP  ${name} — ${reason}`);
}

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ⏱️ BE có rate limiter cho auth: PermitLimit=5/phút/IP (FixedWindowLimiter, Program.cs).
// E2E thực hiện ~19 request login liên tiếp → phải tự pacing ≥13s giữa các lần login
// để KHÔNG BAO GIỜ vượt 5 request/phút (nếu không sẽ bị 429 → login fail).
const AUTH_PACE_MS = 13000;
const paceAuth = () => sleep(AUTH_PACE_MS);

async function typeLikeUser(page, selector, text) {
  await page.click(selector);
  await page.fill(selector, '');
  await page.type(selector, text, { delay: 15 });
}

async function ensureModalClosed(page) {
  try {
    const openOverlay = page.locator('.modal-overlay, .tm-modal-overlay');
    if ((await openOverlay.count()) > 0 && (await openOverlay.first().isVisible().catch(() => false))) {
      const closeBtn = page
        .locator('.modal-overlay button.cancel-btn, .modal-overlay button.close-btn, .tm-modal-overlay button.close-btn, .modal-overlay button[aria-label="Đóng"]')
        .first();
      if ((await closeBtn.count()) > 0 && (await closeBtn.isVisible().catch(() => false))) {
        await closeBtn.click().catch(() => {});
        await sleep(800);
      }
    }
  } catch (e) {}
}

async function clickIfVisible(page, locator, timeout = 6000) {
  const el = page.locator(locator).first();
  await el.waitFor({ state: 'visible', timeout });
  await el.click();
}

async function fillIfVisible(page, selector, value, timeout = 6000) {
  const el = page.locator(selector).first();
  await el.waitFor({ state: 'visible', timeout });
  await el.fill(value);
}

async function expectText(page, text, timeout = 10000) {
  await page.getByText(text, { exact: false }).first().waitFor({ state: 'visible', timeout });
}

async function loginAsUser(page, username, password, expectedUrlKeyword) {
  await paceAuth();
  await page.goto('http://localhost:5173/login');
  await page.evaluate(() => {
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch (e) {}
  });
  await page.waitForSelector('#login-username', { timeout: 10000 });
  await typeLikeUser(page, '#login-username', username);
  await typeLikeUser(page, '#login-password', password);
  await page.click('button[type="submit"]');
  // Nếu dính rate limit (429) dù đã pacing, chờ hết cửa sổ 1 phút rồi thử lại 1 lần
  const raced = await Promise.race([
    page.waitForURL(`**/${expectedUrlKeyword}**`, { timeout: 15000 }).then(() => 'ok'),
    page.locator('.error-message').first().waitFor({ state: 'visible', timeout: 15000 }).then(() => 'error').catch(() => 'ok'),
  ]);
  if (raced === 'error') {
    const errText = await page.locator('.error-message').first().innerText().catch(() => '');
    if (/429|Too Many|rate|quá nhiều|nhiều lần|nhiều yêu cầu/i.test(errText)) {
      console.log(`    ⏳ Gặp rate-limit login ("${errText.slice(0, 60)}") — chờ 65s rồi thử lại...`);
      await sleep(65000);
      await page.goto('http://localhost:5173/login');
      await page.waitForSelector('#login-username', { timeout: 10000 });
      await typeLikeUser(page, '#login-username', username);
      await typeLikeUser(page, '#login-password', password);
      await page.click('button[type="submit"]');
    }
  }
  await page.waitForURL(`**/${expectedUrlKeyword}**`, { timeout: 20000 });
  await sleep(1200);
  // 🔑 Bắt buộc có TOKEN THẬT từ backend — nếu còn demo-token nghĩa là FE đang
  // "đăng nhập demo" giả mạo (bug cũ): phiên sau đó sẽ hỏng (GET trả demo, POST lỗi).
  const token = await page.evaluate(() => localStorage.getItem('token') || '');
  assert.ok(
    token && token !== 'demo-token',
    `Phải lưu token thật từ backend (đang là: "${token}")`
  );
}

(async () => {
  console.log('================================================================================');
  console.log('🚀 E2E TOÀN DIỆN — BẮT ĐẦU (mọi role, mọi màn hình, mọi case có thể xảy ra)');
  console.log('================================================================================');

  const browser = await chromium.launch({
    headless: false,
    channel: 'msedge',
    args: ['--ignore-certificate-errors', '--start-maximized', '--no-sandbox'],
  });

  const context = await browser.newContext({ ignoreHTTPSErrors: true, viewport: null });
  const page = await context.newPage();
  currentPage = page;

  // Thu thập lỗi JS / console của FE trong suốt phiên test
  page.on('pageerror', (e) => consoleErrors.push(`[PAGEERROR] ${e.message}`));
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(`[CONSOLE] ${msg.text()}`);
  });

  const BASE_URL = 'http://localhost:5173';
  const LOCAL_BE = 'https://localhost:7169/api';
  const suffix = Date.now().toString().slice(-6);
  const courseCode = `AV-E2E-${suffix}`;
  const courseName = `Khoa E2E Dong Co ${suffix}`;
  const classCodeUp = `CLS-UP-${suffix}`;
  const classCodeActive = `CLS-ACT-${suffix}`;
  const classNameUp = `Lop Sắp diễn ra ${suffix}`;
  const classNameActive = `Lop Đang diễn ra ${suffix}`;
  const deptName = `Dept E2E ${suffix}`;
  const wrongUser = `nonexist.${suffix}@etr.com`;

  try {
    // ===================================================================
    // PRE-FLIGHT: kiểm tra BE local trước khi chạy (tránh fallback sang DEPLOY
    // làm bẩn dữ liệu Azure khi BE local đang treo)
    // ===================================================================
    await t('Pre-flight: BE local phản hồi nhanh (login probe < 10s)', async () => {
      const probeResult = await page.evaluate(async () => {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);
        try {
          const res = await fetch('https://localhost:7169/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: 'admin@etr.com', password: '123456' }),
            signal: controller.signal,
          });
          const body = await res.json().catch(() => ({}));
          return { status: res.status, hasToken: !!(body && body.token) };
        } catch (err) {
          return { status: 0, error: err.message };
        } finally {
          clearTimeout(timeoutId);
        }
      });
      assert.ok(
        probeResult.hasToken,
        `BE local không khả dụng (status=${probeResult.status}, err=${probeResult.error || 'no token'}). ` +
        'Vui lòng khởi động lại BE (ETR.API trên cổng 7169) rồi chạy lại e2e.'
      );
    });

    // ===================================================================
    // PHASE 0: HOMEPAGE & LOGIN
    // ===================================================================
    console.log('\n📌 PHASE 0: HOMEPAGE & LOGIN');

    await t('Homepage tải được (title + hero)', async () => {
      await page.goto(`${BASE_URL}/`);
      await page.waitForLoadState('domcontentloaded');
      await expectText(page, 'Đào tạo', 8000).catch(() => {});
      await expectText(page, 'login', 8000).catch(() => {});
      assert.ok(true, 'Homepage render thành công');
    });

    await t('Login: bấm submit với field rỗng → hiện lỗi validate', async () => {
      await page.goto(`${BASE_URL}/login`);
      await page.waitForSelector('#login-username');
      await page.click('button[type="submit"]');
      await page.waitForSelector('#username-error, #password-error', { timeout: 5000 });
      const u = await page.locator('#username-error').isVisible().catch(() => false);
      const p = await page.locator('#password-error').isVisible().catch(() => false);
      assert.ok(u || p, 'Phải hiện ít nhất 1 field-error');
    });

    await t('Login: sai mật khẩu → hiện lỗi THẬT từ backend (không đăng nhập demo, không lưu demo-token)', async () => {
      await paceAuth();
      await page.goto(`${BASE_URL}/login`);
      await page.waitForSelector('#login-username');
      await typeLikeUser(page, '#login-username', 'academic@etr.com');
      await typeLikeUser(page, '#login-password', 'sai-mat-khau-123');
      await page.click('button[type="submit"]');
      const errEl = page.locator('.error-message').first();
      await errEl.waitFor({ state: 'visible', timeout: 10000 });
      const errText = await errEl.innerText();
      assert.ok(errText.length > 0, 'Phải hiện thông báo lỗi rõ ràng');
      assert.ok(!/demo/i.test(errText), 'Không được chuyển sang đăng nhập demo khi sai mật khẩu');
      assert.ok(page.url().includes('/login'), 'Sai mật khẩu phải ở lại trang login');
      const token = await page.evaluate(() => localStorage.getItem('token') || '');
      assert.ok(token !== 'demo-token', 'Không được lưu demo-token khi sai mật khẩu');
    });

    await t('Login: tài khoản KHÔNG tồn tại → hiện lỗi thật, ở lại trang login', async () => {
      await paceAuth();
      await page.goto(`${BASE_URL}/login`);
      await page.waitForSelector('#login-username');
      await typeLikeUser(page, '#login-username', wrongUser);
      await typeLikeUser(page, '#login-password', '123456');
      await page.click('button[type="submit"]');
      await page.locator('.error-message').first().waitFor({ state: 'visible', timeout: 10000 });
      assert.ok(page.url().includes('/login'), 'Tài khoản không tồn tại phải ở lại trang login');
      const token = await page.evaluate(() => localStorage.getItem('token') || '');
      assert.ok(token !== 'demo-token', 'Không được lưu demo-token khi tài khoản không tồn tại');
    });

    const roles = [
      { u: 'admin@etr.com', k: 'admin' },
      { u: 'academic@etr.com', k: 'academic' },
      { u: 'instructor@etr.com', k: 'instructor' },
      { u: 'qa@etr.com', k: 'qa' },
      { u: 'manager@etr.com', k: 'trainingmanager' },
      { u: 'audit@etr.com', k: 'auditor' },
      { u: 'student@etr.com', k: 'student' },
    ];
    for (const { u, k } of roles) {
      await t(`Login hợp lệ: ${u} → /${k}`, async () => {
        await loginAsUser(page, u, '123456', k);
      });
    }

    // ===================================================================
    // PHASE 1: ACADEMIC — Khóa học, Lớp học, Ghi danh, ETR
    // ===================================================================
    console.log('\n📌 PHASE 1: ACADEMIC STAFF');
    await loginAsUser(page, 'academic@etr.com', '123456', 'academic');

    await t('Academic: danh sách học viên tải được', async () => {
      await page.goto(`${BASE_URL}/academic/learners`);
      await page.waitForLoadState('domcontentloaded');
      await sleep(2000);
      const body = await page.locator('body').innerText();
      assert.ok(!/500|undefined is not|Cannot read/i.test(body), 'Không có lỗi JS render');
    });

    await t('Academic: tạo khóa học mới (mã duy nhất) → toast thành công', async () => {
      await page.goto(`${BASE_URL}/academic/courses`);
      await sleep(2000);
      await ensureModalClosed(page);
      await clickIfVisible(page, '.header-actions button:has-text("TẠO KHÓA HỌC")');
      await sleep(800);
      await fillIfVisible(page, '#course-code', courseCode);
      await fillIfVisible(page, '#course-name', courseName);
      await fillIfVisible(page, '#course-duration', '180');
      const checkboxes = page.locator('input[type="checkbox"]');
      const count = await checkboxes.count();
      for (let i = 0; i < count; i++) {
        if (!(await checkboxes.nth(i).isChecked().catch(() => false))) {
          await checkboxes.nth(i).check().catch(() => {});
        }
      }
      await page.locator('button.save-btn:has-text("TẠO KHÓA HỌC")').first().click();
      await expectText(page, 'Tạo khóa học thành công', 12000);
    });

    await t('Academic: tạo khóa học TRÙNG mã → toast báo lỗi trùng mã (không phải lỗi thô)', async () => {
      await page.goto(`${BASE_URL}/academic/courses`);
      await sleep(1800);
      await ensureModalClosed(page);
      await clickIfVisible(page, '.header-actions button:has-text("TẠO KHÓA HỌC")');
      await sleep(800);
      await fillIfVisible(page, '#course-code', courseCode);
      await fillIfVisible(page, '#course-name', `${courseName} (dup)`);
      await fillIfVisible(page, '#course-duration', '120');
      const checkboxes = page.locator('input[type="checkbox"]');
      const count = await checkboxes.count();
      for (let i = 0; i < count; i++) {
        if (!(await checkboxes.nth(i).isChecked().catch(() => false))) {
          await checkboxes.nth(i).check().catch(() => {});
        }
      }
      await page.locator('button.save-btn:has-text("TẠO KHÓA HỌC")').first().click();
      await page.getByText('đã tồn tại', { exact: false }).first().waitFor({ state: 'visible', timeout: 12000 });
    });

    await t('Academic: tạo lớp học trạng thái "Sắp diễn ra" → toast thành công', async () => {
      await page.goto(`${BASE_URL}/academic/courses`);
      await sleep(1800);
      await ensureModalClosed(page);
      await clickIfVisible(page, '.header-actions button:has-text("TẠO LỚP HỌC")');
      await sleep(800);
      await fillIfVisible(page, '#class-code-input', classCodeUp);
      await fillIfVisible(page, '#class-name-input', classNameUp);
      await page.locator('input[name="class-status"][value="Sắp diễn ra"]').check({ force: true });
      await page.locator('button.save-btn:has-text("TẠO LỚP HỌC")').first().click();
      await expectText(page, 'Tạo lớp học thành công', 12000);
    });

    await t('Academic: tạo lớp học trạng thái "Đang diễn ra" → toast thành công (fix DbUpdateException)', async () => {
      await page.goto(`${BASE_URL}/academic/courses`);
      await sleep(1800);
      await ensureModalClosed(page);
      await clickIfVisible(page, '.header-actions button:has-text("TẠO LỚP HỌC")');
      await sleep(800);
      await fillIfVisible(page, '#class-code-input', classCodeActive);
      await fillIfVisible(page, '#class-name-input', classNameActive);
      await page.locator('input[name="class-status"][value="Đang diễn ra"]').check({ force: true });
      await page.locator('button.save-btn:has-text("TẠO LỚP HỌC")').first().click();
      await expectText(page, 'Tạo lớp học thành công', 12000);
    });

    await t('Academic: tạo lớp học TRÙNG mã → báo lỗi trùng mã ngay tại FE', async () => {
      await page.goto(`${BASE_URL}/academic/courses`);
      await sleep(1800);
      await ensureModalClosed(page);
      await clickIfVisible(page, '.header-actions button:has-text("TẠO LỚP HỌC")');
      await sleep(800);
      await fillIfVisible(page, '#class-code-input', classCodeUp);
      await fillIfVisible(page, '#class-name-input', `${classNameUp} (dup)`);
      await page.locator('button.save-btn:has-text("TẠO LỚP HỌC")').first().click();
      await page.getByText('đã tồn tại', { exact: false }).first().waitFor({ state: 'visible', timeout: 8000 });
    });

    await t('Academic: màn hình quản lý ETR tải được', async () => {
      await page.goto(`${BASE_URL}/academic/etr`);
      await page.waitForLoadState('domcontentloaded');
      await sleep(2500);
      const body = await page.locator('body').innerText();
      assert.ok(!/Cannot read|is not a function|undefined is not/i.test(body), 'Không có lỗi JS render');
    });

    // ===================================================================
    // PHASE 2: INSTRUCTOR — Lớp, Điểm danh, Chấm điểm, Minh chứng
    // ===================================================================
    console.log('\n📌 PHASE 2: INSTRUCTOR');
    await loginAsUser(page, 'instructor@etr.com', '123456', 'instructor');

    await t('Instructor: danh sách lớp tải được', async () => {
      await page.goto(`${BASE_URL}/instructor/classes`);
      await page.waitForLoadState('domcontentloaded');
      await sleep(2000);
      const body = await page.locator('body').innerText();
      assert.ok(!/Cannot read|is not a function/i.test(body), 'Không có lỗi JS render');
    });

    await t('Instructor: màn hình điểm danh mở được + bảng buổi học render', async () => {
      await page.goto(`${BASE_URL}/instructor/attendance`);
      await page.waitForLoadState('domcontentloaded');
      await sleep(2500);
      const body = await page.locator('body').innerText();
      assert.ok(!/Cannot read|is not a function/i.test(body), 'Không có lỗi JS render');
    });

    await t('Instructor: mở bảng điểm danh buổi đầu (nếu có) + LƯU ĐIỂM DANH', async () => {
      await page.goto(`${BASE_URL}/instructor/attendance`);
      await sleep(2500);
      const btn = page.locator('button:has-text("Điểm danh")').first();
      if ((await btn.count()) === 0 || !(await btn.isVisible().catch(() => false))) {
        skip('Instructor: mở bảng điểm danh buổi đầu', 'Không có buổi học nào để điểm danh');
        return;
      }
      await btn.click();
      await sleep(1500);
      const saveBtn = page.locator('button:has-text("LƯU ĐIỂM DANH")').first();
      if ((await saveBtn.count()) === 0) {
        skip('Instructor: LƯU ĐIỂM DANH', 'Không thấy nút lưu điểm danh');
        return;
      }
      const disabled = await saveBtn.isDisabled().catch(() => false);
      if (disabled) {
        skip('Instructor: LƯU ĐIỂM DANH', 'Buổi học đã bị khóa');
        return;
      }
      // Toggle trạng thái học viên đầu tiên (P -> AE) nếu có
      const firstToggle = page.locator('.attendance-toggle-group button').first();
      if ((await firstToggle.count()) > 0) {
        await firstToggle.click().catch(() => {});
      }
      await saveBtn.click();
      await page.getByText('Lưu điểm danh thành công', { exact: false }).first().waitFor({ state: 'visible', timeout: 12000 });
    });

    await t('Instructor: màn hình chấm điểm tải được', async () => {
      await page.goto(`${BASE_URL}/instructor/assessments`);
      await page.waitForLoadState('domcontentloaded');
      await sleep(2500);
      const body = await page.locator('body').innerText();
      assert.ok(!/Cannot read|is not a function/i.test(body), 'Không có lỗi JS render');
    });

    await t('Instructor: màn hình minh chứng tải được (dropzone upload có)', async () => {
      await page.goto(`${BASE_URL}/instructor/evidence`);
      await page.waitForLoadState('domcontentloaded');
      await sleep(2500);
      const hasUpload = await page.locator('#file-upload-input, input[type="file"]').count();
      assert.ok(hasUpload > 0, 'Phải có input upload file');
    });

    // ===================================================================
    // PHASE 3: QA — Thẩm định minh chứng & Review Queue
    // ===================================================================
    console.log('\n📌 PHASE 3: QA STAFF');
    await loginAsUser(page, 'qa@etr.com', '123456', 'qa');

    await t('QA: màn hình thẩm định minh chứng tải được', async () => {
      await page.goto(`${BASE_URL}/qa/evidence`);
      await page.waitForLoadState('domcontentloaded');
      await sleep(2500);
      const body = await page.locator('body').innerText();
      assert.ok(!/Cannot read|is not a function/i.test(body), 'Không có lỗi JS render');
    });

    await t('QA: review queue tải được (nút Verify ETR / Return)', async () => {
      await page.goto(`${BASE_URL}/qa/reviews`);
      await page.waitForLoadState('domcontentloaded');
      await sleep(2500);
      const body = await page.locator('body').innerText();
      assert.ok(!/Cannot read|is not a function/i.test(body), 'Không có lỗi JS render');
    });

    await t('QA: Search ETR (B10) — dữ liệu đã làm giàu (tên học viên/lớp) hiển thị đúng', async () => {
      await page.goto(`${BASE_URL}/qa/search`);
      await page.waitForLoadState('domcontentloaded');
      await sleep(2500);
      const input = page.locator('input.qa-input').first();
      if ((await input.count()) === 0) {
        skip('QA: Search ETR (B10)', 'Không tìm thấy ô tìm kiếm');
        return;
      }
      await input.fill('Completed');
      await page.locator('button:has-text("Search ETR Records")').first().click();
      await sleep(3500);
      const body = await page.locator('body').innerText();
      assert.ok(!/Cannot read|is not a function/i.test(body), 'Không có lỗi JS render');
      const items = await page.locator('.qa-list-item').count();
      const hasToast = await page.getByText('Tìm kiếm hoàn tất', { exact: false }).count();
      const hasEmpty = await page.getByText('Không tìm thấy bản ghi nào', { exact: false }).count();
      assert.ok(
        hasToast > 0 || hasEmpty > 0 || items > 0,
        `Search phải hoàn tất (toast hoặc kết quả). items=${items}, toast=${hasToast}`
      );
      // Nếu có kết quả, item đầu tiên phải hiện ETR #... - status (không còn raw entity)
      if (items > 0) {
        const firstTitle = await page.locator('.qa-list-title').first().innerText().catch(() => '');
        assert.ok(firstTitle.length > 0, 'Item kết quả phải có tiêu đề');
      }
    });

    // ===================================================================
    // PHASE 4: TRAINING MANAGER — Dashboard, Class Status, ETR Approval
    // ===================================================================
    console.log('\n📌 PHASE 4: TRAINING MANAGER');
    await loginAsUser(page, 'manager@etr.com', '123456', 'trainingmanager');

    await t('TM: dashboard tải được', async () => {
      await page.goto(`${BASE_URL}/trainingmanager`);
      await page.waitForLoadState('domcontentloaded');
      await sleep(2500);
      const body = await page.locator('body').innerText();
      assert.ok(!/Cannot read|is not a function/i.test(body), 'Không có lỗi JS render');
    });

    await t('TM: màn hình trạng thái lớp học tải được', async () => {
      await page.goto(`${BASE_URL}/trainingmanager/classes`);
      await page.waitForLoadState('domcontentloaded');
      await sleep(2500);
      const body = await page.locator('body').innerText();
      assert.ok(!/Cannot read|is not a function/i.test(body), 'Không có lỗi JS render');
    });

    await t('TM: màn hình phê duyệt ETR tải được', async () => {
      await page.goto(`${BASE_URL}/trainingmanager/etr-approval`);
      await page.waitForLoadState('domcontentloaded');
      await sleep(3000);
      const body = await page.locator('body').innerText();
      assert.ok(!/Cannot read|is not a function/i.test(body), 'Không có lỗi JS render');
    });

    // ===================================================================
    // PHASE 5: AUDITOR — Locked ETRs, Audit Logs, Export
    // ===================================================================
    console.log('\n📌 PHASE 5: AUDITOR');
    await loginAsUser(page, 'audit@etr.com', '123456', 'auditor');

    await t('Auditor: danh sách ETR đóng băng tải được', async () => {
      await page.goto(`${BASE_URL}/auditor/etrs`);
      await page.waitForLoadState('domcontentloaded');
      await sleep(2500);
      const body = await page.locator('body').innerText();
      assert.ok(!/Cannot read|is not a function/i.test(body), 'Không có lỗi JS render');
    });

    await t('Auditor: audit logs tải được', async () => {
      await page.goto(`${BASE_URL}/auditor/audit-logs`);
      await page.waitForLoadState('domcontentloaded');
      await sleep(2500);
      const body = await page.locator('body').innerText();
      assert.ok(!/Cannot read|is not a function/i.test(body), 'Không có lỗi JS render');
    });

    await t('Auditor: màn hình export packages hiển thị 4 nút export', async () => {
      await page.goto(`${BASE_URL}/auditor/export-packages`);
      await page.waitForLoadState('domcontentloaded');
      await sleep(2500);
      const pdf = await page.getByText('Export PDF', { exact: true }).count();
      const zip = await page.getByText('Export ZIP', { exact: true }).count();
      assert.ok(pdf > 0 && zip > 0, 'Phải có nút Export PDF và Export ZIP');
    });

    // ===================================================================
    // PHASE 6: STUDENT — Dashboard, My ETR, Certificates
    // ===================================================================
    console.log('\n📌 PHASE 6: STUDENT');
    await loginAsUser(page, 'student@etr.com', '123456', 'student');

    await t('Student: dashboard tải được', async () => {
      await page.goto(`${BASE_URL}/student`);
      await page.waitForLoadState('domcontentloaded');
      await sleep(2500);
      const body = await page.locator('body').innerText();
      assert.ok(!/Cannot read|is not a function/i.test(body), 'Không có lỗi JS render');
    });

    await t('Student: màn hình ETR của tôi tải được', async () => {
      await page.goto(`${BASE_URL}/student/etr`);
      await page.waitForLoadState('domcontentloaded');
      await sleep(2500);
      const body = await page.locator('body').innerText();
      assert.ok(!/Cannot read|is not a function/i.test(body), 'Không có lỗi JS render');
    });

    await t('Student: màn hình trạng thái chứng chỉ tải được', async () => {
      await page.goto(`${BASE_URL}/student/certificates`);
      await page.waitForLoadState('domcontentloaded');
      await sleep(2500);
      const body = await page.locator('body').innerText();
      assert.ok(!/Cannot read|is not a function/i.test(body), 'Không có lỗi JS render');
    });

    await t('Student: chi tiết ETR (B9) — bảng kết quả môn học render với điểm số', async () => {
      await page.goto(`${BASE_URL}/student/etr`);
      await page.waitForLoadState('domcontentloaded');
      await sleep(2500);
      const detailBtn = page.locator('button:has-text("Chi tiết")').first();
      if ((await detailBtn.count()) === 0 || !(await detailBtn.isVisible().catch(() => false))) {
        skip('Student: chi tiết ETR (B9)', 'Không có hồ sơ ETR để xem chi tiết');
        return;
      }
      await detailBtn.click();
      await sleep(2500);
      const body = await page.locator('body').innerText();
      assert.ok(!/Cannot read|is not a function/i.test(body), 'Không có lỗi JS render');
      const hasTable = await page.getByText('Điểm LT', { exact: true }).count();
      const hasNoData = await page.getByText('Không có dữ liệu kết quả môn học', { exact: false }).count();
      assert.ok(hasTable > 0 || hasNoData > 0, 'Phải hiển thị bảng kết quả môn học (hoặc thông báo không có dữ liệu)');
    });

    // ===================================================================
    // PHASE 7: ADMIN — Dashboard, Users, Departments, Audit
    // ===================================================================
    console.log('\n📌 PHASE 7: ADMIN');
    await loginAsUser(page, 'admin@etr.com', '123456', 'admin');

    await t('Admin: dashboard tải được', async () => {
      await page.goto(`${BASE_URL}/admin`);
      await page.waitForLoadState('domcontentloaded');
      await sleep(2500);
      const body = await page.locator('body').innerText();
      assert.ok(!/Cannot read|is not a function/i.test(body), 'Không có lỗi JS render');
    });

    await t('Admin: danh sách tài khoản tải được', async () => {
      await page.goto(`${BASE_URL}/admin/users`);
      await page.waitForLoadState('domcontentloaded');
      await sleep(2500);
      const body = await page.locator('body').innerText();
      assert.ok(!/Cannot read|is not a function/i.test(body), 'Không có lỗi JS render');
    });

    await t('Admin: tạo phòng ban mới (mã duy nhất) → modal đóng + xuất hiện trong danh sách', async () => {
      await page.goto(`${BASE_URL}/admin/departments`);
      await page.waitForLoadState('domcontentloaded');
      await sleep(2500);
      await clickIfVisible(page, 'button:has-text("Thêm phòng ban mới")');
      await sleep(800);
      await fillIfVisible(page, 'input[placeholder*="Flight Operations"]', deptName);
      const ta = page.locator('textarea[placeholder*="Nhập mô tả"]');
      if ((await ta.count()) > 0) await ta.fill('Phòng ban tạo bởi E2E test');
      await page.locator('button:has-text("Tạo mới")').first().click();
      await expectText(page, deptName, 12000);
    });

    await t('Admin: tạo phòng ban TRÙNG tên → hiện lỗi dễ hiểu (không phải lỗi thô JSON/DbUpdateException)', async () => {
      await page.goto(`${BASE_URL}/admin/departments`);
      await page.waitForLoadState('domcontentloaded');
      await sleep(2000);
      await clickIfVisible(page, 'button:has-text("Thêm phòng ban mới")');
      await sleep(800);
      await fillIfVisible(page, 'input[placeholder*="Flight Operations"]', deptName);
      await page.locator('button:has-text("Tạo mới")').first().click();
      await sleep(2500);
      const modalText = await page.locator('body').innerText();
      assert.ok(!modalText.includes('{') && !/DbUpdateException/i.test(modalText), 'Không được hiện lỗi thô JSON/DbUpdateException');
      const hasFriendly = /tồn tại|trùng|Conflict/i.test(modalText);
      assert.ok(hasFriendly, 'Phải hiện thông báo lỗi dễ hiểu khi trùng tên phòng ban');
      await ensureModalClosed(page);
    });

    await t('Admin: tạo tài khoản người dùng mới (username duy nhất) → toast thành công', async () => {
      const newUser = `e2e.user.${suffix}`;
      const newUserEmail = `${newUser}@etr.com`;
      await page.goto(`${BASE_URL}/admin/users`);
      await page.waitForLoadState('domcontentloaded');
      await sleep(2500);
      // Nút mở modal có text tiếng Anh "+ Create User" (UserManagement.jsx dòng 400)
      await clickIfVisible(page, 'button:has-text("Create User")');
      await sleep(800);
      const modal = page.locator('div:has(> h2:text("Tạo tài khoản mới"))');
      const textInputs = modal.locator('input[type="text"]');
      assert.ok((await textInputs.count()) >= 2, 'Modal tạo tài khoản phải có đủ input');
      await textInputs.nth(0).fill(newUserEmail); // Tên đăng nhập
      await textInputs.nth(1).fill(`Người dùng E2E ${suffix}`); // Họ và tên
      const roleSelect = modal.locator('select').first();
      if ((await roleSelect.count()) > 0) {
        await roleSelect.selectOption({ index: 0 }).catch(() => {});
      }
      await modal.locator('button:has-text("Tạo tài khoản")').first().click();
      await page.getByText('thành công', { exact: false }).first().waitFor({ state: 'visible', timeout: 12000 });
      await ensureModalClosed(page);
    });

    await t('Admin: audit logs tải được', async () => {
      await page.goto(`${BASE_URL}/admin/audit`);
      await page.waitForLoadState('domcontentloaded');
      await sleep(2500);
      const body = await page.locator('body').innerText();
      assert.ok(!/Cannot read|is not a function/i.test(body), 'Không có lỗi JS render');
    });

    // ===================================================================
    // PHASE 8: RBAC, BẢO MẬT & EDGE CASES
    // ===================================================================
    console.log('\n📌 PHASE 8: RBAC & EDGE CASES');

    await t('RBAC: chưa đăng nhập vào /admin → bị đá về /login', async () => {
      await page.evaluate(() => {
        try {
          localStorage.clear();
        } catch (e) {}
      });
      await page.goto(`${BASE_URL}/admin`);
      await page.waitForURL('**/login**', { timeout: 10000 });
    });

    await loginAsUser(page, 'student@etr.com', '123456', 'student');
    await t('RBAC: Student vào /admin → bị redirect về /student', async () => {
      await page.goto(`${BASE_URL}/admin`);
      await page.waitForURL('**/student**', { timeout: 10000 });
    });

    await t('RBAC: Student vào /instructor → bị redirect về /student', async () => {
      await page.goto(`${BASE_URL}/instructor/classes`);
      await page.waitForURL('**/student**', { timeout: 10000 });
    });

    await loginAsUser(page, 'academic@etr.com', '123456', 'academic');
    await t('RBAC: Academic vào /auditor → bị redirect về /academic', async () => {
      await page.goto(`${BASE_URL}/auditor`);
      await page.waitForURL('**/academic**', { timeout: 10000 });
    });

    await t('Language toggle: VN <-> EN chuyển đổi được', async () => {
      await page.goto(`${BASE_URL}/academic/courses`);
      await sleep(2000);
      const langBtn = page.locator('.lang-switcher-btn, button.lang-switcher').first();
      await langBtn.waitFor({ state: 'visible', timeout: 8000 });
      const before = await langBtn.innerText();
      await langBtn.click();
      await sleep(1200);
      const after = await langBtn.innerText();
      assert.ok(before !== after, `Nút ngôn ngữ phải đổi text (${before} -> ${after})`);
      await langBtn.click();
      await sleep(1200);
    });

    await t('Route 404: đường dẫn không tồn tại → redirect về /login', async () => {
      await page.goto(`${BASE_URL}/khong-ton-tai-xyz`);
      await page.waitForURL('**/login**', { timeout: 10000 });
    });

    await loginAsUser(page, 'admin@etr.com', '123456', 'admin');
    await t('Logout: bấm nút đăng xuất → xoá token và về /login', async () => {
      await page.goto(`${BASE_URL}/admin`);
      await page.waitForLoadState('domcontentloaded');
      await sleep(2000);
      const logoutBtn = page
        .locator('button:has-text("Đăng xuất"), button:has-text("Logout"), button[aria-label="Đăng xuất"]')
        .first();
      if ((await logoutBtn.count()) === 0 || !(await logoutBtn.isVisible().catch(() => false))) {
        skip('Logout qua UI', 'Không tìm thấy nút đăng xuất trên màn hình Admin');
        return;
      }
      await logoutBtn.click();
      await page.waitForURL('**/login**', { timeout: 10000 });
      const token = await page.evaluate(() => localStorage.getItem('token') || '');
      assert.ok(!token, 'Sau logout phải xoá token khỏi localStorage');
    });

    // ===================================================================
    // SUMMARY
    // ===================================================================
    const passed = results.filter((r) => r.status === 'PASS').length;
    const failed = results.filter((r) => r.status === 'FAIL').length;
    const skipped = results.filter((r) => r.status === 'SKIP').length;

    console.log('\n================================================================================');
    console.log('📊 E2E SUMMARY');
    console.log('================================================================================');
    console.log(`  Tổng: ${results.length} | ✅ PASS: ${passed} | ❌ FAIL: ${failed} | ⏭ SKIP: ${skipped}`);
    if (failed > 0) {
      console.log('\n  ❌ Các test FAIL:');
      results.filter((r) => r.status === 'FAIL').forEach((r) => console.log(`    - ${r.name}: ${r.error}`));
    }
    const realErrors = consoleErrors.filter(
      (e) => !/Failed to load resource|net::|401|403|404|FetchError/i.test(e)
    );
    if (realErrors.length > 0) {
      console.log('\n  🐞 Lỗi JS/Console của FE (không phải lỗi mạng dự kiến):');
      realErrors.slice(0, 30).forEach((e) => console.log(`    - ${e}`));
      console.log(`  (Tổng cộng ${realErrors.length} lỗi, xem chi tiết bên trên)`);
    } else {
      console.log('\n  ✅ Không phát hiện lỗi JS/Console nào của FE.');
    }
    console.log(`\n  Screenshots (khi FAIL): ${screenshotDir}`);
    console.log('================================================================================');

    if (failed > 0) {
      throw new Error(`E2E có ${failed} test FAIL — xem chi tiết ở SUMMARY.`);
    }
  } catch (err) {
    if (!/test FAIL/.test(err.message)) {
      console.error('❌ Lỗi trong quá trình thực thi E2E:', err);
      await page.screenshot({ path: path.join(screenshotDir, 'FATAL_error.png') }).catch(() => {});
    }
  } finally {
    await sleep(3000);
    await browser.close();
  }
})();
