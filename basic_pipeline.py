import os
from unstructured.partition.auto import partition
from sentence_transformers import SentenceTransformer
import chromadb
from chromadb.utils import embedding_functions


def ingest_document(file_path: str, collection_name: str = "docs") -> int:
    """Parse a document and store embeddings in a Chroma collection."""
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"File {file_path} not found")

    elements = partition(file_path)
    texts = [el.text for el in elements if hasattr(el, "text") and el.text]

    client = chromadb.Client()
    collection = client.get_or_create_collection(collection_name)
    embedder = embedding_functions.SentenceTransformerEmbeddingFunction(
        model_name="all-MiniLM-L6-v2"
    )
    embeddings = embedder(texts)
    ids = [f"{collection_name}_{i}" for i in range(len(texts))]
    metadatas = [{"source": file_path}] * len(texts)
    collection.add(documents=texts, ids=ids, embeddings=embeddings, metadatas=metadatas)
    return len(texts)


def query_collection(query_text: str, collection_name: str = "docs", n_results: int = 3):
    """Query the Chroma collection using the same embedding model."""
    client = chromadb.Client()
    collection = client.get_or_create_collection(collection_name)
    results = collection.query(query_texts=[query_text], n_results=n_results)
    docs = results.get("documents", [[]])[0]
    metadatas = results.get("metadatas", [[]])[0]
    return list(zip(docs, metadatas))


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Basic document ingestion and query")
    parser.add_argument("file", help="Path to document to ingest")
    parser.add_argument("--query", help="Query text after ingestion")
    args = parser.parse_args()

    num = ingest_document(args.file)
    print(f"Ingested {num} text segments from {args.file}")

    if args.query:
        matches = query_collection(args.query)
        print("Query results:")
        for doc, meta in matches:
            print("-", doc)

