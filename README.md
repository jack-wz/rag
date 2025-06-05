# Unstructured Platform

This repository contains a simple FastAPI backend and a Next.js frontend used for experimenting with retrieval augmented generation (RAG).

## Backend

The backend lives in `unstructured-platform-backend`. After installing the Python dependencies you can run it with:

```bash
uvicorn main:app --reload
```

The service exposes a basic health check at `/health` and a `/api/v1/process-document/` endpoint for uploading documents.

## Frontend

The Next.js application resides in `unstructured-platform-frontend`.
After installing the Node dependencies with `npm install` you can start the dev server:

```bash
npm run dev
```

The app will be available on <http://localhost:3000>.
