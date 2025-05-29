from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from unstructured.partition.auto import partition
from unstructured.cleaners.core import clean_extra_whitespace
import tempfile
import os
from typing import List, Dict, Any

router = APIRouter()

def elements_to_dicts(elements: List[Any]) -> List[Dict[str, Any]]:
    """Converts a list of Unstructured Element objects to a list of dictionaries."""
    output = []
    for el in elements:
        try:
            # Attempt to convert element to dict; structure might vary
            # For now, using a simple approach; may need refinement based on Element type
            el_dict = el.to_dict() 
            output.append(el_dict)
        except Exception:
            # Fallback for elements that might not have a direct to_dict() or if it fails
            output.append({
                "type": str(type(el)),
                "text": getattr(el, "text", str(el)),
                "metadata": getattr(el, "metadata", {}).to_dict() if hasattr(getattr(el, "metadata", {}), "to_dict") else {}
            })
    return output

@router.post("/process-document/")
async def process_document(
    file: UploadFile = File(...),
    strategy: str = Form("auto"),
    remove_extra_whitespace: bool = Form(True)
):
    """
    Processes an uploaded document using the 'unstructured' library.
    - **file**: The document to process.
    - **strategy**: The partitioning strategy to use (e.g., "auto", "fast", "hi_res", "ocr_only").
    - **remove_extra_whitespace**: Whether to remove extra whitespace from the text.
    """
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file name provided.")

    contents = await file.read()
    
    # Create a temporary file to pass to unstructured's partition function,
    # as some strategies work best with a filename, especially for type detection or OCR.
    # Ensure the temp file has the correct extension for type detection.
    file_extension = os.path.splitext(file.filename)[1]
    
    temp_file_path = None
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=file_extension) as tmp_file:
            tmp_file.write(contents)
            temp_file_path = tmp_file.name
        
        # Determine partitioning parameters
        partition_kwargs = {"filename": temp_file_path, "strategy": strategy}
        if strategy == "ocr_only": # Some strategies might not use all cleaning params
            partition_kwargs["infer_table_structure"] = True # Example of strategy-specific param
            # hi_res_model_name can be added here if configurable
        
        elements = partition(**partition_kwargs)

        if remove_extra_whitespace:
            # Apply cleaning to text elements
            # Note: clean_extra_whitespace modifies elements in-place if they have a 'text' attribute
            # and are of a type that the cleaner supports (typically text-based elements).
            # For more complex scenarios, one might iterate and selectively clean.
             for element in elements:
                if hasattr(element, 'text') and isinstance(element.text, str):
                    element.text = clean_extra_whitespace(element.text)
                # TODO: Consider if metadata text fields also need cleaning.

        return {"elements": elements_to_dicts(elements)}

    except Exception as e:
        # Log the exception details for debugging on the server
        print(f"Error processing document: {e}") # Basic logging
        # Consider more structured logging in a real application
        raise HTTPException(status_code=500, detail=f"Failed to process document: {str(e)}")
    finally:
        if temp_file_path and os.path.exists(temp_file_path):
            os.remove(temp_file_path)
        if file:
            await file.close()
