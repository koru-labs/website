FROM mcr.microsoft.com/devcontainers/javascript-node:1-22-bookworm

WORKDIR /app

ENV NEXT_TELEMETRY_DISABLED=1

COPY package.json ./
RUN npm install

COPY . .

EXPOSE 3000

CMD ["npm", "run", "dev", "--", "--hostname", "0.0.0.0", "--port", "3000"]
