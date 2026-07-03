import { useState, useRef } from "react";
import { Upload, X, Check, ChevronRight, FileSpreadsheet, ArrowLeft, AlertCircle } from "lucide-react";
import { Riesgo } from "@/types";
import { useToast } from "@/components/ToastProvider";

const INTERNAL_FIELDS = [
  { key: "tipo_contrato", label: "Tipo Contrato", required: true },
  { key: "sector", label: "Sector", required: true },
  { key: "categoria", label: "Categoría", required: true },
  { key: "subcategoria", label: "Subcategoría", required: false },
  { key: "riesgo_identificado", label: "Riesgo Identificado", required: true },
  { key: "foco_revision", label: "Foco Revisión", required: true },
  { key: "sustento_legal_normativo", label: "Sustento Legal / Normativo", required: false },
  { key: "nombre_archivo_licitacion", label: "Archivo Licitación", required: false },
  { key: "seccion_bases", label: "Sección Bases", required: false },
  { key: "pagina_pdf", label: "Página PDF", required: false },
  { key: "nombre_archivo_normativa", label: "Archivo Normativa", required: false },
  { key: "nivel_sustento_documental", label: "Nivel Sustento", required: false }
];

interface ExcelUploaderProps {
  onImport: (riesgos: Riesgo[]) => void;
  onCancel: () => void;
}

export function ExcelUploader({ onImport, onCancel }: ExcelUploaderProps) {
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [file, setFile] = useState<File | null>(null);
  const [excelHeaders, setExcelHeaders] = useState<string[]>([]);
  const [excelData, setExcelData] = useState<any[]>([]);
  
  // Mapping from Internal Key -> Excel Header
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [step, setStep] = useState<1 | 2>(1); // 1: Upload, 2: Mapping & Preview
  
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;
    
    setFile(selectedFile);
    try {
      const ExcelJS = (await import("exceljs")).default;
      const workbook = new ExcelJS.Workbook();
      const arrayBuffer = await selectedFile.arrayBuffer();
      await workbook.xlsx.load(arrayBuffer);
      
      const worksheet = workbook.worksheets[0];
      if (!worksheet) {
        showToast("El archivo Excel está vacío", "error");
        return;
      }
      
      const headers: string[] = [];
      worksheet.getRow(1).eachCell((cell, colNumber) => {
        headers[colNumber - 1] = cell.value?.toString() || `Columna ${colNumber}`;
      });
      
      const data: any[] = [];
      worksheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return; // skip header
        const rowData: Record<string, any> = {};
        headers.forEach((h, idx) => {
          rowData[h] = row.getCell(idx + 1).value;
        });
        data.push(rowData);
      });
      
      setExcelHeaders(headers);
      setExcelData(data);
      
      // Auto-map based on similarity
      const initialMapping: Record<string, string> = {};
      INTERNAL_FIELDS.forEach(field => {
        const match = headers.find(h => h.toLowerCase().includes(field.label.toLowerCase()) || field.label.toLowerCase().includes(h.toLowerCase()));
        if (match) {
          initialMapping[field.key] = match;
        }
      });
      setMapping(initialMapping);
      setStep(2);
      
    } catch (err) {
      console.error(err);
      showToast("Error al procesar el archivo Excel", "error");
    }
  };

  const handleImport = () => {
    // Validate required fields
    for (const field of INTERNAL_FIELDS) {
      if (field.required && !mapping[field.key]) {
        showToast(`El campo ${field.label} es obligatorio para la importación.`, "warning");
        return;
      }
    }
    
    const riesgosToImport: Riesgo[] = excelData.map(row => {
      const r: any = {
        alerta_sistema: 'Importado de forma masiva.'
      };
      for (const field of INTERNAL_FIELDS) {
        if (mapping[field.key]) {
          let val = row[mapping[field.key]];
          if (val && typeof val === 'object' && val.richText) {
            val = val.richText.map((rt: any) => rt.text).join('');
          }
          if (val && typeof val === 'object' && val.text) {
            val = val.text;
          }
          r[field.key] = val ? String(val).trim() : '';
        }
      }
      return r as Riesgo;
    });
    
    onImport(riesgosToImport);
    showToast(`Se importaron ${riesgosToImport.length} riesgos con éxito.`, "success");
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button onClick={onCancel} className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-lg font-bold text-slate-900">Importar Excel</h2>
            <p className="text-sm text-slate-500">Importa múltiples riesgos desde una hoja de cálculo.</p>
          </div>
        </div>
      </div>
      
      {step === 1 && (
        <div className="border-2 border-dashed border-slate-300 rounded-xl p-12 flex flex-col items-center justify-center text-center bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer" onClick={() => fileInputRef.current?.click()}>
          <input type="file" accept=".xlsx, .xls" ref={fileInputRef} className="hidden" onChange={handleFileUpload} />
          <FileSpreadsheet className="w-12 h-12 text-indigo-400 mb-4" />
          <h3 className="text-base font-bold text-slate-800 mb-1">Selecciona o arrastra un archivo Excel</h3>
          <p className="text-sm text-slate-500 max-w-sm mx-auto">
            Debe contener columnas con información del riesgo. En el siguiente paso podrás mapear las columnas.
          </p>
          <button className="mt-6 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm rounded-xl transition-colors">
            Examinar archivo
          </button>
        </div>
      )}
      
      {step === 2 && (
        <div className="space-y-8">
          <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 flex gap-3 text-indigo-800">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-sm">Mapeo de Columnas</p>
              <p className="text-sm opacity-90 mt-1">
                Hemos detectado algunas columnas automáticamente. Por favor, revisa y selecciona a qué columna de tu Excel corresponde cada campo del sistema.
              </p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {INTERNAL_FIELDS.map(field => (
              <div key={field.key} className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700 flex items-center gap-1">
                  {field.label}
                  {field.required && <span className="text-rose-500">*</span>}
                </label>
                <select 
                  value={mapping[field.key] || ""} 
                  onChange={e => setMapping({...mapping, [field.key]: e.target.value})}
                  className={`w-full px-3 py-2 border rounded-xl text-sm ${!mapping[field.key] && field.required ? 'border-amber-300 bg-amber-50' : 'border-slate-200'}`}
                >
                  <option value="">-- No asignar --</option>
                  {excelHeaders.map(h => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>
              </div>
            ))}
          </div>
          
          <div className="pt-6 border-t border-slate-100">
            <h3 className="text-sm font-bold text-slate-800 mb-4">Vista Previa (Primeros 3 registros)</h3>
            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-left text-sm whitespace-nowrap min-w-max">
                <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 text-xs uppercase tracking-wider">
                  <tr>
                    {INTERNAL_FIELDS.map(f => (
                      <th key={f.key} className="p-3">
                        {f.label}
                        <div className="text-[10px] text-slate-400 font-normal mt-0.5 max-w-[120px] truncate" title={mapping[f.key] || "No asignado"}>
                          {mapping[f.key] ? `→ ${mapping[f.key]}` : 'No asignado'}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {excelData.slice(0, 3).map((row, idx) => (
                    <tr key={idx} className="bg-white">
                      {INTERNAL_FIELDS.map(f => {
                        const val = mapping[f.key] ? row[mapping[f.key]] : "";
                        const displayVal = val && typeof val === 'object' && val.richText ? val.richText.map((rt:any)=>rt.text).join('') : (val && typeof val === 'object' && val.text ? val.text : val);
                        return (
                          <td key={f.key} className={`p-3 truncate max-w-[200px] ${!displayVal ? 'text-slate-300 italic' : 'text-slate-700'}`}>
                            {displayVal ? String(displayVal) : '-'}
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          
          <div className="flex justify-end gap-3 pt-4">
            <button onClick={() => setStep(1)} className="px-5 py-2.5 text-slate-600 font-semibold text-sm hover:bg-slate-100 rounded-xl transition-colors">
              Elegir otro archivo
            </button>
            <button onClick={handleImport} className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm rounded-xl shadow-sm transition-colors">
              <Check className="w-4 h-4" />
              Confirmar e Importar {excelData.length} riesgos
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
