import google.generativeai as genai
from typing import List
import os
from dotenv import load_dotenv

load_dotenv()

genai.configure(api_key=os.getenv("GOOGLE_API_KEY"))

def generate_response(query: str, context: List[str]) -> str:
    """Generate a response using Google Gemini with retrieved context."""
    context_text = "\n\n".join(context)
    prompt = f"""You are a financial research assistant. Use the provided context from financial reports to answer the user's question accurately and helpfully.

Context:
{context_text}

Question: {query}

Answer:"""
    model = genai.GenerativeModel('gemini-pro')
    response = model.generate_content(
        prompt,
        generation_config=genai.types.GenerationConfig(
            max_output_tokens=500,
            temperature=0.3
        )
    )
    # Gemini's response format: response.text (not .choices[0].message.content)
    return response.text.strip()