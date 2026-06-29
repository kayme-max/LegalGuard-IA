from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class RiskKnowledgeBase(BaseModel):
    """Campos mínimos para crear/actualizar un registro."""

    riesgo_id: Optional[str] = None          # PK de negocio (ej. "L-001"), nullable en BD

    sector: Optional[str] = None
    tipo_contrato: Optional[str] = None
    categoria: Optional[str] = None
    subcategoria: Optional[str] = None
    riesgo_identificado: Optional[str] = None
    foco_revision: Optional[str] = None

    nombre_archivo_licitacion: Optional[str] = None
    seccion_bases: Optional[str] = None
    pagina_pdf: Optional[int] = None

    nombre_archivo_normativa: Optional[str] = None

    contexto_parrafo: Optional[str] = None
    evidencia_licitacion: Optional[str] = None
    sustento_legal_normativo: Optional[str] = None

    fragmento_literal_fuente: Optional[str] = None 

    activo: bool = True


class RiskKnowledge(RiskKnowledgeBase):
    """Schema completo con campos generados por la BD (lectura)."""

    id: int                   # SERIAL PRIMARY KEY
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True  # Pydantic v2 (era orm_mode en v1)


class RiskKnowledgeCreate(RiskKnowledgeBase):
    """Schema para INSERT — todos los campos opcionales salvo los obligatorios de negocio."""
    pass


class RiskKnowledgeUpdate(BaseModel):
    """Schema para UPDATE parcial (PATCH) — todos los campos opcionales."""

    riesgo_id: Optional[str] = None
    sector: Optional[str] = None
    tipo_contrato: Optional[str] = None
    categoria: Optional[str] = None
    subcategoria: Optional[str] = None
    riesgo_identificado: Optional[str] = None
    foco_revision: Optional[str] = None

    nombre_archivo_licitacion: Optional[str] = None
    seccion_bases: Optional[str] = None
    pagina_pdf: Optional[int] = None

    nombre_archivo_normativa: Optional[str] = None

    contexto_parrafo: Optional[str] = None
    evidencia_licitacion: Optional[str] = None
    sustento_legal_normativo: Optional[str] = None

    fragmento_literal_fuente: Optional[str] = None

    activo: Optional[bool] = None