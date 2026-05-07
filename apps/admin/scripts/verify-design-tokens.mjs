#!/usr/bin/env node
/**
 * verify-design-tokens.mjs
 *
 * globals.css :root oklch 토큰과 design.md YAML colors hex 간 ΔE2000 검증.
 * 임계: ΔE ≤ 1.5 (인식 한계 + design.md 정책 정렬).
 *
 * globals.css가 runtime 권위이고 design.md hex가 동기화 대상이므로,
 * 불일치 시 design.md hex를 보정해야 한다.
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { parse as parseColor, formatHex, differenceCiede2000 } from 'culori';
import yaml from 'yaml';

const __dirname = dirname(fileURLToPath(import.meta.url));
const adminRoot = join(__dirname, '..');

const DELTA_THRESHOLD = 1.5;

// ── 1. globals.css :root 토큰 파싱 ──────────────────────────────────────────

const cssContent = readFileSync(join(adminRoot, 'app/globals.css'), 'utf8');

const rootMatch = cssContent.match(/:root\s*\{([\s\S]*?)\}/);
if (!rootMatch) {
  console.error('Error: :root block not found in globals.css');
  process.exit(2);
}

const cssOklchTokens = new Map();
// 값 전체가 oklch(L C H) 형식인 토큰만 추출 (alpha / shadow 복합값 제외)
for (const m of rootMatch[1].matchAll(/--([a-z][\w-]*):\s*(oklch\([^/)]+\))\s*;/g)) {
  cssOklchTokens.set(m[1].trim(), m[2].trim());
}

// ── 2. design.md YAML frontmatter 파싱 ──────────────────────────────────────

const mdContent = readFileSync(join(adminRoot, 'design.md'), 'utf8');

const firstSep = mdContent.indexOf('---');
const secondSep = mdContent.indexOf('\n---', firstSep + 3);
if (firstSep === -1 || secondSep === -1) {
  console.error('Error: YAML frontmatter not found in design.md');
  process.exit(2);
}

const yamlContent = mdContent.slice(firstSep + 3, secondSep).trim();
const frontmatter = yaml.parse(yamlContent);
const yamlColors = frontmatter?.colors ?? {};

if (Object.keys(yamlColors).length === 0) {
  console.error('Error: colors not found in design.md frontmatter');
  process.exit(2);
}

// ── 3. 토큰별 ΔE2000 비교 ────────────────────────────────────────────────────

const delta2000 = differenceCiede2000();

const results = [];
let maxDelta = 0;

for (const [key, designHex] of Object.entries(yamlColors)) {
  const cssOklch = cssOklchTokens.get(key);

  if (!cssOklch) {
    results.push({ key, status: 'MISSING_IN_CSS', designHex, cssOklch: '-', cssHex: '-', delta: null });
    continue;
  }

  const cssColor = parseColor(cssOklch);
  const designColor = parseColor(String(designHex));

  if (!cssColor) {
    results.push({ key, status: 'PARSE_ERR', designHex, cssOklch, cssHex: '-', delta: null });
    continue;
  }

  const cssHex = formatHex(cssColor) ?? '-';

  if (!designColor) {
    results.push({ key, status: 'HEX_PARSE_ERR', designHex, cssOklch, cssHex, delta: null });
    continue;
  }

  const delta = delta2000(cssColor, designColor);
  maxDelta = Math.max(maxDelta, delta);
  results.push({
    key,
    status: delta <= DELTA_THRESHOLD ? 'PASS' : 'FAIL',
    designHex,
    cssOklch,
    cssHex,
    delta,
  });
}

// ── 4. 결과 출력 ─────────────────────────────────────────────────────────────

const failures = results.filter((r) => r.status !== 'PASS');
const passes = results.filter((r) => r.status === 'PASS');
const verbose = process.argv.includes('--verbose') || process.argv.includes('-v');

if (verbose) {
  console.log('\n  token                    design.md hex   css hex    ΔE2000');
  console.log('  ─────────────────────────────────────────────────────────');
  for (const r of results) {
    const mark = r.status === 'PASS' ? '✓' : r.status === 'MISSING_IN_CSS' ? '?' : '✗';
    const delta = r.delta != null ? r.delta.toFixed(2).padStart(6) : '   N/A';
    const col = (s, n) => String(s).padEnd(n);
    console.log(`  ${mark} ${col(r.key, 24)} ${col(r.designHex, 15)} ${col(r.cssHex, 10)} ${delta}`);
  }
  console.log();
}

if (failures.length === 0) {
  console.log(`✓ All ${passes.length} tokens pass (max ΔE: ${maxDelta.toFixed(2)}) — threshold ${DELTA_THRESHOLD}`);
  process.exit(0);
} else {
  console.error(`✗ ${failures.length} token(s) failed (threshold ΔE ≤ ${DELTA_THRESHOLD}):\n`);
  console.error('  token                    design.md hex   css→hex    ΔE2000');
  console.error('  ─────────────────────────────────────────────────────────');
  for (const f of failures) {
    const delta = f.delta != null ? f.delta.toFixed(2) : 'N/A';
    const col = (s, n) => String(s).padEnd(n);
    console.error(`  ✗ ${col(f.key, 24)} ${col(f.designHex, 15)} ${col(f.cssHex, 10)} ${delta}`);
  }
  console.error('\n  → design.md hex를 css→hex 값으로 보정하세요 (globals.css가 runtime 권위).');
  process.exit(1);
}
