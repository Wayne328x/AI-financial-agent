from typing import Any, Dict, List, Optional

# In-memory chunk store keyed by document id.
_chunk_store: Dict[int, List[str]] = {}
_chunk_embedding_store: Dict[int, List[Dict[str, Any]]] = {}


def chunk_text_by_tokens(
    text: str,
    chunk_size_tokens: int = 800,
    overlap_tokens: int = 150,
) -> List[str]:
    """Split text into token-based chunks with overlap.

    Tokens are approximated using whitespace splitting.
    """
    if not text:
        return []

    tokens = text.split()
    if not tokens:
        return []

    if overlap_tokens >= chunk_size_tokens:
        raise ValueError("overlap_tokens must be smaller than chunk_size_tokens")

    chunks: List[str] = []
    step = chunk_size_tokens - overlap_tokens
    start = 0

    while start < len(tokens):
        end = min(start + chunk_size_tokens, len(tokens))
        chunk_tokens = tokens[start:end]
        chunks.append(" ".join(chunk_tokens))

        if end >= len(tokens):
            break
        start += step

    return chunks


def store_chunks_in_memory(document_id: int, chunks: List[str]) -> None:
    """Persist chunks in process memory for the given document id."""
    _chunk_store[document_id] = chunks


def get_chunks_from_memory(document_id: int) -> List[str]:
    """Retrieve in-memory chunks for a document id."""
    return _chunk_store.get(document_id, [])


def store_chunk_embeddings_in_memory(
    document_id: int,
    chunks: List[str],
    embeddings: List[List[float]],
) -> None:
    """Store chunk text with corresponding embedding vectors in memory."""
    paired = []
    for chunk, embedding in zip(chunks, embeddings):
        paired.append({"chunk_text": chunk, "embedding": embedding})
    _chunk_embedding_store[document_id] = paired


def get_chunk_embeddings_from_memory(document_id: int) -> List[Dict[str, Any]]:
    """Retrieve in-memory chunk+embedding payloads for a document id."""
    return _chunk_embedding_store.get(document_id, [])


def get_all_chunk_embeddings_from_memory(document_id: Optional[int] = None) -> List[Dict[str, Any]]:
    """Return all chunk+embedding payloads across all in-memory documents."""
    all_entries: List[Dict[str, Any]] = []
    document_ids = [document_id] if document_id is not None else list(_chunk_embedding_store.keys())

    for current_document_id in document_ids:
        for entry in _chunk_embedding_store.get(current_document_id, []):
            all_entries.append(
                {
                    "document_id": current_document_id,
                    "chunk_text": entry.get("chunk_text", ""),
                    "embedding": entry.get("embedding", []),
                }
            )
    return all_entries
