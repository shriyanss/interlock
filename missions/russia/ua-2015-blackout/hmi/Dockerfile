FROM node:20-bookworm-slim
WORKDIR /app

# Multi-language: Node serves the web UI and speaks Modbus TCP directly;
# Python (c104) handles IEC 60870-5-104, which has no maintained Node
# client library. See iec104_client.py.
RUN apt-get update && apt-get install -y --no-install-recommends python3 python3-pip \
    && pip3 install --break-system-packages --no-cache-dir c104 \
    && rm -rf /var/lib/apt/lists/*

COPY package.json ./
RUN npm install --omit=dev
COPY server.js iec104_client.py ./
COPY public ./public
EXPOSE 80
CMD ["node", "server.js"]
