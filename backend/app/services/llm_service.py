import openai
from typing import List
import os
from dotenv import load_dotenv

load_dotenv()

openai.api_key = os.getenv("OPENAI_API_KEY")

def generate_response(query: str, context: List[str]) -> str:
    """Generate a response using OpenAI GPT with retrieved context."""
    context_text = "\n\n".join(context)
    prompt = f"""
You are a financial research assistant. Use the provided context from financial reports to answer the user's question accurately and helpfully.

Context:
{context_text}

Question: {query}

Answer:
"""
    
    response = openai.ChatCompletion.create(
        model="gpt-3.5-turbo",
        messages=[
            {"role": "system", "content": "You are a helpful financial research assistant."},
            {"role": "user", "content": prompt}
        ],
        max_tokens=500,
        temperature=0.3
    )
    
    return response.choices[0].message.content.strip()