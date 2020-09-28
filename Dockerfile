FROM node:12

# Create app directory
WORKDIR /app/pusher

COPY package*.json ./

# Install only production dependencies
RUN npm ci --only=production

# Bundle app source
COPY . .

CMD [ "node", "pusher.js" ]
