# syntax=docker/dockerfile:1.7
# Stage 8a — admin (multi-stage build).
# Build context = monorepo root (D:/project/simple-CMS).
# Run: docker build -f apps/admin/Dockerfile -t simple-cms-admin .

ARG NODE_VERSION=22-bookworm-slim

# ─── 1. base ────────────────────────────────────────────────
# corepack을 활성화해 pnpm을 packageManager 필드 버전(10.33.0)으로 고정.
FROM node:${NODE_VERSION} AS base
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable
WORKDIR /app

# ─── 2. deps ────────────────────────────────────────────────
# workspace package.json + lockfile만 먼저 복사해 install 캐시 친화.
# 소스 변경 시에도 lockfile 미변경이면 deps 레이어 재사용.
FROM base AS deps
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY apps/admin/package.json apps/admin/
COPY apps/web/package.json apps/web/
COPY packages/config/package.json packages/config/
COPY packages/db/package.json packages/db/
COPY packages/editor/package.json packages/editor/
COPY packages/types/package.json packages/types/
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile

# ─── 3. builder ─────────────────────────────────────────────
# 전체 소스 복사 + Prisma client 생성 + admin standalone 빌드.
# Prisma client는 builder 안에서 생성하고, runner는 standalone tracer가 자동 복사.
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/admin/node_modules ./apps/admin/node_modules
COPY --from=deps /app/apps/web/node_modules ./apps/web/node_modules
COPY --from=deps /app/packages/config/node_modules ./packages/config/node_modules
COPY --from=deps /app/packages/db/node_modules ./packages/db/node_modules
COPY --from=deps /app/packages/editor/node_modules ./packages/editor/node_modules
COPY --from=deps /app/packages/types/node_modules ./packages/types/node_modules
COPY . .

# Next.js 빌드 시 환경변수 인라인 방지: 실제 값은 runtime에 주입.
# DATABASE_URL은 prisma generate 단계가 schema parse만 하면 되므로 더미 충분.
ENV NEXT_TELEMETRY_DISABLED=1
ENV DATABASE_URL="postgresql://placeholder:placeholder@placeholder:5432/placeholder"

RUN pnpm --filter @simple-cms/db generate
RUN pnpm --filter @simple-cms/admin build

# ─── 4. runner ──────────────────────────────────────────────
# standalone 산출물만 골라 복사. public/ + .next/static/ 명시 COPY 필수.
# (Next.js standalone은 이 두 디렉토리를 자동 복사하지 않음)
FROM node:${NODE_VERSION} AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3001
ENV HOSTNAME=0.0.0.0

# non-root user (보안 + Next.js 권장)
RUN groupadd --system --gid 1001 nodejs \
    && useradd --system --uid 1001 --gid nodejs nextjs

# standalone 산출물: outputFileTracingRoot가 monorepo root이므로
# .next/standalone 아래에 apps/admin + 워크스페이스 deps 트리가 형성됨.
COPY --from=builder --chown=nextjs:nodejs /app/apps/admin/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/admin/.next/static ./apps/admin/.next/static
# admin은 public/ 디렉토리 없음 (관리자 전용 — 정적 자산 서빙 불필요). web Dockerfile은 COPY 유지

USER nextjs
EXPOSE 3001
CMD ["node", "apps/admin/server.js"]
