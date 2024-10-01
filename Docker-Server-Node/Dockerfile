FROM node:latest

WORKDIR /test

COPY package*.json /test/

RUN npm install

COPY . /test/

RUN tar -xvzf /test/ngrok-v3-stable-linux-amd64.tgz -C /usr/local/bin
RUN rm /test/ngrok-v3-stable-linux-amd64.tgz

EXPOSE 3000

ENV NGROK_AUTHTOKEN=2lBpu9Ti8Iunn1TxokQdJJYa7oc_5FpwBRbQPi7XZE7bnmuGM

# COPY entrypoint.sh /test/entrypoint.sh

RUN chmod +x /test/entrypoint.sh

CMD [ "/test/entrypoint.sh" ]