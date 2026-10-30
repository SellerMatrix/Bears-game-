const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const d = __dirname;
  let pg = await b.newPage({ viewport: { width: 1024, height: 1024 } });
  await pg.goto('file://' + d + '/icon.svg');
  await pg.screenshot({ path: d + '/AppIcon-1024.png', omitBackground: false });
  pg = await b.newPage({ viewport: { width: 2732, height: 2732 } });
  await pg.goto('file://' + d + '/splash.html'); await pg.waitForTimeout(500);
  await pg.screenshot({ path: d + '/splash-2732.png' });
  await b.close();
})();
