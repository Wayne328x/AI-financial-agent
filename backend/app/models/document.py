from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from pgvector.sqlalchemy import Vector
from ..database import Base

class Document(Base):
    __tablename__ = "documents"

    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String, index=True)
    upload_date = Column(DateTime(timezone=True), server_default=func.now())
    file_path = Column(String)
    content = Column(Text)  # Extracted text

    chunks = relationship("DocumentChunk", back_populates="document")

class DocumentChunk(Base):
    __tablename__ = "document_chunks"

    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, ForeignKey("documents.id"))
    content = Column(Text)
    embedding = Column(Vector(1024))  # Cohere embed-english-v3.0 dimension

    document = relationship("Document", back_populates="chunks")