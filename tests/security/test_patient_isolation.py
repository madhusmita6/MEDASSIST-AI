import pytest

# Mock DB schema layout for testing queries
MOCK_PATIENT_RECORDS = [
    {"id": "rec_1", "patient_id": "patient_A", "notes": "Blood report shows normal range."},
    {"id": "rec_2", "patient_id": "patient_A", "notes": "Medication reminder set for 8 AM."},
    {"id": "rec_3", "patient_id": "patient_B", "notes": "Critical allergies: Penicillin."},
]

def fetch_patient_records(current_patient_id: str) -> list:
    """Simulates query execution matching tenant constraints strictly."""
    # Ensure patient_id is explicitly bound in query filtering
    results = [rec for rec in MOCK_PATIENT_RECORDS if rec["patient_id"] == current_patient_id]
    return results

def test_patient_data_isolation():
    """Verify that queries for patient_A never leak patient_B data."""
    records_A = fetch_patient_records("patient_A")
    
    # Patient A should see exactly two records
    assert len(records_A) == 2
    
    # Ensure no record belongs to Patient B
    for rec in records_A:
        assert rec["patient_id"] != "patient_B"
        assert "Penicillin" not in rec["notes"]

def test_empty_results_on_missing_patient():
    """Verify that queries with unregistered client IDs return empty sets, not all databases."""
    records = fetch_patient_records("unregistered_patient")
    assert len(records) == 0
