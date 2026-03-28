#!/bin/bash
set -e

echo "Installing server dependencies..."
cd server && npm install && cd ..

echo "Installing client dependencies..."
cd client && npm install && cd ..

echo "Starting PostgreSQL and running migrations..."
# Start only the DB first
docker compose up -d db

# Wait for postgres to be ready
echo "Waiting for PostgreSQL to be ready..."
until docker compose exec db pg_isready -U expenses -d expenses 2>/dev/null; do
  sleep 1
done

echo "Running migrations..."
cd server && DATABASE_URL=postgres://expenses:expenses_dev@localhost:5432/expenses npx knex --knexfile db/knexfile.js migrate:latest && cd ..

echo "Running seeds..."
cd server && DATABASE_URL=postgres://expenses:expenses_dev@localhost:5432/expenses npx knex --knexfile db/knexfile.js seed:run && cd ..

echo "Starting all services..."
docker compose up
