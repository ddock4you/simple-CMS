#!/usr/bin/env node
// FSD(Feature-Sliced Design) 아키텍처 의존성 규칙 정적 분석
// 역방향 레이어 import, 같은 레이어 슬라이스 간 import, barrel export를 검사

import { readdirSync, readFileSync, statSync } from 'fs';
import { join, relative } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const ROOT = join(__dirname, '..');

// 배열 앞 = 더 구체적(상위), 뒤 = 더 기반적(하위). 하위가 상위를 import하면 위반.
const LAYER_CONFIG = {
  admin: ['pages', 'features', 'entities', 'shared'],
  web: ['pages', 'widgets', 'features', 'entities', 'shared'],
};

// 슬라이스 격리를 검사할 레이어 (features, entities, widgets)
const CROSS_SLICE_LAYERS = new Set(['features', 'entities', 'widgets']);

// 배럴 export 검사에서 허용할 파일 패턴 (없음 — src/ 내 index.ts는 모두 위반)
const SKIP_DIRS = new Set(['.next', 'node_modules', '.storybook', 'dist', '.turbo']);

function* walkSrc(dir) {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    if (SKIP_DIRS.has(entry.name)) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      yield* walkSrc(full);
    } else if (/\.(ts|tsx)$/.test(entry.name) && !/\.(test|spec|stories)\.(ts|tsx)$/.test(entry.name)) {
      yield full;
    }
  }
}

// file의 레이어와 슬라이스를 구한다 (src/ 기준 상대 경로에서)
function parseLayer(srcRel, layers) {
  const parts = srcRel.split('/');
  const layer = parts[0];
  if (!layers.includes(layer)) return null;
  const slice = parts.length >= 2 ? `${parts[0]}/${parts[1]}` : parts[0];
  return { layer, slice, layerIdx: layers.indexOf(layer) };
}

// @/ import 경로 추출.
// "// @fsd-allow" 가 있는 줄, 또는 해당 주석 줄 다음 이어지는 import 블록은 allowed=true.
// allowed 블록은 비어 있지 않은 비-import 비-주석 줄(코드 시작)이 나오면 종료된다.
function extractAtImports(content) {
  const seen = new Map(); // imp → allowed
  const lines = content.split('\n');
  const re = /from\s+['"](@\/[^'"]+)['"]/g;

  let allowedBlock = false;
  for (const line of lines) {
    const trimmed = line.trim();
    // 독립 주석 줄에 @fsd-allow → 이후 import 블록 허용 시작
    if (trimmed.startsWith('//') && trimmed.includes('@fsd-allow')) {
      allowedBlock = true;
    } else if (trimmed !== '' && !trimmed.startsWith('import ') && !trimmed.startsWith('//')) {
      // 실제 코드 줄이 나오면 허용 블록 종료
      allowedBlock = false;
    }
    // 같은 줄 inline @fsd-allow 또는 블록 허용 중
    const allowed = allowedBlock || line.includes('// @fsd-allow');
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(line)) !== null) {
      const imp = m[1];
      if (!seen.has(imp) || allowed) seen.set(imp, allowed);
    }
  }

  // dynamic import() 패턴도 처리
  const dynRe = /import\s*\(\s*['"](@\/[^'"]+)['"]/g;
  let dm;
  while ((dm = dynRe.exec(content)) !== null) {
    if (!seen.has(dm[1])) seen.set(dm[1], false);
  }
  return [...seen.entries()].map(([imp, allowed]) => ({ imp, allowed }));
}

function checkApp(appName) {
  const layers = LAYER_CONFIG[appName];
  const srcDir = join(ROOT, 'apps', appName, 'src');
  try { statSync(srcDir); } catch { return []; }

  const violations = [];

  for (const filePath of walkSrc(srcDir)) {
    const rel = relative(srcDir, filePath).replace(/\\/g, '/');
    const fileMeta = parseLayer(rel, layers);
    if (!fileMeta) continue;

    let content;
    try { content = readFileSync(filePath, 'utf-8'); } catch { continue; }

    // 규칙 3: barrel export 금지 (src/ 내 index.ts re-export)
    if (rel.endsWith('/index.ts') || rel === 'index.ts') {
      if (/export\s+[\{*\s]|export\s+default/.test(content)) {
        violations.push({
          file: rel,
          import: '(barrel)',
          rule: 'barrel export 금지',
          detail: 'FSD 슬라이스 내 index.ts re-export 발견',
        });
      }
    }

    for (const { imp, allowed } of extractAtImports(content)) {
      if (allowed) continue; // // @fsd-allow 주석으로 명시적 허용된 import
      const impPath = imp.slice(2); // '@/' 제거
      const impMeta = parseLayer(impPath, layers);
      if (!impMeta) continue;

      // 규칙 1: 역방향 레이어 import (하위 레이어가 상위 레이어를 import)
      // impLayerIdx < fileMeta.layerIdx → import 대상이 더 상위 레이어
      if (impMeta.layerIdx < fileMeta.layerIdx) {
        violations.push({
          file: rel,
          import: imp,
          rule: '역방향 레이어 import',
          detail: `${fileMeta.layer} → ${impMeta.layer} 금지 (허용 방향: ${layers.join(' → ')})`,
        });
      }

      // 규칙 2: 같은 레이어 슬라이스 간 직접 import
      if (
        impMeta.layerIdx === fileMeta.layerIdx &&
        impMeta.slice !== fileMeta.slice &&
        CROSS_SLICE_LAYERS.has(fileMeta.layer)
      ) {
        violations.push({
          file: rel,
          import: imp,
          rule: '슬라이스 간 직접 import',
          detail: `${fileMeta.slice} → ${impMeta.slice}`,
        });
      }
    }
  }

  return violations;
}

let total = 0;
let hasViolation = false;

console.log('# FSD 아키텍처 검사\n');

for (const appName of Object.keys(LAYER_CONFIG)) {
  const violations = checkApp(appName);
  total += violations.length;

  console.log(`## ${appName} (src/)\n`);
  if (violations.length === 0) {
    console.log('✅ FSD 아키텍처 규칙 모두 통과\n');
  } else {
    hasViolation = true;
    for (const v of violations) {
      console.log(`⛔ [${v.rule}]`);
      console.log(`   파일:   ${v.file}`);
      if (v.import !== '(barrel)') console.log(`   import: ${v.import}`);
      console.log(`   상세:   ${v.detail}\n`);
    }
  }
}

const exitCode = hasViolation ? 1 : 0;
if (hasViolation) {
  console.error(`총 위반: ${total}건 — CI 차단`);
} else {
  console.log(`총 위반: 0건 — 모든 FSD 규칙 통과 ✅`);
}
process.exit(exitCode);
