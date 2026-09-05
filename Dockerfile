FROM node:22-alpine

WORKDIR /app

# Copy dependency manifests
COPY package*.json ./

# Install dependencies (including devDependencies needed for the TypeScript build)
RUN npm install

# Copy application source code
COPY . .

# Build client and backend bundle
RUN npm run build

# Expose default application port
EXPOSE 3000

# Production environment variables
ENV NODE_ENV=production
ENV PORT=3000

# Launch compiled backend server
CMD ["npm", "start"]
