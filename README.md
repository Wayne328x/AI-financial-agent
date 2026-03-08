# AI Financial Agent

A comprehensive AI-powered financial research chat application with document upload and retrieval capabilities.

## Features

- **Chat Interface**: Interactive chat with AI for financial research
- **Document Upload**: Upload PDF documents for analysis
- **Persistent Chat Sessions**: Save and manage multiple chat conversations
- **Local Storage**: Chat history persists in browser localStorage
- **FastAPI Backend**: Robust backend with vector similarity search
- **SQLite Database**: Easy development setup with SQLite, production-ready for PostgreSQL

## Tech Stack

- **Frontend**: React + TypeScript + Vite
- **Backend**: FastAPI + SQLAlchemy
- **Database**: SQLite (development) / PostgreSQL (production)
- **AI**: Cohere API for embeddings and responses
- **Styling**: CSS with modern responsive design

## Setup Instructions

### Prerequisites

- Python 3.8+
- Node.js 16+
- Git

### Backend Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/Wayne328x/AI-financial-agent.git
   cd AI-financial-agent
   ```

2. **Set up Python environment**
   ```bash
   cd backend
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   pip install -r requirements.txt
   ```

3. **Configure environment variables**
   ```bash
   cp ../.env.example ../.env
   # Edit .env with your API keys
   ```

4. **Run the backend**
   ```bash
   uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
   ```

### Frontend Setup

1. **Install dependencies**
   ```bash
   cd frontend
   npm install
   ```

2. **Start the development server**
   ```bash
   npm run dev
   ```

3. **Open your browser**
   Navigate to `http://localhost:5173`

## API Endpoints

- `GET /api/v1/health` - Health check
- `POST /api/v1/upload` - Upload documents
- `POST /api/v1/query` - Query the AI with context

## Development

### Database Migration

The application automatically creates SQLite database tables on startup. For production with PostgreSQL:

1. Install PostgreSQL and create a database
2. Update `DATABASE_URL` in `.env`
3. The application will use pgvector for optimized vector search

### Adding New Features

- Backend: Add new routers in `app/routers/`
- Frontend: Add new components in `src/components/`
- Database: Update models in `app/models/`

## Deployment

### Backend Deployment

```bash
# Using Docker
docker build -t ai-financial-agent .
docker run -p 8000:8000 ai-financial-agent
```

### Frontend Deployment

```bash
npm run build
# Deploy the dist/ folder to your web server
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see LICENSE file for details