FROM node:16-alpine3.11

WORKDIR /app

COPY package.json yarn.lock ./

RUN yarn 

COPY . .
COPY .env ./

RUN yarn build

ENV NODE_ENV production

USER node

EXPOSE 3050
CMD ["node", "dist/index.js"]