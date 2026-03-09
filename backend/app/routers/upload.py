from fastapi import APIRouter, UploadFile, File, Depends, HTTPException
from sqlalchemy.orm import Session
import logging
from ..database import get_db
from ..models import Document, DocumentChunk
from ..services.chunk_service import (
    chunk_text_by_tokens,
    store_chunk_embeddings_in_memory,
    store_chunks_in_memory,
)
from ..services.embedding_service import generate_embeddings
from ..services.embedding_service import EmbeddingServiceError
from ..services.pdf_service import extract_text_from_pdf
import os
import shutil

router = APIRouter()
logger = logging.getLogger(__name__)

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

@router.post("/upload")
async def upload_pdf(file: UploadFile = File(...), db: Session = Depends(get_db)):
    file_path = None
    try:
        if not file.filename or not file.filename.lower().endswith(".pdf"):
            raise HTTPException(status_code=400, detail="Only PDF files are allowed")
        
        # Save file
        file_path = os.path.join(UPLOAD_DIR, file.filename)
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        # Extract text
        text = extract_text_from_pdf(file_path)
        
        # Save document
        document = Document(filename=file.filename, file_path=file_path, content=text)
        db.add(document)
        db.commit()
        db.refresh(document)
        
        # Chunk text and store in memory for now.
        chunks = chunk_text_by_tokens(text, chunk_size_tokens=800, overlap_tokens=150)
        store_chunks_in_memory(document.id, chunks)
        chunk_embeddings = generate_embeddings(chunks, input_type="search_document") if chunks else []
        store_chunk_embeddings_in_memory(document.id, chunks, chunk_embeddings)
        if chunks and chunk_embeddings:
            db.add_all(
                [
                    DocumentChunk(document_id=document.id, content=chunk, embedding=embedding)
                    for chunk, embedding in zip(chunks, chunk_embeddings)
                ]
            )
            db.commit()

        logger.info(
            "Upload processed document_id=%s chunks_created=%d embeddings_created=%d persisted_chunk_rows=%d",
            document.id,
            len(chunks),
            len(chunk_embeddings),
            min(len(chunks), len(chunk_embeddings)),
        )
        
        return {
            "status": "success",
            "filename": file.filename,
            "message": "Document uploaded and processed successfully",
            "document_id": document.id,
            "extracted_text_length": len(text),
            "chunk_count": len(chunks),
            "embedding_count": len(chunk_embeddings),
        }
    except HTTPException:
        raise
    except EmbeddingServiceError as exc:
        logger.exception("Upload failed during local embedding generation")
        raise HTTPException(status_code=500, detail=str(exc))
    except Exception:
        # Clean up file if it was saved
        if file_path and os.path.exists(file_path):
            os.remove(file_path)
        logger.exception("Upload pipeline failed")
        raise HTTPException(status_code=500, detail="Upload failed due to an internal processing error")