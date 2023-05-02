FROM node:18.16.0-slim

WORKDIR /home/node/app

COPY . ./

RUN npm install

USER node

CMD ["npm", "run", "docker:startup"]
EXPOSE 3000 
