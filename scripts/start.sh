#!/bin/bash
set -e

# Create database directory if it doesn't exist
mkdir -p /opt/render/project/.data/prisma

# Initialize database
prisma db push --skip-generate

# Start the server
NODE_ENV=production bun .next/standalone/server.js
