FROM node:22-alpine AS experience-builder
WORKDIR /experience
COPY marketing/voxel-scene/package.json marketing/voxel-scene/package-lock.json ./
RUN npm ci
COPY marketing/voxel-scene/ ./
RUN npm run build

FROM nginx:1.27-alpine
COPY nginx/nginx.conf /etc/nginx/nginx.conf
COPY nginx/conf.d/default.conf /etc/nginx/conf.d/default.conf
COPY nginx/snippets/ /etc/nginx/snippets/
COPY --from=experience-builder /experience/dist/ /usr/share/nginx/experience/
