FROM node:20

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies (including devDependencies for build)
RUN npm install

# Copy source code
COPY . .

# Build frontend
RUN npm run build

EXPOSE 3000

# Set environment variables
ENV NODE_ENV=production
ENV DB_PATH=/app/data/github-monitor.db
ENV GITHUB_TOKEN=

# Create data directory
RUN mkdir -p /app/data

# Start server
CMD ["npx", "tsx", "server.ts"]
