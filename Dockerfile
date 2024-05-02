FROM node:latest

WORKDIR /app

ENV NODE_ENV=production

COPY ["package.json", "package-lock.json*", "./"]

RUN npm install --production

COPY . .

CMD ["node", "register-commands.js"]
CMD ["node", "index.js"]
