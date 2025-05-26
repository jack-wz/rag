# Semantic Search Functionality Overview

This document provides an overview of how to perform semantic searches on the data indexed in the PostgreSQL database by the `embedding_and_indexing_pipeline.py` script. This pipeline processes documents, generates embeddings, and stores them in the `document_embeddings` table, enabling powerful search capabilities.

## 1. Introduction to Semantic Search

**Semantic search** goes beyond keyword matching. Instead of just looking for exact words, it tries to understand the *meaning* and *context* behind a user's query and the documents in the knowledge base. This allows it to find more relevant results, even if the wording is different.

For example, a semantic search for "how to make a computer faster" might find documents titled "speeding up your PC" or "optimizing system performance," which keyword search might miss.

This capability is powered by **vector embeddings**. Documents (or chunks of documents) are converted into numerical representations (vectors) that capture their semantic meaning. When a user queries, their query is also converted into a vector. The system then searches for document vectors that are "closest" or most similar to the query vector in the high-dimensional vector space.

## 2. Querying pgvector in PostgreSQL

The `embedding_and_indexing_pipeline.py` script uses PostgreSQL with the **pgvector** extension. pgvector enhances PostgreSQL by adding new data types (like `vector`) and operators to perform similarity searches directly within the database.

Key pgvector similarity operators include:

*   `<->`: **L2 Distance** (Euclidean distance). Lower values mean more similar.
*   `<=>`: **Cosine Distance**. Lower values mean more similar (0 for identical, >0 for different). Cosine Similarity is `1 - Cosine Distance`.
*   `<#>`: **Negative Inner Product**. Lower values mean more similar. For normalized vectors (like those from many sentence transformers), Negative Inner Product is equivalent to L2 Distance and related to Cosine Similarity.

The pipeline, as configured in `embedding_and_indexing_pipeline.py` (conceptually, via `cocoindex.storages.Postgres`), would typically set up an index using one of these metrics. The example used **CosineSimilarity** for the `vector_index` configuration, so the `<=>` operator is most relevant for finding items with the smallest cosine distance (which means highest cosine similarity).

## 3. Example SQL Queries

To search the `document_embeddings` table, you'll need a query embedding. This embedding must be generated from the user's search query using the *exact same sentence transformer model* that was used during the indexing pipeline (e.g., `sentence-transformers/all-MiniLM-L6-v2`).

Let's assume you have a query embedding vector `[0.123, 0.456, ..., 0.789]`.

Here's how you might query the `document_embeddings` table:

```sql
-- Placeholder for the actual query embedding vector.
-- In a real application, this vector would be passed as a parameter.
-- For this example, let's represent it as a string that needs to be cast to a vector.
-- The dimension (e.g., 384 for all-MiniLM-L6-v2) must match your embeddings.
SET my_query_embedding = '[0.123, 0.456, ..., 0.789]'; -- Replace with actual vector of correct dimension

SELECT
    chunk_id,      -- The unique ID of the document chunk
    chunk_text,    -- The actual text content of the chunk
    doc_id,        -- The ID of the original document this chunk belongs to
    metadata,      -- Any other stored metadata (e.g., source_filename, chunk_offset)
    embedding <=> CAST(current_setting('my_query_embedding') AS vector) AS cosine_distance
FROM
    document_embeddings
ORDER BY
    embedding <=> CAST(current_setting('my_query_embedding') AS vector)
LIMIT 10;
```

**Explanation:**

*   **`SET my_query_embedding = ...`**: This is a way to use a placeholder for your query embedding in psql or similar tools. In an application, you'd pass this vector as a parameter in your SQL query. The vector *must* be of the same dimension as the `embedding` column (e.g., 384 for `all-MiniLM-L6-v2`).
*   **`CAST(current_setting('my_query_embedding') AS vector)`**: Converts the string representation of the query embedding into pgvector's `vector` type.
*   **`embedding <=> ... AS cosine_distance`**: This calculates the cosine distance between the stored `embedding` in the table and your query embedding. A smaller distance means higher similarity.
*   **`ORDER BY embedding <=> ...`**: This is the core of the semantic search. It sorts the results by their similarity to the query embedding, bringing the most relevant chunks to the top.
*   **`LIMIT 10`**: Retrieves the top 10 most similar document chunks.
*   **Selected Fields**:
    *   `chunk_id`: Useful for uniquely identifying the result.
    *   `chunk_text`: The actual content to display to the user.
    *   `doc_id`: Helps trace back to the original source document.
    *   `metadata`: Can provide additional context (like original filename, page number, etc.).
    *   `cosine_distance`: The calculated similarity score. You might want to convert this to similarity (`1 - cosine_distance`) for display.

**Note on Similarity vs. Distance:**
If your vector index was created for Cosine Similarity, pgvector's operators still often work with *distance*.
*   `<=>` (Cosine Distance): `0` is most similar, `1` is neutral, `2` is most dissimilar.
*   To get a "similarity score" from `0` to `1` (where `1` is most similar) from cosine distance: `similarity = 1 - cosine_distance`.

If you are using an index (like HNSW) that was created with `vector_cosine_ops`, the query will be efficient.

## 4. Application Layer Integration

A typical application (e.g., a web service or a Python script) would integrate this search functionality as follows:

1.  **Receive User Query**: The application gets a natural language query from the user (e.g., through a search bar).
2.  **Generate Query Embedding**:
    *   It uses the *same sentence transformer model* (e.g., `sentence-transformers/all-MiniLM-L6-v2` loaded via the `sentence-transformers` Python library) that was used in `embedding_and_indexing_pipeline.py` to convert the user's text query into a query vector.
3.  **Construct and Execute SQL Query**:
    *   The application backend (e.g., using Python with `psycopg2` or an ORM like SQLAlchemy) dynamically constructs the SQL query shown above.
    *   The generated query vector is passed as a parameter to this SQL query, replacing the placeholder.
4.  **Process and Present Results**:
    *   The application receives the search results (e.g., `chunk_text`, `doc_id`, similarity scores) from PostgreSQL.
    *   It might perform additional processing (like highlighting, linking to original documents, converting distance to similarity score).
    *   Finally, it presents these formatted results to the user.

This approach ensures that the search is fast and relevant because the core similarity computation happens efficiently in the database, close to the data, leveraging pgvector's specialized indexing.

## 5. Conclusion

By using vector embeddings and pgvector, the indexed document chunks can be searched semantically, providing a powerful way to discover information within your knowledge base. The combination of a sentence transformer model for embedding generation and PostgreSQL with pgvector for storage and search offers a robust solution. Remember that the key to relevant search results is using the *same embedding model* for both indexing and querying.
```
