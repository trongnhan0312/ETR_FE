// Probe: login thật + POST /Courses bằng chính fetch của browser (mô phỏng app)
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({
    headless: false,
    channel: 'msedge',
    args: ['--ignore-certificate-errors', '--no-sandbox'],
  });
  const context = await browser.newContext({ ignoreHTTPSErrors: true });
  const page = await context.newPage();

  const result = await page.evaluate(async () => {
    const out = {};
    try {
      const res = await fetch('https://localhost:7169/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'academic@etr.com', password: '123456' }),
      });
      out.loginStatus = res.status;
      const data = await res.json();
      out.loginRole = data.role;
      out.hasToken = !!data.token;

      // POST /Courses với token thật
      const res2 = await fetch('https://localhost:7169/api/Courses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${data.token}`,
        },
        body: JSON.stringify({
          courseCode: 'AV-PROBE-' + Date.now().toString().slice(-5),
          courseName: 'Probe Course',
          description: '',
          durationHours: 120,
          status: 'Active',
        }),
      });
      out.courseStatus = res2.status;
      out.courseBody = (await res2.text()).slice(0, 300);
    } catch (e) {
      out.error = e.message;
    }
    return out;
  });

  console.log('LOGIN PROBE:', JSON.stringify(result, null, 2));
  await browser.close();
})();
