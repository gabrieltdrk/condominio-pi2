#!/bin/sh
set -e

echo "Running database seed..."
node dist/seed.js

echo "Starting backend server..."
exec node dist/server.js
