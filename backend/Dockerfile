FROM node:20-alpine
WORKDIR /app

# Install ALL dependencies including devDependencies (nodemon)
COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 3001

# Default: dev mode with nodemon
# Override CMD in production: ["node", "src/server.js"]
CMD ["npm", "run", "dev"]
