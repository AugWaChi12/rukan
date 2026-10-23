# API image — build จาก root ของ repo:
#   docker build -f apps/api/Dockerfile -t stumatch-api .
# ใช้ได้ทั้ง DigitalOcean App Platform (Dockerfile path = apps/api/Dockerfile, source dir = /)
# และ Droplet (docker run / docker compose)

ARG NODE_VERSION=22
ARG PNPM_VERSION=12.15.0

FROM node:${NODE_VERSION}-alpine AS base
ARG PNPM_VERSION
RUN npm install -g pnpm@${PNPM_VERSION}
WORKDIR /app

# 1) ตัด monorepo ให้เหลือเฉพาะ package ที่ api ใช้ (api + packages/shared + config)
FROM base AS pruner
COPY . .
RUN pnpm dlx turbo@2 prune api --docker

# 2) ติดตั้ง dependency ทั้งหมดแล้ว build
FROM base AS builder
COPY pnpm-workspace.yaml ./
COPY --from=pruner /app/out/json/ .
COPY --from=pruner /app/out/pnpm-lock.yaml ./pnpm-lock.yaml
RUN pnpm install --frozen-lockfile
COPY --from=pruner /app/out/full/ .
RUN pnpm turbo run build --filter=api

# 3) ติดตั้งเฉพาะ production dependency
FROM base AS prod-deps
COPY pnpm-workspace.yaml ./
COPY --from=pruner /app/out/json/ .
COPY --from=pruner /app/out/pnpm-lock.yaml ./pnpm-lock.yaml
RUN pnpm install --frozen-lockfile --prod

# 4) image สุดท้าย: รันด้วย user ที่ไม่ใช่ root
FROM node:${NODE_VERSION}-alpine AS runner
ENV NODE_ENV=production
WORKDIR /app
COPY --from=prod-deps --chown=node:node /app/ .
COPY --from=builder --chown=node:node /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder --chown=node:node /app/apps/api/dist ./apps/api/dist
COPY --from=builder --chown=node:node /app/apps/api/prisma ./apps/api/prisma
COPY --from=builder --chown=node:node /app/apps/api/prisma.config.ts ./apps/api/prisma.config.ts
USER node
WORKDIR /app/apps/api
EXPOSE 4000
# apply migration ที่ยังไม่ได้รันก่อน แล้วค่อย start API
CMD ["sh", "-c", "node ../../node_modules/prisma/build/index.js migrate deploy && node dist/main.js"]
