FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN echo "legacy-peer-deps=true" >> .npmrc && npm install
COPY . .
ARG TEABLE_API_KEY
ARG TEABLE_BASE_URL=https://teable.hirschfeld.at
ENV TEABLE_API_KEY=$TEABLE_API_KEY
ENV TEABLE_BASE_URL=$TEABLE_BASE_URL
RUN npm run build && npm prune --omit=dev

FROM node:22-alpine
WORKDIR /app
COPY --from=builder /app/build ./build
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json .
ENV NODE_ENV=production
EXPOSE 3000
CMD ["node", "build"]
