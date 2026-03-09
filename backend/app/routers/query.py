from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Form
import logging
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Document, DocumentChunk
from ..services.chunk_service import (
    chunk_text_by_tokens,
    get_chunk_embeddings_from_memory,
    store_chunk_embeddings_in_memory,
    store_chunks_in_memory,
)
from ..services.embedding_service import GeminiAPIError, generate_embeddings
from ..services.retrieval_service import embed_query, retrieve_top_chunks
from ..services.llm_service import generate_response

router = APIRouter()
logger = logging.getLogger(__name__)

def _ensure_document_context(document_id: int, db: Session) -> bool:
    in_memory_entries = get_chunk_embeddings_from_memory(document_id)
    if in_memory_entries:
        return True

    persisted_chunks = (
        db.query(DocumentChunk)
        .filter(DocumentChunk.document_id == document_id)
        .all()
    )

    if persisted_chunks:
        chunk_texts = [chunk.content for chunk in persisted_chunks if chunk.content]
        persisted_embeddings = [chunk.embedding for chunk in persisted_chunks if isinstance(chunk.embedding, list) and chunk.embedding]
        if chunk_texts and len(chunk_texts) == len(persisted_embeddings):
            store_chunks_in_memory(document_id, chunk_texts)
            store_chunk_embeddings_in_memory(document_id, chunk_texts, persisted_embeddings)
            logger.info("Rehydrated document context from database document_id=%s chunk_count=%d", document_id, len(chunk_texts))
            return True

    document = db.query(Document).filter(Document.id == document_id).first()
    if not document or not document.content or not document.content.strip():
        return False

    chunk_texts = [chunk.content for chunk in persisted_chunks if chunk.content] or chunk_text_by_tokens(
        document.content,
        chunk_size_tokens=800,
        overlap_tokens=150,
    )
    if not chunk_texts:
        return False

    embeddings = generate_embeddings(chunk_texts, input_type="search_document")
    store_chunks_in_memory(document_id, chunk_texts)
    store_chunk_embeddings_in_memory(document_id, chunk_texts, embeddings)

    db.query(DocumentChunk).filter(DocumentChunk.document_id == document_id).delete(synchronize_session=False)
    db.add_all(
        [
            DocumentChunk(document_id=document_id, content=chunk, embedding=embedding)
            for chunk, embedding in zip(chunk_texts, embeddings)
        ]
    )
    db.commit()
    logger.info("Rebuilt document context for query document_id=%s chunk_count=%d", document_id, len(chunk_texts))
    return True

@router.post("/query")
async def query_documents(
    query: str = Form(...),
    document_id: Optional[int] = Form(None),
    chat_id: Optional[str] = Form(None),
    db: Session = Depends(get_db),
):
    if not query.strip():
        raise HTTPException(status_code=400, detail="Query cannot be empty")
    
    try:
        if document_id is not None:
            document_available = _ensure_document_context(document_id, db)
            logger.info(
                "Query received chat_id=%s document_id=%s document_available=%s",
                chat_id,
                document_id,
                document_available,
            )
            if not document_available:
                return {
                    "response": "The uploaded document for this chat could not be found. Please upload the PDF document again.",
                    "sources": [],
                }
        else:
            logger.warning("Query received without document_id chat_id=%s", chat_id)

        # 1) Embed the user query.
        query_embedding = embed_query(query)

        # 2) Retrieve top relevant chunks.
        results = retrieve_top_chunks(query_embedding, top_k=5, document_id=document_id)
        logger.info(
            "Query retrieval completed chat_id=%s document_id=%s retrieved_chunks=%d",
            chat_id,
            document_id,
            len(results),
        )
        if not results:
            return {"response": "No documents have been uploaded yet. Please upload a PDF document first.", "sources": []}
        
        # 3) Send chunks + question to the LLM.
        context = [chunk for chunk, _ in results]
        
        # 4) Return generated answer + retrieved source chunks.
        response = generate_response(query, context)
        
        return {"response": response, "sources": [{"content": chunk, "similarity": sim} for chunk, sim in results]}
    except GeminiAPIError as exc:
        logger.exception("Query failed during Gemini processing")
        raise HTTPException(status_code=500, detail=str(exc))
    except Exception:
        logger.exception("Query processing failed")
        raise HTTPException(status_code=500, detail="Error processing query")