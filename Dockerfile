ARG SERVICE
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY ${SERVICE}/package*.json ./

# Install dependencies
RUN npm install

# Copy application code
COPY ${SERVICE}/ ./

# Expose port
EXPOSE ${SERVICE:-backend}==backend?5000:3000

# Start command will be overridden by docker-compose
CMD ["npm", "start"]
