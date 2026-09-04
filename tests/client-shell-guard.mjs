#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const projectRoot = path.resolve(process.argv[2] ?? process.cwd());
const sourceRoots = ["app", "src", "pages", "components"];
const ignoredDirectories = new Set([
  ".git",
  ".next",
  "build",
  "coverage",
  "dist",
  "docs",
  "node_modules",
  "portfolio-assets",
  "tests",
]);
const sourceExtensions = new Set([
  ".css",
  ".html",
  ".js",
  ".jsx",
  ".less",
  ".mdx",
  ".sass",
  ".scss",
  ".ts",
  ".tsx",
  ".vue",
]);
const sharedMasterFiles = new Map([
  ["ServiceIntroductionScreen.tsx", "a430b268273eb324e14c13280513b49640516f890aa5b4f6369249ace9d29cb7"],
  ["service-introduction.css", "e2389057831c1b8e19f12df51e71bda11d51af0187018459850005d7a4116777"],
  ["ProposalExplanationScreens.tsx", "20cd5a33d1101356b12369cf23770bf3f9edfa7463d4467b3cb67393336ca071"],
  ["proposal-explanation.css", "5e9c008fd9e720c0a7a83e5e39366870f8e1f32deed0a0a184adf56233d06592"],
]);

async function collectSourceFiles(directory) {
  let entries;

  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch (error) {
    if (error?.code === "ENOENT") return [];
    throw error;
  }

  const files = [];
  for (const entry of entries) {
    if (ignoredDirectories.has(entry.name)) continue;
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collectSourceFiles(entryPath)));
    } else if (entry.isFile() && sourceExtensions.has(path.extname(entry.name).toLowerCase())) {
      files.push(entryPath);
    }
  }
  return files;
}

async function readProjectNumbers() {
  const metadataPath = path.join(projectRoot, "wishket-project.json");
  try {
    const metadata = await readFile(metadataPath, "utf8");
    return [...new Set([
      ...[...metadata.matchAll(/wishket\.com\/project\/(\d{5,})/gi)].map((match) => match[1]),
      ...[...metadata.matchAll(/"(?:projectNumber|projectId|wishketProjectId)"\s*:\s*"?(\d{5,})"?/gi)].map((match) => match[1]),
    ])];
  } catch (error) {
    if (error?.code === "ENOENT") return [];
    throw error;
  }
}

function lineNumberFor(source, index) {
  return source.slice(0, index).split("\n").length;
}

const sourceFiles = (
  await Promise.all(sourceRoots.map((root) => collectSourceFiles(path.join(projectRoot, root))))
).flat();

try {
  const rootHtml = path.join(projectRoot, "index.html");
  await readFile(rootHtml, "utf8");
  sourceFiles.push(rootHtml);
} catch (error) {
  if (error?.code !== "ENOENT") throw error;
}

if (sourceFiles.length === 0) {
  console.error(`Client shell guard failed: no client source files found under ${projectRoot}.`);
  process.exit(1);
}

const projectNumbers = await readProjectNumbers();
const purposeBriefPath = path.join(projectRoot, "wishket-purpose-brief.md");
const requirementsPath = path.join(projectRoot, "wishket-requirements.md");
const forbiddenPatterns = [
  { label: "comparison-version label", pattern: /비교\s*버전/gi },
  { label: "Sol xhigh variant label", pattern: /sol\s*[-+_/ ]\s*xhigh(?:\s*[-+_/ ]\s*[a-z0-9-]+)*/gi },
  { label: "prototype project-number label", pattern: /PROTOTYPE\s*[·:#|-]\s*#?\d{5,}/gi },
  { label: "RFP project-number label", pattern: /RFP\s*[·:#|-]?\s*#?\d{5,}/gi },
  { label: "model name", pattern: /GPT\s*[- ]?5(?:\.\d+)+(?:\s*[- ]?[A-Za-z]+)?/gi },
  { label: "reasoning effort", pattern: /추론\s*(?:강도|수준)/g },
  { label: "generation mode", pattern: /(?:생성|제작)\s*(?:모드|속도)/g },
];

for (const projectNumber of projectNumbers) {
  forbiddenPatterns.push({
    label: `Wishket project number ${projectNumber}`,
    pattern: new RegExp(`(?<!\\d)${projectNumber}(?!\\d)`, "g"),
  });
}

const failures = [];

for (const [fileName, expectedHash] of sharedMasterFiles) {
  const matches = sourceFiles.filter((filePath) => path.basename(filePath) === fileName);
  if (matches.length !== 1) {
    failures.push(`The copied SafeDesk master must contain exactly one unchanged ${fileName}; found ${matches.length}.`);
    continue;
  }
  const bytes = await readFile(matches[0]);
  const actualHash = createHash("sha256").update(bytes).digest("hex");
  if (actualHash !== expectedHash) {
    failures.push(`${path.relative(projectRoot, matches[0])} changed the locked SafeDesk master ${fileName}. Pass project data through typed props instead of editing the template.`);
  }
}

let kickoffDecisionApplicability = null;
let architecturePolicy = null;
let requirementsText = "";
try {
  const requirements = await readFile(requirementsPath, "utf8");
  requirementsText = requirements;
  if (!requirements.includes("## 필수 제안 설명 화면")) {
    failures.push('wishket-requirements.md is missing the required "## 필수 제안 설명 화면" operating-policy section.');
  }
  for (const label of ["서비스 소개", "전체 화면 구성", "개발·검수 방식", "연동·배포 설계"]) {
    if (!requirements.includes(label)) {
      failures.push(`wishket-requirements.md is missing mandatory proposal screen "${label}".`);
    }
  }
  const interactionSection = requirements.match(
    /##\s+핵심 인터랙션 검증\s*\n([\s\S]*?)(?=\n##\s+|$)/,
  )?.[1] ?? "";
  if (!interactionSection) {
    failures.push('wishket-requirements.md is missing required section "## 핵심 인터랙션 검증".');
  } else if (![...interactionSection.matchAll(/\bINT-[A-Z0-9_-]+\b/g)].length) {
    failures.push('"## 핵심 인터랙션 검증" must contain at least one traceable INT-* row.');
  }
  const continuitySection = requirements.match(
    /##\s+운영 화면·상태 연결 원장\s*\n([\s\S]*?)(?=\n##\s+|$)/,
  )?.[1] ?? "";
  if (!continuitySection) {
    failures.push('wishket-requirements.md is missing required section "## 운영 화면·상태 연결 원장".');
  } else if (!/(?:화면|Screen)/i.test(continuitySection) || !/(?:상태|State)/i.test(continuitySection)) {
    failures.push('"## 운영 화면·상태 연결 원장" must record both screen destinations and state changes.');
  }
  const decisionSection = requirements.match(
    /##\s+조건부 착수 전 결정사항\s*\n([\s\S]*?)(?=\n##\s+|$)/,
  )?.[1] ?? "";
  const decisionStatus = decisionSection.match(/상태\s*[:：]\s*(적용|미적용)/)?.[1] ?? null;
  if (!decisionSection) {
    failures.push('wishket-requirements.md is missing required section "## 조건부 착수 전 결정사항".');
  } else if (!decisionStatus) {
    failures.push('"## 조건부 착수 전 결정사항" must contain exact status "상태: 적용" or "상태: 미적용".');
  } else if (!/(?:근거|RFP|공고)/.test(decisionSection)) {
    failures.push('"## 조건부 착수 전 결정사항" must record the RFP evidence or the reason it is not applicable.');
  } else {
    kickoffDecisionApplicability = decisionStatus;
  }
  const architectureSection = requirements.match(
    /##\s+배포 아키텍처 기준\s*\n([\s\S]*?)(?=\n##\s+|$)/,
  )?.[1] ?? "";
  const architectureStatus = architectureSection.match(/상태\s*[:：]\s*(기본안|예외)/)?.[1] ?? null;
  if (!architectureSection) {
    failures.push('wishket-requirements.md is missing required section "## 배포 아키텍처 기준".');
  } else if (!architectureStatus) {
    failures.push('"## 배포 아키텍처 기준" must contain exact status "상태: 기본안" or "상태: 예외".');
  } else if (architectureStatus === "기본안" && !/Vercel\s*\+\s*Supabase/i.test(architectureSection)) {
    failures.push('The default deployment architecture must name "Vercel + Supabase".');
  } else if (architectureStatus === "예외" && !/(?:근거|RFP|공고)/.test(architectureSection)) {
    failures.push('A deployment architecture exception must quote its RFP or operating evidence.');
  } else {
    architecturePolicy = architectureStatus;
  }
} catch (error) {
  if (error?.code === "ENOENT") {
    failures.push("wishket-requirements.md is missing. Map the RFP and all four mandatory client explanation screens before UI code.");
  } else {
    throw error;
  }
}
try {
  const purposeBrief = await readFile(purposeBriefPath, "utf8");
  for (const heading of [
    "## 구매 목적",
    "## 미사용 위험",
    "## 첫 화면 약속",
    "## 5분 시연 경로",
    "## 필수 상태 변화",
    "## 최종 확인 산출물",
  ]) {
    if (!purposeBrief.includes(heading)) {
      failures.push(`wishket-purpose-brief.md is missing required heading "${heading}".`);
    }
  }
} catch (error) {
  if (error?.code === "ENOENT") {
    failures.push("wishket-purpose-brief.md is missing. Define the current prototype's own persuasion and operational contract before UI code.");
  } else {
    throw error;
  }
}
const sources = [];
const clientSources = [];
const applicationClientSources = [];
for (const filePath of [...new Set(sourceFiles)]) {
  const source = await readFile(filePath, "utf8");
  sources.push(source);
  if (![".css", ".less", ".sass", ".scss"].includes(path.extname(filePath).toLowerCase())) {
    clientSources.push(source);
    if (!sharedMasterFiles.has(path.basename(filePath))) applicationClientSources.push(source);
  }
  for (const { label, pattern } of forbiddenPatterns) {
    pattern.lastIndex = 0;
    for (const match of source.matchAll(pattern)) {
      failures.push(
        `${path.relative(projectRoot, filePath)}:${lineNumberFor(source, match.index)} exposes ${label}: "${match[0]}".`,
      );
    }
  }
}

const combinedSource = sources.join("\n");
const combinedClientSource = clientSources.join("\n");
const combinedApplicationClientSource = applicationClientSources.join("\n");

if (architecturePolicy === "기본안") {
  if (!/Vercel/i.test(combinedClientSource) || !/Supabase/i.test(combinedClientSource)) {
    failures.push("The client-facing deployment design must use the recorded Vercel + Supabase default.");
  }
  if (/Spring\s*Boot/i.test(combinedClientSource)) {
    failures.push("Spring Boot was introduced despite the recorded Vercel + Supabase default.");
  }
}

if (
  /Spring\s*Boot/i.test(combinedClientSource) &&
  !/(?:공고|RFP|확정)[^\n]{0,120}(?:Java|Spring)|(?:Java|Spring)[^\n]{0,120}(?:공고|RFP|확정)/i.test(requirementsText)
) {
  failures.push("Spring Boot needs an explicit Java/Spring or dedicated-backend requirement in wishket-requirements.md.");
}

if (!combinedClientSource.includes("서비스 소개")) {
  failures.push('The main navigation is missing the exact mandatory label "서비스 소개".');
}
if (!/<ServiceIntroductionScreen\b|createElement\s*\(\s*ServiceIntroductionScreen\b/.test(combinedApplicationClientSource)) {
  failures.push("The application must render the locked ServiceIntroductionScreen master instead of leaving it as an unused copied asset.");
}
for (const { pattern, message } of [
  {
    pattern: /data-service-introduction-nav(?:\s|=|>)/,
    message: '서비스 소개 is missing its data-service-introduction-nav="service" navigation control.',
  },
  {
    pattern: /data-service-introduction-screen(?:\s|=|>)/,
    message: "서비스 소개 is missing the mandatory data-service-introduction-screen root.",
  },
  {
    pattern: /data-service-master-template(?:\s|=|>)/,
    message: '서비스 소개 is missing data-service-master-template="safedesk-v2".',
  },
  {
    pattern: /data-service-role-flow(?:\s|=|>)/,
    message: "서비스 소개 is missing its current-project role-to-result flow.",
  },
  {
    pattern: /data-service-flow-tabs(?:\s|=|>)/,
    message: "서비스 소개 is missing its mandatory flow-tab control.",
  },
  {
    pattern: /data-service-flow-tab(?:\s|=|>)/,
    message: "서비스 소개 is missing selectable flow tabs.",
  },
  {
    pattern: /data-service-flow-panel(?:\s|=|>)/,
    message: "서비스 소개 is missing the selected flow panel.",
  },
  {
    pattern: /data-service-flow-svg(?:\s|=|>)/,
    message: "서비스 소개 is missing its current-project SVG flow map.",
  },
  {
    pattern: /data-service-flow-layout(?:\s|=|>)/,
    message: "서비스 소개 SVG is missing its swimlane or sequence layout identity.",
  },
  {
    pattern: /data-service-flow-node(?:\s|=|>)/,
    message: "서비스 소개 SVG is missing navigable current-project nodes.",
  },
  {
    pattern: /data-service-role-screen-rows(?:\s|=|>)/,
    message: "서비스 소개 is missing the role-by-role implemented-screen rows below the role SVG.",
  },
  {
    pattern: /data-service-screen-link(?:\s|=|>)/,
    message: "서비스 소개 is missing links to real implemented screens.",
  },
  {
    pattern: /data-service-highlight(?:\s|=|>)/,
    message: "서비스 소개 is missing its three proposal highlight sections.",
  },
  {
    pattern: /data-service-demo-step(?:\s|=|>)/,
    message: "서비스 소개 is missing its clickable five-minute demonstration route.",
  },
  {
    pattern: /data-service-result(?:\s|=|>)/,
    message: "서비스 소개 is missing the fixed 01 result section.",
  },
  {
    pattern: /data-service-improvement(?:\s|=|>)/,
    message: "서비스 소개 is missing the fixed 03 improvement section.",
  },
  {
    pattern: /data-service-support-banner(?:\s|=|>)/,
    message: "서비스 소개 is missing the fixed execution-support banner.",
  },
  {
    pattern: /data-service-workflow(?:\s|=|>)/,
    message: "서비스 소개 is missing the fixed 04 detailed workflow section.",
  },
  {
    pattern: /data-service-features(?:\s|=|>)/,
    message: "서비스 소개 is missing the fixed 05 feature section.",
  },
  {
    pattern: /data-service-scope(?:\s|=|>)/,
    message: "서비스 소개 is missing the fixed 06 scope section.",
  },
  {
    pattern: /data-service-final-cta(?:\s|=|>)/,
    message: "서비스 소개 is missing the final demonstration CTA.",
  },
]) {
  if (!pattern.test(combinedClientSource)) failures.push(message);
}

if (!/data-service-introduction-style\s*=\s*["']safedesk["']/.test(combinedClientSource)) {
  failures.push('서비스 소개 must retain data-service-introduction-style="safedesk".');
}
if (!/data-service-master-template\s*=\s*["']safedesk-v2["']/.test(combinedClientSource)) {
  failures.push('서비스 소개 must retain data-service-master-template="safedesk-v2".');
}

for (const selector of [
  ".service-introduction-hero",
  ".service-introduction-flow-tabs",
  ".service-introduction-flow-canvas",
  ".service-introduction-flow-lane",
  ".service-introduction-flow-node",
  ".service-introduction-role-flows",
  ".service-introduction-highlight",
  ".service-introduction-demo",
  ".service-introduction-improvement-grid",
  ".service-introduction-support-banner",
  ".service-introduction-workflow-grid",
  ".service-introduction-feature-grid",
  ".service-introduction-scope-grid",
  ".service-introduction-final-cta",
]) {
  if (!combinedSource.includes(selector)) {
    failures.push(`The SafeDesk-derived service introduction style is missing required selector ${selector}.`);
  }
}

for (const { id, label } of [
  { id: "overview", label: "전체 화면 구성" },
  { id: "delivery", label: "개발·검수 방식" },
  { id: "architecture", label: "연동·배포 설계" },
]) {
  if (!combinedClientSource.includes(label)) {
    failures.push(`The main navigation is missing mandatory proposal screen label "${label}".`);
  }
  const rootPattern = new RegExp(`data-proposal-screen\\s*=\\s*["']${id}["']`);
  if (!rootPattern.test(combinedClientSource)) {
    failures.push(`Mandatory proposal screen "${label}" is missing data-proposal-screen="${id}".`);
  }
}

for (const { pattern, message } of [
  {
    pattern: /data-proposal-nav(?:\s|=|>)/,
    message: "The three mandatory proposal screens are missing data-proposal-nav controls in the main navigation.",
  },
  {
    pattern: /data-proposal-screen-link(?:\s|=|>)/,
    message: "전체 화면 구성 is missing working data-proposal-screen-link destinations.",
  },
  {
    pattern: /data-delivery-stage(?:\s|=|>)/,
    message: "개발·검수 방식 is missing interactive data-delivery-stage controls.",
  },
  {
    pattern: /data-delivery-stage-detail(?:\s|=|>)/,
    message: "개발·검수 방식 is missing changing data-delivery-stage-detail evidence.",
  },
  {
    pattern: /data-architecture-option(?:\s|=|>)/,
    message: "연동·배포 설계 is missing interactive data-architecture-option controls.",
  },
  {
    pattern: /data-architecture-option-detail(?:\s|=|>)/,
    message: "연동·배포 설계 is missing changing data-architecture-option-detail evidence.",
  },
  {
    pattern: /data-proposal-overview-section\s*=\s*["']workflow["']/,
    message: "전체 화면 구성 is missing the fixed workflow section from the shared SafeDesk template.",
  },
  {
    pattern: /data-proposal-overview-section\s*=\s*["']roles["']/,
    message: "전체 화면 구성 is missing the fixed role directory from the shared SafeDesk template.",
  },
  {
    pattern: /data-proposal-overview-source(?:\s|=|>)/,
    message: "전체 화면 구성 is missing its connecting source-of-truth statement.",
  },
  {
    pattern: /data-delivery-support-plan(?:\s|=|>)/,
    message: "개발·검수 방식 is missing the fixed communication and support-plan section.",
  },
  {
    pattern: /data-delivery-master-template\s*=\s*["']safedesk-v2["']/,
    message: '개발·검수 방식 must use data-delivery-master-template="safedesk-v2".',
  },
  {
    pattern: /data-delivery-completion-rules(?:\s|=|>)/,
    message: "개발·검수 방식 is missing the fixed completion and change-control section.",
  },
  {
    pattern: /data-architecture-section\s*=\s*["']system-flow["']/,
    message: "연동·배포 설계 is missing the fixed system-flow section.",
  },
  {
    pattern: /data-architecture-master-template\s*=\s*["']safedesk-v2["']/,
    message: '연동·배포 설계 must use data-architecture-master-template="safedesk-v2".',
  },
  {
    pattern: /data-architecture-section\s*=\s*["']deployment-stack["']/,
    message: "연동·배포 설계 is missing the fixed recommended deployment-stack section.",
  },
  {
    pattern: /data-architecture-section\s*=\s*["']kickoff-items["']/,
    message: "연동·배포 설계 is missing the fixed kickoff-confirmation section.",
  },
  {
    pattern: /data-architecture-section\s*=\s*["']server-maintenance["']/,
    message: "연동·배포 설계 is missing the fixed server and maintenance section.",
  },
  {
    pattern: /data-architecture-section\s*=\s*["']runbook["']/,
    message: "연동·배포 설계 is missing the fixed deployment and recovery runbook.",
  },
  ...[
    ["data-architecture-ownership", "소유권"],
    ["data-architecture-scale", "예상 규모"],
    ["data-architecture-hosting", "호스팅·배포"],
    ["data-architecture-data-storage", "인증·DB·파일"],
    ["data-architecture-operations", "운영·복구"],
    ["data-architecture-maintenance", "유지보수"],
  ].map(([hook, label]) => ({
    pattern: new RegExp(`${hook}(?:\\s|=|>)`),
    message: `연동·배포 설계의 서버·유지보수 구성에 ${label} 정보가 없습니다.`,
  })),
]) {
  if (!pattern.test(combinedClientSource)) failures.push(message);
}

const proposalStyleHookCount = [
  ...combinedClientSource.matchAll(/data-proposal-explanation-style\s*=\s*["']safedesk["']/g),
].length;
if (proposalStyleHookCount < 3) {
  failures.push('All three mandatory proposal screens must retain data-proposal-explanation-style="safedesk".');
}

const proposalTemplateHookCount = [
  ...combinedClientSource.matchAll(/data-proposal-template-version\s*=\s*["']safedesk-v1["']/g),
].length;
if (proposalTemplateHookCount < 3) {
  failures.push('All three mandatory proposal screens must use data-proposal-template-version="safedesk-v1".');
}

if (kickoffDecisionApplicability === "적용") {
  for (const [pattern, message] of [
    [/착수 전 결정사항/, 'The applicable conditional screen is missing the exact label "착수 전 결정사항".'],
    [/data-proposal-screen\s*=\s*["']decisions["']/, 'The applicable conditional screen is missing data-proposal-screen="decisions".'],
    [/data-decision-item(?:\s|=|>)/, "착수 전 결정사항 is missing its decision items."],
    [/data-decision-boundary(?:\s|=|>)/, "착수 전 결정사항 is missing included, separate, and later boundaries."],
    [/data-decision-client-check(?:\s|=|>)/, "착수 전 결정사항 is missing its visible client confirmation."],
  ]) {
    if (!pattern.test(combinedClientSource)) failures.push(message);
  }
}

for (const selector of [
  ".proposal-explanation-panel",
  ".proposal-section-marker",
  ".proposal-flow-rail",
  ".proposal-delivery-support-grid",
  ".proposal-delivery-rule-grid",
  ".proposal-architecture-master-grid",
  ".proposal-cloud-stack-grid",
  ".proposal-server-comparison",
  ".proposal-operating-profile",
  ".proposal-decision-summary",
]) {
  if (!combinedSource.includes(selector)) {
    failures.push(`The SafeDesk-derived proposal explanation style is missing required selector ${selector}.`);
  }
}

const canonicalPalettes = [
  ["A", "차콜 + 진청"],
  ["B", "라이트 미네랄"],
  ["C", "모노 블랙"],
  ["D", "스페이스 블랙"],
  ["E", "모스 그린"],
];
const paletteSignalCount = canonicalPalettes
  .map(([, label]) => label)
  .filter((label) => combinedSource.includes(label)).length;

{
  if (!combinedSource.includes("테마")) {
    failures.push('A palette system exists, but the client-facing theme trigger has no visible "테마" label.');
  }
  if (!/data-theme-trigger(?:\s|=|>)/.test(combinedClientSource)) {
    failures.push("The collapsed theme selector is missing data-theme-trigger for rendered verification.");
  }
  if (!/data-theme-option(?:\s|=|>)/.test(combinedClientSource)) {
    failures.push("The five canonical theme choices are missing the data-theme-option hook.");
  }
  for (const [id, label] of canonicalPalettes) {
    if (!combinedSource.includes(label)) {
      failures.push(`The palette system is missing required theme ${id} "${label}".`);
    }
  }
  if (/파스텔\s*민트|Evolution\s*Mint|GPT\s*Evolution/i.test(combinedSource)) {
    failures.push("The palette system contains a retired sixth or seventh theme. Only the canonical five A–E themes are allowed.");
  }

  const paletteOptionMatches = [...combinedSource.matchAll(
    /\{[^{}]{0,240}\bid\s*:\s*["']([A-Z])["'][^{}]{0,240}\blabel\s*:\s*["']([^"']+)["'][^{}]{0,240}\}/g,
  )];
  if (paletteOptionMatches.length >= 2) {
    const actualOptions = [...new Map(
      paletteOptionMatches.map((match) => [match[1], match[2]]),
    ).entries()];
    const exactFive = actualOptions.length === canonicalPalettes.length && canonicalPalettes.every(
      ([id, label], index) => actualOptions[index]?.[0] === id && actualOptions[index]?.[1] === label,
    );
    if (!exactFive) {
      failures.push("The palette option list must contain exactly A–E in the canonical order and labels.");
    }
  }

  const paletteType = combinedSource.match(/type\s+PaletteId\s*=\s*([^;]+);/)?.[1] ?? "";
  if (paletteType) {
    const ids = [...paletteType.matchAll(/["']([A-Z])["']/g)].map((match) => match[1]);
    if (ids.join("") !== "ABCDE") {
      failures.push('PaletteId must be exactly "A" | "B" | "C" | "D" | "E".');
    }
  }
  if (!combinedSource.includes("원하는 분위기로 바꿔보세요")) {
    failures.push("A palette system exists, but the initial theme guidance callout is missing.");
  }
  if (!/data-theme-guidance(?:\s|=|>)/.test(combinedClientSource)) {
    failures.push("The initial theme guidance is missing the required data-theme-guidance audit hook.");
  }
  if (!/data-theme-guidance-icon\s*=\s*["']palette["']/.test(combinedClientSource) || !/<Palette\b/.test(combinedClientSource)) {
    failures.push("The initial theme guidance must use the Lucide Palette icon, not a chevron or generic disclosure icon.");
  }

  const guidanceRule = combinedSource.match(/\[data-theme-guidance\]\s*\{([\s\S]*?)\}/)?.[1] ?? "";
  const guidanceIconRule = combinedSource.match(/\[data-theme-guidance-icon=["']palette["']\]\s*\{([\s\S]*?)\}/)?.[1] ?? "";
  const guidancePointerRule = combinedSource.match(/\[data-theme-guidance\]::after\s*\{([\s\S]*?)\}/)?.[1] ?? "";
  const guidanceCopyRule = combinedSource.match(/\[data-theme-guidance\]\s+strong\s*\{([\s\S]*?)\}/)?.[1] ?? "";

  if (
    !/background\s*:\s*var\(--surface\)/.test(guidanceRule) ||
    !/border\s*:\s*1px\s+solid\s+var\(--border\)/.test(guidanceRule) ||
    !/color\s*:\s*var\(--text-main\)/.test(guidanceRule) ||
    !/box-shadow\s*:/.test(guidanceRule)
  ) {
    failures.push("The initial theme guidance must use the elevated content surface, boundary, ink, and shadow rather than sidebar-row tokens.");
  }
  if (!/gap\s*:\s*8px/.test(guidanceRule) || !/white-space\s*:\s*nowrap/.test(guidanceCopyRule)) {
    failures.push("The initial theme guidance must keep the icon and one-line message together with the fixed 8px gap.");
  }
  if (!/background\s*:\s*var\(--primary-soft\)/.test(guidanceIconRule) || !/color\s*:\s*var\(--primary\)/.test(guidanceIconRule)) {
    failures.push("The Palette icon must sit in the shared theme-soft icon tile.");
  }
  if (!/background\s*:\s*var\(--surface\)/.test(guidancePointerRule) || !/transform\s*:\s*rotate\(45deg\)/.test(guidancePointerRule)) {
    failures.push("The initial theme guidance must keep the surface-coloured pointer tail aimed at the theme selector.");
  }
  if (combinedSource.includes("테마를 선택해 화면을 본인의 취향에 맞춰 확인할 수 있습니다.")) {
    failures.push("The initial theme guidance callout includes deprecated explanatory copy instead of the compact title-only message.");
  }
  if (/(?:어두운|밝은)\s*화면으로\s*보기/g.test(combinedSource)) {
    failures.push("A palette system exposes a separate light/dark-mode control instead of using the palette treatment.");
  }
}

const multiScreenSignal = /<nav\b[\s\S]{0,500}?aria-label\s*=\s*["']프로토타입 화면["']/.test(
  combinedClientSource,
);
if (multiScreenSignal) {
  const historyRequirements = [
    [/(?:window\.)?history\.pushState\s*\(/, "history.pushState for user-initiated screen moves"],
    [/(?:window\.)?history\.replaceState\s*\(/, "history.replaceState for the current screen and scroll position"],
    [/popstate/, "a popstate listener for native Back and Forward"],
    [/scrollRestoration/, "manual browser scroll restoration"],
    [/(?:scrollY|scrollTop)/, "a saved scroll position"],
    [/scrollTo\s*\(/, "scroll restoration after navigation"],
    [/(?:location\.(?:hash|pathname|search)|new\s+URL\s*\()/, "a stable URL identity for each screen"],
  ];
  for (const [pattern, requirement] of historyRequirements) {
    if (!pattern.test(combinedClientSource)) {
      failures.push(`A multi-screen prototype is missing ${requirement}.`);
    }
  }
}

if (!combinedClientSource.includes("data-landing-hero")) {
  failures.push("The mandatory 서비스 소개 screen is missing its data-landing-hero first fold.");
}

if (combinedClientSource.includes("data-landing-hero")) {
  if (
    !/data-landing-proof(?:\s|=|>)/.test(combinedClientSource) ||
    !/["'](?:rfp-image|conceptual-illustration)["']/.test(combinedClientSource)
  ) {
    failures.push("The proposal landing hero must declare an RFP-specific image proof value.");
  }
  if (!/data-landing-hero-image(?:\s|=|>)/.test(combinedClientSource)) {
    failures.push("The proposal landing hero must render a real image marked with data-landing-hero-image.");
  }
  if (!/data-landing-hero-theme\s*=\s*["']reactive["']/.test(combinedClientSource)) {
    failures.push('The proposal landing hero must declare data-landing-hero-theme="reactive".');
  }
  const heroStartDefinitions = [...combinedSource.matchAll(/--hero-start\s*:/g)].length;
  const heroEndDefinitions = [...combinedSource.matchAll(/--hero-end\s*:/g)].length;
  if (heroStartDefinitions < 5 || heroEndDefinitions < 5) {
    failures.push("Palettes A–E must each define --hero-start and --hero-end for the theme-reactive hero tint.");
  }
  if (!/markerUnits\s*=\s*["']userSpaceOnUse["']/.test(combinedClientSource)) {
    failures.push('Service-flow SVG arrow markers must use markerUnits="userSpaceOnUse".');
  }
  if (!/data-landing-primary-action(?:\s|=|>)/.test(combinedClientSource)) {
    failures.push("The proposal landing hero is missing the working data-landing-primary-action that starts the demonstration.");
  }
  const landingHeroRule = combinedSource.match(/\[data-landing-hero\]\s*\{([\s\S]*?)\}/)?.[1] ?? "";
  const heightMatch = landingHeroRule.match(/min-height\s*:\s*(\d+)px/);
  if (!heightMatch || Number(heightMatch[1]) < 600) {
    failures.push("The proposal landing hero must target the shared 640px desktop depth and may not fall below 600px.");
  }
  if (!/@media[\s\S]*?\[data-landing-hero\]\s*\{[\s\S]*?min-height\s*:\s*0/.test(combinedSource)) {
    failures.push("The proposal landing hero must return to content-driven height at the narrow-layout breakpoint.");
  }
}

if (!combinedClientSource.includes("역할별 업무 연결") || !combinedClientSource.includes("전체 업무 흐름")) {
  failures.push('서비스 소개 must include the mandatory "역할별 업무 연결" and "전체 업무 흐름" tabs.');
}

if (!combinedClientSource.includes("swimlane")) {
  failures.push('The "역할별 업무 연결" SVG must declare the role swimlane layout.');
}

if (failures.length > 0) {
  console.error("Client shell guard failed:\n");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`Client shell guard passed: ${sourceFiles.length} client source file(s).`);
