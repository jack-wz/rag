from fastapi import APIRouter, File, UploadFile, Form, HTTPException
from typing import List, Dict, Any, Optional
import tempfile
import os
import json

router = APIRouter()

# Helper to convert boolean form data
def string_to_bool(value: str) -> bool:
    return value.lower() == "true"

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
    supported_extensions = [".txt", ".pdf", ".docx", ".doc", ".html", ".md"]
    if file_extension not in supported_extensions:
        raise HTTPException(
            status_code=400, 
            detail=f"Unsupported file type: {file_extension}. Supported types: {', '.join(supported_extensions)}"
        )
    
    # 简单的文本提取（仅支持.txt文件）
    if file_extension == ".txt":
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
                
                for i in range(0, len(text_content), max_chars - overlap):
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