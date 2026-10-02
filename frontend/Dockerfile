FROM node:20-alpine AS build
WORKDIR /app
ARG VITE_API_URL=http://localhost:4000/api
ENV VITE_API_URL=${VITE_API_URL}
COPY package.json package-lock.json ./
COPY frontend/package.json ./frontend/package.json
COPY gateway/package.json ./gateway/package.json
COPY services/auth-service/package.json ./services/auth-service/package.json
COPY services/user-service/package.json ./services/user-service/package.json
COPY services/job-service/package.json ./services/job-service/package.json
COPY services/application-service/package.json ./services/application-service/package.json
RUN npm ci
COPY frontend ./frontend
RUN npm run build --workspace frontend

FROM nginx:1.27-alpine
COPY --from=build /app/frontend/dist /usr/share/nginx/html
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
