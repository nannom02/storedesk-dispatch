#!/usr/bin/env node

/**
 * Typography guard (static tier)
 *
 * Enforces the documented type hierarchy before a prototype can be built or deployed.
 *
 * Design decisions:
 *
 * 1. Compact typography is opt-in, not opt-out.
 *    The previous implementation tried to infer intent from the selector's terminal
 *    HTML tag. Class selectors ("...card-title") produced no terminal tag, so the
 *    check silently skipped every rule in a React codebase. It also carried a
 *    hard-coded whitelist of RehabLink-specific class names, which doubled as a
 *    bypass: naming any element ".status-pill" removed the restriction.
 *
 *    Compact tokens are now allowed only where the author declared intent with a
 *    "data-density" opt-in. There is nothing to guess and nothing to bypass.
 *
 * 2. Every place a font size can be set is scanned.
 *    Stylesheets, Tailwind utilities, JSX inline styles, and CSS-in-JS template
 *    literals all reach the browser, so all of them are audited.
 *
 * Opt-in syntax:
 *
 *    CSS   .timestamp[data-density="meta"] { font-size: var(--type-meta); }
 *    JSX   <span className="timestamp" data-density="meta">2026-07-25</span>
 *    TS    const metaSize = 12; // density: meta
 *
 * This guard reads source. It cannot know what the browser finally rendered.
 * Pair it with scripts/audit_rendered_typography.mjs, which measures computed
 * styles on the running application.
 *
 * Usage: node audit_typography.mjs [projectRoot]
 */

import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const projectRoot = path.resolve(process.argv[2] ?? process.cwd());

const SOURCE_ROOTS = ["app", "src", "components", "features", "lib", "pages", "styles"];
const IGNORED_DIRECTORIES = new Set([
  ".git",
  ".next",
  ".turbo",
  ".vercel",
  "build",
  "coverage",
  "dist",
  "node_modules",
  "portfolio-assets",
  "storybook-static",
  "tests",
]);

const STYLE_EXTENSIONS = new Set([".css", ".scss", ".sass", ".less"]);
const MARKUP_EXTENSIONS = new Set([".tsx", ".jsx", ".ts", ".js", ".mjs", ".html", ".vue", ".svelte", ".mdx"]);

/** Minimum size for business-critical and interactive text. */
const MIN_BUSINESS_PX = 14;

/** Token contract. Values are fixed by references/design-system.md. */
const REQUIRED_TOKENS = new Map([
  ["--type-body", "16px"],
  ["--type-emphasis", "15px"],
  ["--type-ui", "14px"],
  ["--type-support", "13px"],
  ["--type-meta", "12px"],
  ["--type-phone-title", "18px"],
  ["--type-phone-body", "15px"],
  ["--type-phone-ui", "14px"],
  ["--type-phone-support", "13px"],
  ["--type-phone-meta", "12px"],
  // Above body. The specification used to describe titles as size ranges with no
  // tokens, so every screen invented its own scale and headings drifted below the
  // body text they headed. --type-hero stays out of this list: it is genuinely
  // optional, and only a screen with a hero band should declare it.
  ["--type-card-title", "18px"],
  ["--type-panel", "20px"],
  ["--type-section", "25px"],
  ["--type-page", "32px"],
  // Weight is the second hierarchy axis. Size alone cannot separate adjacent steps.
  ["--weight-regular", "400"],
  ["--weight-medium", "500"],
  ["--weight-semibold", "600"],
  ["--weight-bold", "700"],
]);

/** Tokens that resolve below MIN_BUSINESS_PX and therefore require an opt-in. */
const COMPACT_TOKENS = ["--type-support", "--type-meta", "--type-phone-support", "--type-phone-meta"];

/**
 * Tokens a real implementation must actually reference, not merely declare.
 *
 * Body and UI are universal. Card-title becomes required only when the current
 * project actually contains a card, panel, tile, item, entry, row, or KPI title.
 * A focused form must not invent a card just to satisfy the typography guard.
 */
const TOKENS_REQUIRING_USE = ["--type-body", "--type-ui"];

/**
 * Weights that smear Korean glyphs. Prominence comes from a size step, not from
 * pushing the stroke weight past semibold.
 */
const FORBIDDEN_WEIGHTS = ["800", "900"];

/**
 * Selectors that name a card or item heading.
 *
 * Card titles were specified as --type-emphasis, which is 15px, while body text
 * is 16px. Every card had a heading smaller than its own paragraph, and the
 * specification was the cause. This list lets the guard catch the inversion by
 * name instead of trusting that the specification was read.
 */
const CARD_TITLE_PATTERN = /(?:card|item|panel|kpi|tile|entry|row)[-_]?title|title[-_]?(?:card|item)/i;

const DENSITY_OPT_IN = /data-density|density\s*:\s*(?:meta|support)/;

async function collectFiles(directory) {
  let entries;

  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch (error) {
    if (error?.code === "ENOENT") {
      return [];
    }
    throw error;
  }

  const files = [];

  for (const entry of entries) {
    if (IGNORED_DIRECTORIES.has(entry.name)) {
      continue;
    }

    const entryPath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      files.push(...(await collectFiles(entryPath)));
      continue;
    }

    if (!entry.isFile()) {
      continue;
    }

    const extension = path.extname(entry.name).toLowerCase();

    if (STYLE_EXTENSIONS.has(extension) || MARKUP_EXTENSIONS.has(extension)) {
      files.push(entryPath);
    }
  }

  return files;
}

function lineNumberFor(source, index) {
  return source.slice(0, index).split("\n").length;
}

function lineAt(source, index) {
  const start = source.lastIndexOf("\n", index) + 1;
  const end = source.indexOf("\n", index);
  return source.slice(start, end === -1 ? source.length : end);
}

/**
 * Returns the JSX/HTML element that encloses `index`, when there is one.
 * Attributes frequently sit several lines away from the value they qualify,
 * so a line-only lookup would miss legitimate opt-ins.
 */
function enclosingElement(source, index) {
  const start = source.lastIndexOf("<", index);

  if (start === -1) {
    return "";
  }

  const end = source.indexOf(">", index);

  if (end === -1 || end < start) {
    return "";
  }

  return source.slice(start, end + 1);
}

function hasDensityOptIn(source, index) {
  return DENSITY_OPT_IN.test(lineAt(source, index)) || DENSITY_OPT_IN.test(enclosingElement(source, index));
}

function toPixels(value, unit) {
  const numeric = Number.parseFloat(value);

  if (Number.isNaN(numeric)) {
    return null;
  }

  if (unit === "rem" || unit === "em") {
    return numeric * 16;
  }

  return numeric;
}

const failures = [];

function report(filePath, source, index, message) {
  failures.push({
    location: `${path.relative(projectRoot, filePath)}:${lineNumberFor(source, index)}`,
    message,
  });
}

// ── Rule 1 ────────────────────────────────────────────────────────────────────
// Direct font-size declarations below the business minimum, in any file type.
// Covers stylesheets and CSS-in-JS template literals alike.
function auditDirectDeclarations(filePath, source) {
  for (const match of source.matchAll(/font-size\s*:\s*(\d+(?:\.\d+)?)(px|rem|em)/gi)) {
    const pixels = toPixels(match[1], match[2].toLowerCase());

    if (pixels === null || pixels >= MIN_BUSINESS_PX) {
      continue;
    }

    if (hasDensityOptIn(source, match.index)) {
      continue;
    }

    report(
      filePath,
      source,
      match.index,
      `declares "${match[0]}" (${pixels}px) directly. Use a semantic token, or mark the element with data-density.`,
    );
  }
}

// ── Rule 2 ────────────────────────────────────────────────────────────────────
// Compact semantic tokens used without an explicit density opt-in.
// This replaces the terminal-tag heuristic and the RehabLink class whitelist.
function auditCompactTokenUse(filePath, source) {
  const withoutComments = source.replace(/\/\*[\s\S]*?\*\//g, (comment) => " ".repeat(comment.length));
  const compactPattern = new RegExp(
    `font-size\\s*:\\s*var\\(\\s*(${COMPACT_TOKENS.join("|")})\\s*[),]`,
    "i",
  );

  for (const rule of withoutComments.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const declaration = rule[2];
    const compactToken = declaration.match(compactPattern)?.[1];

    if (!compactToken) {
      continue;
    }

    const selectors = rule[1]
      .split(",")
      .map((selector) => selector.trim())
      .filter(Boolean);

    for (const selector of selectors) {
      if (selector.startsWith("@") || selector.includes("[data-density=")) {
        continue;
      }

      report(
        filePath,
        source,
        rule.index,
        `"${selector}" applies ${compactToken} without a density opt-in. ` +
          `Write "${selector}[data-density=\"${compactToken.includes("meta") ? "meta" : "support"}\"]" ` +
          "and set the attribute in markup, or switch to --type-ui / --type-body.",
      );
    }
  }
}

// ── Rule 3 ────────────────────────────────────────────────────────────────────
// Tailwind compact utilities, including arbitrary values and variant prefixes.
function auditTailwindUtilities(filePath, source) {
  const pattern = /(?:^|[\s"'`{])((?:[a-z0-9.:-]+:)*text-(?:xs|\[(\d+(?:\.\d+)?)(px|rem|em)\]))/g;

  for (const match of source.matchAll(pattern)) {
    const utility = match[1];
    const pixels = match[2] ? toPixels(match[2], match[3].toLowerCase()) : 12;

    if (pixels === null || pixels >= MIN_BUSINESS_PX) {
      continue;
    }

    if (hasDensityOptIn(source, match.index)) {
      continue;
    }

    report(
      filePath,
      source,
      match.index,
      `uses Tailwind "${utility}" (${pixels}px) on unmarked text. ` +
        "Use text-sm or larger, or add data-density to the element.",
    );
  }
}

// ── Rule 4 ────────────────────────────────────────────────────────────────────
// JSX and JS inline style objects.
function auditInlineStyles(filePath, source) {
  const pattern = /fontSize\s*:\s*["'`]?\s*(\d+(?:\.\d+)?)\s*(px|rem|em)?\s*["'`]?/g;

  for (const match of source.matchAll(pattern)) {
    const pixels = toPixels(match[1], (match[2] ?? "px").toLowerCase());

    if (pixels === null || pixels >= MIN_BUSINESS_PX) {
      continue;
    }

    if (hasDensityOptIn(source, match.index)) {
      continue;
    }

    report(
      filePath,
      source,
      match.index,
      `sets inline fontSize ${pixels}px on unmarked text. ` +
        "Move the value into a semantic token, or add data-density to the element.",
    );
  }
}

// ── Rule 4b ───────────────────────────────────────────────────────────────────
// A card heading styled with the emphasis token, which is smaller than body text.
//
// This is the inversion the specification itself used to prescribe, so it is
// checked by name rather than left to whether the specification was read.
function auditCardTitleInversion(filePath, source) {
  const withoutComments = source.replace(/\/\*[\s\S]*?\*\//g, (comment) => " ".repeat(comment.length));

  for (const rule of withoutComments.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    if (!/font-size\s*:\s*var\(\s*--type-emphasis\s*[),]/i.test(rule[2])) {
      continue;
    }

    const selectors = rule[1]
      .split(",")
      .map((selector) => selector.trim())
      .filter((selector) => Boolean(selector) && !selector.startsWith("@"));

    for (const selector of selectors) {
      if (!CARD_TITLE_PATTERN.test(selector)) {
        continue;
      }

      report(
        filePath,
        source,
        rule.index,
        `"${selector}" is a heading but applies --type-emphasis (15px), which is smaller than ` +
          "--type-body (16px). A title must not be smaller than the text it heads. Use --type-card-title.",
      );
    }
  }
}

// ── Rule 4c ───────────────────────────────────────────────────────────────────
// Font weights that smear Korean glyphs.
function auditForbiddenWeights(filePath, source) {
  const cssPattern = new RegExp(`font-weight\\s*:\\s*(${FORBIDDEN_WEIGHTS.join("|")})\\b`, "gi");
  const jsxPattern = new RegExp(`fontWeight\\s*:\\s*["'\`]?(${FORBIDDEN_WEIGHTS.join("|")})["'\`]?`, "g");
  const tailwindPattern = /(?:^|[\s"'`{])((?:[a-z0-9.:-]+:)*font-(?:extrabold|black))/g;

  for (const pattern of [cssPattern, jsxPattern, tailwindPattern]) {
    for (const match of source.matchAll(pattern)) {
      report(
        filePath,
        source,
        match.index,
        `uses "${match[1] ?? match[0].trim()}". Korean glyphs merge at weight 800 and 900. ` +
          "Raise a size step instead, and keep weight at --weight-bold (700) or below.",
      );
    }
  }
}

const files = (await Promise.all(SOURCE_ROOTS.map((root) => collectFiles(path.join(projectRoot, root))))).flat();
const uniqueFiles = [...new Set(files)];
const styleFiles = uniqueFiles.filter((filePath) => STYLE_EXTENSIONS.has(path.extname(filePath).toLowerCase()));

if (styleFiles.length === 0) {
  console.error(
    `Typography guard failed: no stylesheet found under ${projectRoot}/{${SOURCE_ROOTS.join(",")}}. ` +
      "The typography tokens must be declared in a stylesheet.",
  );
  process.exit(1);
}

const styleSources = [];
const allSources = [];

for (const filePath of uniqueFiles) {
  const source = await readFile(filePath, "utf8");
  allSources.push(source);
  const isStyleFile = STYLE_EXTENSIONS.has(path.extname(filePath).toLowerCase());

  if (isStyleFile) {
    styleSources.push(source);
  }

  auditDirectDeclarations(filePath, source);
  auditCompactTokenUse(filePath, source);
  auditCardTitleInversion(filePath, source);
  auditForbiddenWeights(filePath, source);

  if (!isStyleFile) {
    auditTailwindUtilities(filePath, source);
    auditInlineStyles(filePath, source);
  }
}

// ── Rule 5 ────────────────────────────────────────────────────────────────────
// The token contract must be present with the documented values.
const combinedStyles = styleSources.join("\n");

for (const [token, value] of REQUIRED_TOKENS) {
  const escapedToken = token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const escapedValue = value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  if (!new RegExp(`${escapedToken}\\s*:\\s*${escapedValue}\\b`).test(combinedStyles)) {
    failures.push({ location: "tokens", message: `missing required typography token ${token}: ${value}.` });
  }
}

// ── Rule 6 ────────────────────────────────────────────────────────────────────
// Declaring the contract is not the same as honouring it.
const combinedSource = styleSources.join("\n");
const requiredUse = [
  ...TOKENS_REQUIRING_USE,
  ...(CARD_TITLE_PATTERN.test(allSources.join("\n")) ? ["--type-card-title"] : []),
];

for (const token of requiredUse) {
  const escapedToken = token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  if (!new RegExp(`var\\(\\s*${escapedToken}\\s*[),]`).test(combinedSource)) {
    failures.push({
      location: "tokens",
      message: `${token} is declared but never referenced with var(). The hierarchy is not actually applied.`,
    });
  }
}

if (failures.length > 0) {
  console.error(`Typography guard failed: ${failures.length} issue(s) across ${uniqueFiles.length} file(s).\n`);

  for (const failure of failures) {
    console.error(`- ${failure.location} ${failure.message}`);
  }

  console.error(
    "\nBusiness and interactive text must resolve to at least " +
      `${MIN_BUSINESS_PX}px. Sizes below that are reserved for dates, IDs, ` +
      "kickers, indexes, axis labels, and terse technical metadata, and must " +
      'carry data-density="meta" or data-density="support".',
  );

  process.exit(1);
}

console.log(
  `Typography guard passed: ${uniqueFiles.length} file(s), ${styleFiles.length} stylesheet(s), ` +
    `${REQUIRED_TOKENS.size} required tokens.`,
);
