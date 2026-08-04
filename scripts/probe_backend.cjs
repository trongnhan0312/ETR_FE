// Probe: kiểm tra xem browser tự động có kết nối được backend local không
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({
    headless: false,
    channel: 'msedge',
    args: ['--ignore-certificate-errors', '--no-sandbox'],
  });
  const context = await browser.newContext({ ignoreHTTPSErrors: true });
  const page = await context.newPage();

  // 1. Test fetch trực tiếp tới backend local từ page context
  const result = await page.evaluate(async () => {
    const out = {};
    try {
      const res = await fetch('https://localhost:7169/api/Courses', {
        headers: { 'Content-Type': 'application/json' },
      });
      out.localStatus = res.status;
      out.localBody = (await res.text()).slice(0, 200);
    } catch (e) {
      out.localError = e.message;
    }
    try {
      const res = await fetch(
        'https://etrmanagement-be-fwhvagaxf3f3dmf0.southeastasia-01.azurewebsites.net/api/Courses',
        { headers: { 'Content-Type': 'application/json' } },
      );
      out.deployStatus = res.status;
      out.deployBody = (await res.text()).slice(0, 200);
    } catch (e) {
      out.deployError = e.message;
    }
    return out;
  });

  console.log('PROBE RESULT:', JSON.stringify(result, null, 2));
  await browser.close();
})();
