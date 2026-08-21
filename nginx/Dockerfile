FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/nginx.conf
COPY conf.d/default.conf /etc/nginx/conf.d/default.conf
COPY snippets/ /etc/nginx/snippets/
COPY marketing/voxel-scene/dist/ /usr/share/nginx/experience/
