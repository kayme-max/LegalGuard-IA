import fitz  # PyMuPDF
import os

def extraer_texto_pdf(ruta_pdf: str) -> str:
    """
    Extrae el texto de un PDF manteniendo un rastro de la estructura básica.
    """
    if not os.path.exists(ruta_pdf):
        raise FileNotFoundError(f"No se encontró el archivo: {ruta_pdf}")

    texto_completo = ""
    
    try:
        # Abrir el documento
        with fitz.open(ruta_pdf) as doc:
            for num_pagina, pagina in enumerate(doc):
                # Extraemos el texto de la página
                texto_pagina = pagina.get_text("text")
                
                # Añadimos una marca de página para que la IA sepa dónde está
                texto_completo += f"\n--- INICIO PÁGINA {num_pagina + 1} ---\n"
                texto_completo += texto_pagina
                texto_completo += f"\n--- FIN PÁGINA {num_pagina + 1} ---\n"
        
        return texto_completo

    except Exception as e:
        print(f"Error al extraer PDF: {e}")
        return ""