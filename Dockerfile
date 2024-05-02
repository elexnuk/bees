FROM node:latest

WORKDIR /app

ENV NODE_ENV=production

COPY ["package.json", "package-lock.json*", "./"]

RUN mkdir data

RUN npm install --production

COPY . .

CMD ["npm", "start"]