FROM node:latest

WORKDIR /app

ENV NODE_ENV=production

COPY ["package.json", "package-lock.json*", "./"]

RUN npm install --production

COPY . .

#RUN node register-commands.js
RUN node index.js
