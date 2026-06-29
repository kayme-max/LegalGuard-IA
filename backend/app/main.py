from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes.analizar import router as analizar_router
from app.api.routes.informes import router as informes_router
from app.api.routes.base_conocimiento import router as base_conocimiento_router

app = FastAPI(title="Asistente Legal AI")

# 🔥 CORS (NECESARIO PARA FRONTEND VITE)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# routers
app.include_router(analizar_router)
app.include_router(informes_router)
app.include_router(base_conocimiento_router)