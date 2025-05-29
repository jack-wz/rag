from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Depends
from unstructured.partition.auto import partition
from unstructured.chunking.title import chunk_by_title
from unstructured.chunking.basic import chunk_elements as chunk_elements_basic # alias to avoid name clash
from unstructured.cleaners.core import clean_extra_whitespace
import tempfile
import os
from typing import List, Dict, Any, Optional

router = APIRouter()

# Helper to convert boolean form data
def string_to_bool(value: str) -> bool:
    return value.lower() == "true"

# Pydantic model could be used here for better validation of Form data,
# but for direct Form(...) usage, we'll parse them individually.

def elements_to_dicts(elements: List[Any]) -> List[Dict[str, Any]]:
    output = []
    for el in elements:
        try:
            el_dict = el.to_dict()
            output.append(el_dict)
        except Exception:
            output.append({
                "type": str(type(el)),
                "text": getattr(el, "text", str(el)),
                "metadata": getattr(el, "metadata", {}).to_dict() if hasattr(getattr(el, "metadata", {}), "to_dict") else getattr(el, "metadata", {})
            })
    return output

@router.post("/process-document/")
async def process_document(
    file: UploadFile = File(...),
    # Partitioning Params
    strategy: str = Form("auto"),
    remove_extra_whitespace: str = Form("true"), # Receive as string, convert to bool
    ocr_languages: Optional[str] = Form(None), # E.g., "eng+deu"
    pdf_infer_table_structure: str = Form("true"), # Receive as string
    extract_image_block_types: Optional[str] = Form(None), # Comma-separated
    # Chunking Params
    chunking_strategy: Optional[str] = Form("none"),
    chunk_max_characters: Optional[int] = Form(None),
    chunk_new_after_n_chars: Optional[int] = Form(None),
    chunk_combine_text_under_n_chars: Optional[int] = Form(None),
    chunk_overlap: Optional[int] = Form(None),
    chunk_multipage_sections: str = Form("true") # Receive as string
):
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file name provided.")

    contents = await file.read()
    file_extension = os.path.splitext(file.filename)[1]
    temp_file_path = None

    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=file_extension) as tmp_file:
            tmp_file.write(contents)
            temp_file_path = tmp_file.name

        # Prepare partition kwargs
        partition_kwargs: Dict[str, Any] = {"filename": temp_file_path, "strategy": strategy}
        if ocr_languages:
            partition_kwargs["ocr_languages"] = ocr_languages
        
        # pdf_infer_table_structure is a top-level param for partition_pdf,
        # but for partition (auto), it's often tied to hi_res or specific handling.
        # We'll pass it if not None, unstructured handles if it's applicable.
        _pdf_infer_table_structure = string_to_bool(pdf_infer_table_structure)
        if _pdf_infer_table_structure is not None: # Check if it was provided
             partition_kwargs["pdf_infer_table_structure"] = _pdf_infer_table_structure


        if extract_image_block_types and extract_image_block_types.strip():
            # Pass as a list of strings
            partition_kwargs["extract_image_block_types"] = [s.strip() for s in extract_image_block_types.split(',')]
            # For image extraction to work, strategy often needs to be 'hi_res'
            # and relevant dependencies like detectron2 installed.
            # Also, extract_images_in_pdf=True might be needed if not implicitly handled by extract_image_block_types
            if strategy == "hi_res": # Or if auto resolves to hi_res for this file type
                 partition_kwargs["extract_images_in_pdf"] = True # Ensure this is set for hi_res PDF image extraction

        # Add chunking_strategy to partition_kwargs if a valid strategy is provided
        # This allows partition to handle chunking internally if supported
        if chunking_strategy and chunking_strategy != "none":
            partition_kwargs["chunking_strategy"] = chunking_strategy
            if chunk_max_characters is not None:
                partition_kwargs["max_characters"] = chunk_max_characters # used by internal chunk_elements
            if chunk_new_after_n_chars is not None:
                partition_kwargs["new_after_n_chars"] = chunk_new_after_n_chars
            if chunk_combine_text_under_n_chars is not None and chunking_strategy == "by_title":
                 partition_kwargs["combine_text_under_n_chars"] = chunk_combine_text_under_n_chars
            if chunk_overlap is not None:
                partition_kwargs["overlap"] = chunk_overlap
            if chunking_strategy == "by_title": # multipage_sections is specific to by_title
                 partition_kwargs["multipage_sections"] = string_to_bool(chunk_multipage_sections)


        elements = partition(**partition_kwargs)
        
        _remove_extra_whitespace = string_to_bool(remove_extra_whitespace)
        if _remove_extra_whitespace:
            for element in elements:
                if hasattr(element, 'text') and isinstance(element.text, str):
                    element.text = clean_extra_whitespace(element.text)

        return {"elements": elements_to_dicts(elements)}

    except Exception as e:
        print(f"Error processing document: {type(e).__name__} - {e}")
        raise HTTPException(status_code=500, detail=f"Failed to process document: {type(e).__name__} - {str(e)}")
    finally:
        if temp_file_path and os.path.exists(temp_file_path):
            os.remove(temp_file_path)
        if file:
            await file.close()

# Import the flow schemas
from app.core.schemas.flow import ProcessingFlow, FlowNode, FlowEdge

@router.post("/process-flow/")
async def process_flow(flow_data: ProcessingFlow):
    """
    Placeholder endpoint to receive a processing flow definition.
    Currently, it only logs the received flow and returns a confirmation.
    """
    # Log the received flow data (using print for simplicity in sandbox, use logger in production)
    print("Received processing flow:")
    print(flow_data.model_dump_json(indent=2))

    # You can access individual parts like:
    # print("Nodes:", flow_data.nodes)
    # print("Edges:", flow_data.edges)
    # for node in flow_data.nodes:
    #     print(f"Node ID: {node.id}, Type: {node.type}, Config: {node.config}")

    return {
        "message": "Flow received successfully. Processing not yet implemented.",
        "received_flow": flow_data.model_dump()
    }
