#!/bin/sh
set -e
echo "Running database migrations..."
./node_modules/.bin/drizzle-kit migrate
echo "Starting application..."
node .output/server/index.mjs
