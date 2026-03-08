#!/usr/bin/env node

/**
 * Records a demo video of the Complr web UI using Puppeteer.
 *
 * Usage: ANTHROPIC_API_KEY=sk-ant-... npx tsx scripts/record-demo.ts
 *
 * Outputs: demo-recording.webm in the project root
 */

import puppeteer from "puppeteer";
import { PuppeteerScreenRecorder } from "puppeteer-screen-recorder";
import { spawn } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_PATH = path.join(__dirname, "..", "demo-recording.webm");
const PORT = 3456;

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
  console.log("Starting Complr server...");

  const server = spawn("npx", ["tsx", "src/api/server.ts"], {
    cwd: path.join(__dirname, ".."),
    env: { ...process.env, PORT: String(PORT) },
    stdio: "pipe",
  });

  server.stdout?.on("data", (d) => process.stdout.write(`[server] ${d}`));
  server.stderr?.on("data", (d) => process.stderr.write(`[server] ${d}`));

  await waitForServer(`http://localhost:${PORT}/health`);
  console.log("Server is ready.\n");

  console.log("Launching browser...");
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--window-size=1920,1080"],
    defaultViewport: { width: 1920, height: 1080 },
  });

  const page = await browser.newPage();
  await page.goto(`http://localhost:${PORT}`, { waitUntil: "networkidle0" });

  const recorder = new PuppeteerScreenRecorder(page, {
    fps: 30,
    ffmpeg_Path: undefined,
    videoFrame: { width: 1920, height: 1080 },
    aspectRatio: "16:9",
  });

  console.log("Recording started...\n");
  await recorder.start(OUTPUT_PATH);

  // ──────────────────────────────────────────────
  // Opening: show the landing page
  // ──────────────────────────────────────────────
  await sleep(2000);

  // ──────────────────────────────────────────────
  // DEMO 1: Regulatory Query
  // ──────────────────────────────────────────────
  console.log("DEMO 1: Regulatory Query (MAS)...");

  // The question is pre-filled. Select MAS and click Ask.
  await page.select("#q-jurisdiction", "MAS");
  await sleep(500);
  await page.click("button.btn");

  // Wait for the result to appear (API call ~10-20s)
  await page.waitForSelector("#q-result .result", { timeout: 60000 });
  console.log("  MAS result loaded.");
  await sleep(3000);

  // Scroll through the result
  await autoScroll(page, "#q-result .result");
  await sleep(2000);

  // Now query FSA
  console.log("  Switching to FSA...");
  await page.select("#q-jurisdiction", "FSA");
  await sleep(500);
  await page.click("button.btn");
  await page.waitForSelector("#q-result .result", { timeout: 60000 });
  console.log("  FSA result loaded.");
  await sleep(3000);
  await autoScroll(page, "#q-result .result");
  await sleep(2000);

  // ──────────────────────────────────────────────
  // DEMO 2: Transaction Compliance Check
  // ──────────────────────────────────────────────
  console.log("DEMO 2: Transaction Compliance Check...");

  // Click the Transaction Check tab
  const tabs = await page.$$("nav button");
  await tabs[1].click();
  await sleep(1000);

  // Fields are pre-filled. Click Check Compliance.
  const checkBtn = await page.$("#tab-check button.btn");
  await checkBtn!.click();

  await page.waitForSelector("#c-result .result", { timeout: 120000 });
  console.log("  Compliance results loaded.");
  await sleep(3000);

  // Scroll through results
  await autoScroll(page, "#c-result .result");
  await sleep(2000);

  // ──────────────────────────────────────────────
  // DEMO 3: SAR/STR Report
  // ──────────────────────────────────────────────
  console.log("DEMO 3: SAR/STR Report Generation...");

  await tabs[2].click();
  await sleep(1000);

  const reportBtn = await page.$("#tab-report button.btn");
  await reportBtn!.click();

  await page.waitForSelector("#r-result .result", { timeout: 120000 });
  console.log("  SAR/STR report generated.");
  await sleep(3000);

  await autoScroll(page, "#r-result .result");
  await sleep(2000);

  // ──────────────────────────────────────────────
  // DEMO 4: Obligation Extraction
  // ──────────────────────────────────────────────
  console.log("DEMO 4: Obligation Extraction...");

  await tabs[3].click();
  await sleep(1000);

  const analyzeBtn = await page.$("#tab-analyze button.btn");
  await analyzeBtn!.click();

  await page.waitForSelector("#a-result .result", { timeout: 120000 });
  console.log("  Obligations extracted.");
  await sleep(3000);

  await autoScroll(page, "#a-result .result");
  await sleep(3000);

  // ──────────────────────────────────────────────
  // End
  // ──────────────────────────────────────────────
  console.log("\nStopping recording...");
  await recorder.stop();
  await browser.close();

  server.kill("SIGTERM");

  console.log(`\nDemo video saved to: ${OUTPUT_PATH}`);
}

async function autoScroll(page: puppeteer.Page, selector: string) {
  await page.evaluate(async (sel) => {
    const el = document.querySelector(sel);
    if (!el) return;
    const totalHeight = el.scrollHeight;
    const step = 100;
    const delay = 80;
    for (let pos = 0; pos < totalHeight; pos += step) {
      el.scrollTop = pos;
      await new Promise((r) => setTimeout(r, delay));
    }
  }, selector);
}

main().catch((err) => {
  console.error("Recording failed:", err);
  process.exit(1);
});
