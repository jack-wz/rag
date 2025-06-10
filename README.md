# RAG Platform

This repository contains a small example platform with a FastAPI backend and a Next.js frontend.

## Backend API

The backend lives in `unstructured-platform-backend`. It exposes two sets of processing routes:

- `processing` – full document processing using the `unstructured` library, mounted under `/api/v1`.
- `processing_simple` – a lightweight placeholder implementation, mounted under `/api/v1/simple`.

Each router provides endpoints such as `/process-document/`, `/supported-formats` and `/health` within its prefix.

## Frontend

The frontend lives in `unstructured-platform-frontend` and is a standard Next.js application.
