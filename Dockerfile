FROM node:18-alpine

WORKDIR /app

# Install dependencies
RUN apk add --no-cache libc6-compat postgresql-client openssl openssl-dev

# Copy package files
COPY package.json ./
RUN npm install

# Copy app files
COPY . .

# Generate Prisma Client
RUN npx prisma generate

EXPOSE 3000

# Start command (dev or prod)
CMD ["npm", "run", "dev"]
