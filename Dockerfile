ARG NODE_VERSION=22-slim
ARG NPM_REGISTRY=https://mirrors.cloud.tencent.com/npm/

FROM node:${NODE_VERSION} AS dependencies
WORKDIR /app
ARG NPM_REGISTRY
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci --registry=${NPM_REGISTRY}

FROM dependencies AS operations
WORKDIR /app
COPY . .
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

FROM node:${NODE_VERSION} AS builder
WORKDIR /app
COPY --from=dependencies /app/node_modules ./node_modules
COPY . .
ARG NEXT_PUBLIC_APP_URL
ARG NEXT_PUBLIC_STUDIO_CN_URL
ARG NEXT_PUBLIC_STUDIO_GLOBAL_URL
ENV NEXT_PUBLIC_APP_URL=${NEXT_PUBLIC_APP_URL}
ENV NEXT_PUBLIC_STUDIO_CN_URL=${NEXT_PUBLIC_STUDIO_CN_URL}
ENV NEXT_PUBLIC_STUDIO_GLOBAL_URL=${NEXT_PUBLIC_STUDIO_GLOBAL_URL}
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV BUILD_STANDALONE=true
RUN npm run build

FROM node:${NODE_VERSION} AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
ENV NEXT_TELEMETRY_DISABLED=1
ENV STORAGE_LOCAL_ROOT=/data/xinzhi-storage
COPY --from=builder --chown=node:node /app/public ./public
RUN mkdir -p .next /data/xinzhi-storage && chown node:node .next /data/xinzhi-storage
COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static
USER node
EXPOSE 3000
CMD ["node", "server.js"]
