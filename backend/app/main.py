from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .routers import upload, query
from .database import engine, Base

# Create database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(title="AI Financial Research Assistant", version="1.0.0")

# CORS middleware for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # React dev server
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(upload.router, prefix="/api/v1", tags=["upload"])
app.include_router(query.router, prefix="/api/v1", tags=["query"])

@app.get("/api/v1/health")
async def health_check():
    return {"status": "healthy", "message": "AI Financial Research Assistant API is running"}

@app.get("/")
async def root():
    return {"message": "AI Financial Research Assistant API"}