"""Iteration 30 — Media Library: image optimization + CDN (WebP), GIF preservation,
batch upload, 20MB limit. Regression: block-templates 'columns' + news refresh-all.
"""
import io
import os
import uuid
import pytest
import requests
from PIL import Image


# ----- helpers ------------------------------------------------------------
def _backend_url() -> str:
    url = os.environ.get("REACT_APP_BACKEND_URL")
    if not url:
        env_path = "/app/frontend/.env"
        if os.path.exists(env_path):
            with open(env_path) as f:
                for line in f:
                    line = line.strip()
                    if line.startswith("REACT_APP_BACKEND_URL="):
                        url = line.split("=", 1)[1].strip().strip('"').strip("'")
                        break
    if not url:
        raise RuntimeError("REACT_APP_BACKEND_URL not found")
    return url.rstrip("/")


BASE = _backend_url()
API = f"{BASE}/api"

ADMIN_EMAIL = "admin@vasilisnetshield.com"
ADMIN_PASSWORD = "Admin123!"


@pytest.fixture(scope="module")
def admin_headers():
    r = requests.post(
        f"{API}/auth/login",
        json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
        timeout=20,
    )
    assert r.status_code == 200, f"admin login failed: {r.status_code} {r.text}"
    return {"Authorization": f"Bearer {r.json()['token']}"}


@pytest.fixture(scope="module")
def trainee_headers():
    """Register a fresh non-admin (TRAINEE) user for 403 checks."""
    email = f"TEST_trainee_{uuid.uuid4().hex[:8]}@example.com"
    r = requests.post(
        f"{API}/auth/register",
        json={"email": email, "password": "Trainee123!", "name": "Test Trainee"},
        timeout=20,
    )
    assert r.status_code in (200, 201), f"trainee register failed: {r.status_code} {r.text}"
    token = r.json()["token"]
    role = r.json()["user"]["role"]
    assert role == "trainee", f"expected trainee, got {role}"
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture(scope="module")
def created_media_ids():
    ids = []
    yield ids
    # cleanup — best-effort
    r = requests.post(
        f"{API}/auth/login",
        json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
        timeout=20,
    )
    if r.status_code != 200:
        return
    h = {"Authorization": f"Bearer {r.json()['token']}"}
    for mid in ids:
        try:
            requests.delete(f"{API}/media/{mid}", headers=h, timeout=10)
        except Exception:
            pass


# ----- fixture generators -------------------------------------------------
def make_jpeg_bytes(size=(1024, 768), color="navy") -> bytes:
    buf = io.BytesIO()
    Image.new("RGB", size, color).save(buf, format="JPEG", quality=90)
    return buf.getvalue()


def make_png_bytes(size=(800, 600), color=(255, 0, 0, 255)) -> bytes:
    buf = io.BytesIO()
    Image.new("RGBA", size, color).save(buf, format="PNG")
    return buf.getvalue()


def make_animated_gif_bytes(size=(600, 600), frames=4) -> bytes:
    imgs = []
    for i in range(frames):
        img = Image.new("RGB", size, (i * 60 % 255, 50, 200))
        imgs.append(img)
    buf = io.BytesIO()
    imgs[0].save(
        buf,
        format="GIF",
        save_all=True,
        append_images=imgs[1:],
        duration=150,
        loop=0,
    )
    return buf.getvalue()


def make_svg_bytes() -> bytes:
    return (
        b'<?xml version="1.0"?>'
        b'<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100">'
        b'<circle cx="50" cy="50" r="40" fill="red"/></svg>'
    )


# =========================================================================
# 1. Single upload — JPEG → WebP optimization
# =========================================================================
def test_upload_jpeg_converted_to_webp(admin_headers, created_media_ids):
    jpeg = make_jpeg_bytes((1024, 768), "navy")
    assert len(jpeg) >= 5_000

    files = {"file": ("TEST_navy.jpg", jpeg, "image/jpeg")}
    data = {"category": "test", "alt_text": "TEST navy"}
    r = requests.post(f"{API}/media/upload", headers=admin_headers, files=files, data=data, timeout=30)
    assert r.status_code == 200, f"{r.status_code} {r.text}"
    body = r.json()
    assert "media" in body
    m = body["media"]
    for k in ("media_id", "filename", "mime_type", "original_mime_type",
              "original_size", "size", "data_url", "thumb_url", "category",
              "alt_text", "created_at"):
        assert k in m, f"missing field {k}"
    assert m["mime_type"] == "image/webp"
    assert m["original_mime_type"] == "image/jpeg"
    assert m["size"] < m["original_size"], "WebP should be smaller than JPEG"
    assert body["savings_percent"] > 0
    assert m["data_url"].startswith("data:image/webp;base64,")
    assert m["thumb_url"].startswith("data:image/webp;base64,")
    assert m["category"] == "test"
    created_media_ids.append(m["media_id"])


# =========================================================================
# 2. Single upload — PNG with alpha → WebP (alpha preserved)
# =========================================================================
def test_upload_png_converted_to_webp(admin_headers, created_media_ids):
    png = make_png_bytes((800, 600), (200, 50, 50, 128))  # semi-transparent
    files = {"file": ("TEST_alpha.png", png, "image/png")}
    data = {"category": "test"}
    r = requests.post(f"{API}/media/upload", headers=admin_headers, files=files, data=data, timeout=30)
    assert r.status_code == 200, r.text
    m = r.json()["media"]
    assert m["mime_type"] == "image/webp"
    assert m["original_mime_type"] == "image/png"
    assert m["data_url"].startswith("data:image/webp;base64,")
    created_media_ids.append(m["media_id"])


# =========================================================================
# 3. Single upload — Animated GIF must keep animation (stays image/gif)
# =========================================================================
def test_upload_animated_gif_preserved(admin_headers, created_media_ids):
    gif = make_animated_gif_bytes((600, 600), frames=4)
    files = {"file": ("TEST_anim.gif", gif, "image/gif")}
    data = {"category": "test"}
    r = requests.post(f"{API}/media/upload", headers=admin_headers, files=files, data=data, timeout=30)
    assert r.status_code == 200, r.text
    m = r.json()["media"]
    assert m["mime_type"] == "image/gif", f"GIF mime must be preserved, got {m['mime_type']}"
    assert m["original_mime_type"] == "image/gif"
    assert m["data_url"].startswith("data:image/gif;base64,")
    # thumbnail is WebP (expected — strips animation for grid preview)
    assert m["thumb_url"].startswith("data:image/webp;base64,")

    # Decode data_url and verify it is still an animated GIF (>1 frame)
    import base64
    b64 = m["data_url"].split(",", 1)[1]
    raw = base64.b64decode(b64)
    img = Image.open(io.BytesIO(raw))
    frames = 0
    try:
        while True:
            img.seek(frames)
            frames += 1
    except EOFError:
        pass
    assert frames > 1, f"animation lost — only {frames} frame(s)"
    created_media_ids.append(m["media_id"])


# =========================================================================
# 4. Single upload — SVG passthrough
# =========================================================================
def test_upload_svg_passthrough(admin_headers, created_media_ids):
    svg = make_svg_bytes()
    files = {"file": ("TEST_icon.svg", svg, "image/svg+xml")}
    data = {"category": "test"}
    r = requests.post(f"{API}/media/upload", headers=admin_headers, files=files, data=data, timeout=30)
    assert r.status_code == 200, r.text
    m = r.json()["media"]
    assert m["mime_type"] == "image/svg+xml"
    assert m["original_mime_type"] == "image/svg+xml"
    assert m["data_url"].startswith("data:image/svg+xml;base64,")
    created_media_ids.append(m["media_id"])


# =========================================================================
# 5. Single upload — rejects >20MB
# =========================================================================
def test_upload_rejects_oversized(admin_headers):
    # 21MB payload — JPEG content_type is fine; size check runs before optimization
    big = b"x" * (21 * 1024 * 1024)
    files = {"file": ("TEST_big.jpg", big, "image/jpeg")}
    r = requests.post(f"{API}/media/upload", headers=admin_headers, files=files, timeout=60)
    assert r.status_code == 400, f"expected 400, got {r.status_code} {r.text[:200]}"
    assert "20MB" in r.text or "too large" in r.text.lower()


# =========================================================================
# 6. Batch upload — happy path (2 JPEG + 1 GIF)
# =========================================================================
def test_batch_upload_mixed(admin_headers, created_media_ids):
    jpeg1 = make_jpeg_bytes((800, 600), "teal")
    jpeg2 = make_jpeg_bytes((640, 480), "crimson")
    gif = make_animated_gif_bytes((400, 400), frames=3)

    files = [
        ("files", ("TEST_batch_a.jpg", jpeg1, "image/jpeg")),
        ("files", ("TEST_batch_b.jpg", jpeg2, "image/jpeg")),
        ("files", ("TEST_batch_c.gif", gif, "image/gif")),
    ]
    r = requests.post(
        f"{API}/media/upload-batch",
        headers=admin_headers,
        files=files,
        data={"category": "batch-test"},
        timeout=60,
    )
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["total"] == 3
    assert body["ok"] == 3
    assert body["errors"] == 0
    assert body["failed"] == []
    assert len(body["uploaded"]) == 3

    mimes = [m["mime_type"] for m in body["uploaded"]]
    assert mimes.count("image/webp") == 2
    assert mimes.count("image/gif") == 1

    for m in body["uploaded"]:
        for k in ("media_id", "filename", "mime_type", "original_mime_type",
                  "original_size", "size", "data_url", "thumb_url", "category"):
            assert k in m
        assert m["category"] == "batch-test"
        created_media_ids.append(m["media_id"])


# =========================================================================
# 7. Batch upload — partial failure (one oversized file mixed with valid ones)
# =========================================================================
def test_batch_upload_partial_failure(admin_headers, created_media_ids):
    jpeg = make_jpeg_bytes((800, 600), "gold")
    big = b"x" * (21 * 1024 * 1024)

    files = [
        ("files", ("TEST_batch_ok.jpg", jpeg, "image/jpeg")),
        ("files", ("TEST_batch_big.jpg", big, "image/jpeg")),
    ]
    r = requests.post(
        f"{API}/media/upload-batch",
        headers=admin_headers,
        files=files,
        data={"category": "batch-test"},
        timeout=60,
    )
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["total"] == 2
    assert body["ok"] >= 1
    assert body["errors"] >= 1
    assert len(body["failed"]) >= 1
    f0 = body["failed"][0]
    assert "filename" in f0 and "error" in f0
    assert f0["filename"] == "TEST_batch_big.jpg"
    for m in body["uploaded"]:
        created_media_ids.append(m["media_id"])


# =========================================================================
# 8. Batch upload — admin-only (403 for trainee)
# =========================================================================
def test_batch_upload_forbidden_for_non_admin(trainee_headers):
    jpeg = make_jpeg_bytes((400, 300), "black")
    files = [("files", ("TEST_x.jpg", jpeg, "image/jpeg"))]
    r = requests.post(
        f"{API}/media/upload-batch",
        headers=trainee_headers,
        files=files,
        timeout=30,
    )
    assert r.status_code == 403, f"expected 403, got {r.status_code} {r.text[:200]}"


# =========================================================================
# 9. Single upload — admin-only (sanity check, 403 for trainee)
# =========================================================================
def test_single_upload_forbidden_for_non_admin(trainee_headers):
    jpeg = make_jpeg_bytes((400, 300), "black")
    files = {"file": ("TEST_x.jpg", jpeg, "image/jpeg")}
    r = requests.post(f"{API}/media/upload", headers=trainee_headers, files=files, timeout=30)
    assert r.status_code == 403


# =========================================================================
# 10. GET /api/media — list returns thumb_url populated
# =========================================================================
def test_list_media_includes_thumb_url(admin_headers, created_media_ids):
    assert len(created_media_ids) > 0, "need prior uploads"
    r = requests.get(f"{API}/media", headers=admin_headers, timeout=20)
    assert r.status_code == 200, r.text
    items = r.json().get("media", [])
    assert isinstance(items, list) and len(items) > 0
    # At least one recent TEST_ upload should have thumb_url
    recent = [m for m in items if m.get("media_id") in created_media_ids]
    assert len(recent) > 0, "none of the created media found in list"
    for m in recent:
        assert "thumb_url" in m and m["thumb_url"], f"thumb_url missing on {m.get('media_id')}"
        assert m["thumb_url"].startswith("data:image/")


# =========================================================================
# 11. DELETE /api/media/{id} — admin-only, actually deletes
# =========================================================================
def test_delete_media_admin_only(admin_headers, trainee_headers):
    # Create a throwaway item
    jpeg = make_jpeg_bytes((320, 240), "olive")
    files = {"file": ("TEST_del.jpg", jpeg, "image/jpeg")}
    r = requests.post(f"{API}/media/upload", headers=admin_headers, files=files,
                      data={"category": "test"}, timeout=30)
    assert r.status_code == 200
    mid = r.json()["media"]["media_id"]

    # Trainee cannot delete
    r_tr = requests.delete(f"{API}/media/{mid}", headers=trainee_headers, timeout=15)
    assert r_tr.status_code == 403

    # Admin can delete
    r_ok = requests.delete(f"{API}/media/{mid}", headers=admin_headers, timeout=15)
    assert r_ok.status_code == 200

    # Verify gone
    r_get = requests.get(f"{API}/media/{mid}", headers=admin_headers, timeout=15)
    assert r_get.status_code == 404


# =========================================================================
# 12. Regression — block-templates still includes 'columns'
# =========================================================================
def test_block_templates_has_columns(admin_headers):
    r = requests.get(f"{API}/pages/block-templates", headers=admin_headers, timeout=15)
    assert r.status_code == 200, r.text
    body = r.json()
    # API returns dict with 'templates' key
    templates = body.get("templates", body if isinstance(body, list) else [])
    types = {t.get("type") for t in templates if isinstance(t, dict)}
    assert "columns" in types, f"'columns' template missing. types={types}"


# =========================================================================
# 13. Regression — news refresh-all still works (admin-only, 200)
# =========================================================================
def test_news_refresh_all(admin_headers):
    r = requests.post(f"{API}/news/feeds/refresh-all", headers=admin_headers, timeout=60)
    assert r.status_code == 200, f"refresh-all failed: {r.status_code} {r.text[:300]}"
    body = r.json()
    # Flexible contract: we only need a well-formed JSON response
    assert isinstance(body, dict)
