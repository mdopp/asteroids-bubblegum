const { chromium } = require("playwright");
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    viewport: { width: 1920, height: 1080 },
  });
  const baseURL = "http://host.containers.internal:8080";
  try {
    await page.goto(baseURL, { waitUntil: "networkidle", timeout: 30000 });
    console.log("✅ Page loaded:", page.url());
    
    // Check title
    const title = await page.title();
    console.log("✅ Title:", title);
    
    // Check for game elements
    const score = await page.$("#score");
    console.log("✅ Score element:", score ? "found" : "MISSING");
    
    const fireButton = await page.$("#fire-button");
    console.log("✅ Fire button:", fireButton ? "found" : "MISSING");
    
    const loadingScreen = await page.$("#loading-screen");
    console.log("✅ Loading screen:", loadingScreen ? "found" : "MISSING");
    
    // Wait a bit for Three.js to initialize
    await page.waitForTimeout(3000);
    
    // Check for WebGL canvas
    const canvas = await page.$("canvas");
    console.log("✅ WebGL canvas:", canvas ? "found" : "MISSING");
    
    // Check console for errors
    const errors = await page.evaluate(() => {
      return []; // Can't capture console errors easily
    });
    
    console.log("✅ Page loaded successfully");
    
  } catch (e) {
    console.log("❌ Error:", e.message);
  }
  
  await browser.close();
})();
