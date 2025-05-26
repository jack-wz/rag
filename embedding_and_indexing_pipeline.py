# embedding_and_indexing_pipeline.py
# This script demonstrates a CocoIndex pipeline that ingests documents, processes them,
# generates embeddings, and stores them in PostgreSQL.

# --- Installation Instructions ---
# Before running a real version of this script, you'll need to install several libraries:
#
# pip install cocoindex pypdf python-docx sentence-transformers psycopg2-binary
#
# For this demonstration, CocoIndex and its modules are placeholders.
# Ensure your PostgreSQL server (e.g., from Step 1 Docker setup) is running.
# ---------------------------------------------------------------

import os
import hashlib # For creating unique IDs
from typing import Dict, Any, Iterator, List

# --- CocoIndex Placeholder Imports & Definitions ---
# These are conceptual representations for demonstration.

class cocoindex:
    class sources:
        @staticmethod
        def LocalFile(path: str, file_filter: List[str] = None, recursive: bool = True):
            print(f"[CocoIndex.sources.LocalFile] Initialized to read from: {path}, filter: {file_filter}, recursive: {recursive}")
            found_files = []
            for root, _, files in os.walk(path):
                for file_name in files:
                    if file_filter is None or any(file_name.endswith(ext) for ext in file_filter):
                        found_files.append(os.path.join(root, file_name))
            
            for filepath in found_files:
                try:
                    with open(filepath, 'r', encoding='utf-8') as f:
                        content = f.read()
                    yield {
                        "doc_id": hashlib.md5(filepath.encode()).hexdigest(), # Generate a doc_id
                        "path": filepath, 
                        "content": content, 
                        "metadata": {"source_filename": os.path.basename(filepath)}
                    }
                except Exception:
                    yield {
                        "doc_id": hashlib.md5(filepath.encode()).hexdigest(),
                        "path": filepath, 
                        "content": f"Binary or special file: {filepath}", 
                        "metadata": {"source_filename": os.path.basename(filepath), "error": "Could not read as text"}
                    }

    class functions:
        @staticmethod
        def SplitRecursively(text_field: str = "text_content", chunk_size: int = 1000, chunk_overlap: int = 200, id_fields: List[str] = None):
            print(f"[CocoIndex.functions.SplitRecursively] Initialized: text_field='{text_field}', chunk_size={chunk_size}, id_fields={id_fields}")
            
            def splitter(data_item: Dict[str, Any]) -> Iterator[Dict[str, Any]]:
                text_to_split = data_item.get(text_field, "")
                if not text_to_split:
                    data_item["chunk_id"] = data_item.get("doc_id", "unknown_doc") + "_chunk_0"
                    data_item["chunk_text"] = ""
                    yield data_item
                    return

                start = 0
                chunk_seq = 0
                base_id = "_".join(str(data_item.get(f, f"missing_{f}")) for f in id_fields) if id_fields else data_item.get("doc_id", "unknown_doc")
                
                while start < len(text_to_split):
                    end = start + chunk_size
                    chunk_text = text_to_split[start:end]
                    
                    new_item = data_item.copy()
                    del new_item["content"] # Assuming content was moved to text_field, and now chunked
                    if "text_content" in new_item: del new_item["text_content"]


                    new_item["chunk_id"] = f"{base_id}_chunk_{chunk_seq}"
                    new_item["chunk_text"] = chunk_text
                    new_item["metadata"] = new_item.get("metadata", {}).copy()
                    new_item["metadata"]["chunk_offset"] = start
                    new_item["metadata"]["original_doc_id"] = data_item.get("doc_id")
                    new_item["metadata"]["original_path"] = data_item.get("path")
                    yield new_item
                    
                    chunk_seq += 1
                    if end >= len(text_to_split):
                        break
                    start += chunk_size - chunk_overlap
            return splitter

        @staticmethod
        def SentenceTransformerEmbed(model_name: str, text_field: str = "chunk_text", embedding_field: str = "embedding"):
            print(f"[CocoIndex.functions.SentenceTransformerEmbed] Initialized: model='{model_name}', text_field='{text_field}', embedding_field='{embedding_field}'")
            
            # Placeholder for actual SentenceTransformer model
            class _MockSentenceTransformer:
                def __init__(self, model_name):
                    self.model_name = model_name
                    print(f"    (MockSentenceTransformer: Loaded model {self.model_name})")
                
                def encode(self, texts: List[str], show_progress_bar: bool = False) -> List[List[float]]:
                    print(f"    (MockSentenceTransformer: Encoding {len(texts)} texts: '{str(texts)[:50]}...')")
                    # Simulate varying embedding sizes based on model name for realism
                    dim = 384 if "all-MiniLM" in self.model_name else 768
                    return [[0.1 + i*0.01] * dim for i, _ in enumerate(texts)]

            model = _MockSentenceTransformer(model_name)

            def embedder(data_item_or_list: Any) -> Any: # Can be single item or list
                is_list = isinstance(data_item_or_list, list)
                items_to_process = data_item_or_list if is_list else [data_item_or_list]
                
                texts_to_embed = [item.get(text_field, "") for item in items_to_process]
                
                if any(texts_to_embed): # Only call encode if there's text
                    embeddings = model.encode(texts_to_embed)
                    for item, emb in zip(items_to_process, embeddings):
                        item[embedding_field] = emb
                else: # Handle cases with no text to avoid errors
                     for item in items_to_process:
                        item[embedding_field] = []


                return items_to_process if is_list else items_to_process[0]
            return embedder
            
    class storages:
        @staticmethod
        def Postgres(database_url: str, table_name: str, primary_key_fields: List[str], vector_index: Dict = None, recreate_table: bool = False):
            print(f"[CocoIndex.storages.Postgres] Initialized: db_url='{database_url}', table='{table_name}'")
            print(f"    Primary Keys: {primary_key_fields}, Vector Index: {vector_index}, Recreate: {recreate_table}")
            
            def sink_function(data_item_or_list: Any): # Can be single item or list
                items_to_store = data_item_or_list if isinstance(data_item_or_list, list) else [data_item_or_list]
                
                print(f"    (Postgres Sink): Received {len(items_to_store)} item(s) to store in '{table_name}'.")
                for item in items_to_store:
                    pk_values = {pkf: item.get(pkf) for pkf in primary_key_fields}
                    # print(f"      Storing item with PK {pk_values} (Embedding: {str(item.get('embedding', [])[:3])}... )")
                # In a real scenario, this would connect to PostgreSQL and perform INSERT/UPSERT.
                # It would use psycopg2-binary or similar.
                # Example:
                # conn = psycopg2.connect(database_url)
                # cur = conn.cursor()
                # For vector_index, it might execute: CREATE INDEX IF NOT EXISTS ... ON table_name USING hnsw (embedding_field vector_cosine_ops);
                # cur.execute("INSERT INTO ... VALUES ... ON CONFLICT DO UPDATE ...")
                # conn.commit()
                # cur.close()
                # conn.close()
                pass # Placeholder does not actually store.
            return sink_function

    @staticmethod
    def flow_def(name: str):
        print(f"[CocoIndex.flow_def] Defining flow: {name}")
        def decorator(func):
            def wrapper(*args, **kwargs):
                print(f"[CocoIndex.flow_def] Running flow: {name}")
                return func(*args, **kwargs)
            return wrapper
        return decorator

    class Flow:
        def __init__(self, source, processors: List, sink=None):
            self.source = source
            self.processors = processors
            self.sink = sink
            print("[CocoIndex.Flow] Initialized with source, processors, and sink.")

        def run(self):
            print("[CocoIndex.Flow] Starting run...")
            
            # Simulate data flowing from source
            current_data_stream = self.source

            # Apply each processor
            for i, processor_func in enumerate(self.processors):
                print(f"  [Flow Step {i+1}]: Applying processor {processor_func.__name__ if hasattr(processor_func, '__name__') else type(processor_func)}")
                
                # This simplified simulation assumes processors can handle iterators and yield iterators
                # or directly transform items. A real CocoIndex flow runner is more sophisticated.
                output_stream = []
                for item in current_data_stream: # item from previous step
                    processed_item_or_items = processor_func(item) # processor_func might return one or many (e.g. splitter)
                    if isinstance(processed_item_or_items, list) or isinstance(processed_item_or_items, Iterator):
                        output_stream.extend(list(processed_item_or_items))
                    else: # single item
                        output_stream.append(processed_item_or_items)
                current_data_stream = output_stream
            
            final_items = list(current_data_stream)
            print(f"  [Flow]: {len(final_items)} items generated after all processing steps.")

            if self.sink:
                print("  [Flow]: Sending items to sink...")
                # In a real system, sink might batch or handle items as they come.
                self.sink(final_items) 
                print("  [Flow]: All items sent to sink.")
            else:
                print("  [Flow]: No sink configured. Final items (first 3 shown):")
                for item in final_items[:3]:
                    print(f"    {str(item)[:250]}...")

            print("[CocoIndex.Flow] Run finished.")


# --- Text Extraction Functions (copied from previous script, slightly adapted) ---

def extract_text_from_pdf_placeholder(file_path: str) -> str:
    return f"Extracted text from PDF: {os.path.basename(file_path)}."

def extract_text_from_docx_placeholder(file_path: str) -> str:
    return f"Extracted text from DOCX: {os.path.basename(file_path)}."

def map_extract_text_from_file(item: Dict[str, Any]) -> Dict[str, Any]:
    file_path = item.get("path")
    content = item.get("content", "") 
    item_copy = item.copy() # Work on a copy

    if not file_path:
        item_copy["text_content"] = ""
        item_copy["metadata"]["extraction_error"] = "Missing file path"
        return item_copy

    _, extension = os.path.splitext(file_path.lower())
    extracted_text = ""

    if extension in [".txt", ".md"]:
        extracted_text = content
    elif extension == ".pdf":
        extracted_text = extract_text_from_pdf_placeholder(file_path)
    elif extension == ".docx":
        extracted_text = extract_text_from_docx_placeholder(file_path)
    else:
        extracted_text = content if content else f"Unsupported file type: {extension}"
    
    item_copy["text_content"] = extracted_text
    return item_copy


# --- CocoIndex Flow Definition ---

@cocoindex.flow_def(name="FullDocumentPipeline")
def full_document_pipeline():
    """
    Defines the full data pipeline:
    1. Reads files from './sample_documents/'.
    2. Extracts text content.
    3. Splits text into chunks.
    4. Generates embeddings for chunks.
    5. Stores chunks and embeddings in PostgreSQL.
    """
    print("\n--- Defining Full Document Pipeline ---")

    # 1. Configure Data Source
    file_source = cocoindex.sources.LocalFile(
        path="./sample_documents/",
        file_filter=[".txt", ".md", ".pdf", ".docx"],
        recursive=True
    )

    # 2. Configure Text Extraction (as a map function)
    # (map_extract_text_from_file is defined above)

    # 3. Configure Text Splitting
    text_splitter = cocoindex.functions.SplitRecursively(
        text_field="text_content",
        chunk_size=300, # Smaller for more demo chunks
        chunk_overlap=30,
        id_fields=["doc_id"] # Used to create unique chunk_id
    )

    # 4. Configure Embedding Generation
    embedder = cocoindex.functions.SentenceTransformerEmbed(
        model_name='sentence-transformers/all-MiniLM-L6-v2', # Common model
        text_field="chunk_text",      # Input field from the splitter
        embedding_field="embedding"   # Output field for the vector
    )

    # 5. Configure Data Sink (PostgreSQL)
    # Ensure your PostgreSQL (e.g., from Docker in Step 1) is running and accessible.
    # The database 'coco_database' with user 'coco_user' should exist.
    # The pgvector extension should be enabled in 'coco_database'.
    pg_sink = cocoindex.storages.Postgres(
        database_url="postgresql://coco_user:coco_password@localhost:5432/coco_database",
        table_name="document_embeddings",
        primary_key_fields=["chunk_id"], # Unique ID for each chunk
        vector_index={
            "field_name": "embedding",        # The column containing vectors
            "metric": "CosineSimilarity",     # Or "L2Distance", "InnerProduct"
            "index_type": "hnsw",             # pgvector index type (e.g., hnsw, ivfflat)
            # "options": {"m": 16, "ef_construction": 64} # Example options for HNSW
        },
        recreate_table=True # For demonstration, recreate table on each run
    )

    # Define the flow execution
    simulated_flow = cocoindex.Flow(
        source=file_source,
        processors=[
            map_extract_text_from_file, # Step 2
            text_splitter,              # Step 3
            embedder                    # Step 4
        ],
        sink=pg_sink                      # Step 5
    )
    
    print("\n--- Simulating Full Document Pipeline ---")
    simulated_flow.run()
    print("--- Flow Simulation Complete ---")
    print("\nIn a real scenario, data would now be in your PostgreSQL table 'document_embeddings'.")
    print("You would need 'sentence-transformers' and 'psycopg2-binary' installed.")
    print("Make sure PostgreSQL server is running and pgvector is enabled.")


# --- Main Execution Block ---
if __name__ == "__main__":
    print("Starting full document embedding and indexing pipeline demonstration...\n")

    # Create sample_documents directory and files if they don't exist
    sample_docs_dir = "./sample_documents"
    if not os.path.exists(sample_docs_dir):
        os.makedirs(sample_docs_dir)
        print(f"Created '{sample_docs_dir}' directory for sample files.")
        with open(os.path.join(sample_docs_dir, "plain_text_example.txt"), "w") as f: f.write("This is a simple plain text file for CocoIndex.")
        with open(os.path.join(sample_docs_dir, "markdown_example.md"), "w") as f: f.write("# Markdown Test\nCocoIndex can process markdown content.")
        with open(os.path.join(sample_docs_dir, "dummy_document.pdf"), "w") as f: f.write("Dummy PDF content (mocked extraction).")
        with open(os.path.join(sample_docs_dir, "dummy_document.docx"), "w") as f: f.write("Dummy DOCX content (mocked extraction).")

    full_document_pipeline()

    print("\nDemonstration finished.")
    print("To implement this for real:")
    print("1. Install CocoIndex and other libraries: pip install cocoindex pypdf python-docx sentence-transformers psycopg2-binary")
    print("2. Ensure your PostgreSQL server with pgvector is running and configured as per the script's database_url.")
    print("3. Replace placeholder CocoIndex modules and functions with actual implementations.")
```
