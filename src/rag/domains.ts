export const DOMINIOS_JURIDICOS = [
  "Garantías y Seguros",
  "Penalidades y Multas",
  "Pagos y Aspectos Económicos",
  "Plazos y Cronograma",
  "Resolución y Terminación",
  "Responsabilidades e Indemnizaciones",
  "Aspectos Técnicos y Operativos",
  "Aspectos Regulatorios y Ambientales",
  "Aspectos Laborales y Tributarios",
  "Otros Aspectos Legales"
];

export function groupRisksByDomain(risks: any[]): Record<string, any[]> {
  const grouped: Record<string, any[]> = {};
  
  // Initialize domains
  for (const dom of DOMINIOS_JURIDICOS) {
    grouped[dom] = [];
  }

  for (const risk of risks) {
    const cat = (risk.categoria || '').toLowerCase();
    const subcat = (risk.subcategoria || '').toLowerCase();
    const texto = (risk.riesgo_identificado + ' ' + risk.foco_revision).toLowerCase();

    let assigned = false;
    
    if (cat.includes('garant') || subcat.includes('garant') || texto.includes('garantía') || texto.includes('fianza') || texto.includes('seguro')) {
      grouped["Garantías y Seguros"].push(risk);
      assigned = true;
    } else if (cat.includes('penal') || subcat.includes('penal') || texto.includes('penalidad') || texto.includes('multa')) {
      grouped["Penalidades y Multas"].push(risk);
      assigned = true;
    } else if (cat.includes('económ') || cat.includes('financier') || texto.includes('pago') || texto.includes('precio') || texto.includes('adelanto')) {
      grouped["Pagos y Aspectos Económicos"].push(risk);
      assigned = true;
    } else if (cat.includes('plazo') || texto.includes('plazo') || texto.includes('cronograma')) {
      grouped["Plazos y Cronograma"].push(risk);
      assigned = true;
    } else if (cat.includes('resolución') || cat.includes('terminación') || texto.includes('resolución') || texto.includes('nulidad')) {
      grouped["Resolución y Terminación"].push(risk);
      assigned = true;
    } else if (cat.includes('responsabilidad') || texto.includes('indemnización') || texto.includes('daño')) {
      grouped["Responsabilidades e Indemnizaciones"].push(risk);
      assigned = true;
    } else if (cat.includes('técnic') || cat.includes('operativ') || texto.includes('técnico') || texto.includes('obra') || texto.includes('servicio')) {
      grouped["Aspectos Técnicos y Operativos"].push(risk);
      assigned = true;
    } else if (cat.includes('ambiental') || cat.includes('regulatori') || texto.includes('permiso') || texto.includes('licencia')) {
      grouped["Aspectos Regulatorios y Ambientales"].push(risk);
      assigned = true;
    } else if (cat.includes('laboral') || cat.includes('tributari') || texto.includes('trabajador') || texto.includes('impuesto')) {
      grouped["Aspectos Laborales y Tributarios"].push(risk);
      assigned = true;
    }
    
    if (!assigned) {
      grouped["Otros Aspectos Legales"].push(risk);
    }
  }

  // Remove empty domains
  for (const dom in grouped) {
    if (grouped[dom].length === 0) {
      delete grouped[dom];
    }
  }

  return grouped;
}
