# syntax=docker/dockerfile:1

# Vite inlines VITE_* env vars into the bundle at build time (see .env.example),
# so unlike a typical static site this image must be rebuilt per target
# environment rather than promoted as-is - the DEV and PUBLISH pipelines each
# run their own `docker build` with environment-appropriate --build-arg values.
FROM node:22-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

ARG VITE_UMBRACO_API_BASE_URL=""
ARG VITE_ONLINE_UPLOAD_URL=""
ENV VITE_UMBRACO_API_BASE_URL=$VITE_UMBRACO_API_BASE_URL \
    VITE_ONLINE_UPLOAD_URL=$VITE_ONLINE_UPLOAD_URL

RUN npm run build

FROM nginx:1.27-alpine AS runtime
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
