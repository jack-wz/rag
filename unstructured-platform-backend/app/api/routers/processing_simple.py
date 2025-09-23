from fastapi import APIRouter, File, UploadFile, Form, HTTPException
from typing import List, Dict, Any, Optional
import tempfile
import os
import json
import re

router = APIRouter()

SUPPORTED_EXTENSIONS = [".txt", ".pdf", ".docx", ".doc", ".html", ".md"]
TEXT_READABLE_EXTENSIONS = {".txt"}

# Helper to convert boolean form data
def string_to_bool(value: str) -> bool:
    return value.lower() == "true"


def collapse_whitespace(text: str) -> str:
    """Reduce consecutive whitespace characters to single spaces."""
    return re.sub(r"\s+", " ", text).strip()


def build_linear_flow_path(nodes: List[Dict[str, Any]], edges: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Validate flow data and return a single linear path from input to output."""

    input_nodes = [node for node in nodes if node.get("type") == "inputNode"]
    output_nodes = [node for node in nodes if node.get("type") == "outputNode"]

    if not input_nodes:
        raise ValueError("Flow must contain one input node.")
    if len(input_nodes) > 1:
        raise ValueError("Only single-input flows are supported in the simplified processor.")
    if not output_nodes:
        raise ValueError("Flow must contain one output node.")
    if len(output_nodes) > 1:
        raise ValueError("Only single-output flows are supported in the simplified processor.")

    nodes_by_id = {node.get("id"): node for node in nodes if node.get("id") is not None}
    if None in nodes_by_id:
        raise ValueError("All nodes must include an id.")

    current_node = input_nodes[0]
    path = [current_node]
    visited = {current_node.get("id")}

    for _ in range(len(nodes)):
        if current_node.get("type") == "outputNode":
            break

        outgoing = [edge for edge in edges if edge.get("source") == current_node.get("id")]
        if not outgoing:
            raise ValueError(f"Node {current_node.get('id')} does not connect to an output node.")
        if len(outgoing) > 1:
            raise ValueError(f"Node {current_node.get('id')} has multiple outgoing edges; only linear flows are supported.")

        next_id = outgoing[0].get("target")
        if next_id not in nodes_by_id:
            raise ValueError(f"Edge references unknown target node '{next_id}'.")
        if next_id in visited:
            raise ValueError("Cycle detected in flow; only linear paths are supported.")

        next_node = nodes_by_id[next_id]
        path.append(next_node)
        visited.add(next_id)
        current_node = next_node
    else:
        raise ValueError("Flow traversal did not reach an output node.")

    if path[-1].get("type") != "outputNode":
        raise ValueError("Flow must terminate at an output node.")

    return path

@router.post("/process-document/")
async def process_document(
    file: UploadFile = File(...),
    # Partitioning Params
    strategy: str = Form("auto"),
    remove_extra_whitespace: str = Form("true"),
    ocr_languages: Optional[str] = Form(None),
    pdf_infer_table_structure: str = Form("true"),
    extract_image_block_types: Optional[str] = Form(None),
    # Chunking Params
    chunking_strategy: Optional[str] = Form("none"),
    chunk_max_characters: Optional[int] = Form(None),
    chunk_new_after_n_chars: Optional[int] = Form(None),
    chunk_combine_text_under_n_chars: Optional[int] = Form(None),
    chunk_overlap: Optional[int] = Form(None),
    chunk_multipage_sections: str = Form("true")
):
    """简化版文档处理API - 暂时返回模拟数据，等待unstructured包安装"""
    
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file name provided.")

    contents = await file.read()
    file_extension = os.path.splitext(file.filename)[1].lower()
    
    # 基础文件类型检查
    if file_extension not in SUPPORTED_EXTENSIONS:
        raise HTTPException(
            status_code=400, 
            detail=f"Unsupported file type: {file_extension}. Supported types: {', '.join(SUPPORTED_EXTENSIONS)}"
        )
    
    # 简单的文本提取（仅支持.txt文件）
    if file_extension in TEXT_READABLE_EXTENSIONS:
        try:
            text_content = contents.decode('utf-8')
            
            # 简单的分块处理
            chunks = []
            if chunking_strategy == "none" or not chunking_strategy:
                chunks = [{
                    "type": "NarrativeText",
                    "text": text_content,
                    "metadata": {
                        "filename": file.filename,
                        "file_directory": "/tmp",
                        "filetype": "text/plain"
                    }
                }]
            else:
                # 简单按字符数分块
                max_chars = chunk_max_characters or 1000
                overlap = chunk_overlap or 0
                step = max(1, max_chars - overlap)

                for i in range(0, len(text_content), step):
                    chunk_text = text_content[i:i + max_chars]
                    if chunk_text.strip():
                        chunks.append({
                            "type": "NarrativeText",
                            "text": chunk_text,
                            "metadata": {
                                "filename": file.filename,
                                "file_directory": "/tmp",
                                "filetype": "text/plain",
                                "chunk_index": len(chunks)
                            }
                        })
            
            return {
                "elements": chunks,
                "metadata": {
                    "filename": file.filename,
                    "file_size": len(contents),
                    "processing_strategy": strategy,
                    "chunking_strategy": chunking_strategy,
                    "total_elements": len(chunks),
                    "note": "Simplified processing - full unstructured features pending dependency installation"
                }
            }
            
        except UnicodeDecodeError:
            raise HTTPException(status_code=400, detail="Unable to decode text file. Please ensure it's UTF-8 encoded.")
    
    else:
        # 对于其他文件类型，返回占位符响应
        return {
            "elements": [{
                "type": "Title",
                "text": f"Document: {file.filename}",
                "metadata": {
                    "filename": file.filename,
                    "file_directory": "/tmp",
                    "filetype": file.content_type or "application/octet-stream"
                }
            }, {
                "type": "NarrativeText",
                "text": f"This is a placeholder for {file_extension} file processing. Full document parsing requires the unstructured library to be installed.",
                "metadata": {
                    "filename": file.filename,
                    "file_directory": "/tmp",
                    "filetype": file.content_type or "application/octet-stream"
                }
            }],
            "metadata": {
                "filename": file.filename,
                "file_size": len(contents),
                "processing_strategy": strategy,
                "chunking_strategy": chunking_strategy,
                "total_elements": 2,
                "note": "Placeholder response - install unstructured library for full document processing"
            }
        }

@router.post("/process-flow/")
async def process_flow(
    flow_data_json: str = Form(...),
    file: UploadFile = File(...),
):
    """Simplified flow execution endpoint used by the frontend."""

    if not file.filename:
        raise HTTPException(status_code=400, detail="No file name provided.")

    try:
        flow_data = json.loads(flow_data_json)
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid JSON format for flow_data.")

    nodes = flow_data.get("nodes")
    edges = flow_data.get("edges")
    if not isinstance(nodes, list) or not isinstance(edges, list):
        raise HTTPException(status_code=400, detail="Flow data must include node and edge lists.")

    try:
        path_nodes = build_linear_flow_path(nodes, edges)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    try:
        contents = await file.read()
        file_extension = os.path.splitext(file.filename)[1].lower()

        if file_extension not in SUPPORTED_EXTENSIONS:
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported file type: {file_extension}. Supported types: {', '.join(SUPPORTED_EXTENSIONS)}",
            )

        metadata_base = {
            "filename": file.filename,
            "file_directory": "/tmp",
            "filetype": file.content_type or "application/octet-stream",
        }

        if file_extension in TEXT_READABLE_EXTENSIONS:
            try:
                text_content = contents.decode("utf-8")
            except UnicodeDecodeError as exc:
                raise HTTPException(status_code=400, detail="Unable to decode text file. Please ensure it's UTF-8 encoded.") from exc
        else:
            text_content = (
                f"Placeholder content for {file.filename}. "
                "Full parsing for this format requires additional document processing dependencies."
            )

        segments = [
            {
                "text": text_content,
                "metadata": {**metadata_base, "stage": "input"},
            }
        ]
        message_parts = ["Input node received file"]
        chunk_counter = 0

        for node in path_nodes[1:]:  # Skip the initial input node already handled
            node_type = node.get("type")
            node_config = node.get("config") or {}

            if node_type == "partitionNode":
                for seg in segments:
                    seg["metadata"].update(
                        {
                            "stage": "partition",
                            "partition_strategy": node_config.get("strategy", "auto"),
                        }
                    )
                message_parts.append("Partition step simulated")

            elif node_type == "cleanNode":
                should_clean = node_config.get("removeExtraWhitespace", True)
                if should_clean:
                    for seg in segments:
                        seg["text"] = collapse_whitespace(seg["text"])
                        seg["metadata"]["stage"] = "clean"
                    message_parts.append("Removed extra whitespace")
                else:
                    message_parts.append("Clean node skipped")

            elif node_type == "chunkNode":
                strategy = node_config.get("chunkingStrategy") or "none"
                if strategy != "none":
                    max_chars = node_config.get("chunkMaxCharacters") or 500
                    soft_limit = node_config.get("chunkNewAfterNChars")
                    overlap = node_config.get("chunkOverlap") or 0

                    if max_chars <= 0:
                        max_chars = 500
                    step = soft_limit if isinstance(soft_limit, int) and soft_limit > 0 else max_chars
                    step = max(step - overlap, 1)

                    new_segments = []
                    for seg in segments:
                        text_value = seg["text"]
                        base_metadata = seg["metadata"]
                        for start in range(0, len(text_value), step):
                            chunk_text = text_value[start:start + max_chars]
                            if not chunk_text.strip():
                                continue
                            chunk_metadata = {
                                **base_metadata,
                                "stage": "chunk",
                                "chunk_index": chunk_counter,
                                "chunking_strategy": strategy,
                            }
                            if node_config.get("chunkCombineTextUnderNChars") is not None:
                                chunk_metadata["combine_text_under_n_chars"] = node_config.get("chunkCombineTextUnderNChars")
                            if node_config.get("chunkMultipageSections") is not None:
                                chunk_metadata["multipage_sections"] = node_config.get("chunkMultipageSections")
                            new_segments.append({"text": chunk_text, "metadata": chunk_metadata})
                            chunk_counter += 1
                    if new_segments:
                        segments = new_segments
                    message_parts.append(f"Chunked text using '{strategy}' strategy")
                else:
                    message_parts.append("Chunk node skipped (strategy none)")

            elif node_type == "outputNode":
                message_parts.append("Output node reached")

            else:
                message_parts.append(f"Node type '{node_type}' not implemented in simplified flow; stopping.")
                break

        processed_elements = [
            {
                "type": "NarrativeText",
                "text": segment["text"],
                "metadata": segment["metadata"],
            }
            for segment in segments
            if segment["text"].strip()
        ]

        response = {
            "message": " -> ".join(message_parts),
            "processed_elements": processed_elements,
            "determined_path": [
                {"id": node.get("id"), "type": node.get("type")}
                for node in path_nodes
            ],
            "received_filename": file.filename,
            "note": "Simplified flow execution. Text parsing is fully supported; other formats return placeholder content.",
        }

        return response

    except HTTPException:
        raise
    except Exception as exc:  # pragma: no cover - safeguard for unexpected issues
        raise HTTPException(status_code=500, detail=f"Unexpected error during flow execution: {exc}") from exc
    finally:
        await file.close()


@router.get("/health")
async def processing_health():
    """处理模块健康检查"""
    return {
        "status": "ok",
        "module": "processing",
        "features": {
            "text_files": "supported",
            "pdf_files": "placeholder",
            "docx_files": "placeholder",
            "unstructured_library": "not_installed"
        }
    }

@router.get("/supported-formats")
async def get_supported_formats():
    """获取支持的文件格式"""
    return {
        "fully_supported": [".txt"],
        "placeholder_support": [".pdf", ".docx", ".doc", ".html", ".md"],
        "note": "Full format support requires unstructured library installation"
    }