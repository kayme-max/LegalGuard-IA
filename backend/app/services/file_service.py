# app/services/file_service.py

import shutil
import os
from uuid import uuid4
from fastapi import UploadFile
from app.core.config import UPLOAD_DIR

def guardar_pdf_temporal(file: UploadFile):

    os.makedirs(UPLOAD_DIR, exist_ok=True)

    filename = f"{uuid4()}_{file.filename}"

    temp_path = os.path.join(UPLOAD_DIR, filename)

    with open(temp_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    return temp_path

def eliminar_archivo(path):

    if os.path.exists(path):
        os.remove(path)