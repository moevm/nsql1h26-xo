FROM node:25.8.1-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build && npm cache clean --force

FROM nginxinc/nginx-unprivileged:stable-alpine

RUN rm -f /etc/nginx/conf.d/default.conf
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html

ENTRYPOINT [ "nginx" ]
CMD [ "-g", "daemon off;" ]
