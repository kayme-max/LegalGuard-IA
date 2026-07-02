import { useState } from 'react';
import { Bell, Target, Database, Layers, BrainCircuit, Activity, AlertCircle, CheckCircle2, Filter, Calendar } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend } from 'recharts';
import { AnalysisSession, View, Riesgo } from '@/types';

interface DashboardProps {
  history: AnalysisSession[];
  savedRiesgos: Riesgo[];
  setCurrentView: (view: View) => void;
}

export default function Dashboard({ history, savedRiesgos, setCurrentView }: DashboardProps) {
  const [showNotifications, setShowNotifications] = useState(false);
  const [dateFilter, setDateFilter] = useState('ALL');
  const [sectorFilter, setSectorFilter] = useState('ALL');
  const [tipoContratoFilter, setTipoContratoFilter] = useState('ALL');

  // Compute filter options based on full history
  const sectoresOptions = Array.from(new Set(history.flatMap(s => s.formData?.sector || []).filter(Boolean)));
  const tiposContratoOptions = Array.from(new Set(history.map(s => s.formData?.tipoContrato).filter(Boolean)));

  // Filter history
  const filteredHistory = history.filter(session => {
    // Date filter
    if (dateFilter !== 'ALL') {
      const sessionDate = new Date(session.fecha);
      const today = new Date();
      if (dateFilter === '7_DAYS') {
        const sevenDaysAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
        if (sessionDate < sevenDaysAgo) return false;
      } else if (dateFilter === '30_DAYS') {
        const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
        if (sessionDate < thirtyDaysAgo) return false;
      } else if (dateFilter === 'THIS_MONTH') {
        if (sessionDate.getMonth() !== today.getMonth() || sessionDate.getFullYear() !== today.getFullYear()) return false;
      } else if (dateFilter === 'THIS_YEAR') {
        if (sessionDate.getFullYear() !== today.getFullYear()) return false;
      }
    }

    // Sector filter
    if (sectorFilter !== 'ALL' && !(session.formData?.sector || []).includes(sectorFilter)) {
      return false;
    }

    // Tipo de contrato filter
    if (tipoContratoFilter !== 'ALL' && session.formData?.tipoContrato !== tipoContratoFilter) {
      return false;
    }

    return true;
  });

  // 1. Group by project (using filename) to calculate iterations
  const projectsMap = filteredHistory.reduce((acc, session) => {
    const projectName = session.filename || 'Archivo Desconocido';
    if (!acc[projectName]) {
      acc[projectName] = [];
    }
    acc[projectName].push(session);
    return acc;
  }, {} as Record<string, AnalysisSession[]>);

  const totalProyectos = Object.keys(projectsMap).length;
  const totalConsultas = filteredHistory.length;
  const iteracionesPromedio = totalProyectos > 0 ? (totalConsultas / totalProyectos).toFixed(1) : '0';

  // 2. RAG Precision (Sustento Legal vs Nuevos)
  let riesgosConSustento = 0;
  let riesgosNuevos = 0;
  let riesgosNuevosValidados = 0; // New risks saved to the knowledge base

  filteredHistory.forEach(session => {
    const riesgos = session.result?.resultado?.riesgos_detectados || [];
    riesgos.forEach(r => {
      // Si tiene normativa asociada, consideramos que tiene sustento RAG
      if (r.nombre_archivo_normativa && r.nombre_archivo_normativa.trim() !== '') {
        riesgosConSustento++;
      } else {
        riesgosNuevos++;
        // Check if this new finding was saved to the knowledge base
        const wasSaved = savedRiesgos.some(sr => sr.riesgo_identificado === r.riesgo_identificado);
        if (wasSaved) {
          riesgosNuevosValidados++;
        }
      }
    });
  });

  const totalRiesgosDetectados = riesgosConSustento + riesgosNuevos;
  const precisionRAG = totalRiesgosDetectados > 0 
    ? Math.round((riesgosConSustento / totalRiesgosDetectados) * 100) 
    : 0;

  // 3. Data for Precision Chart
  const dataPrecision = [
    { name: 'Riesgos Justificados (Cruzado con Normativa)', value: riesgosConSustento, color: '#00D4FF' },
    { name: 'Riesgos Huérfanos (Hallazgos IA Nuevos)', value: riesgosNuevos, color: '#7C3AED' }
  ];

  if (totalRiesgosDetectados === 0) {
    dataPrecision.push({ name: 'Sin Datos', value: 1, color: '#e2e8f0' });
  }

  // 4. Data for Iterations Evolution (Simulated or based on actual multi-queries)
  // Let's take the project with most queries, or aggregate
  const proyectosOrdenados = Object.entries(projectsMap)
    .sort((a, b) => b[1].length - a[1].length)
    .slice(0, 3); // Top 3 proyectos con más iteraciones

  const dataIteraciones = proyectosOrdenados.map(([nombre, sesiones]) => {
    // Sort sessions by date ascending to simulate Iteration 1, 2, 3
    const sesionesOrdenadas = [...sesiones].sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());
    
    return {
      nombre: nombre.substring(0, 15),
      iteracion1: sesionesOrdenadas[0]?.result?.resultado?.riesgos_detectados?.length || 0,
      iteracion2: sesionesOrdenadas[1]?.result?.resultado?.riesgos_detectados?.length || 0,
      iteracion3: sesionesOrdenadas[2]?.result?.resultado?.riesgos_detectados?.length || 0,
    };
  });

  // Calculate context usage
  let maxPaginasLicitacion = 0;
  let maxPaginasNormativas = 0;
  const systemWarnings: string[] = [];

  filteredHistory.forEach(session => {
    const pLic = session.paginasLicitacion || 0;
    const pNor = session.paginasNormativas || 0;
    if (pLic > maxPaginasLicitacion) maxPaginasLicitacion = pLic;
    if (pNor > maxPaginasNormativas) maxPaginasNormativas = pNor;

    if (pLic > 500) {
      systemWarnings.push(`Excedido: ${session.filename} tiene ${pLic} pág (Límite 500).`);
    }
    if (pNor > 1000) {
      systemWarnings.push(`Excedido normativas en consulta ${session.filename} con ${pNor} pág (Límite 1000).`);
    }
  });

  // Deduplicate warnings
  const uniqueWarnings = Array.from(new Set(systemWarnings));

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-start lg:items-center justify-between gap-4 mb-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-800 tracking-tight">
            Métricas de Precisión IA
          </h1>
          <p className="text-slate-500 text-sm mt-1">Evaluación de efectividad RAG, aprendizaje y refinamiento por proyecto.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3 relative">
          <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-2 py-1.5 shadow-sm">
            <Calendar className="w-4 h-4 text-slate-400" />
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="bg-transparent text-sm font-medium text-slate-700 focus:outline-none cursor-pointer"
            >
              <option value="ALL">Todo el tiempo</option>
              <option value="7_DAYS">Últimos 7 días</option>
              <option value="30_DAYS">Últimos 30 días</option>
              <option value="THIS_MONTH">Este mes</option>
              <option value="THIS_YEAR">Este año</option>
            </select>
          </div>

          <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-2 py-1.5 shadow-sm">
            <Filter className="w-4 h-4 text-slate-400" />
            <select
              value={sectorFilter}
              onChange={(e) => setSectorFilter(e.target.value)}
              className="bg-transparent text-sm font-medium text-slate-700 focus:outline-none cursor-pointer max-w-[120px] truncate"
            >
              <option value="ALL">Todos los Sectores</option>
              {sectoresOptions.map(sector => (
                <option key={sector} value={sector}>{sector}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-2 py-1.5 shadow-sm">
            <Filter className="w-4 h-4 text-slate-400" />
            <select
              value={tipoContratoFilter}
              onChange={(e) => setTipoContratoFilter(e.target.value)}
              className="bg-transparent text-sm font-medium text-slate-700 focus:outline-none cursor-pointer max-w-[120px] truncate"
            >
              <option value="ALL">Tipos Contrato</option>
              {tiposContratoOptions.map(tipo => (
                <option key={tipo} value={tipo}>{tipo}</option>
              ))}
            </select>
          </div>

          <button 
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-2 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors shadow-sm cursor-pointer ml-auto"
          >
            <Bell className="w-5 h-5 text-slate-600" />
            {uniqueWarnings.length > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full border border-white"></span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute top-12 right-0 w-80 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 overflow-hidden">
              <div className="p-4 border-b border-slate-100 bg-slate-50">
                <h3 className="text-sm font-bold text-slate-800">Notificaciones del Sistema</h3>
              </div>
              <div className="max-h-64 overflow-y-auto">
                {uniqueWarnings.length === 0 ? (
                  <div className="p-4 text-center text-sm text-slate-500">
                    <CheckCircle2 className="w-6 h-6 text-emerald-500 mx-auto mb-2" />
                    Todo está funcionando dentro de los límites.
                  </div>
                ) : (
                  <ul className="divide-y divide-slate-100">
                    {uniqueWarnings.map((warn, idx) => (
                      <li key={idx} className="p-3 flex items-start gap-3 hover:bg-slate-50 transition-colors">
                        <AlertCircle className="w-4 h-4 text-rose-500 mt-0.5 shrink-0" />
                        <span className="text-xs text-slate-600 leading-relaxed">{warn}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* RAG Precision & Value KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm relative group">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-50 rounded-lg">
                <Target className="w-5 h-5 text-blue-600" />
              </div>
              <p className="text-sm font-bold text-slate-600">Precisión RAG</p>
            </div>
            <div className="text-slate-400 cursor-help">
              <AlertCircle className="w-4 h-4" />
            </div>
          </div>
          
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-800">{precisionRAG}%</span>
            <span className="text-xs font-bold text-blue-500 bg-blue-50 px-2 py-0.5 rounded-full">Sustento Legal</span>
          </div>
          <p className="text-[10px] text-slate-400 mt-2 uppercase font-bold tracking-wider">Sin Alucinaciones</p>

          <div className="absolute top-full left-0 mt-2 w-64 p-3 bg-slate-800 text-white text-xs rounded-xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
            <strong>¿Cómo se calcula?</strong><br/>
            Porcentaje de riesgos detectados que tienen una base normativa cruzada (sustento legal validado) frente al total de riesgos sugeridos por la IA.
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-purple-50 rounded-lg">
              <Layers className="w-5 h-5 text-purple-600" />
            </div>
            <p className="text-sm font-bold text-slate-600">Proyectos Auditados</p>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-800">{totalProyectos}</span>
            <span className="text-xs font-bold text-purple-500 bg-purple-50 px-2 py-0.5 rounded-full">{iteracionesPromedio} iter/prom</span>
          </div>
          <p className="text-[10px] text-slate-400 mt-2 uppercase font-bold tracking-wider">Refinamiento Continuo</p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm relative group">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-50 rounded-lg">
                <Database className="w-5 h-5 text-emerald-600" />
              </div>
              <p className="text-sm font-bold text-slate-600">Uso de Contexto</p>
            </div>
            <div className="text-slate-400 cursor-help">
              <AlertCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-800">{Math.max(maxPaginasLicitacion + maxPaginasNormativas, 0)}</span>
            <span className="text-xs font-bold text-emerald-500 bg-emerald-50 px-2 py-0.5 rounded-full">Págs en 1 Consulta</span>
          </div>
          <p className="text-[10px] text-slate-400 mt-2 uppercase font-bold tracking-wider">Límite por Consulta: 1500 Págs</p>
          <div className="absolute top-full left-0 mt-2 w-64 p-3 bg-slate-800 text-white text-xs rounded-xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
            <strong>Límite por Consulta</strong><br/>
            El límite de 1500 páginas (500 licitación + 1000 normativas) se aplica de forma individual a cada consulta o iteración que se realice.
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm relative group">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-50 rounded-lg">
                <BrainCircuit className="w-5 h-5 text-amber-600" />
              </div>
              <p className="text-sm font-bold text-slate-600">Hallazgos Validados</p>
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-800">{riesgosNuevosValidados}</span>
            <span className="text-xs font-bold text-amber-500 bg-amber-50 px-2 py-0.5 rounded-full">De {riesgosNuevos} Nuevos</span>
          </div>
          <p className="text-[10px] text-slate-400 mt-2 uppercase font-bold tracking-wider">Aprobados por Usuario</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Gráfico de Barras - Evolución por Iteración */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-bold text-slate-800">Evolución de Precisión por Proyecto</h2>
              <p className="text-xs text-slate-500 mt-1">Comparativa de hallazgos en hasta 3 iteraciones (consultas) por licitación.</p>
            </div>
          </div>
          <div className="flex-1 min-h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dataIteraciones} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="nombre" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 600 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10 }} />
                <Tooltip 
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', fontWeight: 500, color: '#64748b' }} />
                <Bar name="Consulta 1 (Exploratoria)" dataKey="iteracion1" fill="#cbd5e1" radius={[4, 4, 0, 0]} barSize={20} />
                <Bar name="Consulta 2 (Refinada)" dataKey="iteracion2" fill="#7C3AED" radius={[4, 4, 0, 0]} barSize={20} />
                <Bar name="Consulta 3 (Con Base Conoc.)" dataKey="iteracion3" fill="#00D4FF" radius={[4, 4, 0, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Distribución RAG Precision */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <h2 className="text-lg font-bold text-slate-800 mb-2">Fiabilidad de Hallazgos</h2>
          <p className="text-xs text-slate-500 mb-6">Riesgos cruzados con normativas vs. riesgos huérfanos.</p>
          <div className="h-48 relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={dataPrecision}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={70}
                  stroke="none"
                  paddingAngle={5}
                  dataKey="value"
                >
                  {dataPrecision.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-2xl font-black text-slate-800">{totalRiesgosDetectados}</span>
              <span className="text-[10px] text-slate-400 font-bold uppercase">Totales</span>
            </div>
          </div>
          <div className="mt-4 space-y-3">
            {dataPrecision.filter(d => d.name !== 'Sin Datos').map((item, i) => (
              <div key={i} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }}></span>
                  <span className="text-slate-600 font-medium">{item.name}</span>
                </div>
                <span className="font-bold text-slate-800">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Analysis Details Panel */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-slate-800">Calidad de Contexto y Base de Conocimiento</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
            <h3 className="text-sm font-bold text-slate-800 mb-2 flex items-center gap-2">
              <Database className="w-4 h-4 text-[#00D4FF]" />
              Límites del Sistema RAG
            </h3>
            <ul className="text-xs text-slate-600 space-y-2">
              <li className="flex justify-between border-b border-slate-200 pb-1">
                <span>Pág. Licitación (Lím. 500/consulta):</span>
                <span className={`font-bold ${maxPaginasLicitacion > 500 ? 'text-rose-500' : 'text-emerald-600'}`}>
                  {maxPaginasLicitacion} / 500
                </span>
              </li>
              <li className="flex justify-between border-b border-slate-200 pb-1">
                <span>Pág. Normativas (Lím. 1000/consulta):</span>
                <span className={`font-bold ${maxPaginasNormativas > 1000 ? 'text-rose-500' : 'text-emerald-600'}`}>
                  {maxPaginasNormativas} / 1000
                </span>
              </li>
              <li className="flex justify-between mt-2 pt-1 border-t border-slate-200">
                <span className="text-slate-500 font-medium italic">Se evalúa por cada iteración enviada.</span>
              </li>
            </ul>
          </div>
          
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
            <h3 className="text-sm font-bold text-slate-800 mb-2 flex items-center gap-2">
              <Activity className="w-4 h-4 text-[#7C3AED]" />
              Calidad de Consulta
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              La IA mejora su precisión cuando las instrucciones (prompts) son detalladas y cuando la base de conocimiento está actualizada. Un <span className="font-bold text-slate-800">{precisionRAG}%</span> de precisión indica una buena alineación RAG.
            </p>
          </div>

          <div className="flex flex-col justify-center gap-3">
             <button 
              onClick={() => setCurrentView('conocimiento')}
              className="bg-white border border-[#1E3A8A] text-[#1E3A8A] hover:bg-slate-50 text-xs font-bold py-2.5 px-4 rounded-xl transition-all w-full text-center"
            >
              Alimentar Base de Conocimiento
            </button>
            <button 
              onClick={() => setCurrentView('identificar')}
              className="bg-[#1E3A8A] hover:bg-[#1E3A8A]/90 text-white text-xs font-bold py-2.5 px-4 rounded-xl transition-all w-full shadow-md shadow-[#1E3A8A]/20"
            >
              Realizar Nueva Consulta
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
