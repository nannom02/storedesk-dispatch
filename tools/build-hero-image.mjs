#!/usr/bin/env node

/**
 * 서비스 소개 히어로용 임시 래스터 이미지를 만든다.
 *
 * 이 실행 환경에는 사진 생성 도구가 없다. 그래서 실제로 구현된 화면을 그대로 촬영해
 * 한 장면으로 합성한 래스터(JPEG) 이미지를 만든다. 사진이나 일러스트가 아니라
 * "제품 상태 합성 이미지"이며, 최종 히어로 사진은 사람이 지시하는 Codex 후속 작업에서
 * 교체한다(`wishket-image-prompts.md`의 `Codex 히어로 최종 보정` 참조).
 *
 * 이미지 자체에는 문구용 암막이나 테마색을 굽지 않는다. 대비와 테마 틴트는 CSS 레이어가
 * 담당한다.
 *
 * 사용법: node tools/build-hero-image.mjs [--base-url http://127.0.0.1:4318]
 */

import { spawn } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import process from "node:process";
import { chromium } from "playwright";

const baseUrl = process.argv.includes("--base-url")
  ? process.argv[process.argv.indexOf("--base-url") + 1]
  : "http://127.0.0.1:4318";

const SHOTS = [
  { screen: "deposits", file: "deposits.png", width: 1560, height: 1080 },
  { screen: "unmatched", file: "unmatched.png", width: 1680, height: 1040 },
  { screen: "dashboard", file: "dashboard.png", width: 1360, height: 900 },
];

async function waitForServer(url, seconds) {
  const deadline = Date.now() + seconds * 1000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url, { redirect: "manual" });
      if (response.status < 500) return true;
    } catch {
      /* still starting */
    }
    await new Promise((resolve) => setTimeout(resolve, 400));
  }
  return false;
}

const server = spawn(`npm run preview -- --port ${new URL(baseUrl).port}`, {
  cwd: process.cwd(),
  shell: true,
  detached: true,
  stdio: "ignore",
});
const stop = () => {
  try {
    process.kill(-server.pid, "SIGTERM");
  } catch {
    /* already gone */
  }
};
process.on("exit", stop);

if (!(await waitForServer(baseUrl, 90))) {
  console.error(`히어로 합성 실패: ${baseUrl} 응답 없음`);
  stop();
  process.exit(1);
}

const workDir = await mkdtemp(path.join(tmpdir(), "storedesk-hero-"));
const browser = await chromium.launch({ args: ["--no-sandbox", "--disable-dev-shm-usage"] });

try {
  for (const shot of SHOTS) {
    const context = await browser.newContext({
      viewport: { width: shot.width, height: shot.height },
      deviceScaleFactor: 2,
    });
    const page = await context.newPage();
    // 항상 대조센터에서 업로드를 실행한 뒤 목표 화면으로 이동한다.
    // 업로드 직후 상태가 이 제품의 핵심 장면이기 때문이다.
    await page.goto(`${baseUrl}/?screen=deposits&__wishket_automation=1`, {
      waitUntil: "load",
      timeout: 30_000,
    });
    await page.waitForLoadState("networkidle", { timeout: 5_000 }).catch(() => {});
    const upload = page.getByRole("button", { name: "은행 거래내역 업로드", exact: true }).first();
    await upload.waitFor({ state: "visible", timeout: 10_000 });
    await upload.click();
    await page.waitForTimeout(600);

    if (shot.screen !== "deposits") {
      const navLabel = shot.screen === "unmatched" ? "미매칭 검토" : "운영 대시보드";
      await page.getByRole("button", { name: navLabel, exact: true }).first().click();
      await page.waitForTimeout(500);
    }
    if (shot.screen === "unmatched") {
      await page.getByRole("button", { name: "TX-0904 검토 열기", exact: true }).first().click();
      await page.waitForTimeout(400);
    }
    await page.evaluate(() => {
      document.querySelectorAll(".toast-stack").forEach((node) => node.remove());
      window.scrollTo(0, 0);
    });
    await page.screenshot({ path: path.join(workDir, shot.file), fullPage: false });
    await context.close();
  }

  const composition = `<!doctype html>
<html lang="ko"><head><meta charset="utf-8" />
<style>
  * { box-sizing: border-box; margin: 0; }
  body {
    width: 1920px; height: 1080px; overflow: hidden;
    background: radial-gradient(120% 120% at 68% 18%, #ffffff 0%, #eef2f7 46%, #dbe3ec 100%);
    font-family: system-ui, sans-serif;
  }
  .stage { position: relative; width: 1920px; height: 1080px; }
  .shot { position: absolute; border-radius: 16px; overflow: hidden; background: #fff;
          box-shadow: 0 30px 70px -28px rgba(15,23,42,.42), 0 2px 6px rgba(15,23,42,.10);
          border: 1px solid rgba(148,163,184,.35); }
  .shot img { display: block; width: 100%; height: 100%; object-fit: cover; object-position: top left; }
  /* 핵심 화면(입금 대조센터)을 가장 크게, 오른쪽에 배치해 왼쪽 문구 자리를 비워 둔다. */
  .a { left: 852px; top: 96px; width: 1000px; height: 700px; }
  .b { left: 620px; top: 452px; width: 690px; height: 508px; }
  .c { left: 1206px; top: 620px; width: 646px; height: 400px; }
</style></head>
<body>
  <div class="stage">
    <div class="shot a"><img src="file://${path.join(workDir, "deposits.png")}" alt="" /></div>
    <div class="shot c"><img src="file://${path.join(workDir, "dashboard.png")}" alt="" /></div>
    <div class="shot b"><img src="file://${path.join(workDir, "unmatched.png")}" alt="" /></div>
  </div>
</body></html>`;

  const compositionPath = path.join(workDir, "composition.html");
  await writeFile(compositionPath, composition, "utf8");

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();
  await page.goto(`file://${compositionPath}`, { waitUntil: "load" });
  await page.waitForTimeout(600);
  await page.screenshot({
    path: path.join(process.cwd(), "public", "hero-landing.jpg"),
    type: "jpeg",
    quality: 92,
    fullPage: false,
  });
  await context.close();
  console.log("public/hero-landing.jpg 생성 완료 (1920×1080, 실제 구현 화면 합성)");
} finally {
  await browser.close();
  await rm(workDir, { recursive: true, force: true });
  stop();
}
