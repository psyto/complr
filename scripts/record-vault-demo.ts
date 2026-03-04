#!/usr/bin/env node

/**
 * Records a demo video of the Complr Vault dashboard using Puppeteer.
 *
 * Prerequisites: Server must be running on port 3000 (or set PORT env).
 *   ANTHROPIC_API_KEY=sk-ant-... npm run start:server
 *
 * Usage: npx tsx scripts/record-vault-demo.ts
 *
 * Outputs: vault-demo-recording.webm in the project root
 */

import puppeteer from "puppeteer";
import { PuppeteerScreenRecorder } from "puppeteer-screen-recorder";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_PATH = path.join(__dirname, "..", "vault-demo-recording.webm");
const PORT = Number(process.env.PORT) || 3000;
const BASE_URL = `http://localhost:${PORT}`;

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function waitForServer(url: string, timeoutMs = 30000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.ok) return;
    } catch {}
    await sleep(500);
  }
  throw new Error("Server did not start in time");
}

async function main() {
  console.log(`Checking server at ${BASE_URL}...`);
  await waitForServer(`${BASE_URL}/health`);
  console.log("Server is ready.\n");

  // First, screen an investor so we can demo deposits
  console.log("Pre-screening investors for demo...");
  const investorsRes = await fetch(`${BASE_URL}/vault/investors`);
  const investors = (await investorsRes.json()) as Array<{ id: string; name: string }>;
  const tanaka = investors.find((i) => i.name === "Tanaka Hiroshi");
  const chan = investors.find((i) => i.name === "Chan Ka Ming");

  if (tanaka) {
    await fetch(`${BASE_URL}/vault/investors/${tanaka.id}/screen`, { method: "POST" });
    console.log(`  Screened: ${tanaka.name}`);
    // Make a deposit so portfolio has data
    await fetch(`${BASE_URL}/vault/deposit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ investorId: tanaka.id, vaultId: "conservative", amount: 50000 }),
    });
    await fetch(`${BASE_URL}/vault/deposit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ investorId: tanaka.id, vaultId: "balanced", amount: 25000 }),
    });
    console.log("  Deposited: $50k conservative + $25k balanced");
  }
  if (chan) {
    await fetch(`${BASE_URL}/vault/investors/${chan.id}/screen`, { method: "POST" });
    console.log(`  Screened: ${chan.name}`);
    await fetch(`${BASE_URL}/vault/deposit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ investorId: chan.id, vaultId: "growth", amount: 100000 }),
    });
    console.log("  Deposited: $100k growth");
  }
  console.log();

  console.log("Launching browser...");
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--window-size=1920,1080"],
    defaultViewport: { width: 1920, height: 1080 },
  });

  const page = await browser.newPage();
  await page.goto(`${BASE_URL}/vault-demo`, { waitUntil: "networkidle0" });

  const recorder = new PuppeteerScreenRecorder(page, {
    fps: 30,
    ffmpeg_Path: undefined,
    videoFrame: { width: 1920, height: 1080 },
    aspectRatio: "16:9",
  });

  console.log("Recording started...\n");
  await recorder.start(OUTPUT_PATH);

  // ──────────────────────────────────────────────
  // Opening: Strategies tab (already active)
  // ──────────────────────────────────────────────
  console.log("TAB 1: Strategies...");
  await sleep(3000);

  // Scroll down to see all 3 vault cards
  await autoScroll(page, "body");
  await sleep(2000);

  // Scroll back up
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "smooth" }));
  await sleep(1000);

  // ──────────────────────────────────────────────
  // Tab 2: Portfolio
  // ──────────────────────────────────────────────
  console.log("TAB 2: Portfolio...");
  const tabs = await page.$$("nav button");
  await tabs[1].click();
  await sleep(1500);

  // Select Tanaka (first investor with deposits)
  if (tanaka) {
    await page.select("#portfolio-investor", tanaka.id);
    await sleep(3000);

    // Scroll to see holdings table
    await autoScroll(page, "body");
    await sleep(2000);

    // Click Generate Monthly Report
    const reportBtn = await page.$('#tab-portfolio button.btn');
    if (reportBtn) {
      await reportBtn.click();
      console.log("  Generating monthly report...");
      await sleep(3000);
      await autoScroll(page, "body");
      await sleep(2000);
    }
  }

  // Scroll back up
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "smooth" }));
  await sleep(1000);

  // ──────────────────────────────────────────────
  // Tab 3: Performance
  // ──────────────────────────────────────────────
  console.log("TAB 3: Performance...");
  await tabs[2].click();
  await sleep(3000);

  // Show conservative vault 90-day chart (default)
  await sleep(2000);

  // Switch to balanced
  console.log("  Switching to balanced vault...");
  await page.select("#perf-vault", "balanced");
  await sleep(2500);

  // Switch to 30-day view
  console.log("  Switching to 30-day view...");
  await page.select("#perf-days", "30");
  await sleep(2500);

  // Switch to growth
  console.log("  Switching to growth vault...");
  await page.select("#perf-vault", "growth");
  await sleep(2500);

  // ──────────────────────────────────────────────
  // Tab 4: Deposit / Withdraw
  // ──────────────────────────────────────────────
  console.log("TAB 4: Deposit / Withdraw...");
  await tabs[3].click();
  await sleep(1500);

  // Make a deposit with Tanaka into balanced vault
  if (tanaka) {
    await page.select("#dep-investor", tanaka.id);
    await page.select("#dep-vault", "balanced");
    await clearAndType(page, "#dep-amount", "15000");
    await sleep(500);

    const depBtn = await page.$("#tab-deposit .onboarding-step:first-child button.btn");
    if (depBtn) {
      await depBtn.click();
      console.log("  Depositing $15k into balanced...");
      await sleep(2000);
    }
  }

  // Show the withdraw side
  await autoScroll(page, "body");
  await sleep(2000);

  // Scroll back
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "smooth" }));
  await sleep(1000);

  // ──────────────────────────────────────────────
  // Tab 5: Investor Onboarding
  // ──────────────────────────────────────────────
  console.log("TAB 5: Investor Onboarding...");
  await tabs[4].click();
  await sleep(1500);

  // Register a new investor
  console.log("  Registering new investor...");
  await clearAndType(page, "#reg-name", "Suzuki Aiko");
  await clearAndType(page, "#reg-email", "suzuki@example.jp");
  await page.select("#reg-jurisdiction", "FSA");
  await page.select("#reg-accredited", "true");
  await sleep(500);

  const regBtn = await page.$("#tab-onboarding .onboarding-step:first-child button.btn");
  if (regBtn) {
    await regBtn.click();
    console.log("  Registered.");
    await sleep(2000);
  }

  // Scroll down to see the investors table
  await autoScroll(page, "body");
  await sleep(2000);

  // Screen the new investor
  console.log("  Running compliance screening...");
  // Select the newly registered investor in the screen dropdown (last one)
  const screenOptions = await page.$$eval("#screen-investor option", (opts) =>
    opts.map((o) => (o as HTMLOptionElement).value)
  );
  const newInvestorId = screenOptions[screenOptions.length - 1];
  await page.select("#screen-investor", newInvestorId);
  await sleep(500);

  // Scroll up to the screening section
  await page.evaluate(() => {
    const el = document.querySelector("#tab-onboarding .onboarding-step:nth-child(2)");
    el?.scrollIntoView({ behavior: "smooth" });
  });
  await sleep(500);

  const screenBtn = await page.$("#tab-onboarding .onboarding-step:nth-child(2) button.btn");
  if (screenBtn) {
    await screenBtn.click();
    console.log("  Screening in progress (LLM call)...");
    await page.waitForSelector("#screen-result .result", { timeout: 120000 });
    console.log("  Screening complete.");
    await sleep(3000);
  }

  // Scroll to see updated investors table
  await autoScroll(page, "body");
  await sleep(3000);

  // ──────────────────────────────────────────────
  // End
  // ──────────────────────────────────────────────
  console.log("\nStopping recording...");
  await recorder.stop();
  await browser.close();

  console.log(`\nVault demo video saved to: ${OUTPUT_PATH}`);
}

async function clearAndType(page: puppeteer.Page, selector: string, text: string) {
  await page.click(selector, { clickCount: 3 });
  await page.type(selector, text, { delay: 30 });
}

async function autoScroll(page: puppeteer.Page, selector: string) {
  await page.evaluate(async (sel) => {
    const el = sel === "body" ? document.documentElement : document.querySelector(sel);
    if (!el) return;
    const totalHeight = el.scrollHeight;
    const step = 100;
    const delay = 80;
    for (let pos = 0; pos < totalHeight; pos += step) {
      el.scrollTop = pos;
      if (sel === "body") window.scrollTo({ top: pos });
      await new Promise((r) => setTimeout(r, delay));
    }
  }, selector);
}

main().catch((err) => {
  console.error("Recording failed:", err);
  process.exit(1);
});
