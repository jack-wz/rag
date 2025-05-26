#!/bin/bash
set -e

# Perform all actions as the postgres user
export PGUSER="$POSTGRES_USER"

# Create the database if it doesn't exist
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
  CREATE EXTENSION IF NOT EXISTS vector;
EOSQL
