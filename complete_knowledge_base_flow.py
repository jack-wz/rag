# complete_knowledge_base_flow.py
# This script provides a consolidated example of a CocoIndex flow for building an
# enterprise knowledge base. It covers document ingestion, text extraction,
# chunking, embedding generation, and storage in PostgreSQL.

# --- Prerequisites ---
# 1. Python environment with necessary libraries. Install them using pip:
#    pip install cocoindex pypdf python-docx sentence-transformers psycopg2-binary
#
# 2. Running PostgreSQL Server:
#    Ensure you have a PostgreSQL server running, for example, the one set up
#    via Docker in the previous steps (refer to README.md or Step 1).
#    The database should exist, and the pgvector extension should be enabled.
#
# 3. Sample Documents:
#    Create a directory (e.g., './sample_documents/') and place some sample
#    .txt, .md, .pdf, and .docx files in it for the pipeline to process.
#
# Note: CocoIndex modules and functions used here are placeholders for demonstration.
# Replace them with actual CocoIndex implementations when using the library.
# ------------------------------------------------------------------------------

import os
import hashlib
from typing import Dict, Any, Iterator, List, Tuple

# --- Configuration Variables ---
DOCUMENTS_DIR = "./sample_documents/"
POSTGRES_DB_URL = "postgresql://coco_user:coco_password@localhost:5432/coco_database"
EMBEDDING_MODEL_NAME = "sentence-transformers/all-MiniLM-L6-v2" # Ensure this model is available
TABLE_NAME = "enterprise_knowledge_embeddings"
CHUNK_SIZE = 500  # Characters per chunk
CHUNK_OVERLAP = 50 # Characters of overlap between chunks

# --- CocoIndex Placeholder Framework ---
# (This is a simplified, conceptual framework for demonstration purposes)
class cocoindex:
    class sources:
        @staticmethod
        def LocalFile(path: str, file_filter: List[str] = None, recursive: bool = True):
            print(f"[CocoSource.LocalFile] Reading from: {path}, Filter: {file_filter}")
            for root, _, files in os.walk(path):
                for file_name in files:
                    if file_filter is None or any(file_name.endswith(ext) for ext in file_filter):
                        file_path = os.path.join(root, file_name)
                        doc_id = hashlib.md5(file_path.encode()).hexdigest()
                        yield {
                            "doc_id": doc_id,
                            "file_path": file_path,
                            "file_name": file_name,
                            "metadata": {"source_type": "LocalFile"}
                        }

    class functions:
        @staticmethod
        def Map(func, input_field=None, output_field=None):
            """Placeholder for a mapping function that applies 'func' to items."""
            print(f"[CocoFunc.Map] Applying function '{func.__name__}'")
            def mapper(item_or_items: Any) -> Any:
                is_list = isinstance(item_or_items, list)
                items_to_process = item_or_items if is_list else [item_or_items]
                
                results = []
                for item in items_to_process:
                    # This is a simplified map. A real one would handle field mapping.
                    results.append(func(item)) 
                return results if is_list else results[0]
            return mapper

        @staticmethod
        def SplitRecursively(text_field: str, chunk_size: int, chunk_overlap: int, id_fields: List[str]):
            print(f"[CocoFunc.SplitRecursively] Configured: text_field='{text_field}', chunk_size={chunk_size}, id_fields={id_fields}")
            def splitter(item: Dict[str, Any]) -> Iterator[Dict[str, Any]]:
                text_to_split = item.get(text_field, "")
                if not text_to_split:
                    # Create a single chunk if no text
                    base_id = "_".join(str(item.get(f, f"no_{f}")) for f in id_fields)
                    chunk_item = item.copy()
                    chunk_item.update({
                        "chunk_id": f"{base_id}_chunk_0",
                        "chunk_text": "",
                        "chunk_offset": 0,
                        "metadata": {**item.get("metadata", {}), "original_doc_id": item.get("doc_id")}
                    })
                    if text_field in chunk_item: del chunk_item[text_field] # remove original full text
                    yield chunk_item
                    return

                start = 0
                chunk_seq = 0
                base_id = "_".join(str(item.get(f, f"no_{f}")) for f in id_fields)

                while start < len(text_to_split):
                    end = start + chunk_size
                    current_chunk_text = text_to_split[start:end]
                    
                    chunk_item = item.copy() # inherit metadata from parent item
                    if text_field in chunk_item: del chunk_item[text_field] # remove original full text
                    if "raw_content" in chunk_item: del chunk_item["raw_content"]


                    chunk_item.update({
                        "chunk_id": f"{base_id}_chunk_{chunk_seq}",
                        "chunk_text": current_chunk_text,
                        "chunk_offset": start,
                        "metadata": {**item.get("metadata", {}), 
                                     "original_doc_id": item.get("doc_id"),
                                     "original_file_name": item.get("file_name")}
                    })
                    yield chunk_item
                    
                    chunk_seq += 1
                    if end >= len(text_to_split):
                        break
                    start += (chunk_size - chunk_overlap)
            return splitter

        @staticmethod
        def SentenceTransformerEmbed(model_name: str, text_field: str, embedding_field: str):
            print(f"[CocoFunc.SentenceTransformerEmbed] Configured: model='{model_name}', text_field='{text_field}'")
            
            # Mock SentenceTransformer model
            class _MockSentenceTransformer:
                def __init__(self, model_name_):
                    self.model_name = model_name_
                    self.dim = 384 if "all-MiniLM" in self.model_name else 768 # common dimensions
                    print(f"    (MockSentenceTransformer: Model '{self.model_name}' loaded, dim={self.dim})")
                
                def encode(self, texts: List[str], show_progress_bar:bool=False) -> List[List[float]]:
                    # print(f"    (MockSentenceTransformer: Encoding {len(texts)} texts: '{str(texts)[:70]}...')")
                    return [[(idx + 0.1) * 0.01] * self.dim for idx, _ in enumerate(texts)]

            model = _MockSentenceTransformer(model_name)

            def embedder(item_or_items: Any) -> Any:
                is_list = isinstance(item_or_items, list)
                items = item_or_items if is_list else [item_or_items]
                
                texts = [it.get(text_field, "") for it in items]
                embeddings = model.encode(texts) if any(texts) else [[] for _ in items]
                
                for it, emb in zip(items, embeddings):
                    it[embedding_field] = emb
                return items if is_list else items[0]
            return embedder

    class storages:
        @staticmethod
        def Postgres(database_url: str, table_name: str, primary_key_fields: List[str], vector_index: Dict = None, recreate_table: bool = False):
            print(f"[CocoStorage.Postgres] Configured: URL='{database_url}', Table='{table_name}'")
            print(f"    PKs: {primary_key_fields}, VectorIndex: {vector_index}, Recreate: {recreate_table}")
            
            def sink(collected_items: List[Dict[str, Any]]):
                print(f"    (Postgres Sink): Received {len(collected_items)} items to store in '{table_name}'.")
                if not collected_items:
                    print("    (Postgres Sink): No items to store.")
                    return

                # In a real scenario, this would use psycopg2 to:
                # 1. Connect to PostgreSQL.
                # 2. Optionally create/recreate the table (based on `recreate_table` and schema).
                #    CREATE TABLE IF NOT EXISTS {table_name} (
                #        chunk_id TEXT PRIMARY KEY,
                #        doc_id TEXT,
                #        file_name TEXT,
                #        chunk_text TEXT,
                #        chunk_offset INTEGER,
                #        embedding VECTOR({EMBEDDING_DIMENSION}), -- Dimension from model
                #        metadata JSONB
                #    );
                # 3. Create vector index if configured and not exists:
                #    CREATE INDEX IF NOT EXISTS idx_{table_name}_embedding ON {table_name}
                #    USING hnsw (embedding vector_cosine_ops); -- or other type/metric
                # 4. Batch INSERT/UPSERT data.
                print(f"    (Postgres Sink): Example item to store: {str(collected_items[0])[:200]}...")
                print(f"    (Postgres Sink): Successfully processed {len(collected_items)} items (simulation).")
            return sink

    @staticmethod
    def flow_def(name: str):
        print(f"[CocoIndex.flow_def] Defining flow: {name}")
        def decorator(func):
            def wrapper(*args, **kwargs):
                print(f"\n--- Running CocoIndex Flow: {name} ---")
                flow_instance = func(*args, **kwargs)
                # Conceptual: The flow instance would have a .run() method
                if hasattr(flow_instance, '_execute_flow_simulation'):
                    flow_instance._execute_flow_simulation()
                else:
                    print("   (Flow execution mechanism not fully defined in this placeholder)")
                print(f"--- Flow: {name} - Execution Complete (Simulation) ---")
            return wrapper
        return decorator
    
    # Conceptual DataCollector
    class DataCollector:
        def __init__(self):
            self.collected_data = []
            print("[CocoUtils.DataCollector] Initialized.")

        def collect(self, item: Dict[str, Any]):
            self.collected_data.append(item)
        
        def get_all(self) -> List[Dict[str, Any]]:
            return self.collected_data

        def __call__(self, item_or_items: Any) -> Any: # To make it callable in a flow
            if isinstance(item_or_items, list):
                for item in item_or_items:
                    self.collect(item)
                return item_or_items # Pass through
            else:
                self.collect(item_or_items)
                return item_or_items # Pass through


# --- Text Extraction Logic ---
def extract_text_from_pdf_placeholder(file_path: str) -> str:
    """Placeholder for PDF text extraction (uses pypdf in real scenario)."""
    print(f"    [Extractor] Reading PDF (placeholder): {os.path.basename(file_path)}")
    return f"Text from PDF: {os.path.basename(file_path)}. This is mock content."

def extract_text_from_docx_placeholder(file_path: str) -> str:
    """Placeholder for DOCX text extraction (uses python-docx in real scenario)."""
    print(f"    [Extractor] Reading DOCX (placeholder): {os.path.basename(file_path)}")
    return f"Text from DOCX: {os.path.basename(file_path)}. This is mock content."

def map_extract_document_content(item: Dict[str, Any]) -> Dict[str, Any]:
    """
    Extracts text content from a file specified in 'item' (must have 'file_path').
    Adds 'raw_content' to the item.
    """
    file_path = item.get("file_path")
    if not file_path:
        item["raw_content"] = ""
        item["metadata"]["extraction_error"] = "Missing file_path"
        return item

    _, extension = os.path.splitext(file_path.lower())
    extracted_text = ""

    try:
        if extension == ".txt" or extension == ".md":
            with open(file_path, 'r', encoding='utf-8') as f:
                extracted_text = f.read()
            print(f"    [Extractor] Read TXT/MD: {os.path.basename(file_path)}")
        elif extension == ".pdf":
            extracted_text = extract_text_from_pdf_placeholder(file_path)
        elif extension == ".docx":
            extracted_text = extract_text_from_docx_placeholder(file_path)
        else:
            extracted_text = f"Unsupported file type: {extension}"
            item["metadata"]["extraction_warning"] = "Unsupported file type"
    except Exception as e:
        extracted_text = f"Error extracting text: {str(e)}"
        item["metadata"]["extraction_error"] = str(e)
    
    item["raw_content"] = extracted_text
    return item

# --- CocoIndex Flow Definition ---
@cocoindex.flow_def(name="BuildKnowledgeBaseFlow")
def build_knowledge_base_flow():
    """
    Defines the complete data ingestion and indexing pipeline for the knowledge base.
    """
    
    # 1. Source: Read documents from local file system
    doc_source = cocoindex.sources.LocalFile(
        path=DOCUMENTS_DIR,
        file_filter=[".txt", ".md", ".pdf", ".docx"],
        recursive=True
    )

    # 2. Text Extraction: Apply the 'map_extract_document_content' function to each document item
    #    (Conceptual: CocoIndex would map this function over items from doc_source)
    #    This step adds 'raw_content' to each item.

    # 3. Text Chunking: Split 'raw_content' into smaller pieces
    #    (Conceptual: CocoIndex applies this to each item after text extraction)
    text_splitter = cocoindex.functions.SplitRecursively(
        text_field="raw_content", # Field containing the text to split
        chunk_size=CHUNK_SIZE,
        chunk_overlap=CHUNK_OVERLAP,
        id_fields=["doc_id"] # Helps create unique chunk_id (e.g., {doc_id}_chunk_{seq})
    )
    # This step transforms one document item into multiple chunk items.
    # Each chunk item will have 'chunk_text', 'chunk_id', 'chunk_offset', etc.

    # 4. Embedding Generation: Create vector embeddings for 'chunk_text'
    #    (Conceptual: CocoIndex applies this to each chunk item)
    embedder = cocoindex.functions.SentenceTransformerEmbed(
        model_name=EMBEDDING_MODEL_NAME,
        text_field="chunk_text",      # Input field (from splitter output)
        embedding_field="embedding"   # Output field for the vector
    )
    # This step adds 'embedding' to each chunk item.

    # 5. Data Collection: Gather all processed chunk items before sinking
    #    (Conceptual: CocoIndex might use a collector or manage streaming to sink)
    data_collector = cocoindex.DataCollector()

    # 6. Sink: Store the processed data (chunks with embeddings) into PostgreSQL
    pg_vector_sink = cocoindex.storages.Postgres(
        database_url=POSTGRES_DB_URL,
        table_name=TABLE_NAME,
        primary_key_fields=["chunk_id"], # Field(s) to use as primary key
        vector_index={
            "field_name": "embedding",       # Column containing the vectors
            "metric": "CosineSimilarity",    # Or "L2Distance", "InnerProduct"
            "index_type": "hnsw",            # pgvector index type (e.g., hnsw, ivfflat)
            # "options": {"m": 16, "ef_construction": 64} # Example HNSW options
        },
        recreate_table=True # For demonstration, set to True to clear table on each run
    )

    # --- Conceptual Flow Execution Simulation ---
    # This is a simplified simulation of how CocoIndex might process the data.
    # A real CocoIndex framework would manage the data flow and execution.
    def _execute_flow_simulation():
        print("    [FlowSim] Starting simulation...")
        
        all_docs_data = list(doc_source) # Simulates reading all files
        print(f"    [FlowSim] Source: Found {len(all_docs_data)} documents.")

        # Step 2: Text Extraction
        extracted_docs = []
        for doc_item in all_docs_data:
            extracted_docs.append(map_extract_document_content(doc_item))
        print(f"    [FlowSim] Text Extraction: Processed {len(extracted_docs)} documents.")
        
        # Step 3: Text Chunking
        all_chunks = []
        for doc_item in extracted_docs:
            for chunk in text_splitter(doc_item): # text_splitter is an iterator
                all_chunks.append(chunk)
        print(f"    [FlowSim] Text Chunking: Generated {len(all_chunks)} chunks.")

        # Step 4: Embedding Generation
        # In a real scenario, embeddings might be generated in batches for efficiency.
        # For simplicity, processing one by one here.
        embedded_chunks = []
        for chunk_item in all_chunks:
            embedded_chunks.append(embedder(chunk_item)) # embedder processes single item here
        print(f"    [FlowSim] Embedding Generation: Processed {len(embedded_chunks)} chunks.")

        # Step 5: Data Collection (already done implicitly by appending to embedded_chunks)
        # data_collector would be used if items were processed and collected individually.
        # For this simulation, embedded_chunks holds all final items.
        # For a more explicit collector pattern:
        # for chunk in embedded_chunks: data_collector.collect(chunk)
        # final_data_to_sink = data_collector.get_all()
        final_data_to_sink = embedded_chunks 
        print(f"    [FlowSim] Data Collection: {len(final_data_to_sink)} items prepared for sink.")
        
        # Step 6: Sink
        if final_data_to_sink:
            pg_vector_sink(final_data_to_sink) # Sink processes the list of items
        else:
            print("    [FlowSim] Sink: No data to send to sink.")
        
        print("    [FlowSim] Simulation finished.")

    # Return an object that allows triggering the simulation (conceptual)
    class FlowRunner:
        def _execute_flow_simulation(self):
            _execute_flow_simulation()
    
    return FlowRunner()


# --- Main Execution Block (Conceptual) ---
if __name__ == "__main__":
    print("Starting Enterprise Knowledge Base Flow script...")

    # 1. Ensure sample documents directory exists
    if not os.path.exists(DOCUMENTS_DIR):
        os.makedirs(DOCUMENTS_DIR)
        print(f"Created sample documents directory: {DOCUMENTS_DIR}")
        # Create some dummy files for the demonstration
        with open(os.path.join(DOCUMENTS_DIR, "sample_text.txt"), "w") as f:
            f.write("This is a sample text document about CocoIndex and AI.")
        with open(os.path.join(DOCUMENTS_DIR, "sample_markdown.md"), "w") as f:
            f.write("# Sample Markdown\n\nThis document discusses **semantic search** and *vector embeddings*.")
        with open(os.path.join(DOCUMENTS_DIR, "dummy_report.pdf"), "w") as f: # Placeholder
            f.write("PDF content (mocked).")
        with open(os.path.join(DOCUMENTS_DIR, "dummy_manual.docx"), "w") as f: # Placeholder
            f.write("DOCX content (mocked).")
        print(f"Added sample files to {DOCUMENTS_DIR}. Replace with your actual documents.")

    # 2. (Conceptual) Invoke the CocoIndex flow
    # In a real CocoIndex application, you might run this using a CocoIndex CLI or scheduler.
    # For this script, we directly call the decorated function which triggers the simulation.
    build_knowledge_base_flow()

    print("\nScript execution finished.")
    print("Summary of (simulated) actions:")
    print(f"- Read documents from: {DOCUMENTS_DIR}")
    print("- Extracted text, chunked, and generated embeddings using '{EMBEDDING_MODEL_NAME}'.")
    print(f"- Attempted to store results in PostgreSQL table '{TABLE_NAME}' at '{POSTGRES_DB_URL}'.")
    print("\nTo run this for real:")
    print("  - Install all dependencies: pip install cocoindex pypdf python-docx sentence-transformers psycopg2-binary")
    print("  - Ensure your PostgreSQL server is running and accessible with pgvector enabled.")
    print("  - Replace placeholder CocoIndex components with the actual library's implementations.")
```
