from fastapi import APIRouter, UploadFile, File, Depends, HTTPException
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import Document, DocumentChunk
from ..utils.pdf_utils import extract_text_from_pdf, chunk_text
from ..services.embedding_service import generate_embeddings
import os
import shutil

router = APIRouter()

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

@router.post("/upload")
async def upload_pdf(file: UploadFile = File(...), db: Session = Depends(get_db)):
    if not file.filename.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are allowed")
    
    # Save file
    file_path = os.path.join(UPLOAD_DIR, file.filename)
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    # Extract text
    try:
        text = extract_text_from_pdf(file_path)
    except Exception as e:
        os.remove(file_path)
        raise HTTPException(status_code=500, detail=f"Failed to extract text: {str(e)}")
    
    # Save document
    document = Document(filename=file.filename, file_path=file_path, content=text)
    db.add(document)
    db.commit()
    db.refresh(document)
    
    # Chunk and embed
    chunks = chunk_text(text)
    if chunks:
        embeddings = generate_embeddings(chunks)
        for chunk, embedding in zip(chunks, embeddings):
            doc_chunk = DocumentChunk(document_id=document.id, content=chunk, embedding=embedding)
            db.add(doc_chunk)
        db.commit()
    
    return {"message": "Document uploaded and processed successfully", "document_id": document.id}