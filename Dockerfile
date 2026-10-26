FROM node:24-bookworm-slim AS build
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile --ignore-scripts
COPY . .
RUN npm run build && mkdir -p /runtime/node_modules && cp -rL node_modules/nodemailer /runtime/node_modules/nodemailer
FROM node:24-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production DATA_DIR=/data PORT=8080
COPY --from=build /app/server ./server
COPY --from=build /app/worker ./worker
COPY --from=build /app/drizzle ./drizzle
COPY --from=build /app/dist/client ./dist/client
COPY --from=build /app/owner-app/dist/client ./owner-app/dist/client
COPY --from=build /app/team ./team
COPY --from=build /app/scripts ./scripts
COPY --from=build /runtime/node_modules ./node_modules
COPY package.json ./
EXPOSE 8080
CMD ["node","server/index.mjs"]
