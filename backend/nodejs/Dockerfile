# Container image for Google Cloud Run (or any container host). Cloud Run sets PORT; the app reads it.
# Settings (DB_PROVIDER, JWT_SECRET, ...) are passed as environment variables when the container starts, never baked in.
FROM node:22-slim
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY src ./src
USER node
CMD ["node", "src/server.js"]
