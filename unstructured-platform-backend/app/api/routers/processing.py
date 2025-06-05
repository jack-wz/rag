from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Depends
from unstructured.partition.auto import partition
from unstructured.chunking.title import chunk_by_title
from unstructured.chunking.basic import chunk_elements as chunk_elements_basic # alias to avoid name clash
from unstructured.cleaners.core import clean_extra_whitespace
import tempfile
import os
from typing import List, Dict, Any, Optional, Union

router = APIRouter()

# Helper to convert boolean form data
def string_to_bool(value: Union[str, bool, None]) -> Optional[bool]:
    """Convert common truthy/falsey form values to ``bool``.

    Returns ``None`` when ``value`` is ``None`` to make the conversion safe for
    optional form fields.
    """
    if value is None:
        return None
    if isinstance(value, bool):
        return value
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
from typing import List, Dict, Any, Optional # Added Dict, Any, Optional for broader use
import json # For parsing JSON string from FormData

# Frontend node types (as strings)
INPUT_NODE_TYPE = "inputNode"
OUTPUT_NODE_TYPE = "outputNode"
PARTITION_NODE_TYPE = "partitionNode"
CHUNK_NODE_TYPE = "chunkNode" # Added ChunkNode type

def find_linear_path(nodes: List[FlowNode], edges: List[FlowEdge]) -> List[FlowNode]:
    """
    Finds a single linear path from an input node to an output node.
    Raises ValueError if the flow is not a valid linear path.
    """
    input_nodes = [node for node in nodes if node.type == INPUT_NODE_TYPE]
    if not input_nodes: # This check is also done before calling, but good for robustness
        raise ValueError("No input node found in the provided nodes.")
    if len(input_nodes) > 1: # Also checked before, but good for robustness
        raise ValueError("Multiple input nodes found; only one input node is supported for linear flows.")
    
    start_node = input_nodes[0]
    current_path: List[FlowNode] = [start_node]
    current_node = start_node
    
    # Visited set to detect cycles that are not direct back-edges
    visited_node_ids = {start_node.id} 

    for _ in range(len(nodes)): # Max iterations to prevent infinite loops in complex non-linear graphs
        if current_node.type == OUTPUT_NODE_TYPE:
            break # Path successfully reached an output node

        outgoing_edges = [edge for edge in edges if edge.source == current_node.id]

        if not outgoing_edges:
            if current_node.type != OUTPUT_NODE_TYPE: # Should be caught by loop condition, but as safeguard
                raise ValueError(f"Node path ends prematurely at node {current_node.id} ({current_node.type}) before an Output node.")
            break # Valid end if it's an output node (already handled by loop condition)

        if len(outgoing_edges) > 1:
            raise ValueError(f"Node {current_node.id} ({current_node.type}) has multiple outgoing paths; only linear flows supported.")

        target_node_id = outgoing_edges[0].target
        
        next_node_candidates = [node for node in nodes if node.id == target_node_id]
        if not next_node_candidates:
            raise ValueError(f"Target node {target_node_id} specified in edge from {current_node.id} not found in nodes list.")
        
        next_node = next_node_candidates[0]

        if next_node.id in visited_node_ids: # Cycle detection
             # This check is more general than just next_node in current_path for direct back-edges
            raise ValueError(f"Cycle detected involving node {next_node.id} ({next_node.type}). Path cannot be linear.")

        current_path.append(next_node)
        visited_node_ids.add(next_node.id)
        current_node = next_node
    else: # Loop completed without breaking (i.e., didn't reach output node within len(nodes) steps)
        if current_path[-1].type != OUTPUT_NODE_TYPE:
            raise ValueError("Path did not end in an Output node after traversing all possible steps, or too many nodes for a linear path.")

    if current_path[-1].type != OUTPUT_NODE_TYPE: # Final check after loop
         raise ValueError("Path did not end in an Output node.")
        
    return current_path


@router.post("/process-flow/")
async def process_flow_with_file(
    flow_data_json: str = Form(...),
    file: UploadFile = File(...)
):
    """
    Receives a processing flow definition (JSON string) and an uploaded file.
    Validates the flow, determines the linear path, and saves the file temporarily.
    Actual processing of the flow with the file is not yet implemented.
    """
    # 1. Deserialize Flow Data
    try:
        flow_data_dict = json.loads(flow_data_json)
        flow_data = ProcessingFlow(**flow_data_dict)
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid JSON format for flow_data.")
    except Exception as e: # Catch Pydantic validation errors or other issues
        raise HTTPException(status_code=400, detail=f"Error parsing flow_data: {str(e)}")

    # 2. Basic Flow Validation (using parsed flow_data)
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

    # 3. Call Traversal Function
    try:
        determined_path = find_linear_path(flow_data.nodes, flow_data.edges)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    # 4. Process Uploaded File (Temporarily) and Execute Flow
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file name provided with the uploaded file.")

    temp_file_path: Optional[str] = None # Ensure temp_file_path is defined in the outer scope for finally
    
    try:
        # Save uploaded file temporarily
        contents = await file.read()
        file_extension = os.path.splitext(file.filename)[1]
        with tempfile.NamedTemporaryFile(delete=False, suffix=file_extension) as tmp_file:
            tmp_file.write(contents)
            temp_file_path = tmp_file.name
        
        print(f"Uploaded file saved temporarily to: {temp_file_path}")

        # --- Start of Node Execution Logic ---
        current_data_payload: Any = temp_file_path # Initially, the path to the input file
        processed_elements_for_response: Optional[List[Dict[str, Any]]] = None
        final_message = "Flow validation and file reception successful. Path determined, execution started."

        for node_in_path in determined_path:
            if node_in_path.type == INPUT_NODE_TYPE:
                print(f"Executing InputNode ({node_in_path.id}): Output is {current_data_payload}")
                continue 
            
            elif node_in_path.type == PARTITION_NODE_TYPE:
                if not isinstance(current_data_payload, str) or not os.path.exists(current_data_payload):
                    # This error suggests an issue with the flow logic or previous node's output
                    raise HTTPException(status_code=500, detail=f"Internal Error: PartitionNode ({node_in_path.id}) requires a file path input.")
                
                print(f"Executing PartitionNode ({node_in_path.id}) with config: {node_in_path.config}")
                partition_params: Dict[str, Any] = {}
                node_config = node_in_path.config

                if node_config.strategy: partition_params["strategy"] = node_config.strategy
                if node_config.ocr_languages: partition_params["ocr_languages"] = node_config.ocr_languages
                if node_config.pdf_infer_table_structure is not None: partition_params["pdf_infer_table_structure"] = node_config.pdf_infer_table_structure
                if node_config.extract_image_block_types and node_config.extract_image_block_types.strip():
                    partition_params["extract_image_block_types"] = [s.strip() for s in node_config.extract_image_block_types.split(',')]
                    if node_config.strategy == "hi_res": partition_params["extract_images_in_pdf"] = True
                
                try:
                    elements = partition(filename=current_data_payload, **partition_params)
                    if node_config.remove_extra_whitespace: # This applies if True
                        elements = [clean_extra_whitespace(el) for el in elements if hasattr(el, "text")] # Simplified
                    
                    current_data_payload = elements 
                    processed_elements_for_response = elements_to_dicts(elements)
                    final_message = f"Flow executed up to PartitionNode ({node_in_path.id})."
                    print(f"PartitionNode ({node_in_path.id}) produced {len(elements)} elements.")
                except Exception as e_partition:
                    print(f"Error during PartitionNode ({node_in_path.id}) execution: {type(e_partition).__name__} - {e_partition}")
                    raise HTTPException(status_code=500, detail=f"Error in PartitionNode ({node_in_path.id}): {str(e_partition)}")
            
            elif node_in_path.type == CHUNK_NODE_TYPE:
                if not isinstance(current_data_payload, list) or not all(hasattr(el, 'to_dict') for el in current_data_payload):
                    raise HTTPException(status_code=500, detail=f"Internal Error: ChunkNode ({node_in_path.id}) expects a list of Unstructured Elements as input.")

                print(f"Executing ChunkNode ({node_in_path.id}) with config: {node_in_path.config}")
                node_config = node_in_path.config
                chunk_params: Dict[str, Any] = {}

                if node_config.chunk_max_characters is not None: chunk_params["max_characters"] = node_config.chunk_max_characters
                if node_config.chunk_new_after_n_chars is not None: chunk_params["new_after_n_chars"] = node_config.chunk_new_after_n_chars
                if node_config.chunk_overlap is not None: chunk_params["overlap"] = node_config.chunk_overlap
                
                try:
                    if node_config.chunking_strategy == "by_title":
                        if node_config.chunk_combine_text_under_n_chars is not None: chunk_params["combine_text_under_n_chars"] = node_config.chunk_combine_text_under_n_chars
                        if node_config.chunk_multipage_sections is not None: chunk_params["multipage_sections"] = node_config.chunk_multipage_sections
                        chunked_elements = chunk_by_title(elements=current_data_payload, **chunk_params)
                    elif node_config.chunking_strategy == "basic":
                        chunked_elements = chunk_elements_basic(elements=current_data_payload, **chunk_params)
                    elif node_config.chunking_strategy == "none" or node_config.chunking_strategy is None:
                        chunked_elements = current_data_payload 
                        print(f"ChunkNode ({node_in_path.id}) has strategy 'none' or undefined, elements passed through.")
                    else:
                        raise ValueError(f"Unsupported chunking_strategy '{node_config.chunking_strategy}' for ChunkNode.")

                    current_data_payload = chunked_elements
                    processed_elements_for_response = elements_to_dicts(chunked_elements)
                    final_message = f"Flow executed up to ChunkNode ({node_in_path.id})."
                    print(f"ChunkNode ({node_in_path.id}) produced {len(chunked_elements)} chunks.")
                except Exception as e_chunk:
                    print(f"Error during ChunkNode ({node_in_path.id}) execution: {type(e_chunk).__name__} - {e_chunk}")
                    raise HTTPException(status_code=500, detail=f"Error in ChunkNode ({node_in_path.id}): {str(e_chunk)}")

            elif node_in_path.type == OUTPUT_NODE_TYPE:
                print(f"Reached OutputNode ({node_in_path.id}). Finalizing response.")
                # The data for the output node is whatever current_data_payload holds from the previous step.
                # processed_elements_for_response should already be updated by the last processing node.
                if not processed_elements_for_response and isinstance(current_data_payload, list):
                     # This ensures if the last processing node didn't explicitly set it, but current_data is list of elements
                    processed_elements_for_response = elements_to_dicts(current_data_payload)
                elif not processed_elements_for_response and isinstance(current_data_payload, str):
                    # Input directly to Output, no processing elements, this is fine.
                    # We might want to indicate that the output is just the file path.
                    final_message = "Flow reached OutputNode. Output is the initial unprocessed file."
                
                final_message = "Flow executed successfully and reached OutputNode."
                break 
            
            else: # Placeholder for other node types like CleanNode, ExtractLLMNode
                print(f"Node type {node_in_path.type} ({node_in_path.id}) not yet implemented. Stopping flow.")
                final_message = f"Flow execution stopped at unimplemented node type: {node_in_path.type}."
                if isinstance(current_data_payload, list) and all(hasattr(el, 'to_dict') for el in current_data_payload):
                     processed_elements_for_response = elements_to_dicts(current_data_payload)
                break 
        
        # --- End of Node Execution Logic ---

        response_payload: Dict[str, Any] = {
            "message": final_message,
            "determined_path": [{"id": node.id, "type": node.type} for node in determined_path],
            "received_filename": file.filename,
        }
        if processed_elements_for_response is not None:
            response_payload["processed_elements"] = processed_elements_for_response
        
        # If the final output is just the initial file (e.g., Input -> Output flow)
        if current_data_payload == temp_file_path and final_message.startswith("Flow executed successfully"):
             response_payload["output_details"] = "Output is the initial unprocessed file."
             # In this case, the client might need the file, but we can't return the path.
             # This scenario needs further thought on how client gets the file if no processing happened.
             # For now, the message indicates it.

        return response_payload

    except HTTPException: # Re-raise HTTPExceptions directly
        raise
    except Exception as e:
        # Catch any other unexpected errors during setup or the loop (if not caught by specific node handlers)
        print(f"Unexpected error during flow execution: {type(e).__name__} - {e}")
        raise HTTPException(status_code=500, detail=f"Unexpected error during flow execution: {str(e)}")
    finally:
        await file.close()
        # Cleanup the initial temporary file after the entire flow execution attempt
        if temp_file_path and os.path.exists(temp_file_path):
            try:
                os.remove(temp_file_path)
                print(f"Cleaned up temporary input file: {temp_file_path}")
            except Exception as e_cleanup:
                print(f"Error cleaning up temporary file {temp_file_path}: {e_cleanup}")
        
        # --- Start of Node Execution Logic ---
        current_data_payload: Any = temp_file_path # Initially, the path to the input file
        processed_elements_for_response: Optional[List[Dict[str, Any]]] = None
        final_message = "Flow validation and file reception successful. Path determined."

        for node_in_path in determined_path:
            if node_in_path.type == INPUT_NODE_TYPE:
                # The input node's "output" is the initially saved file path.
                print(f"Executing InputNode ({node_in_path.id}): Output is {current_data_payload}")
                continue # Move to the next node
            
            elif node_in_path.type == PARTITION_NODE_TYPE:
                if not isinstance(current_data_payload, str) or not os.path.exists(current_data_payload):
                    raise HTTPException(status_code=400, detail=f"PartitionNode ({node_in_path.id}) requires a valid file path from the previous step, but got: {current_data_payload}")
                
                print(f"Executing PartitionNode ({node_in_path.id}) with config: {node_in_path.config}")
                
                partition_params: Dict[str, Any] = {}
                node_config = node_in_path.config

                # Extract known parameters from NodeConfig, providing defaults if necessary or handling None
                if node_config.strategy:
                    partition_params["strategy"] = node_config.strategy
                if node_config.ocr_languages:
                    partition_params["ocr_languages"] = node_config.ocr_languages
                if node_config.pdf_infer_table_structure is not None:
                    partition_params["pdf_infer_table_structure"] = node_config.pdf_infer_table_structure
                
                if node_config.extract_image_block_types and node_config.extract_image_block_types.strip():
                    partition_params["extract_image_block_types"] = [s.strip() for s in node_config.extract_image_block_types.split(',')]
                    if node_config.strategy == "hi_res": # As per previous logic for /process-document
                         partition_params["extract_images_in_pdf"] = True
                
                # Note: chunking parameters from node_config are not directly used by partition here.
                # If partition is to handle chunking, its chunking_strategy needs to be set.
                # This subtask focuses on partition; chunking node will be separate.

                try:
                    elements = partition(filename=current_data_payload, **partition_params)
                    
                    # Apply cleaning if specified (remove_extra_whitespace is a general config)
                    if node_config.remove_extra_whitespace is not None and node_config.remove_extra_whitespace:
                        for element in elements:
                            if hasattr(element, 'text') and isinstance(element.text, str):
                                element.text = clean_extra_whitespace(element.text)
                    
                    current_data_payload = elements # Output of partition is list of Elements
                    processed_elements_for_response = elements_to_dicts(elements) # For potential response
                    final_message = f"Flow executed up to PartitionNode ({node_in_path.id})."
                    print(f"PartitionNode ({node_in_path.id}) produced {len(elements)} elements.")

                except Exception as e_partition:
                    print(f"Error during PartitionNode ({node_in_path.id}) execution: {type(e_partition).__name__} - {e_partition}")
                    # Cleanup the input temp file before raising, as flow execution stops here
                    if temp_file_path and os.path.exists(temp_file_path):
                        os.remove(temp_file_path)
                        print(f"Cleaned up temporary file: {temp_file_path}")
                    raise HTTPException(status_code=500, detail=f"Error in PartitionNode ({node_in_path.id}): {str(e_partition)}")
            
            elif node_in_path.type == CHUNK_NODE_TYPE:
                if not isinstance(current_data_payload, list) or \
                   not all(hasattr(el, 'to_dict') for el in current_data_payload): # Check if it's list of Element-like
                    # Attempt to gracefully handle if it's already dicts (e.g. from a previous API step not returning Element objects)
                    # For now, we are strict: expects list of Elements from previous step (e.g. Partition)
                    raise HTTPException(status_code=400, detail=f"ChunkNode ({node_in_path.id}) expects a list of Unstructured Elements as input from the previous step.")

                print(f"Executing ChunkNode ({node_in_path.id}) with config: {node_in_path.config}")
                node_config = node_in_path.config
                chunk_params: Dict[str, Any] = {}

                if node_config.chunk_max_characters is not None:
                    chunk_params["max_characters"] = node_config.chunk_max_characters
                if node_config.chunk_new_after_n_chars is not None:
                    chunk_params["new_after_n_chars"] = node_config.chunk_new_after_n_chars
                if node_config.chunk_overlap is not None:
                    chunk_params["overlap"] = node_config.chunk_overlap
                
                try:
                    if node_config.chunking_strategy == "by_title":
                        # Specific params for by_title
                        if node_config.chunk_combine_text_under_n_chars is not None:
                            chunk_params["combine_text_under_n_chars"] = node_config.chunk_combine_text_under_n_chars
                        if node_config.chunk_multipage_sections is not None:
                            chunk_params["multipage_sections"] = node_config.chunk_multipage_sections
                        
                        chunked_elements = chunk_by_title(elements=current_data_payload, **chunk_params)
                    elif node_config.chunking_strategy == "basic":
                        chunked_elements = chunk_elements_basic(elements=current_data_payload, **chunk_params)
                    else: # "none" or undefined strategy for a chunk node means no chunking, or invalid
                        # If strategy is "none", this node shouldn't do anything or should be skipped.
                        # For now, if it's a ChunkNode, we assume a valid strategy was intended.
                        # If strategy is 'none', we just pass through the elements.
                        if node_config.chunking_strategy == "none":
                            chunked_elements = current_data_payload # Pass through
                            print(f"ChunkNode ({node_in_path.id}) has strategy 'none', elements passed through.")
                        else:
                            raise ValueError(f"Unsupported or missing chunking_strategy '{node_config.chunking_strategy}' for ChunkNode.")

                    current_data_payload = chunked_elements
                    processed_elements_for_response = elements_to_dicts(chunked_elements)
                    final_message = f"Flow executed up to ChunkNode ({node_in_path.id})."
                    print(f"ChunkNode ({node_in_path.id}) produced {len(chunked_elements)} chunks.")

                except Exception as e_chunk:
                    print(f"Error during ChunkNode ({node_in_path.id}) execution: {type(e_chunk).__name__} - {e_chunk}")
                    # Temp file cleanup handled by the outermost finally block if execution stops
                    raise HTTPException(status_code=500, detail=f"Error in ChunkNode ({node_in_path.id}): {str(e_chunk)}")

            elif node_in_path.type == OUTPUT_NODE_TYPE:
                print(f"Reached OutputNode ({node_in_path.id}). Current data type: {type(current_data_payload)}")
                if not processed_elements_for_response and isinstance(current_data_payload, list):
                    pass 
                final_message = "Flow execution reached OutputNode."
                break 

            else:
                print(f"Node type {node_in_path.type} ({node_in_path.id}) not yet implemented for execution. Stopping.")
                final_message = f"Flow execution stopped at unimplemented node type: {node_in_path.type}"
                if isinstance(current_data_payload, list) and all(hasattr(el, 'to_dict') for el in current_data_payload):
                     processed_elements_for_response = elements_to_dicts(current_data_payload)
                break 
        
        # --- End of Node Execution Logic ---

        # Update Endpoint Response
        response_payload: Dict[str, Any] = {
            "message": final_message,
            "determined_path": [{"id": node.id, "type": node.type} for node in determined_path],
            "received_filename": file.filename,
        }
        if processed_elements_for_response is not None:
            response_payload["processed_elements"] = processed_elements_for_response
        
        # For debugging, show what the final data payload is (could be path or elements)
        if isinstance(current_data_payload, str): # If it's still a file path (e.g. input -> output)
            response_payload["final_output_reference"] = current_data_payload
            # In this case, temp_file_path is the one to potentially cleanup later
            # We are NOT cleaning it up here yet if it's the final output reference.
        
        # If current_data_payload is a list of elements, it's captured in processed_elements_for_response
        # The original input temp_file_path might still need cleanup if it's not the final output.
        # This cleanup logic needs to be more robust based on the full flow.
        # For now, if partition ran, temp_file_path was its input, and current_data_payload is elements.
        # If partition was the last step before output, temp_file_path (the input to partition) can be cleaned.
        
        if final_message.startswith("Flow execution reached OutputNode") or \
           final_message.startswith("Flow execution stopped at unimplemented node type"):
            if temp_file_path and os.path.exists(temp_file_path) and current_data_payload is not temp_file_path:
                # If current_data_payload is no longer the temp_file_path (i.e., processing happened)
                # or if we stopped/finished and temp_file_path was an intermediate file.
                # This logic is still simplistic for multi-stage cleanup.
                # os.remove(temp_file_path)
                # print(f"Cleaned up input temporary file: {temp_file_path}")
                # Deferring cleanup to a more robust solution later.
                # For now, we'll just log its path if it was not the final output.
                response_payload["temp_file_path_processed_or_input"] = temp_file_path
            elif current_data_payload is temp_file_path: # e.g. Input -> Output flow
                 response_payload["output_is_input_temp_file"] = True


        return response_payload
