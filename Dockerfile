FROM node:20 AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build -- --configuration=production

FROM nginx:alpine
RUN apk add --no-cache openssl && \
    mkdir -p /etc/nginx/ssl && \
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
      -keyout /etc/nginx/ssl/nginx.key \
      -out /etc/nginx/ssl/nginx.crt \
      -subj "/C=CO/ST=Valle/L=Cali/O=Territorio/CN=192.168.1.15"

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist/territorio-front/browser /usr/share/nginx/html

# Endurecimiento de permisos sobre assets estáticos de producción
RUN chown -R nginx:nginx /usr/share/nginx/html && \
    chmod -R 755 /usr/share/nginx/html

EXPOSE 80 443
CMD ["nginx", "-g", "daemon off;"]
