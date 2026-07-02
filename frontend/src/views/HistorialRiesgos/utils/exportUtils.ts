import { AnalysisSession } from '@/types';

export const handleDownloadExcel = async (selectedSession: AnalysisSession) => {
  if (
    !selectedSession ||
    !selectedSession.result?.resultado?.riesgos_detectados
  )
    return;

  const ExcelJS = (await import("exceljs")).default;
  const { saveAs } = await import("file-saver");

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Sistema de Análisis de Riesgos";
  workbook.lastModifiedBy = "Sistema de Análisis de Riesgos";
  workbook.created = new Date();
  workbook.modified = new Date();

  const ws1 = workbook.addWorksheet("Resumen de Análisis de Riesgo");
  const ws2 = workbook.addWorksheet("Detalle de Riesgos Identificados");

  const projectName =
    selectedSession.formData?.nombreProyecto ||
    selectedSession.result?.proyecto ||
    "Proyecto";
  const sector =
    selectedSession.result?.sector ||
    (Array.isArray(selectedSession.formData?.sector) ? selectedSession.formData.sector.join(", ") : selectedSession.formData?.sector) ||
    "S/N";
  const tiposContrato =
    selectedSession.formData?.tipoContrato || "S/N";
  const numRiesgos =
    selectedSession.result.resultado.riesgos_detectados.length;

  let conSustento = 0;
  let nuevos = 0;

  selectedSession.result.resultado.riesgos_detectados.forEach((r) => {
    if (
      r.nombre_archivo_normativa &&
      r.nombre_archivo_normativa.trim() !== ""
    ) {
      conSustento++;
    } else {
      nuevos++;
    }
  });

  const numDocLicitacion = selectedSession.filename ? 1 : 0;
  const numDocNormativa =
    selectedSession.result?.normativas_cargadas?.length || 0;
  const pagLicitacion = selectedSession.paginasLicitacion || 0;
  const pagNormativa = selectedSession.paginasNormativas || 0;

  // Helper to add styled title rows
  const addTitle = (
    sheet: any,
    text: string,
    bgColor: string = "2B3A55",
    fontColor: string = "FFFFFF",
  ) => {
    const row = sheet.addRow([text]);
    sheet.mergeCells(`A${row.number}:Q${row.number}`);
    row.getCell(1).font = {
      bold: true,
      color: { argb: fontColor },
      size: 12,
    };
    row.getCell(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: bgColor },
    };
    row.getCell(1).alignment = { vertical: "middle", horizontal: "center" };
    row.height = 25;
  };

  // Helper to add label-value rows
  const addLabelValue = (
    sheet: any,
    label: string,
    value1: any,
    value2: any = "",
  ) => {
    const row = sheet.addRow([label, value1, value2]);
    sheet.mergeCells(`B${row.number}:Q${row.number}`);
    row.getCell(1).font = { bold: true, color: { argb: "333333" } };
    row.getCell(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "F0F4F8" },
    };
    row.getCell(1).alignment = { vertical: "middle" };
    row.getCell(2).alignment = { vertical: "middle", wrapText: true };

    // Add borders
    [1, 2].forEach((col) => {
      row.getCell(col).border = {
        top: { style: "thin", color: { argb: "E2E8F0" } },
        left: { style: "thin", color: { argb: "E2E8F0" } },
        bottom: { style: "thin", color: { argb: "E2E8F0" } },
        right: { style: "thin", color: { argb: "E2E8F0" } },
      };
    });
  };

  // --- SUMMARY SECTION (SHEET 1) ---
  addTitle(ws1, "RESUMEN DE ANÁLISIS DE RIESGOS");
  ws1.addRow([]); // empty row

  addTitle(ws1, "INFORMACIÓN DEL PROYECTO", "4A5568");
  addLabelValue(ws1, "Nombre", projectName);
  addLabelValue(ws1, "Sector", sector);
  addLabelValue(ws1, "Tipos de Contrato", tiposContrato);
  ws1.addRow([]); // empty row

  addTitle(ws1, "DOCUMENTOS SUBIDOS", "4A5568");
  addLabelValue(
    ws1,
    "Archivos de Licitación",
    `${numDocLicitacion} documento(s) - ${pagLicitacion > 0 ? `${pagLicitacion} páginas` : "N/A"}`,
  );
  addLabelValue(
    ws1,
    "Archivos de Normativa",
    `${numDocNormativa} documento(s) - ${pagNormativa > 0 ? `${pagNormativa} páginas` : "N/A"}`,
  );
  ws1.addRow([]); // empty row

  addTitle(ws1, "MÉTRICAS DE RIESGOS", "4A5568");
  addLabelValue(ws1, "Total Riesgos Identificados", numRiesgos);
  addLabelValue(ws1, "Riesgos con Sustento Normativo", conSustento);
  addLabelValue(ws1, "Riesgos Nuevos", nuevos);
  ws1.addRow([]); // empty row

  ws1.columns = [{ width: 30 }, { width: 80 }];

  // --- RISKS DATA SECTION (SHEET 2) ---
  addTitle(ws2, "DETALLE DE RIESGOS IDENTIFICADOS", "1E40AF");

  // Headers
  const headers = [
    "ID",
    "Sector",
    "Tipo Contrato",
    "Categoría",
    "Subcategoría",
    "Riesgo Identificado",
    "Foco Revisión",
    "Archivo Licitación",
    "Sección Bases",
    "Página PDF",
    "Archivo Normativa",
    "Contexto Párrafo",
    "Evidencia Licitación",
    "Sustento Legal/Normativo",
    "Fragmento Literal",
    "Nivel Sustento",
    "Alerta Sistema",
  ];

  const headerRow = ws2.addRow(headers);
  headerRow.height = 30;
  headerRow.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: "FFFFFF" }, size: 11 };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "312E81" },
    }; // Deep Indigo
    cell.alignment = {
      vertical: "middle",
      horizontal: "center",
      wrapText: true,
    };
    cell.border = {
      top: { style: "thin", color: { argb: "4F46E5" } },
      left: { style: "thin", color: { argb: "4F46E5" } },
      bottom: { style: "thin", color: { argb: "4F46E5" } },
      right: { style: "thin", color: { argb: "4F46E5" } },
    };
  });

  // Data rows
  selectedSession.result.resultado.riesgos_detectados.forEach((r, i) => {
    const row = ws2.addRow([
      r.numero_riesgo || String(i + 1).padStart(3, "0"),
      r.sector || sector,
      r.tipo_contrato || tiposContrato,
      r.categoria || "",
      r.subcategoria || "",
      r.riesgo_identificado || "",
      r.foco_revision || "",
      r.nombre_archivo_licitacion || "",
      r.seccion_bases || "",
      r.pagina_pdf || "",
      r.nombre_archivo_normativa || "",
      r.contexto_parrafo || "",
      r.evidencia_licitacion || "",
      r.sustento_legal_normativo || "",
      r.fragmento_literal_fuente || "",
      r.nivel_sustento_documental || "",
      r.alerta_sistema || "",
    ]);

    // Alternating row colors and borders
    const isEven = i % 2 === 0;
    row.eachCell((cell, colNumber) => {
      cell.alignment = { vertical: "top", wrapText: true };
      if (isEven) {
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "F8FAFC" },
        };
      }
      cell.border = {
        top: { style: "thin", color: { argb: "E2E8F0" } },
        left: { style: "thin", color: { argb: "E2E8F0" } },
        bottom: { style: "thin", color: { argb: "E2E8F0" } },
        right: { style: "thin", color: { argb: "E2E8F0" } },
      };

      // Highlight Nivel Sustento
      if (colNumber === 16) {
        const val = cell.value?.toString().toUpperCase();
        if (val === "ALTO") {
          cell.font = { color: { argb: "047857" }, bold: true };
          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "D1FAE5" },
          };
        } else if (val === "MEDIO") {
          cell.font = { color: { argb: "B45309" }, bold: true };
          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FEF3C7" },
          };
        } else if (val === "BAJO") {
          cell.font = { color: { argb: "BE123C" }, bold: true };
          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFE4E6" },
          };
        }
      }
    });
  });

  // Column widths
  ws2.columns = [
    { width: 12 }, // ID
    { width: 15 }, // Sector
    { width: 20 }, // Tipo Contrato
    { width: 20 }, // Categoría
    { width: 20 }, // Subcategoría
    { width: 45 }, // Riesgo Identificado
    { width: 35 }, // Foco
    { width: 25 }, // Archivo Lic
    { width: 18 }, // Sección Bases
    { width: 15 }, // Pagina PDF
    { width: 25 }, // Archivo Norm
    { width: 45 }, // Contexto
    { width: 45 }, // Evidencia
    { width: 45 }, // Sustento Legal
    { width: 45 }, // Fragmento Literal
    { width: 15 }, // Nivel Sustento
    { width: 30 }, // Alerta Sistema
  ];

  const safeName = projectName.replace(/[^a-z0-9]/gi, "_").toLowerCase();

  // Save file
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  saveAs(blob, `riesgos_${safeName}.xlsx`);
};

export const handleDownloadPDF = async (selectedSession: AnalysisSession) => {
  if (
    !selectedSession ||
    !selectedSession.result?.resultado?.riesgos_detectados
  )
    return;

  const { jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;

  const doc = new jsPDF("landscape");
  const pageWidth = doc.internal.pageSize.width;
  let currentY = 20;

  const projectName =
    selectedSession.formData?.nombreProyecto ||
    selectedSession.result?.proyecto ||
    "Proyecto de Licitación";
  const safeName = projectName.replace(/[^a-z0-9]/gi, "_").toLowerCase();

  // Title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(30, 64, 175); // Deep Indigo
  doc.text("INFORME DE ANÁLISIS DE RIESGOS", pageWidth / 2, currentY, {
    align: "center",
  });

  currentY += 10;

  // Project info
  doc.setFontSize(11);
  doc.setTextColor(51, 51, 51);
  doc.text(`Proyecto: ${projectName}`, 14, currentY);
  currentY += 6;
  doc.text(
    `Sector: ${selectedSession.result?.sector || (Array.isArray(selectedSession.formData?.sector) ? selectedSession.formData.sector.join(", ") : selectedSession.formData?.sector) || "S/N"}`,
    14,
    currentY,
  );
  currentY += 6;
  doc.text(
    `Tipos de Contrato: ${selectedSession.formData?.tipoContrato || "S/N"}`,
    14,
    currentY,
  );
  currentY += 10;

  // Summary Metrics
  const riesgos = selectedSession.result.resultado.riesgos_detectados;
  let conSustento = 0;
  let nuevos = 0;
  riesgos.forEach((r) => {
    if (
      r.nombre_archivo_normativa &&
      r.nombre_archivo_normativa.trim() !== ""
    )
      conSustento++;
    else nuevos++;
  });

  autoTable(doc, {
    startY: currentY,
    head: [["Métricas de Riesgos", "Valor"]],
    body: [
      ["Total Riesgos Identificados", riesgos.length.toString()],
      ["Riesgos con Sustento Normativo", conSustento.toString()],
      ["Riesgos Nuevos", nuevos.toString()],
    ],
    theme: "grid",
    headStyles: {
      fillColor: [43, 58, 85],
      textColor: 255,
      fontStyle: "bold",
    },
    styles: { fontSize: 10 },
    margin: { left: 14, right: 14 },
    tableWidth: 100,
  });

  currentY = (doc as any).lastAutoTable.finalY + 15;

  // Risks Table
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(30, 64, 175);
  doc.text("Detalle de Riesgos Identificados", 14, currentY);
  currentY += 8;

  const tableData = riesgos.map((r, i) => [
    r.numero_riesgo || String(i + 1).padStart(3, "0"),
    r.categoria || "S/N",
    r.riesgo_identificado || "",
    r.foco_revision || "",
    r.nivel_sustento_documental || "",
    r.nombre_archivo_normativa || "Nuevo",
  ]);

  autoTable(doc, {
    startY: currentY,
    head: [
      [
        "ID",
        "Categoría",
        "Riesgo Identificado",
        "Foco Revisión",
        "Nivel",
        "Normativa",
      ],
    ],
    body: tableData,
    theme: "grid",
    headStyles: {
      fillColor: [49, 46, 129],
      textColor: 255,
      fontStyle: "bold",
    },
    styles: { fontSize: 8, cellPadding: 2, overflow: "linebreak" },
    columnStyles: {
      0: { cellWidth: 12 },
      1: { cellWidth: 30 },
      2: { cellWidth: 80 },
      3: { cellWidth: 60 },
      4: { cellWidth: 20 },
      5: { cellWidth: 60 },
    },
    didParseCell: function (data: any) {
      if (data.section === "body" && data.column.index === 4) {
        // Nivel Sustento
        const val = data.cell.raw
          ? data.cell.raw.toString().toUpperCase()
          : "";
        if (val === "ALTO") {
          data.cell.styles.textColor = [4, 120, 87]; // Emerald 700
          data.cell.styles.fontStyle = "bold";
        } else if (val === "MEDIO") {
          data.cell.styles.textColor = [180, 83, 9]; // Amber 700
          data.cell.styles.fontStyle = "bold";
        } else if (val === "BAJO") {
          data.cell.styles.textColor = [190, 18, 60]; // Rose 700
          data.cell.styles.fontStyle = "bold";
        }
      }
    },
  });

  doc.save(`informe_riesgos_${safeName}.pdf`);
};
