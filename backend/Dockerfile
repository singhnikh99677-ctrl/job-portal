FROM node:20-alpine

WORKDIR /app

COPY backend/package*.json ./backend/
RUN cd backend && npm install

COPY backend ./backend
RUN cd backend && npx prisma generate

EXPOSE 4000

CMD ["sh", "-c", "cd /app/backend && npx prisma db push && npm run start"]
