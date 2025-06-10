# Unstructured Platform

This repository contains a simple FastAPI backend and a Next.js frontend used for experimenting with retrieval augmented generation (RAG).

## Backend

The backend lives in `unstructured-platform-backend`.
Run the following to install dependencies and start the development server:

```bash
cd unstructured-platform-backend
pip install -r requirements.txt
uvicorn main:app --reload
```

This exposes a basic health check at `/health` and a `/api/v1/process-document/` endpoint for uploading documents.

## Frontend

The Next.js application resides in `unstructured-platform-frontend`.
Run the following to install dependencies and start the dev server:

```bash
cd ../unstructured-platform-frontend
npm install
npm run dev
```

The app will be available at <http://localhost:3000>.
