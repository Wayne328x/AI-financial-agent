from sqlalchemy.orm import Session
from pgvector.sqlalchemy import Vector
from sqlalchemy import text
from typing import List, Tuple
from .embedding_service import generate_embeddings

def search_similar_chunks(query: str, db: Session, top_k: int = 5) -> List[Tuple[str, float]]:
    """Search for similar document chunks using vector similarity."""
    # Generate embedding for the query
    query_embedding = generate_embeddings([query])[0]
    
    # Perform vector search
    results = db.execute(
        text("""
        SELECT content, 1 - (embedding <=> :query_embedding) as similarity
        FROM document_chunks
        ORDER BY embedding <=> :query_embedding
        LIMIT :top_k
        """),
        {"query_embedding": query_embedding, "top_k": top_k}
    ).fetchall()
    
    return [(row[0], row[1]) for row in results]