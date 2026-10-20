FROM node:22-bookworm-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    chromium ffmpeg fonts-inter fonts-dejavu-core ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev
COPY server.js ./

ENV NODE_ENV=production \
    CHROMIUM_PATH=/usr/bin/chromium \
    JOB_ROOT=/tmp/efs-short-jobs

EXPOSE 10000
CMD ["node", "server.js"]
