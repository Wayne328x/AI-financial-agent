from typing import List, Optional, Tuple
import numpy as np
from .chunk_service import get_all_chunk_embeddings_from_memory
from .embedding_service import generate_embeddings

def cosine_similarity(a: List[float], b: List[float]) -> float:
    """Calculate cosine similarity between two vectors."""
    a_arr = np.array(a, dtype=float)
    b_arr = np.array(b, dtype=float)
    a_norm = np.linalg.norm(a_arr)
    b_norm = np.linalg.norm(b_arr)
    if a_norm == 0.0 or b_norm == 0.0:
        return 0.0
    return float(np.dot(a_arr, b_arr) / (a_norm * b_norm))

def embed_query(query: str) -> List[float]:
    """Embed a user query using the configured embeddings provider."""
    if not query.strip():
        return []
    return generate_embeddings([query], input_type="search_query")[0]


def retrieve_top_chunks(
    query_embedding: List[float],
    top_k: int = 5,
    document_id: Optional[int] = None,
) -> List[Tuple[str, float]]:
    """Retrieve top-k in-memory chunks by cosine similarity."""
    if not query_embedding:
        return []

    entries = get_all_chunk_embeddings_from_memory(document_id=document_id)

    similarities: List[Tuple[str, float]] = []
    for entry in entries:
        content = entry.get("chunk_text", "")
        chunk_embedding = entry.get("embedding", [])
        if content and isinstance(chunk_embedding, list) and chunk_embedding:
            similarity = cosine_similarity(query_embedding, chunk_embedding)
            similarities.append((content, similarity))

    similarities.sort(key=lambda x: x[1], reverse=True)
    return similarities[:top_k]


def search_similar_chunks(
    query: str,
    db=None,
    top_k: int = 5,
    document_id: Optional[int] = None,
) -> List[Tuple[str, float]]:
    """Compatibility wrapper for older call sites."""
    del db  # Kept for backward-compatible call sites.

    if not query.strip():
        return []

    query_embedding = embed_query(query)
    return retrieve_top_chunks(query_embedding, top_k=top_k, document_id=document_id)