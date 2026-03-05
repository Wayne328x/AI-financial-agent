# AI Financial Research Assistant

A full-stack application for uploading financial reports (PDFs) and asking questions using RAG (Retrieval Augmented Generation).

## Tech Stack
- Frontend: React + TypeScript (Vite)
- Backend: FastAPI (Python)
- Database: PostgreSQL with pgvector
- AI: OpenAI API
- Deployment: Docker

## Setup

1. Clone the repository
2. Set up environment variables in `.env`
3. Run with Docker: `docker-compose up --build`
4. Access frontend at http://localhost:3000
5. API docs at http://localhost:8000/docs

## Usage
1. Upload a PDF financial report
2. Ask questions about the content
3. Get AI-powered responses based on the document