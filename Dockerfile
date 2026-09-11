FROM node:20-bookworm-slim

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=4000

RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/*

COPY package.json ./
COPY apps/api/package.json apps/api/package.json
COPY packages/database/package.json packages/database/package.json

RUN npm install --omit=optional

COPY . .

RUN npm run build --workspace @specialcare/api

EXPOSE 4000

CMD ["sh", "-c", "npm run migrate:deploy --workspace @specialcare/database && npm run seed --workspace @specialcare/database && node apps/api/dist/server.js"]
