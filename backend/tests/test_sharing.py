from tests.conftest import login


def _ids(listing: list[dict]) -> dict[int, str]:
    return {d["id"]: d["role"] for d in listing}


def test_sharing_roles_control_access(client):
    alice, bob = login(client, "alice"), login(client, "bob")

    # 1. alice creates a doc
    res = client.post("/documents", json={"title": "Plan"}, headers=alice)
    assert res.status_code == 201
    doc_id = res.json()["id"]
    url = f"/documents/{doc_id}"

    # 2. bob has no access: 404, and it's not in his shared list
    assert client.get(url, headers=bob).status_code == 404
    assert doc_id not in _ids(client.get("/documents", headers=bob).json()["shared"])

    # 3. share as viewer
    res = client.post(f"{url}/shares", json={"username": "bob", "role": "viewer"}, headers=alice)
    assert res.status_code == 201
    assert res.json()["role"] == "viewer"

    # 4. bob can read as viewer
    res = client.get(url, headers=bob)
    assert res.status_code == 200
    assert res.json()["role"] == "viewer"
    assert _ids(client.get("/documents", headers=bob).json()["shared"])[doc_id] == "viewer"

    # 5. viewer cannot edit or share
    assert client.patch(url, json={"content_html": "<p>x</p>"}, headers=bob).status_code == 403
    res = client.post(f"{url}/shares", json={"username": "carol"}, headers=bob)
    assert res.status_code == 403

    # 6. re-share upgrades the role instead of duplicating the share
    res = client.post(f"{url}/shares", json={"username": "bob", "role": "editor"}, headers=alice)
    assert res.status_code == 200
    shares = client.get(f"{url}/shares", headers=alice).json()
    assert [(s["user"]["username"], s["role"]) for s in shares] == [("bob", "editor")]

    # 7. editor can edit content
    html = "<p><strong>hi</strong></p>"
    res = client.patch(url, json={"content_html": html}, headers=bob)
    assert res.status_code == 200

    # 8. formatting round-trips exactly
    assert client.get(url, headers=alice).json()["content_html"] == html

    # 9. editor still cannot delete
    assert client.delete(url, headers=bob).status_code == 403

    # 10. unshare revokes access
    assert client.delete(f"{url}/shares/bob", headers=alice).status_code == 204
    assert client.get(url, headers=bob).status_code == 404


def test_carol_cannot_see_unshared_doc(client):
    alice, carol = login(client, "alice"), login(client, "carol")
    owned = client.get("/documents", headers=alice).json()["owned"]
    welcome = next(d for d in owned if d["title"] == "Welcome to Ajaia Docs")
    assert client.get(f"/documents/{welcome['id']}", headers=carol).status_code == 404


def test_import_validates_and_converts(client):
    alice = login(client, "alice")

    res = client.post(
        "/documents/import", files={"file": ("x.pdf", b"%PDF-1.4", "application/pdf")},
        headers=alice,
    )
    assert res.status_code == 400

    res = client.post(
        "/documents/import", files={"file": ("notes.md", b"# Hi\n\n- a\n- b", "text/markdown")},
        headers=alice,
    )
    assert res.status_code == 201
    doc = res.json()
    assert "<h1>Hi</h1>" in doc["content_html"]
    assert "<li>a</li>" in doc["content_html"]
    assert doc["title"] == "notes"
    assert doc["id"] in _ids(client.get("/documents", headers=alice).json()["owned"])

    res = client.post(
        "/documents/import", files={"file": ("empty.txt", b"", "text/plain")}, headers=alice
    )
    assert res.status_code == 400


def test_requires_login(client):
    assert client.get("/documents").status_code == 401
