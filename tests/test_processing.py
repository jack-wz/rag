import json
import sys
import types
from pathlib import Path

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

# Ensure backend package is importable
BACKEND_PATH = Path(__file__).resolve().parents[1] / "unstructured-platform-backend"
if str(BACKEND_PATH) not in sys.path:
    sys.path.insert(0, str(BACKEND_PATH))

from app.api.routers import processing_simple


def create_unstructured_stub():
    """Insert minimal stub for the unstructured package."""
    class DummyElement:
        def __init__(self, text="stub"):
            self.text = text
            self.metadata = types.SimpleNamespace()

        def to_dict(self):
            return {"text": self.text}

    unstructured = types.ModuleType("unstructured")
    partition_mod = types.ModuleType("unstructured.partition")
    auto_mod = types.ModuleType("unstructured.partition.auto")

    def partition(filename=None, **kwargs):
        return [DummyElement("dummy content")]

    auto_mod.partition = partition
    partition_mod.auto = auto_mod

    chunking_mod = types.ModuleType("unstructured.chunking")
    title_mod = types.ModuleType("unstructured.chunking.title")
    basic_mod = types.ModuleType("unstructured.chunking.basic")

    def passthrough(elements, **kwargs):
        return elements

    title_mod.chunk_by_title = passthrough
    basic_mod.chunk_elements = passthrough
    chunking_mod.title = title_mod
    chunking_mod.basic = basic_mod

    cleaners_mod = types.ModuleType("unstructured.cleaners")
    core_mod = types.ModuleType("unstructured.cleaners.core")

    def clean_extra_whitespace(text):
        return text

    core_mod.clean_extra_whitespace = clean_extra_whitespace
    cleaners_mod.core = core_mod

    unstructured.partition = partition_mod
    unstructured.chunking = chunking_mod
    unstructured.cleaners = cleaners_mod

    modules = {
        "unstructured": unstructured,
        "unstructured.partition": partition_mod,
        "unstructured.partition.auto": auto_mod,
        "unstructured.chunking": chunking_mod,
        "unstructured.chunking.title": title_mod,
        "unstructured.chunking.basic": basic_mod,
        "unstructured.cleaners": cleaners_mod,
        "unstructured.cleaners.core": core_mod,
    }
    sys.modules.update(modules)
    return modules


@pytest.fixture(scope="session")
def flow_client():
    modules = create_unstructured_stub()
    from app.api.routers import processing  # imported after stubbing

    app = FastAPI()
    app.include_router(processing.router, prefix="/api/v1")
    client = TestClient(app)
    yield client
    for name in modules:
        sys.modules.pop(name, None)


@pytest.fixture(scope="session")
def doc_client():
    app = FastAPI()
    app.include_router(processing_simple.router, prefix="/api/v1")
    return TestClient(app)


def test_process_document_basic(doc_client):
    resp = doc_client.post(
        "/api/v1/process-document/",
        files={"file": ("test.txt", b"hello world", "text/plain")},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert "elements" in data
    assert isinstance(data["elements"], list)


def test_process_document_unsupported_type(doc_client):
    resp = doc_client.post(
        "/api/v1/process-document/",
        files={"file": ("malware.exe", b"0x0", "application/octet-stream")},
    )
    assert resp.status_code == 400
    assert "Unsupported file type" in resp.json()["detail"]


def test_process_flow_valid(flow_client):
    flow = {
        "nodes": [
            {"id": "1", "type": "inputNode", "config": {}},
            {"id": "2", "type": "outputNode", "config": {}},
        ],
        "edges": [
            {"id": "e1", "source": "1", "target": "2"},
        ],
    }
    resp = flow_client.post(
        "/api/v1/process-flow/",
        data={"flow_data_json": json.dumps(flow)},
        files={"file": ("test.txt", b"content", "text/plain")},
    )
    assert resp.status_code == 200
    assert len(resp.json().get("determined_path", [])) == 2


def test_process_flow_multiple_inputs(flow_client):
    flow = {
        "nodes": [
            {"id": "1", "type": "inputNode", "config": {}},
            {"id": "x", "type": "inputNode", "config": {}},
            {"id": "2", "type": "outputNode", "config": {}},
        ],
        "edges": [
            {"id": "e1", "source": "1", "target": "2"},
        ],
    }
    resp = flow_client.post(
        "/api/v1/process-flow/",
        data={"flow_data_json": json.dumps(flow)},
        files={"file": ("test.txt", b"content", "text/plain")},
    )
    assert resp.status_code == 400
    assert "Input node" in resp.json()["detail"]


def test_process_flow_invalid_json(flow_client):
    resp = flow_client.post(
        "/api/v1/process-flow/",
        data={"flow_data_json": "{oops"},
        files={"file": ("test.txt", b"content", "text/plain")},
    )
    assert resp.status_code == 400
    assert "Invalid JSON" in resp.json()["detail"]
