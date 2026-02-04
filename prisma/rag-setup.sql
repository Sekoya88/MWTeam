-- RAG: extension pgvector + table rag_documents
-- Exécuter une fois (Neon SQL Editor, Cloud SQL, ou: psql $DATABASE_URL -f prisma/rag-setup.sql)

CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS rag_documents (
    id TEXT PRIMARY KEY,
    titre TEXT NOT NULL,
    contenu TEXT NOT NULL,
    embedding vector (768),
    source_type TEXT NOT NULL,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rag_documents_embedding ON rag_documents USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);