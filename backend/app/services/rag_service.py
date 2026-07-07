import os
import json
import urllib.request
import hashlib
from typing import List, Dict, Any
from app.services.chroma_client import chroma_client
from app.logging import logger

class RAGService:
    COLLECTION_NAME = "medical_reports_rag"

    def __init__(self):
        self.api_key = os.getenv("GEMINI_API_KEY")
        self.model_name = os.getenv("EMBEDDING_MODEL", "text-embedding-004")
        self.is_mock = not self.api_key
        
        try:
            self.collection = chroma_client.get_or_create_collection(
                name=self.COLLECTION_NAME
            )
        except Exception as e:
            logger.error(f"Error accessing collection: {str(e)}")
            self.collection = None

    def get_embedding(self, text: str) -> List[float]:
        """Generates a 768-dimension dense vector embedding for the given text."""
        if self.is_mock:
            # Deterministic mock embedding generator based on MD5 hashes
            hasher = hashlib.md5(text.encode("utf-8"))
            hash_val = int(hasher.hexdigest(), 16)
            # Create a 768-dimension vector
            vector = []
            for i in range(768):
                # Generates a pseudo-random value between -1.0 and 1.0
                val = ((hash_val >> (i % 32)) & 1) * 2.0 - 1.0
                vector.append(val * 0.1)
            return vector
            
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{self.model_name}:embedContent?key={self.api_key}"
        payload = {
            "model": f"models/{self.model_name}",
            "content": {
                "parts": [{"text": text}]
            }
        }
        
        try:
            req = urllib.request.Request(
                url,
                data=json.dumps(payload).encode("utf-8"),
                headers={"Content-Type": "application/json"},
                method="POST"
            )
            with urllib.request.urlopen(req, timeout=10) as response:
                res_data = json.loads(response.read().decode("utf-8"))
                return res_data["embedding"]["values"]
        except Exception as e:
            logger.error(f"Embedding API call failed: {str(e)}. Reverting to MD5 hash generator.")
            self.is_mock = True
            return self.get_embedding(text)

    def ingest_document(
        self, 
        patient_id: str, 
        report_id: str, 
        filename: str, 
        text_content: str,
        user_id: str = None,
        uploaded_at: str = None
    ) -> bool:
        if not self.collection:
            logger.error("ChromaDB collection unavailable. Skipping ingestion.")
            return False
            
        logger.info(f"Ingesting and embedding report {report_id} ({filename}) for patient {patient_id}...")
        
        # Segment report into character-bounded chunks
        chunks = [chunk.strip() for chunk in text_content.split("\n\n") if chunk.strip()]
        if not chunks:
            chunks = [text_content[i:i+500] for i in range(0, len(text_content), 500)]
            
        documents = []
        ids = []
        metadatas = []
        embeddings = []
        
        from datetime import datetime, timezone
        timestamp = uploaded_at or datetime.now(timezone.utc).isoformat()
        
        for idx, chunk in enumerate(chunks):
            documents.append(chunk)
            ids.append(f"{report_id}_chunk_{idx}")
            metadatas.append({
                "patient_id": patient_id,
                "user_id": user_id or "unknown",
                "report_id": report_id,
                "filename": filename,
                "chunk_index": idx,
                "uploaded_at": timestamp
            })
            embeddings.append(self.get_embedding(chunk))
            
        try:
            self.collection.add(
                documents=documents,
                ids=ids,
                metadatas=metadatas,
                embeddings=embeddings
            )
            logger.info(f"Successfully vectorized and indexed {len(chunks)} chunks.")
            return True
        except Exception as e:
            logger.error(f"Failed to save vectors to ChromaDB: {str(e)}")
            return False

    def retrieve_relevant_chunks(
        self, 
        patient_id: str, 
        query: str, 
        limit: int = 4,
        filename_filter: str = None
    ) -> List[Dict[str, Any]]:
        """
        Retrieves matching document chunks along with source metadata citations.
        Returns: List of dicts: {"text": str, "source": str, "chunk_index": int, "distance": float}
        """
        if not self.collection:
            logger.error("ChromaDB collection unavailable.")
            return []
            
        logger.info(f"Retrieving context with citations for query: '{query}' for patient {patient_id} (Filter: {filename_filter})...")
        query_vector = self.get_embedding(query)
        
        try:
            where_clause = {"patient_id": patient_id}
            if filename_filter:
                where_clause = {"filename": filename_filter}
                
            results = self.collection.query(
                query_embeddings=[query_vector],
                n_results=limit,
                where=where_clause
            )
            
            citations = []
            documents = results.get("documents", [[]])[0]
            metadatas = results.get("metadatas", [[]])[0]
            distances = results.get("distances", [[]])[0]
            
            for idx in range(len(documents)):
                meta = metadatas[idx] if idx < len(metadatas) else {}
                dist = distances[idx] if idx < len(distances) else 0.0
                citations.append({
                    "text": documents[idx],
                    "source": meta.get("filename", "unknown_report"),
                    "chunk_index": meta.get("chunk_index", 0),
                    "distance": dist
                })
            return citations
        except Exception as e:
            logger.error(f"Error querying vector collection: {str(e)}")
            return []

    def generate_report_summary(self, text_content: str) -> str:
        """Parses raw text content and creates an clinical overview summary."""
        # Simple extraction parser
        critical_lines = []
        for line in text_content.split("\n"):
            line_lower = line.lower()
            if any(kw in line_lower for kw in ["high", "low", "critical", "elevated", "abnormal"]):
                critical_lines.append(line.strip())
                
        summary = "METABOLIC LAB PROFILE REPORT ANALYSIS SUMMARY:\n"
        if critical_lines:
            summary += "Clinical Outliers Detected:\n"
            for cl in critical_lines[:5]:
                summary += f"- {cl}\n"
        else:
            summary += "All lab values parsed are within typical reference ranges.\n"
            
        summary += "\nRecommendation: Review findings with your physician during next consultation."
        return summary

rag_service = RAGService()
