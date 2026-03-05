from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..database import get_db
from ..services.retrieval_service import search_similar_chunks
from ..services.llm_service import generate_response

router = APIRouter()

@router.post("/query")
async def query_documents(query: str, db: Session = Depends(get_db)):
    if not query.strip():
        raise HTTPException(status_code=400, detail="Query cannot be empty")
    
    # Retrieve relevant chunks
    results = search_similar_chunks(query, db, top_k=5)
    if not results:
        return {"response": "No relevant information found in the documents."}
    
    context = [chunk for chunk, _ in results]
    
    # Generate response
    response = generate_response(query, context)
    
    return {"response": response, "sources": [{"content": chunk, "similarity": sim} for chunk, sim in results]}