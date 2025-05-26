# CocoIndex with PostgreSQL and pgvector Docker Setup

This guide provides instructions to set up a Docker environment containing PostgreSQL with the pgvector extension enabled, and CocoIndex installed. It also explains how to configure CocoIndex to connect to this database.

## Prerequisites

*   Docker installed on your system.

## 1. Build the Docker Image

Navigate to the directory containing the `Dockerfile` and `init-db.sh` script. Run the following command to build the Docker image:

```bash
docker build -t cocoindex-postgres .
```

## 2. Run the Docker Container

Once the image is built, you can run a container. This command will start a PostgreSQL server in the background, initialize it with the pgvector extension, and make it accessible on port 5432.

```bash
docker run -d \
  --name coco-db \
  -e POSTGRES_USER=coco_user \
  -e POSTGRES_PASSWORD=coco_password \
  -e POSTGRES_DB=coco_database \
  -p 5432:5432 \
  cocoindex-postgres
```

**Explanation of `docker run` options:**

*   `-d`: Run the container in detached mode (in the background).
*   `--name coco-db`: Assign a name to the container for easier management.
*   `-e POSTGRES_USER=coco_user`: Sets the default PostgreSQL superuser.
*   `-e POSTGRES_PASSWORD=coco_password`: Sets the password for the PostgreSQL superuser.
*   `-e POSTGRES_DB=coco_database`: Creates a default database named `coco_database`. The `init-db.sh` script will then enable the `vector` extension in this database.
*   `-p 5432:5432`: Maps port 5432 of the host machine to port 5432 of the container, allowing you to connect to PostgreSQL from your host.
*   `cocoindex-postgres`: The name of the image to use.

You can check if the container is running using `docker ps`.
To see the logs of the PostgreSQL server and the initialization script:
```bash
docker logs coco-db
```
You should see messages indicating that the database system is ready to accept connections and that the `vector` extension has been created.

## 3. Configure CocoIndex to Connect to PostgreSQL

CocoIndex (assumed to be a Python library) would typically be configured by providing a database connection URL and potentially other parameters for specifying how vectors are stored and indexed.

**Database Connection URL Format:**

The general format for a PostgreSQL connection URL is:
`postgresql://<username>:<password>@<host>:<port>/<database_name>`

Based on the `docker run` command above, the connection URL to the PostgreSQL instance in the Docker container would be:

`postgresql://coco_user:coco_password@localhost:5432/coco_database`

*   **username**: `coco_user`
*   **password**: `coco_password`
*   **host**: `localhost` (since we mapped the container's port 5432 to the host's port 5432)
*   **port**: `5432`
*   **database_name**: `coco_database`

**Example CocoIndex Configuration (Conceptual):**

The exact configuration will depend on CocoIndex's API. Below is a *hypothetical* Python example of how you might initialize CocoIndex:

```python
from cocoindex import CocoIndex, StorageConfig, IndexConfig

# Database connection URL
db_url = "postgresql://coco_user:coco_password@localhost:5432/coco_database"

# Configuration for storing vectors in PostgreSQL with pgvector
# These are example parameters; refer to CocoIndex documentation for actual names and values.
storage_config = StorageConfig(
    db_url=db_url,
    table_name="vector_embeddings",  # Name of the table to store vectors
    vector_dimension=768,          # Dimension of your vectors (e.g., 768 for many sentence transformers)
    # Potentially other pgvector specific parameters if CocoIndex supports them,
    # such as specifying index types (e.g., HNSW, IVFFlat) or distance metrics.
)

# Configuration for the index (if separate from storage)
index_config = IndexConfig(
    # Parameters related to how pgvector should index the vectors for efficient search
    # e.g., index_type='hnsw', m=16, ef_construction=64
    # These would be translated by CocoIndex into pgvector index creation commands.
)

# Initialize CocoIndex
# The exact class and method names might differ.
try:
    coco_client = CocoIndex(storage_config=storage_config, index_config=index_config)
    print("CocoIndex initialized successfully and connected to PostgreSQL.")

    # Example usage (hypothetical):
    # embedding = [0.1] * 768  # Example embedding
    # metadata = {"document_id": "doc123"}
    # coco_client.add_embedding(embedding, metadata)
    # results = coco_client.search_similar(embedding, top_k=5)
    # print(f"Search results: {results}")

except Exception as e:
    print(f"Error initializing CocoIndex or connecting to the database: {e}")
    print("Please ensure the Docker container 'coco-db' is running and accessible.")
    print("Also, verify your CocoIndex installation and configuration parameters.")

```

**Key considerations for CocoIndex configuration with pgvector:**

*   **Database URL**: Ensure this accurately points to your PostgreSQL instance.
*   **Vector Dimension**: This must match the dimension of the vectors you intend to store (e.g., embeddings from a specific model). pgvector requires this.
*   **Table and Column Names**: CocoIndex will likely manage creating a table and specific columns for IDs, vectors, and metadata. You might be able to configure these names.
*   **pgvector Index Parameters**: For efficient similarity search, pgvector allows creating indexes on vector columns (e.g., `CREATE INDEX ON items USING hnsw (embedding vector_l2_ops);`). CocoIndex should ideally provide a way to specify these index types (like HNSW or IVFFlat) and their respective parameters (e.g., `m`, `ef_construction` for HNSW) during setup or table creation. Refer to the [pgvector documentation](https://github.com/pgvector/pgvector) for details on index types and distance functions.
*   **Distance Metrics**: pgvector supports L2 distance, inner product, and cosine distance. CocoIndex should allow you to specify which metric to use, which is crucial for the relevance of search results.

**Always refer to the official CocoIndex documentation for the correct and most up-to-date configuration parameters and API usage.**

## 4. Accessing PostgreSQL Directly

You can connect to the PostgreSQL database directly using `psql` or any other PostgreSQL client:

```bash
psql "postgresql://coco_user:coco_password@localhost:5432/coco_database"
```

Inside `psql`, you can verify that the `vector` extension is enabled:
```sql
\dx
```
You should see `vector` listed. You can also check the tables CocoIndex creates.

## Stopping and Removing the Container

To stop the container:
```bash
docker stop coco-db
```

To remove the container (this will delete the data in the database unless you have set up persistent volumes):
```bash
docker rm coco-db
```
