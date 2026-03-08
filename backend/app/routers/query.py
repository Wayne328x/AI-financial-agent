from fastapi import APIRouter, Depends, HTTPException, Form
from sqlalchemy.orm import Session
from ..database import get_db
from ..services.retrieval_service import search_similar_chunks
from ..services.llm_service import generate_response

router = APIRouter()

@router.post("/query")
async def query_documents(query: str = Form(...), db: Session = Depends(get_db)):
    if not query.strip():
        raise HTTPException(status_code=400, detail="Query cannot be empty")
    
    try:
        # Retrieve relevant chunks
        results = search_similar_chunks(query, db, top_k=5)
        if not results:
            return {"response": "No documents have been uploaded yet. Please upload a PDF document first.", "sources": []}
        
        context = [chunk for chunk, _ in results]
        
        # Generate response
        response = generate_response(query, context)
        
        return {"response": response, "sources": [{"content": chunk, "similarity": sim} for chunk, sim in results]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing query: {str(e)}")