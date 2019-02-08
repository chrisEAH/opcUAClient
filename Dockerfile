FROM node:latest
WORKDIR /app
COPY app /app

RUN npm install

RUN ["chmod", "+x", "./cmd.sh"]
CMD ["./cmd.sh"]

