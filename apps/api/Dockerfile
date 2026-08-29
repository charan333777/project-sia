FROM node:22-alpine AS build
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-workspace.yaml tsconfig.base.json pnpm-lock.yaml ./
COPY apps/api/package.json apps/api/package.json
COPY packages/validation/package.json packages/validation/package.json
COPY packages/shared/package.json packages/shared/package.json
RUN pnpm install --frozen-lockfile
COPY apps/api apps/api
COPY packages/validation packages/validation
COPY packages/shared packages/shared
RUN pnpm --filter @sia/validation build && pnpm --filter @sia/shared build && pnpm --filter @sia/api build

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
RUN corepack enable
COPY --from=build /app/package.json /app/pnpm-workspace.yaml /app/pnpm-lock.yaml ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/apps/api/package.json ./apps/api/package.json
COPY --from=build /app/apps/api/dist ./apps/api/dist
COPY --from=build /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=build /app/packages ./packages
EXPOSE 4000
CMD ["node", "apps/api/dist/server.js"]
