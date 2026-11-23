FROM node:20-bookworm-slim

ENV NODE_ENV=production \
    NODE_OPTIONS=--max-old-space-size=512

# ffmpeg pour les commandes médias, git requis par certaines deps npm
RUN apt-get update && apt-get install -y \
    ffmpeg \
    git \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./

# Install minimal : pas de scripts postinstall (puppeteer/sharp),
# pas de deps optionnelles ni dev — évite les timeouts de build
RUN npm install --legacy-peer-deps --no-optional --omit=dev --ignore-scripts \
    && npm cache clean --force

COPY . .

EXPOSE 10000

CMD ["node", "start.js"]
