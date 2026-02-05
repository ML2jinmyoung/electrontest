from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import json
import os
from datetime import datetime
from uuid import uuid4

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DATA_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data")
os.makedirs(DATA_DIR, exist_ok=True)
DATA_FILE = os.path.join(DATA_DIR, "folders.json")


class FileItem(BaseModel):
    name: str
    path: str
    type: str  # "file" or "directory"


class FolderUpload(BaseModel):
    folderName: str
    folderPath: str
    files: list[FileItem]


def load_data() -> list[dict]:
    if os.path.exists(DATA_FILE):
        with open(DATA_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    return []


def save_data(data: list[dict]):
    with open(DATA_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)


@app.post("/api/upload")
async def upload_folder(folder: FolderUpload):
    data = load_data()

    record = {
        "id": str(uuid4()),
        **folder.model_dump(),
        "savedAt": datetime.now().isoformat(),
    }

    data.append(record)
    save_data(data)

    return record


@app.get("/api/folders")
async def get_folders():
    return load_data()


@app.get("/api/folders/{folder_id}")
async def get_folder(folder_id: str):
    data = load_data()
    for record in data:
        if record["id"] == folder_id:
            return record
    return {"error": "Not found"}
