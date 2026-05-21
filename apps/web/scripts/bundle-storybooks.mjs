/**
 * 시연 모드 빌드 전용 헬퍼.
 *
 * admin/web Storybook을 각각 `apps/web/public/_cms/storybook/{admin,web}/`로
 * 출력해서 Vercel web 프로젝트 하나로 다음 4개를 단일 origin에서 제공한다.
 *
 *   demo.example.com/                        → web 메인 (Next.js)
 *   demo.example.com/_cms/admin/*            → admin (rewrites)
 *   demo.example.com/_cms/storybook/admin/*  → admin Storybook (정적)
 *   demo.example.com/_cms/storybook/web/*    → web Storybook (정적)
 *
 * 호출 위치: `pnpm --filter @simple-cms/web build:demo`의 사전 단계.
 * 로컬 `pnpm --filter @simple-cms/web build`는 본 스크립트를 거치지 않는다.
 *
 * **Self-nesting 회피 설계**:
 *   @storybook/nextjs-vite는 Next.js의 `apps/web/public/` 디렉토리를 자동으로
 *   staticDirs로 흡수한다. 만약 두 Storybook을 `apps/web/public/_cms/storybook/`
 *   바로 아래로 직접 빌드하면, 첫 빌드가 끝난 시점에 이미 산출물이 public 안에
 *   존재하기 때문에 두 번째 Storybook 빌드가 그 디렉토리를 자기 산출물에
 *   재귀적으로 복사해 무한 중첩(`/web/_cms/storybook/web/_cms/storybook/...`)이
 *   발생한다. Windows long-path 한도(260자)를 즉시 초과해 cleanup조차 어렵다.
 *
 *   해결: 두 Storybook을 **`apps/web/.tmp-storybook/{admin,web}/`** (public 바깥)에
 *   빌드한 뒤 한 번에 `apps/web/public/_cms/storybook/{admin,web}/`로 rename 이동.
 *   public 안에는 빌드 도중 어떤 산출물도 들어가지 않아 self-nesting이 원천 차단된다.
 */
import { spawn } from 'node:child_process';
import { rename, rm, mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.resolve(__dirname, '..');
const monorepoRoot = path.resolve(webRoot, '../..');

const tmpBase = path.join(webRoot, '.tmp-storybook');
const finalBase = path.join(webRoot, 'public', '_cms', 'storybook');
// web Storybook 빌드 cwd가 apps/web이라 staticDirs로 `apps/web/public/`을 자동
// 흡수한다. 빌드 직전 `public/_cms/` 디렉토리가 빈 채로 남아 있으면 web 산출물
// 안에 `_cms` 빈 디렉토리가 또 복사되는 self-nesting이 발생하므로 부모까지 비운다.
const finalParent = path.join(webRoot, 'public', '_cms');

const STORYBOOKS = [
  { filter: '@simple-cms/admin', name: 'admin' },
  { filter: '@simple-cms/web', name: 'web' },
];

function run(cmd, args, cwd, extraEnv = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, {
      cwd,
      stdio: 'inherit',
      shell: true,
      env: { ...process.env, ...extraEnv },
    });
    child.on('exit', (code) =>
      code === 0 ? resolve() : reject(new Error(`${cmd} ${args.join(' ')} exited ${code}`)),
    );
    child.on('error', reject);
  });
}

/**
 * Windows에서 storybook 빌드 직후 rename은 Windows Defender 스캔이나 빌드 프로세스의
 * 잔여 핸들 때문에 EPERM/EBUSY가 일시적으로 발생할 수 있다. 짧은 backoff + retry로 해소.
 * 또한 target이 이미 존재하면 Node fs.rename은 Windows에서 overwrite 불가하므로
 * 명시적으로 제거한다.
 */
async function moveWithRetry(from, to, retries = 5) {
  await rm(to, { recursive: true, force: true });
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      await rename(from, to);
      return;
    } catch (err) {
      const transient =
        err.code === 'EPERM' || err.code === 'EBUSY' || err.code === 'ENOTEMPTY';
      if (!transient || attempt === retries) throw err;
      const delay = 300 * (attempt + 1);
      console.warn(
        `[bundle-storybooks] rename ${err.code}, retry ${attempt + 1}/${retries} after ${delay}ms`,
      );
      await new Promise((r) => setTimeout(r, delay));
    }
  }
}

async function main() {
  // 1. 임시 위치 + 최종 위치(부모 `_cms` 포함) 모두 비우기.
  //    `_cms` 부모까지 비우는 이유는 위 `finalParent` 주석 참조.
  console.log(`[bundle-storybooks] cleaning ${tmpBase}`);
  await rm(tmpBase, { recursive: true, force: true });
  console.log(`[bundle-storybooks] cleaning ${finalParent}`);
  await rm(finalParent, { recursive: true, force: true });

  // 2. 두 Storybook을 public 바깥의 임시 디렉토리에 빌드.
  //    STORYBOOK_BASE_PATH 환경변수로 최종 서빙 sub-directory를 전달 → 양쪽 .storybook/main.ts의
  //    viteFinal이 그 값을 vite `config.base`에 주입 → 빌드 산출물의 모든 asset href/src가
  //    `/_cms/storybook/{admin|web}/assets/...` 형태로 박혀 정상 fetch.
  for (const { filter, name } of STORYBOOKS) {
    const outDir = path.join(tmpBase, name);
    const basePath = `/_cms/storybook/${name}/`;
    console.log(
      `[bundle-storybooks] building ${filter} → ${outDir} (base=${basePath})`,
    );
    await run(
      'pnpm',
      ['--filter', filter, 'exec', 'storybook', 'build', '--output-dir', outDir],
      monorepoRoot,
      { STORYBOOK_BASE_PATH: basePath },
    );
  }

  // 3. 빌드 완료 후 한번에 최종 위치로 이동.
  //    `finalBase` 자체(`public/_cms/storybook`)까지 생성해야 rename target의
  //    부모가 존재한다. `path.dirname(finalBase)`만 만들면 ENOENT 발생.
  await mkdir(finalBase, { recursive: true });
  for (const { name } of STORYBOOKS) {
    const from = path.join(tmpBase, name);
    const to = path.join(finalBase, name);
    console.log(`[bundle-storybooks] moving ${from} → ${to}`);
    await moveWithRetry(from, to);
  }

  // 4. Storybook Manager 빌더는 viteFinal의 base path를 무시하고 산출물
  //    index.html에 `./sb-manager/...` / `./vite-inject-mocker-entry.js` 같은
  //    relative path를 박는다. Visitor가 trailing slash 없이
  //    `/_cms/storybook/admin`으로 접근하면 base URL이 부모 디렉토리
  //    (`/_cms/storybook/`)로 해석되어 manager asset fetch가 모두
  //    `/_cms/storybook/sb-manager/...`(404)로 가버린다.
  //
  //    HTML의 `src=`/`href=` 속성에서 `./` 시작 모든 relative path를 절대
  //    path로 치환해 trailing slash 의존성을 원천 제거. `../`, 외부 URL
  //    (`https://...`), 인라인 데이터(`data:...`)는 영향 없음.
  for (const { name } of STORYBOOKS) {
    const dir = path.join(finalBase, name);
    const absBase = `/_cms/storybook/${name}`;
    for (const htmlFile of ['index.html', 'iframe.html']) {
      const file = path.join(dir, htmlFile);
      try {
        let content = await readFile(file, 'utf-8');
        const before = content;
        // (a) HTML 속성: `src="./..."`, `href="./..."`
        content = content.replace(
          /((?:src|href)=["'])\.\//g,
          `$1${absBase}/`,
        );
        // (b) inline `<script type="module">` 내부 ES module import 문:
        //     `import './sb-manager/runtime.js'`, `import('./X.js')` 등.
        //     Storybook Manager 빌더가 index.html에 inline import script를
        //     박는데 이게 base URL 기준 resolve라 trailing-slash 없는 URL에서
        //     부모 디렉토리로 잘못 resolve됨. 절대 path로 치환해 해결.
        content = content.replace(
          /(\bimport[\s(]+["'])\.\//g,
          `$1${absBase}/`,
        );
        if (content !== before) {
          await writeFile(file, content);
          console.log(`[bundle-storybooks] rewrote relative paths in ${path.relative(webRoot, file)}`);
        }
      } catch (err) {
        if (err.code !== 'ENOENT') throw err;
      }
    }
  }

  // 5. 임시 디렉토리 잔여 정리.
  await rm(tmpBase, { recursive: true, force: true });

  console.log('[bundle-storybooks] done');
}

main().catch((err) => {
  console.error('[bundle-storybooks] failed:', err.message);
  process.exit(1);
});
