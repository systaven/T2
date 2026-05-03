ARG NOTION_PAGE_ID
ARG NEXT_PUBLIC_THEME

FROM node:20-alpine AS base

# 1. Install dependencies only when needed
FROM base AS deps
# Add python3, make, gcc, and g++ for node-gyp/native dependencies
RUN apk add --no-cache libc6-compat python3 make gcc g++
WORKDIR /app
COPY package.json ./
RUN yarn install --frozen-lockfile

# 2. Rebuild the source code only when needed
FROM base AS builder
ARG NOTION_PAGE_ID
ENV NEXT_BUILD_STANDALONE=true

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN yarn build

# 3. Production image, copy all the files and run next
FROM base AS runner
ENV NODE_ENV=production

WORKDIR /app

COPY --from=builder /app/public ./public

# Automatically leverage output traces to reduce image size
# https://nextjs.org/docs/advanced-features/output-file-tracing
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# 个人仓库把将配置好的.env.local文件放到项目根目录，可自动使用环境变量
# COPY --from=builder /app/.env.local ./

EXPOSE 3000

# Next.js collects completely anonymous telemetry data about general usage.
# Learn more here: https://nextjs.org/telemetry
# Uncomment the following line in case you want to disable telemetry.
# ENV NEXT_TELEMETRY_DISABLED 1

CMD ["node", "server.js"]
