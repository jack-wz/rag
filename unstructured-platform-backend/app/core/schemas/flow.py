from pydantic import BaseModel
from typing import List, Optional


class NodeConfig(BaseModel):
    """
    Represents the configuration for a node.
    This model includes common and specific fields that might be present
    in a node's 'data' or 'config' object from the frontend.
    """
    label: Optional[str] = None # Common field for all nodes

    # Partitioning specific
    strategy: Optional[str] = None
    ocr_languages: Optional[str] = None
    pdf_infer_table_structure: Optional[bool] = None
    extract_image_block_types: Optional[str] = None
    # Comma-separated initially from form

    # Cleaning specific (also used in partitioning)
    remove_extra_whitespace: Optional[bool] = None

    # Chunking specific
    chunking_strategy: Optional[str] = None
    chunk_max_characters: Optional[int] = None
    chunk_new_after_n_chars: Optional[int] = None
    chunk_combine_text_under_n_chars: Optional[int] = None
    chunk_overlap: Optional[int] = None
    chunk_multipage_sections: Optional[bool] = None

    # LLM Extract specific
    extraction_prompt: Optional[str] = None
    ollama_server_url: Optional[str] = None
    ollama_model_name: Optional[str] = None
    ollama_temperature: Optional[float] = None

    # Allow any other fields as nodes might have diverse configurations not explicitly defined
    class Config:
        extra = "allow"


class FlowNode(BaseModel):
    id: str
    type: str
    config: NodeConfig # Using the detailed NodeConfig


class FlowEdge(BaseModel):
    id: str
    source: str
    target: str


class ProcessingFlow(BaseModel):
    nodes: List[FlowNode]
    edges: List[FlowEdge]
