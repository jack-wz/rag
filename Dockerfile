# Use an official PostgreSQL image as a parent image
FROM postgres:15

# Install pgvector
# See https://github.com/pgvector/pgvector#installation for installation instructions
RUN apt-get update && apt-get install -y --no-install-recommends \
    postgresql-common \
    postgresql-server-dev-15 \
    # build dependencies for pgvector
    git \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

RUN git clone --branch v0.5.1 https://github.com/pgvector/pgvector.git /tmp/pgvector \
    && cd /tmp/pgvector \
    && make \
    && make install \
    && cd / \
    && rm -rf /tmp/pgvector

# Install Python and pip
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    python3-pip \
    && rm -rf /var/lib/apt/lists/*

# Install CocoIndex
RUN pip3 install cocoindex

# Set up a script to enable pgvector and start PostgreSQL
# This script will be executed when the container starts
COPY ./init-db.sh /docker-entrypoint-initdb.d/init-db.sh
RUN chmod +x /docker-entrypoint-initdb.d/init-db.sh

# Expose PostgreSQL port
EXPOSE 5432

# Default command to start PostgreSQL (already handled by base image)
# CMD ["postgres"]
