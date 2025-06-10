# rag

This repository contains a small retrieval-augmented generation prototype.
The FastAPI backend lives in `unstructured-platform-backend` and the Next.js
frontend in `unstructured-platform-frontend`.

## Backend setup

Install the minimal dependencies:

```bash
pip install -r unstructured-platform-backend/requirements.txt
```

For OCR or vision based features (which rely on PyTorch and other
heavy packages) install the optional set:

```bash
pip install -r unstructured-platform-backend/requirements-dev.txt
```

## Running the API

```bash
cd unstructured-platform-backend
uvicorn main:app --reload
```
