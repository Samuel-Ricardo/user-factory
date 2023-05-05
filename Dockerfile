FROM node:18.16.0-slim

WORKDIR /home/node/app

RUN apt update && apt install make

COPY . ./

RUN npm install

USER node

RUN chown $USER:$USER -R /home/node/app/prisma 
RUN chown $USER:$USER -R /home/node/app/node_modules/.prisma/client

CMD ["npm", "run", "docker:startup"]

