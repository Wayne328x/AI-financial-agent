from google import genai
from typing import List
import os
import logging
import re
from dotenv import load_dotenv
from .embedding_service import GeminiAPIError

load_dotenv()

logger = logging.getLogger(__name__)
GENERATION_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")


def _get_gemini_api_key() -> str:
    api_key = os.getenv("GEMINI_API_KEY", "").strip()
    if not api_key or api_key.lower().startswith("your_"):
        raise GeminiAPIError("Gemini generation failed: GEMINI_API_KEY is missing or invalid")
    return api_key


def _build_gemini_client() -> genai.Client:
    api_key = _get_gemini_api_key()
    logger.info("Gemini config loaded model=%s gemini_api_key_present=%s", GENERATION_MODEL, bool(api_key))
    return genai.Client(api_key=api_key)


def _public_gemini_error(exc: Exception) -> GeminiAPIError:
    error_text = str(exc)
    lower_text = error_text.lower()

    if "api_key_invalid" in lower_text or "api key" in lower_text:
        return GeminiAPIError("Gemini generation failed: GEMINI_API_KEY is missing or invalid")

    return GeminiAPIError("Gemini generation failed")


def _to_plain_text(text: str) -> str:
    """Remove common markdown formatting markers for cleaner UI display."""
    cleaned = text
    cleaned = re.sub(r"```[\s\S]*?```", "", cleaned)
    cleaned = re.sub(r"`([^`]*)`", r"\1", cleaned)
    cleaned = re.sub(r"\*\*([^*]+)\*\*", r"\1", cleaned)
    cleaned = re.sub(r"__([^_]+)__", r"\1", cleaned)
    cleaned = re.sub(r"(?<!\*)\*([^*]+)\*(?!\*)", r"\1", cleaned)
    cleaned = re.sub(r"(?<!_)_([^_]+)_(?!_)", r"\1", cleaned)
    cleaned = re.sub(r"^\s{0,3}#{1,6}\s*", "", cleaned, flags=re.MULTILINE)
    cleaned = re.sub(r"^\s{0,3}[-*+]\s+", "", cleaned, flags=re.MULTILINE)
    cleaned = re.sub(r"\n{3,}", "\n\n", cleaned)
    return cleaned.strip()

def generate_response(query: str, context: List[str]) -> str:
    """Generate a response using Google Gemini with retrieved context."""
    context_text = "\n\n".join(context)
    prompt = f"""You are a financial research assistant. Use the provided context from financial reports to answer the user's question accurately and helpfully.

Context:
{context_text}

Question: {query}

Answer:"""
    try:
        logger.info("Gemini generation model selected: %s", GENERATION_MODEL)
        client = _build_gemini_client()
        response = client.models.generate_content(
            model=GENERATION_MODEL,
            contents=prompt,
        )

        text = (response.text or "").strip()
        if not text:
            raise GeminiAPIError("Gemini generation failed")
        return _to_plain_text(text)
    except GeminiAPIError:
        raise
    except Exception as exc:
        logger.exception("Gemini generation call failed")
        raise _public_gemini_error(exc)