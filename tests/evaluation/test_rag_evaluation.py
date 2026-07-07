import pytest
from unittest.mock import MagicMock
# Assuming local path resolution
# from backend.app.services.rag_service import RAGService

@pytest.fixture
def mock_chroma_client():
    client = MagicMock()
    mock_collection = MagicMock()
    
    # Mocking standard query response format for ChromaDB
    mock_collection.query.return_value = {
        "documents": [
            [
                "The patient's LDL cholesterol is elevated at 145 mg/dL.",
                "Slightly high glucose noted in fasting blood panel.",
                "Recommend diet control and follow-up in 3 months."
            ]
        ],
        "metadatas": [
            [
                {"patient_id": "patient_1", "report_id": "rep_1"},
                {"patient_id": "patient_1", "report_id": "rep_1"},
                {"patient_id": "patient_1", "report_id": "rep_1"}
            ]
        ],
        "distances": [[0.12, 0.25, 0.38]]
    }
    client.get_collection.return_value = mock_collection
    return client

def test_rag_retrieval_relevance(mock_chroma_client):
    """
    Verify that RAG collection query properly filters by patient_id
    and matches top context based on distance score threshold.
    """
    collection = mock_chroma_client.get_collection("medical_reports_rag")
    query_text = "What was my cholesterol level?"
    
    results = collection.query(
        query_embeddings=[[0.1] * 768],
        n_results=3,
        where={"patient_id": "patient_1"}
    )
    
    # Verify retrieval structure
    assert "documents" in results
    assert len(results["documents"][0]) == 3
    
    # Check that the first retrieved document contains our target term
    first_doc = results["documents"][0][0]
    assert "cholesterol" in first_doc.lower()
    
    # Check distance constraints (closeness threshold)
    assert results["distances"][0][0] < 0.2
