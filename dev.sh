#!/bin/bash

# Kill any processes on ports 5001 and 5173
echo "Cleaning up old processes..."
lsof -ti:5001 | xargs kill -9 2>/dev/null || true
lsof -ti:5173 | xargs kill -9 2>/dev/null || true

echo "Starting server..."
NODE_ENV=development npx tsx --env-file=.env server/index.ts
