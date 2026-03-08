import cohere
from typing import List
import os
from dotenv import load_dotenv

load_dotenv()

cohere_client = cohere.Client(api_key=os.getenv("COHERE_API_KEY"))

def generate_embeddings(texts: List[str], input_type: str = "search_document") -> List[List[float]]:
    """Generate embeddings for a list of texts using Cohere."""
    response = cohere_client.embed(
        texts=texts,
        model="embed-english-v3.0",
        input_type=input_type
    )
    return response.embeddings