import { Riesgo } from '@/types';

export const handleDownloadBaseExcel = async (riesgos: Riesgo[]) => {
  if (!riesgos || riesgos.length === 0) return;
  const ExcelJS = (await import("exceljs")).default;
  const { saveAs } = await import("file-saver");
  const workbook = new ExcelJS.Workbook();
  const ws = workbook.addWorksheet("Base de Conocimiento");

  const headers = [
    "Número Riesgo",
    "Tipo Contrato",
    "Sector",
    "Categoría",
    "Subcategoría",
    "Riesgo Identificado",
    "Foco Revisión",
    "Sustento Legal / Normativo",
    "Archivo Licitación",
    "Sección Bases",
    "Página PDF",
    "Archivo Normativa",
    "Nivel Sustento Documental"
  ];

  const headerRow = ws.addRow(headers);
  headerRow.height = 30;
  headerRow.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: "FFFFFF" }, size: 11 };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "312E81" } };
    cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
    cell.border = {
      top: { style: "thin", color: { argb: "4F46E5" } },
      left: { style: "thin", color: { argb: "4F46E5" } },
      bottom: { style: "thin", color: { argb: "4F46E5" } },
      right: { style: "thin", color: { argb: "4F46E5" } },
    };
  });

  riesgos.forEach((r, i) => {
    const row = ws.addRow([
      r.numero_riesgo || r.riesgo_id || String(i + 1).padStart(3, "0"),
      r.tipo_contrato || "",
      r.sector || "",
      r.categoria || "",
      r.subcategoria || "",
      r.riesgo_identificado || "",
      r.foco_revision || "",
      r.sustento_legal_normativo || "",
      r.nombre_archivo_licitacion || "",
      r.seccion_bases || "",
      r.pagina_pdf || "",
      r.nombre_archivo_normativa || "",
      r.nivel_sustento_documental || ""
    ]);
    const isEven = i % 2 === 0;
    row.eachCell((cell) => {
      cell.alignment = { vertical: "top", wrapText: true };
      if (isEven) {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "F8FAFC" } };
      }
      cell.border = {
        top: { style: "thin", color: { argb: "E2E8F0" } },
        left: { style: "thin", color: { argb: "E2E8F0" } },
        bottom: { style: "thin", color: { argb: "E2E8F0" } },
        right: { style: "thin", color: { argb: "E2E8F0" } },
      };
    });
  });

  ws.columns = [
    { width: 15 }, { width: 20 }, { width: 15 }, { width: 20 }, { width: 20 },
    { width: 40 }, { width: 40 }, { width: 40 }, { width: 25 }, { width: 15 },
    { width: 15 }, { width: 25 }, { width: 25 }
  ];

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  saveAs(blob, `base_conocimiento.xlsx`);
};
