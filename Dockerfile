ARG SERVICE
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY ${SERVICE}/package*.json ./

# Install dependencies
RUN npm install

# Copy application code
COPY ${SERVICE}/ ./

# Expose ports (actual port mapping is controlled by docker-compose)
EXPOSE 3000 5000

# Start command will be overridden by docker-compose
CMD ["npm", "start"]
