FROM node:20
WORKDIR /app
COPY . .
RUN npm install --legacy-peer-deps
CMD ["npm", "start"]