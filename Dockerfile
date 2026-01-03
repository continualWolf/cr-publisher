ARG NODE_VERSION=22.20.0
FROM node:${NODE_VERSION}

WORKDIR /app

# Copy only package files first to leverage Docker cache
COPY package.json package-lock.json* ./

# Install all dependencies
RUN npm install

# Copy the rest of the app
COPY . .

# Expose port
EXPOSE 3000

# Run the app
CMD ["node", "server.js"]
