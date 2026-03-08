from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import List, Tuple
import numpy as np
from .embedding_service import generate_embeddings

def cosine_similarity(a, b):
    """Calculate cosine similarity between two vectors."""
    a = np.array(a)
    b = np.array(b)
    return np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b))

def search_similar_chunks(query: str, db: Session, top_k: int = 5) -> List[Tuple[str, float]]:
    """Search for similar document chunks using vector similarity."""
    # Generate embedding for the query
    query_embedding = generate_embeddings([query])[0]

    # Get all chunks from database
    results = db.execute(text("SELECT id, content, embedding FROM document_chunks")).fetchall()

    # Calculate similarities
    similarities = []
    for row in results:
        chunk_id, content, embedding_json = row
        if embedding_json:
            # Parse JSON embedding
            chunk_embedding = embedding_json if isinstance(embedding_json, list) else []
            if chunk_embedding:
                similarity = cosine_similarity(query_embedding, chunk_embedding)
                similarities.append((content, similarity))

    # Sort by similarity and return top_k
    similarities.sort(key=lambda x: x[1], reverse=True)
    return similarities[:top_k]