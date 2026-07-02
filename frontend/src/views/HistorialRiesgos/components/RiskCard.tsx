import React from 'react';
import { ChevronDown, ChevronUp, Edit, Check, X, CheckCircle } from 'lucide-react';
import { Riesgo } from '@/types';

interface RiskCardProps {
  riesgo: Riesgo;
  index: number;
  isEditing: boolean;
  alreadySaved: boolean;
  editedRiskData: Partial<Riesgo>;
  setEditedRiskData: React.Dispatch<React.SetStateAction<Partial<Riesgo>>>;
  expandedRiskIndices: Set<number>;
  toggleExpandRisk: (index: number) => void;
  setEditingRiskIndex: (index: number | null) => void;
  handleSaveRiskChanges: (index: number) => void;
  handleSaveToBC: (riesgo: Riesgo, index?: number) => void;
  handleStartEdit: (riesgo: Riesgo, index: number) => void;
}

export const RiskCard: React.FC<RiskCardProps> = ({
  riesgo,
  index,
  isEditing,
  alreadySaved,
  editedRiskData,
  setEditedRiskData,
  expandedRiskIndices,
  toggleExpandRisk,
  setEditingRiskIndex,
  handleSaveRiskChanges,
  handleSaveToBC,
  handleStartEdit,
}) => {
  return (
    <div
      className={`p-5 rounded-2xl border transition-all space-y-4 ${
        isEditing
          ? "border-indigo-500 ring-2 ring-indigo-500/10 bg-white"
          : "border-slate-200 hover:border-slate-300 bg-white"
      }`}
    >
      {/* Metadata labels row */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
        {isEditing ? (
          <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 uppercase tracking-wider">
            <span className="animate-pulse block w-2 h-2 rounded-full bg-indigo-600"></span>
            Modo Edición
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-1.5 text-xs font-bold">
            <span className="bg-indigo-100 text-indigo-700 px-2.5 py-0.5 rounded-md font-mono">
              {String(index + 1).padStart(3, "0")}
            </span>
            <span className="bg-slate-100 text-slate-600 px-2.5 py-0.5 rounded-md">
              {riesgo.categoria || "LEGAL"}
            </span>
            {riesgo.subcategoria && (
              <span className="bg-indigo-50 text-indigo-600 px-2.5 py-0.5 rounded-md">
                {riesgo.subcategoria}
              </span>
            )}
            <span
              className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                riesgo.nivel_sustento_documental === "ALTO"
                  ? "bg-emerald-100 text-emerald-800"
                  : riesgo.nivel_sustento_documental === "MEDIO"
                    ? "bg-amber-100 text-amber-800"
                    : riesgo.nivel_sustento_documental === "BAJO"
                      ? "bg-rose-100 text-rose-800"
                      : "bg-slate-100 text-slate-800"
              }`}
            >
              Sustento: {riesgo.nivel_sustento_documental || "MEDIO"}
            </span>
          </div>
        )}

        {/* Save/Edit controls */}
        <div className="flex items-center gap-2">
          {isEditing ? (
            <>
              <button
                onClick={() => {
                  setEditingRiskIndex(null);
                  setEditedRiskData({});
                }}
                className="inline-flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 px-3 py-1 rounded-full transition-all cursor-pointer"
                title="Cancelar edición"
              >
                <X className="w-3.5 h-3.5" />
                Cancelar
              </button>
              <button
                onClick={() => handleSaveRiskChanges(index)}
                className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 hover:text-white bg-white hover:bg-emerald-600 border border-emerald-200 hover:border-emerald-600 px-3 py-1 rounded-full transition-all cursor-pointer"
                title="Actualizar en esta sesión"
              >
                <Check className="w-3.5 h-3.5" />
                Guardar Cambios
              </button>
              {!alreadySaved && (
                <button
                  onClick={() => handleSaveToBC(riesgo, index)}
                  className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-3 py-1 rounded-full transition-all cursor-pointer shadow-xs"
                  title="Guardar cambios y marcar como hallazgo válido"
                >
                  <CheckCircle className="w-3.5 h-3.5" />
                  Validar y Guardar
                </button>
              )}
            </>
          ) : (
            <>
              <button
                onClick={() => handleStartEdit(riesgo, index)}
                className="inline-flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-slate-800 hover:bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-full transition-all cursor-pointer"
                title="Editar campos de este riesgo"
              >
                <Edit className="w-3.5 h-3.5" />
                Editar
              </button>

              {alreadySaved ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 px-2.5 py-1 rounded-full">
                  <CheckCircle className="w-3.5 h-3.5" />
                  Hallazgo Validado
                </span>
              ) : (
                <button
                  onClick={() => handleSaveToBC(riesgo)}
                  className="inline-flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-emerald-700 bg-white hover:bg-emerald-50 border border-slate-200 hover:border-emerald-300 px-3 py-1 rounded-full transition-all cursor-pointer shadow-xs group"
                  title="Marcar como hallazgo correcto y guardar en Base de Conocimiento"
                >
                  <CheckCircle className="w-3.5 h-3.5 text-slate-300 group-hover:text-emerald-600 transition-colors" />
                  Validar Riesgo
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {isEditing ? (
        /* EDIT MODE VIEW */
        <div className="grid grid-cols-1 gap-5 pt-1 animate-in fade-in duration-200">
          {/* Riesgo Identificado */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
              Riesgo Identificado
            </label>
            <textarea
              value={editedRiskData.riesgo_identificado || ""}
              onChange={(e) =>
                setEditedRiskData((prev) => ({
                  ...prev,
                  riesgo_identificado: e.target.value,
                }))
              }
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-bold text-slate-800 leading-relaxed"
              rows={3}
            />
          </div>

          {/* General metadata grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100 text-xs">
            <div>
              <label className="block font-bold text-slate-400 uppercase tracking-wider text-[10px] mb-1">
                Sector
              </label>
              <input
                type="text"
                value={editedRiskData.sector || ""}
                onChange={(e) =>
                  setEditedRiskData((prev) => ({
                    ...prev,
                    sector: e.target.value,
                  }))
                }
                className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 font-semibold text-slate-700 focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-400 uppercase tracking-wider text-[10px] mb-1">
                Tipo de Contrato
              </label>
              <input
                type="text"
                value={editedRiskData.tipo_contrato || ""}
                onChange={(e) =>
                  setEditedRiskData((prev) => ({
                    ...prev,
                    tipo_contrato: e.target.value,
                  }))
                }
                className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 font-semibold text-slate-700 focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-400 uppercase tracking-wider text-[10px] mb-1">
                Categoría
              </label>
              <input
                type="text"
                value={editedRiskData.categoria || ""}
                onChange={(e) =>
                  setEditedRiskData((prev) => ({
                    ...prev,
                    categoria: e.target.value,
                  }))
                }
                className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 font-semibold text-slate-700 focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-400 uppercase tracking-wider text-[10px] mb-1">
                Subcategoría
              </label>
              <input
                type="text"
                value={editedRiskData.subcategoria || ""}
                onChange={(e) =>
                  setEditedRiskData((prev) => ({
                    ...prev,
                    subcategoria: e.target.value,
                  }))
                }
                className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 font-semibold text-slate-700 focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-400 uppercase tracking-wider text-[10px] mb-1">
                Foco de Revisión
              </label>
              <input
                type="text"
                value={editedRiskData.foco_revision || ""}
                onChange={(e) =>
                  setEditedRiskData((prev) => ({
                    ...prev,
                    foco_revision: e.target.value,
                  }))
                }
                className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 font-semibold text-slate-700 focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-400 uppercase tracking-wider text-[10px] mb-1">
                Criticidad
              </label>
              <select
                value={editedRiskData.criticidad || ""}
                onChange={(e) =>
                  setEditedRiskData((prev) => ({
                    ...prev,
                    criticidad: e.target.value,
                  }))
                }
                className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 font-semibold text-slate-700 focus:outline-none focus:border-indigo-500 transition-colors"
              >
                <option value="">Seleccione...</option>
                <option value="Alta">Alta</option>
                <option value="Media">Media</option>
                <option value="Baja">Baja</option>
              </select>
            </div>
            <div>
              <label className="block font-bold text-slate-400 uppercase tracking-wider text-[10px] mb-1">
                Nivel de Sustento
              </label>
              <select
                value={editedRiskData.nivel_sustento_documental || ""}
                onChange={(e) =>
                  setEditedRiskData((prev) => ({
                    ...prev,
                    nivel_sustento_documental: e.target.value as any,
                  }))
                }
                className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 font-semibold text-slate-700 focus:outline-none focus:border-indigo-500 transition-colors"
              >
                <option value="ALTO">ALTO</option>
                <option value="MEDIO">MEDIO</option>
                <option value="BAJO">BAJO</option>
                <option value="MANUAL">MANUAL</option>
              </select>
            </div>
          </div>

          {/* Rich detailed texts */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
                Sustento Legal y Contexto
              </label>
              <textarea
                value={editedRiskData.evidencia_seccion_normativa_riesgo || ""}
                onChange={(e) =>
                  setEditedRiskData((prev) => ({
                    ...prev,
                    evidencia_seccion_normativa_riesgo: e.target.value,
                  }))
                }
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium text-slate-700 leading-relaxed"
                rows={4}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
                Alerta / Sugerencia del Sissubcategoria
              </label>
              <textarea
                value={editedRiskData.alerta_sistema || ""}
                onChange={(e) =>
                  setEditedRiskData((prev) => ({
                    ...prev,
                    alerta_sistema: e.target.value,
                  }))
                }
                className="w-full bg-indigo-50/20 border border-indigo-100 rounded-xl p-3 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium text-slate-700 leading-relaxed"
                rows={4}
              />
            </div>
          </div>

          {/* Source texts */}
          <div className="space-y-3 bg-slate-50/50 p-4 rounded-xl border border-slate-150 text-xs">
            <div className="space-y-1">
              <label className="block font-bold text-slate-400 uppercase tracking-wider text-[10px]">
                Evidencia Detectada
              </label>
              <textarea
                value={editedRiskData.fragmento_licitacion_evidencia || ""}
                onChange={(e) =>
                  setEditedRiskData((prev) => ({
                    ...prev,
                    fragmento_licitacion_evidencia: e.target.value,
                  }))
                }
                className="w-full bg-white border border-slate-200 rounded-lg p-2 font-medium text-slate-700 focus:outline-none"
                rows={2}
              />
            </div>
            <div className="space-y-1">
              <label className="block font-bold text-slate-400 uppercase tracking-wider text-[10px]">
                Fragmento Literal de la Fuente
              </label>
              <textarea
                value={editedRiskData.fragmento_literal_fuente || ""}
                onChange={(e) =>
                  setEditedRiskData((prev) => ({
                    ...prev,
                    fragmento_literal_fuente: e.target.value,
                  }))
                }
                className="w-full bg-white border border-slate-200 rounded-lg p-2 font-mono text-[11px] text-slate-600 focus:outline-none"
                rows={2}
              />
            </div>
            <div className="space-y-1">
              <label className="block font-bold text-slate-400 uppercase tracking-wider text-[10px]">
                Contexto del Párrafo
              </label>
              <textarea
                value={editedRiskData.contexto_parrafo || ""}
                onChange={(e) =>
                  setEditedRiskData((prev) => ({
                    ...prev,
                    contexto_parrafo: e.target.value,
                  }))
                }
                className="w-full bg-white border border-slate-200 rounded-lg p-2 font-medium text-slate-600 focus:outline-none"
                rows={2}
              />
            </div>
          </div>

          {/* File paths settings */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 bg-slate-100/50 p-3 rounded-xl text-xs">
            <div>
              <label className="block font-bold text-slate-400 uppercase tracking-wider text-[10px] mb-1">
                Archivo Licitación
              </label>
              <input
                type="text"
                value={editedRiskData.nombre_archivo_licitacion || ""}
                onChange={(e) =>
                  setEditedRiskData((prev) => ({
                    ...prev,
                    nombre_archivo_licitacion: e.target.value,
                  }))
                }
                className="w-full bg-white border border-slate-200 rounded px-2 py-1 text-slate-700 focus:outline-none"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-400 uppercase tracking-wider text-[10px] mb-1">
                Archivo Normativa
              </label>
              <input
                type="text"
                value={editedRiskData.nombre_archivo_normativa || ""}
                onChange={(e) =>
                  setEditedRiskData((prev) => ({
                    ...prev,
                    nombre_archivo_normativa: e.target.value,
                  }))
                }
                className="w-full bg-white border border-slate-200 rounded px-2 py-1 text-slate-700 focus:outline-none"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-400 uppercase tracking-wider text-[10px] mb-1">
                Ubicación en Bases
              </label>
              <input
                type="text"
                value={editedRiskData.seccion_bases || ""}
                onChange={(e) =>
                  setEditedRiskData((prev) => ({
                    ...prev,
                    seccion_bases: e.target.value,
                  }))
                }
                className="w-full bg-white border border-slate-200 rounded px-2 py-1 text-slate-700 focus:outline-none"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-400 uppercase tracking-wider text-[10px] mb-1">
                Página PDF
              </label>
              <input
                type="number"
                value={
                  editedRiskData.pagina_pdf !== undefined &&
                  editedRiskData.pagina_pdf !== null
                    ? editedRiskData.pagina_pdf
                    : riesgo.sector
                }
                onChange={(e) => {
                  const val = e.target.value;
                  setEditedRiskData((prev) => ({
                    ...prev,
                    pagina_pdf: val === riesgo.sector ? null : parseInt(val, 10),
                  }));
                }}
                className="w-full bg-white border border-slate-200 rounded px-2 py-1 text-slate-700 focus:outline-none"
              />
            </div>
          </div>
        </div>
      ) : (
        /* STANDARD READ-ONLY CARD */
        <div className="grid grid-cols-1 gap-5">
          {/* Prominent Risk Identified */}
          <div
            className="space-y-1.5 cursor-pointer group"
            onClick={() => toggleExpandRisk(index)}
          >
            <div className="flex items-center justify-between">
              <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                Riesgo Identificado
              </h4>
              <button className="text-slate-400 group-hover:text-indigo-600 transition-colors">
                {expandedRiskIndices.has(index) ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </button>
            </div>
            <p className="text-slate-800 font-bold text-base leading-relaxed bg-slate-50/40 p-3 rounded-xl border border-slate-100 group-hover:border-indigo-200 transition-colors">
              {riesgo.riesgo_identificado}
            </p>
          </div>

          {expandedRiskIndices.has(index) && (
            <>
              {/* General metadata grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100 text-xs">
                <div>
                  <span className="block font-bold text-slate-400 uppercase tracking-wider text-[10px] mb-0.5">
                    Sector
                  </span>
                  <span className="font-semibold text-slate-700">
                    {riesgo.sector || "N/A"}
                  </span>
                </div>
                <div>
                  <span className="block font-bold text-slate-400 uppercase tracking-wider text-[10px] mb-0.5">
                    Tipo de Contrato
                  </span>
                  <span className="font-semibold text-slate-700">
                    {riesgo.tipo_contrato || "N/A"}
                  </span>
                </div>
                <div>
                  <span className="block font-bold text-slate-400 uppercase tracking-wider text-[10px] mb-0.5">
                    Categoría
                  </span>
                  <span className="font-semibold text-slate-700">
                    {riesgo.categoria || "N/A"}
                  </span>
                </div>
                {riesgo.subcategoria && (
                  <div>
                    <span className="block font-bold text-slate-400 uppercase tracking-wider text-[10px] mb-0.5">
                      Subcategoría
                    </span>
                    <span className="font-semibold text-slate-700">
                      {riesgo.subcategoria}
                    </span>
                  </div>
                )}
                {riesgo.foco_revision && (
                  <div>
                    <span className="block font-bold text-slate-400 uppercase tracking-wider text-[10px] mb-0.5">
                      Foco de Revisión
                    </span>
                    <span className="font-semibold text-slate-700">
                      {riesgo.foco_revision}
                    </span>
                  </div>
                )}
                {(riesgo.criticidad || riesgo.precision_nivel) && (
                  <div>
                    <span className="block font-bold text-slate-400 uppercase tracking-wider text-[10px] mb-0.5">
                      Criticidad
                    </span>
                    <span
                      className={`font-bold uppercase text-[10px] px-2 py-0.5 rounded-md inline-block ${
                        riesgo.criticidad === "Alta" ||
                        riesgo.criticidad === "ALTA"
                          ? "bg-rose-100 text-rose-700"
                          : riesgo.criticidad === "Media" ||
                              riesgo.criticidad === "MEDIA"
                            ? "bg-amber-100 text-amber-700"
                            : "bg-emerald-100 text-emerald-700"
                      }`}
                    >
                      {riesgo.criticidad ||
                        riesgo.precision_nivel ||
                        "Media"}
                    </span>
                  </div>
                )}
                {riesgo.nivel_sustento_documental && (
                  <div>
                    <span className="block font-bold text-slate-400 uppercase tracking-wider text-[10px] mb-0.5">
                      Nivel de Sustento
                    </span>
                    <span className="font-semibold text-slate-700">
                      {riesgo.nivel_sustento_documental}
                    </span>
                  </div>
                )}
                {riesgo.precision_score !== undefined &&
                  riesgo.precision_score !== null && (
                    <div>
                      <span className="block font-bold text-slate-400 uppercase tracking-wider text-[10px] mb-0.5">
                        Precisión IA
                      </span>
                      <span className="font-semibold text-slate-700">
                        {typeof riesgo.precision_score === "number"
                          ? `${(riesgo.precision_score * 100).toFixed(0)}%`
                          : riesgo.precision_score}
                      </span>
                    </div>
                  )}
              </div>

              {/* Rich detailed texts */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 text-xs text-slate-600 space-y-1.5">
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    Sustento Legal y Contexto
                  </h4>
                  <p className="leading-relaxed whitespace-pre-line font-medium text-slate-700">
                    {riesgo.evidencia_seccion_normativa_riesgo ||
                      "Verificado de acuerdo a términos generales del pliego de condiciones de la licitación."}
                  </p>
                </div>

                {riesgo.alerta_sistema && (
                  <div className="bg-indigo-50/40 border border-indigo-100 rounded-xl p-4 text-xs text-slate-600 space-y-1.5">
                    <h4 className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest">
                      Alerta / Sugerencia del Sissubcategoria
                    </h4>
                    <p className="leading-relaxed whitespace-pre-line font-medium text-slate-700">
                      {riesgo.alerta_sistema}
                    </p>
                  </div>
                )}
              </div>

              {/* Source Texts if available */}
              {(riesgo.fragmento_licitacion_evidencia ||
                riesgo.fragmento_literal_fuente ||
                riesgo.contexto_parrafo) && (
                <div className="space-y-3 bg-slate-50/50 p-4 rounded-xl border border-slate-150 text-xs">
                  {riesgo.fragmento_licitacion_evidencia && (
                    <div>
                      <span className="block font-bold text-slate-400 uppercase tracking-wider text-[10px] mb-0.5">
                        Evidencia Detectada
                      </span>
                      <p className="italic text-slate-600 font-medium">
                        "{riesgo.fragmento_licitacion_evidencia}"
                      </p>
                    </div>
                  )}
                  {riesgo.fragmento_literal_fuente && (
                    <div className="pt-2 border-t border-slate-100">
                      <span className="block font-bold text-slate-400 uppercase tracking-wider text-[10px] mb-0.5">
                        Fragmento Literal de la Fuente
                      </span>
                      <p className="font-mono text-[11px] text-slate-600 bg-white p-2.5 rounded-lg border border-slate-100">
                        {riesgo.fragmento_literal_fuente}
                      </p>
                    </div>
                  )}
                  {riesgo.contexto_parrafo && (
                    <div className="pt-2 border-t border-slate-100">
                      <span className="block font-bold text-slate-400 uppercase tracking-wider text-[10px] mb-0.5">
                        Contexto del Párrafo
                      </span>
                      <p className="text-slate-600 leading-relaxed font-medium">
                        {riesgo.contexto_parrafo}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* File names and locations if available */}
              {(riesgo.nombre_archivo_licitacion ||
                riesgo.nombre_archivo_normativa ||
                riesgo.seccion_bases ||
                riesgo.pagina_pdf) && (
                <div className="text-[10px] text-slate-500 bg-slate-100/50 p-3 rounded-xl space-y-1">
                  {riesgo.nombre_archivo_licitacion && (
                    <p className="truncate">
                      <strong>Archivo Licitación:</strong>{" "}
                      {riesgo.nombre_archivo_licitacion}
                    </p>
                  )}
                  {riesgo.nombre_archivo_normativa && (
                    <p className="truncate">
                      <strong>Archivo Normativa:</strong>{" "}
                      {riesgo.nombre_archivo_normativa}
                    </p>
                  )}
                  {riesgo.seccion_bases && (
                    <p className="truncate">
                      <strong>Ubicación en Bases:</strong>{" "}
                      {riesgo.seccion_bases}
                    </p>
                  )}
                  {riesgo.pagina_pdf && (
                    <p>
                      <strong>Página del Documento:</strong>{" "}
                      {riesgo.pagina_pdf}
                    </p>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};
