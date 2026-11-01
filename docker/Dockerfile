FROM node:20-alpine AS build

WORKDIR /app

COPY package.json yarn.lock ./
RUN corepack enable && yarn install --frozen-lockfile

COPY . .

ARG VITE_MAPPEDIN_KEY
ARG VITE_MAPPEDIN_SECRET
ARG VITE_MAPPEDIN_MAP_ID

ENV VITE_MAPPEDIN_KEY=$VITE_MAPPEDIN_KEY
ENV VITE_MAPPEDIN_SECRET=$VITE_MAPPEDIN_SECRET
ENV VITE_MAPPEDIN_MAP_ID=$VITE_MAPPEDIN_MAP_ID

RUN yarn build

FROM nginxinc/nginx-unprivileged:1.27-alpine

COPY docker/nginx/default.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 8080
