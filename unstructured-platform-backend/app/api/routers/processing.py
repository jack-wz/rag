from __future__ import annotations

import json
import logging
import os
import tempfile
from typing import Any, Dict, List, Optional, Tuple

from fastapi import APIRouter, File, Form, HTTPException, UploadFile

from app.core.schemas.flow import FlowEdge, FlowNode, ProcessingFlow

logger = logging.getLogger(__name__)

router = APIRouter()

try:  # pragma: no cover - exercised via tests with stubbed modules
    from unstructured.partition.auto import partition as _partition
    from unstructured.chunking.title import chunk_by_title as _chunk_by_title
    from unstructured.chunking.basic import chunk_elements as _chunk_elements_basic
    from unstructured.cleaners.core import clean_extra_whitespace as _clean_extra_whitespace
except ImportError:  # pragma: no cover - runtime fallback
    UNSTRUCTURED_AVAILABLE = False
    _partition = None
    _chunk_by_title = None
    _chunk_elements_basic = None

    def _clean_extra_whitespace(text: str) -> str:
        return text
else:  # pragma: no cover - exercised when full dependency installed
    UNSTRUCTURED_AVAILABLE = True


def string_to_bool(value: str) -> bool:
    return value.lower() == "true"


def elements_to_dicts(elements: List[Any]) -> List[Dict[str, Any]]:
    output: List[Dict[str, Any]] = []
    for el in elements:
        if isinstance(el, dict):
            output.append(el)
            continue
        try:
            el_dict = el.to_dict()  # type: ignore[call-arg]
            output.append(el_dict)
        except Exception:  # pragma: no cover - defensive
            output.append(
                {
                    "type": str(type(el)),
                    "text": getattr(el, "text", str(el)),
                    "metadata": getattr(el, "metadata", {}),
                }
            )
    return output


@router.post("/process-document/")
async def process_document(
    file: UploadFile = File(...),
    strategy: str = Form("auto"),
    remove_extra_whitespace: str = Form("true"),
    ocr_languages: Optional[str] = Form(None),
    pdf_infer_table_structure: str = Form("true"),
    extract_image_block_types: Optional[str] = Form(None),
    chunking_strategy: Optional[str] = Form("none"),
    chunk_max_characters: Optional[int] = Form(None),
    chunk_new_after_n_chars: Optional[int] = Form(None),
    chunk_combine_text_under_n_chars: Optional[int] = Form(None),
    chunk_overlap: Optional[int] = Form(None),
    chunk_multipage_sections: str = Form("true"),
):
    """Document processing endpoint powered by ``unstructured``.

    When the ``unstructured`` dependency is not available we transparently
    fall back to the simplified implementation so the endpoint keeps
    responding with useful placeholder data.
    """

    if not file.filename:
        raise HTTPException(status_code=400, detail="No file name provided.")

    if not UNSTRUCTURED_AVAILABLE or _partition is None:
        from . import processing_simple  # Local import to avoid circular dependency

        return await processing_simple.process_document(  # type: ignore[return-value]
            file=file,
            strategy=strategy,
            remove_extra_whitespace=remove_extra_whitespace,
            ocr_languages=ocr_languages,
            pdf_infer_table_structure=pdf_infer_table_structure,
            extract_image_block_types=extract_image_block_types,
            chunking_strategy=chunking_strategy,
            chunk_max_characters=chunk_max_characters,
            chunk_new_after_n_chars=chunk_new_after_n_chars,
            chunk_combine_text_under_n_chars=chunk_combine_text_under_n_chars,
            chunk_overlap=chunk_overlap,
            chunk_multipage_sections=chunk_multipage_sections,
        )

    contents = await file.read()
    file_extension = os.path.splitext(file.filename)[1]
    temp_file_path: Optional[str] = None

    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=file_extension) as tmp_file:
            tmp_file.write(contents)
            temp_file_path = tmp_file.name

        partition_kwargs: Dict[str, Any] = {"filename": temp_file_path, "strategy": strategy}
        if ocr_languages:
            partition_kwargs["ocr_languages"] = ocr_languages

        _pdf_infer_table_structure = string_to_bool(pdf_infer_table_structure)
        partition_kwargs["pdf_infer_table_structure"] = _pdf_infer_table_structure

        if extract_image_block_types and extract_image_block_types.strip():
            partition_kwargs["extract_image_block_types"] = [
                s.strip() for s in extract_image_block_types.split(",")
            ]
            if strategy == "hi_res":
                partition_kwargs["extract_images_in_pdf"] = True

        if chunking_strategy and chunking_strategy != "none":
            partition_kwargs["chunking_strategy"] = chunking_strategy
            if chunk_max_characters is not None:
                partition_kwargs["max_characters"] = chunk_max_characters
            if chunk_new_after_n_chars is not None:
                partition_kwargs["new_after_n_chars"] = chunk_new_after_n_chars
            if chunk_combine_text_under_n_chars is not None and chunking_strategy == "by_title":
                partition_kwargs["combine_text_under_n_chars"] = chunk_combine_text_under_n_chars
            if chunk_overlap is not None:
                partition_kwargs["overlap"] = chunk_overlap
            if chunking_strategy == "by_title":
                partition_kwargs["multipage_sections"] = string_to_bool(chunk_multipage_sections)

        elements = _partition(**partition_kwargs)  # type: ignore[misc]

        if string_to_bool(remove_extra_whitespace):
            for element in elements:
                if hasattr(element, "text") and isinstance(element.text, str):
                    element.text = _clean_extra_whitespace(element.text)

        return {"elements": elements_to_dicts(elements)}
    except Exception as exc:
        logger.exception("Error processing document")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to process document: {type(exc).__name__} - {exc}",
        )
    finally:
        if temp_file_path and os.path.exists(temp_file_path):
            os.remove(temp_file_path)
        await file.close()


INPUT_NODE_TYPE = "inputNode"
OUTPUT_NODE_TYPE = "outputNode"
PARTITION_NODE_TYPE = "partitionNode"
CHUNK_NODE_TYPE = "chunkNode"


def find_linear_path(nodes: List[FlowNode], edges: List[FlowEdge]) -> List[FlowNode]:
    input_nodes = [node for node in nodes if node.type == INPUT_NODE_TYPE]
    if not input_nodes:
        raise ValueError("No input node found in the provided nodes.")
    if len(input_nodes) > 1:
        raise ValueError("Multiple input nodes found; only one input node is supported for linear flows.")

    start_node = input_nodes[0]
    current_path: List[FlowNode] = [start_node]
    current_node = start_node
    visited_node_ids = {start_node.id}

    for _ in range(len(nodes)):
        if current_node.type == OUTPUT_NODE_TYPE:
            break

        outgoing_edges = [edge for edge in edges if edge.source == current_node.id]
        if not outgoing_edges:
            raise ValueError(
                f"Node path ends prematurely at node {current_node.id} ({current_node.type}) before an Output node."
            )
        if len(outgoing_edges) > 1:
            raise ValueError(
                f"Node {current_node.id} ({current_node.type}) has multiple outgoing paths; only linear flows supported."
            )

        target_node_id = outgoing_edges[0].target
        next_node_candidates = [node for node in nodes if node.id == target_node_id]
        if not next_node_candidates:
            raise ValueError(
                f"Target node {target_node_id} specified in edge from {current_node.id} not found in nodes list."
            )

        next_node = next_node_candidates[0]
        if next_node.id in visited_node_ids:
            raise ValueError(f"Cycle detected involving node {next_node.id} ({next_node.type}). Path cannot be linear.")

        current_path.append(next_node)
        visited_node_ids.add(next_node.id)
        current_node = next_node
    else:
        if current_path[-1].type != OUTPUT_NODE_TYPE:
            raise ValueError("Path did not end in an Output node.")

    if current_path[-1].type != OUTPUT_NODE_TYPE:
        raise ValueError("Path did not end in an Output node.")

    return current_path


def execute_flow_path(
    determined_path: List[FlowNode], temp_file_path: str
) -> Tuple[Any, Optional[List[Dict[str, Any]]], str]:
    current_data_payload: Any = temp_file_path
    processed_elements_for_response: Optional[List[Dict[str, Any]]] = None
    final_message = "Flow validation and file reception successful. Path determined."

    for node in determined_path:
        if node.type == INPUT_NODE_TYPE:
            logger.debug("Executing InputNode %s", node.id)
            continue

        if node.type == PARTITION_NODE_TYPE:
            if _partition is None:
                raise HTTPException(
                    status_code=503,
                    detail="Partition processing requires the unstructured package to be installed.",
                )
            if not isinstance(current_data_payload, str) or not os.path.exists(current_data_payload):
                raise HTTPException(
                    status_code=500,
                    detail=f"PartitionNode ({node.id}) requires a file path input.",
                )

            partition_params: Dict[str, Any] = {}
            node_config = node.config
            if node_config.strategy:
                partition_params["strategy"] = node_config.strategy
            if node_config.ocr_languages:
                partition_params["ocr_languages"] = node_config.ocr_languages
            if node_config.pdf_infer_table_structure is not None:
                partition_params["pdf_infer_table_structure"] = node_config.pdf_infer_table_structure
            if node_config.extract_image_block_types and node_config.extract_image_block_types.strip():
                partition_params["extract_image_block_types"] = [
                    s.strip() for s in node_config.extract_image_block_types.split(",")
                ]
                if node_config.strategy == "hi_res":
                    partition_params["extract_images_in_pdf"] = True

            elements = _partition(filename=current_data_payload, **partition_params)  # type: ignore[misc]

            if node_config.remove_extra_whitespace:
                for element in elements:
                    if hasattr(element, "text") and isinstance(element.text, str):
                        element.text = _clean_extra_whitespace(element.text)

            current_data_payload = elements
            processed_elements_for_response = elements_to_dicts(elements)
            final_message = f"Flow executed up to PartitionNode ({node.id})."
            logger.debug("PartitionNode %s produced %s elements", node.id, len(processed_elements_for_response))
            continue

        if node.type == CHUNK_NODE_TYPE:
            if _chunk_by_title is None or _chunk_elements_basic is None:
                raise HTTPException(
                    status_code=503,
                    detail="Chunk processing requires the unstructured package to be installed.",
                )
            if not isinstance(current_data_payload, list):
                raise HTTPException(
                    status_code=500,
                    detail=f"ChunkNode ({node.id}) expects a list of Unstructured elements as input.",
                )

            node_config = node.config
            chunk_params: Dict[str, Any] = {}
            if node_config.chunk_max_characters is not None:
                chunk_params["max_characters"] = node_config.chunk_max_characters
            if node_config.chunk_new_after_n_chars is not None:
                chunk_params["new_after_n_chars"] = node_config.chunk_new_after_n_chars
            if node_config.chunk_overlap is not None:
                chunk_params["overlap"] = node_config.chunk_overlap

            if node_config.chunking_strategy == "by_title":
                if node_config.chunk_combine_text_under_n_chars is not None:
                    chunk_params["combine_text_under_n_chars"] = node_config.chunk_combine_text_under_n_chars
                if node_config.chunk_multipage_sections is not None:
                    chunk_params["multipage_sections"] = node_config.chunk_multipage_sections
                chunked_elements = _chunk_by_title(elements=current_data_payload, **chunk_params)  # type: ignore[misc]
            elif node_config.chunking_strategy == "basic":
                chunked_elements = _chunk_elements_basic(elements=current_data_payload, **chunk_params)  # type: ignore[misc]
            elif node_config.chunking_strategy in (None, "none"):
                chunked_elements = current_data_payload
            else:
                raise HTTPException(
                    status_code=400,
                    detail=f"Unsupported chunking_strategy '{node_config.chunking_strategy}' for ChunkNode.",
                )

            current_data_payload = chunked_elements
            processed_elements_for_response = elements_to_dicts(chunked_elements)
            final_message = f"Flow executed up to ChunkNode ({node.id})."
            logger.debug("ChunkNode %s produced %s chunks", node.id, len(processed_elements_for_response))
            continue

        if node.type == OUTPUT_NODE_TYPE:
            final_message = "Flow executed successfully and reached OutputNode."
            if not processed_elements_for_response and isinstance(current_data_payload, list):
                processed_elements_for_response = elements_to_dicts(current_data_payload)
            break

        final_message = f"Flow execution stopped at unimplemented node type: {node.type}."
        if isinstance(current_data_payload, list):
            processed_elements_for_response = elements_to_dicts(current_data_payload)
        break

    return current_data_payload, processed_elements_for_response, final_message


@router.post("/process-flow/")
async def process_flow_with_file(
    flow_data_json: str = Form(...),
    file: UploadFile = File(...),
):
    try:
        flow_data_dict = json.loads(flow_data_json)
        flow_data = ProcessingFlow(**flow_data_dict)
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid JSON format for flow_data.")
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Error parsing flow_data: {exc}")

    if not flow_data.nodes:
        raise HTTPException(status_code=400, detail="Flow contains no nodes.")

    input_nodes_count = sum(1 for node in flow_data.nodes if node.type == INPUT_NODE_TYPE)
    output_nodes_count = sum(1 for node in flow_data.nodes if node.type == OUTPUT_NODE_TYPE)
    if input_nodes_count == 0:
        raise HTTPException(status_code=400, detail="Flow must contain at least one Input node.")
    if input_nodes_count > 1:
        raise HTTPException(status_code=400, detail="Simple linear flow supports only one Input node for now.")
    if output_nodes_count == 0:
        raise HTTPException(status_code=400, detail="Flow must contain at least one Output node.")
    if output_nodes_count > 1:
        raise HTTPException(status_code=400, detail="Simple linear flow supports only one Output node for now.")

    try:
        determined_path = find_linear_path(flow_data.nodes, flow_data.edges)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    if not file.filename:
        raise HTTPException(status_code=400, detail="No file name provided with the uploaded file.")

    temp_file_path: Optional[str] = None

    try:
        contents = await file.read()
        file_extension = os.path.splitext(file.filename)[1]
        with tempfile.NamedTemporaryFile(delete=False, suffix=file_extension) as tmp_file:
            tmp_file.write(contents)
            temp_file_path = tmp_file.name

        current_data_payload, processed_elements, final_message = execute_flow_path(
            determined_path, temp_file_path
        )

        response_payload: Dict[str, Any] = {
            "message": final_message,
            "determined_path": [{"id": node.id, "type": node.type} for node in determined_path],
            "received_filename": file.filename,
        }

        if processed_elements is not None:
            response_payload["processed_elements"] = processed_elements
        if isinstance(current_data_payload, str) and current_data_payload == temp_file_path:
            response_payload["output_is_input_temp_file"] = True

        return response_payload
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Unexpected error during flow execution")
        raise HTTPException(
            status_code=500,
            detail=f"Unexpected error during flow execution: {exc}",
        )
    finally:
        await file.close()
        if temp_file_path and os.path.exists(temp_file_path):
            try:
                os.remove(temp_file_path)
            except Exception:  # pragma: no cover - best effort cleanup
                logger.warning("Failed to clean up temporary file %s", temp_file_path)
