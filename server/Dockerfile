FROM node:22-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY tsconfig.json ./
COPY src ./src
RUN npm run build

FROM node:22-alpine AS runtime

WORKDIR /app

RUN apk add --no-cache git openssh-client

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=build /app/dist ./dist

RUN mkdir -p /data/uploads

ENV NODE_ENV=production
ENV DB_FILE_PATH=/data/db.json
ENV UPLOAD_DIR=/data/uploads

ENV PORT=3000
EXPOSE 3000

CMD ["node", "dist/index.js"]
