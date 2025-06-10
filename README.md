# RAG

This repository contains a small example with a FastAPI backend and a Next.js
frontend.

## Prerequisites

- **Python** >= 3.11
- **Node.js** >= 20

## Environment variables

The demo runs without any required environment variables. If you want to change
the default host or port you can export `HOST` and `PORT` before starting the
backend with `uvicorn`. The frontend uses `next.config.ts` to proxy API calls to
`http://localhost:8000`. Adjust that file if your backend runs elsewhere.

## Backend setup

```bash
cd unstructured-platform-backend
python3 -m venv .venv && source .venv/bin/activate  # optional
pip install -r requirements.txt
uvicorn main:app --reload
```

The API will be available at `http://localhost:8000`.

## Frontend setup

```bash
cd unstructured-platform-frontend
npm install
npm run dev
```

Open `http://localhost:3000` to access the web interface.

## Service interaction

When both services are running, the frontend automatically forwards requests
under `/api/v1/*` to the backend thanks to the rewrite rule in
`unstructured-platform-frontend/next.config.ts`.
