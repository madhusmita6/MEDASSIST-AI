def test_health_check(client):
    """Verify healthcheck endpoint returns status 200 and details."""
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"

def test_auth_register_placeholder(client):
    """Verify register stub endpoint responds correctly."""
    response = client.post("/api/v1/auth/register")
    assert response.status_code == 201
    assert "TODO" in response.json()["message"]

def test_emergency_sos_placeholder(client):
    """Verify SOS stub endpoint responds with structured return schema."""
    response = client.post("/api/v1/emergency/sos")
    assert response.status_code == 200
    assert response.json()["status"] == "triggered"
    assert "caregivers_notified" in response.json()
