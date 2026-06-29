# app/core/config.py

import os
from dotenv import load_dotenv

load_dotenv()

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

UPLOAD_DIR = os.path.join(BASE_DIR, "uploads")

# RUTA_JSON eliminada — la base de conocimiento ahora vive en PostgreSQL
# (tabla base_conocimiento_riesgos). Ver app/repositories/risk_repository.py