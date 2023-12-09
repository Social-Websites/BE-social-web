FROM node:latest

WORKDIR /app/server

COPY package*.json ./

RUN npm install 

COPY . .
RUN npm install -g nodemon

EXPOSE 5000

CMD ["npm","start"]