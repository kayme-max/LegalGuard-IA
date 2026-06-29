"""Excepciones del motor de riesgos."""

from __future__ import annotations


class LLMRateLimitError(Exception):
    """Cuota o rate limit del proveedor LLM agotado."""

    def __init__(
        self,
        mensaje: str,
        proveedor: str = "groq",
        retry_after: str | None = None,
    ) -> None:
        self.proveedor = proveedor
        self.retry_after = retry_after
        super().__init__(mensaje)


class LLMContextTooLargeError(Exception):
    """El prompt supera el límite de tokens del proveedor."""

    def __init__(
        self,
        mensaje: str,
        proveedor: str = "groq",
        tokens_solicitados: int | None = None,
        tokens_limite: int | None = None,
    ) -> None:
        self.proveedor = proveedor
        self.tokens_solicitados = tokens_solicitados
        self.tokens_limite = tokens_limite
        super().__init__(mensaje)
