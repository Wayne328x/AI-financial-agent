from typing import List
import logging
import threading

from sentence_transformers import SentenceTransformer

logger = logging.getLogger(__name__)

LOCAL_EMBEDDING_MODEL = "sentence-transformers/all-MiniLM-L6-v2"
EMBEDDING_DIMENSION = 384
_BACKEND_LOGGED = False
_BACKEND_LOG_LOCK = threading.Lock()
_MODEL_INSTANCE: SentenceTransformer | None = None
_MODEL_LOCK = threading.Lock()


class EmbeddingServiceError(Exception):
    """Raised when local sentence-transformer embedding generation fails."""


# Backward compatibility for existing imports in routes/services.
GeminiAPIError = EmbeddingServiceError


def _log_backend_once() -> None:
    global _BACKEND_LOGGED
    if _BACKEND_LOGGED:
        return
    with _BACKEND_LOG_LOCK:
        if _BACKEND_LOGGED:
            return
        logger.info(
            "Embedding backend initialized: %s (dimension=%d)",
            LOCAL_EMBEDDING_MODEL,
            EMBEDDING_DIMENSION,
        )
        _BACKEND_LOGGED = True


def _get_model() -> SentenceTransformer:
    global _MODEL_INSTANCE
    if _MODEL_INSTANCE is not None:
        return _MODEL_INSTANCE

    with _MODEL_LOCK:
        if _MODEL_INSTANCE is not None:
            return _MODEL_INSTANCE
        _MODEL_INSTANCE = SentenceTransformer(LOCAL_EMBEDDING_MODEL)
        return _MODEL_INSTANCE

def generate_embeddings(texts: List[str], input_type: str = "search_document") -> List[List[float]]:
    """Generate local sentence-transformer embeddings for texts.

    input_type is accepted for API compatibility with existing call sites.
    """
    if not texts:
        return []

    try:
        _log_backend_once()
        model = _get_model()
        _ = input_type  # Retained for backwards compatibility.
        normalized_texts = [text if text.strip() else " " for text in texts]
        vectors = model.encode(
            normalized_texts,
            convert_to_numpy=True,
            normalize_embeddings=True,
            show_progress_bar=False,
        )

        return [vector.tolist() for vector in vectors]
    except Exception as exc:
        logger.exception(
            "Local embedding generation failed using backend=%s input_type=%s",
            LOCAL_EMBEDDING_MODEL,
            input_type,
        )
        raise EmbeddingServiceError("Local embedding generation failed") from exc