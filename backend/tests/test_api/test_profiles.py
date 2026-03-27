def test_create_and_get_profile(client):
    res = client.post("/api/v1/profiles/", json={"full_name": "Jane Doe", "email": "jane@example.com"})
    assert res.status_code == 201
    data = res.json()
    assert data["full_name"] == "Jane Doe"
    profile_id = data["id"]

    res2 = client.get(f"/api/v1/profiles/{profile_id}")
    assert res2.status_code == 200
    assert res2.json()["email"] == "jane@example.com"


def test_update_profile(client):
    res = client.post("/api/v1/profiles/", json={"full_name": "John"})
    pid = res.json()["id"]
    updated = client.patch(f"/api/v1/profiles/{pid}", json={"full_name": "John Updated"})
    assert updated.json()["full_name"] == "John Updated"


def test_delete_profile(client):
    res = client.post("/api/v1/profiles/", json={"full_name": "Delete Me"})
    pid = res.json()["id"]
    client.delete(f"/api/v1/profiles/{pid}")
    assert client.get(f"/api/v1/profiles/{pid}").status_code == 404
