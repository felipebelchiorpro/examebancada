"use client";

import React, { useState, useEffect } from "react";
import * as XLSX from "xlsx";
import { LaudoUrina, StatusLaudo, VALORES_PADRAO_NORMAL } from "@/types/urinalise";
import { StatusBadge } from "@/components/StatusBadge";
import { QuickChipSelect } from "@/components/QuickChipSelect";
import {
  Search,
  Calendar,
  Filter,
  Edit3,
  Download,
  AlertTriangle,
  CheckCircle2,
  X,
  Save,
  FileSpreadsheet,
  RefreshCw,
} from "lucide-react";

export default function ConsultaAuditoriaPage() {
  const [laudos, setLaudos] = useState<LaudoUrina[]>([]);
  const [dataFiltro, setDataFiltro] = useState<string>("");
  const [busca, setBusca] = useState<string>("");
  const [statusFiltro, setStatusFiltro] = useState<string>("todos");
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Modal / Gaveta de Edição Rápida
  const [editandoLaudo, setEditandoLaudo] = useState<LaudoUrina | null>(null);
  const [isSavingEdit, setIsSavingEdit] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    carregarLaudos();
  }, [dataFiltro]);

  const carregarLaudos = async () => {
    setIsLoading(true);
    try {
      const url = dataFiltro ? `/api/laudos-dia?data=${dataFiltro}` : "/api/laudos-dia";
      const res = await fetch(url);
      const data = await res.json();
      if (data.ok && Array.isArray(data.laudos)) {
        setLaudos(data.laudos);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const laudosFiltrados = laudos.filter((l) => {
    const termo = busca.toLowerCase();
    const matchBusca =
      l.nome_paciente.toLowerCase().includes(termo) ||
      l.prontuario.toLowerCase().includes(termo);

    const matchStatus =
      statusFiltro === "todos"
        ? true
        : statusFiltro === "pendentes"
        ? l.status === "rascunho"
        : statusFiltro === "recoletas"
        ? l.status === "recoleta"
        : l.status === "finalizado";

    return matchBusca && matchStatus;
  });

  // Salvar alterações da edição rápida
  const handleSalvarEdicao = async () => {
    if (!editandoLaudo) return;

    setIsSavingEdit(true);
    try {
      const res = await fetch("/api/salvar-laudo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editandoLaudo),
      });
      const data = await res.json();

      if (data.ok) {
        setFeedback("Alterações salvas com sucesso!");
        // Atualiza a lista em tela
        setLaudos((prev) =>
          prev.map((l) => (l.prontuario === editandoLaudo.prontuario ? editandoLaudo : l))
        );
        setTimeout(() => {
          setEditandoLaudo(null);
          setFeedback(null);
        }, 800);
      } else {
        alert("Erro ao salvar: " + (data.message || data.error));
      }
    } catch (err) {
      console.error(err);
      alert("Falha de rede ao salvar alterações.");
    } finally {
      setIsSavingEdit(false);
    }
  };

  // Exportar para Excel (.xlsx) padrão de auditoria
  const exportarParaExcel = () => {
    if (laudosFiltrados.length === 0) {
      alert("Nenhum registro para exportar.");
      return;
    }

    const rows = laudosFiltrados.map((l) => ({
      "ID": l.id || "",
      "Data e Hora": l.data_hora,
      Prontuário: l.prontuario,
      Paciente: l.nome_paciente,
      Status: l.status.toUpperCase(),
      Cor: l.cor,
      Aspecto: l.aspecto,
      Densidade: l.densidade,
      pH: l.ph,
      Proteína: l.proteina,
      Glicose: l.glicose,
      Cetona: l.cetona,
      Bilirrubina: l.bilirrubina,
      Urobilinogênio: l.urobilinogenio,
      "Sangue / Hb": l.sangue,
      Nitrito: l.nitrito,
      "Leucócitos (Fita)": l.leucocitos_fita,
      "Células Epiteliais": l.celulas_epiteliais,
      "Leucócitos (Campo)": l.leucocitos_campo,
      "Hemácias (Campo)": l.hemacias_campo,
      Bactérias: l.bacterias,
      Cristais: l.cristais,
      Cilindros: l.cilindros,
      "Sangue Oculto (PSO)": l.resultado_pso || "-",
      "Proteinúria Rápida": l.resultado_proteinuria_rapida || "-",
      "Beta-HCG": l.resultado_beta_hcg || "-",
      VDRL: l.resultado_vdrl || "-",
      VHS: l.resultado_vhs || "-",
      PCR: l.resultado_pcr || "-",
      Observações: l.observacoes,
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Auditoria_Urinalise");
    XLSX.writeFile(wb, `Auditoria_Urinalise_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  // Exportar especificamente no formato para Extensão de Auto-Laudo / Sistema do Laboratório
  const exportarParaExtensaoAutoLaudo = () => {
    if (laudosFiltrados.length === 0) {
      alert("Nenhum registro para exportar.");
      return;
    }

    const rows = laudosFiltrados.map((l) => ({
      PRONTUARIO: l.prontuario,
      PACIENTE: l.nome_paciente,
      DATA: l.data_hora.split("T")[0],
      COR: l.cor,
      ASPECTO: l.aspecto,
      DENSIDADE: l.densidade,
      PH: l.ph,
      PROTEINA: l.proteina,
      GLICOSE: l.glicose,
      CETONAS: l.cetona,
      BILIRRUBINA: l.bilirrubina,
      UROBILINOGENIO: l.urobilinogenio,
      SANGUE: l.sangue,
      NITRITO: l.nitrito,
      LEUCOCITOS_FITA: l.leucocitos_fita,
      CELULAS_EPITELIAIS: l.celulas_epiteliais,
      LEUCOCITOS: l.leucocitos_campo,
      HEMACIAS: l.hemacias_campo,
      BACTERIAS: l.bacterias,
      CRISTAIS: l.cristais,
      CILINDROS: l.cilindros,
      SANGUE_OCULTO_PSO: l.resultado_pso || "Negativo",
      PROTEINURIA_RAPIDA: l.resultado_proteinuria_rapida || "Negativo",
      BETA_HCG: l.resultado_beta_hcg || "",
      VDRL: l.resultado_vdrl || "",
      VHS: l.resultado_vhs || "",
      PCR: l.resultado_pcr || "",
      STATUS: l.status.toUpperCase(),
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "AutoLaudo_Bancada");
    XLSX.writeFile(wb, `AutoLaudo_Urinálise_Extensao_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  // Copiar dados formatados para colar direto na extensão (TSV / Clipboard)
  const copiarParaClipboardExtensao = () => {
    if (laudosFiltrados.length === 0) {
      alert("Nenhum registro para copiar.");
      return;
    }

    const colunas = [
      "PRONTUARIO",
      "PACIENTE",
      "COR",
      "ASPECTO",
      "DENSIDADE",
      "PH",
      "PROTEINA",
      "GLICOSE",
      "SANGUE",
      "NITRITO",
      "LEUCOCITOS",
      "HEMACIAS",
      "CRISTAIS",
      "BACTERIAS",
      "PSO",
      "PROT_RAPIDA",
    ];

    const linhas = laudosFiltrados.map((l) => [
      l.prontuario,
      l.nome_paciente,
      l.cor,
      l.aspecto,
      l.densidade,
      l.ph,
      l.proteina,
      l.glicose,
      l.sangue,
      l.nitrito,
      l.leucocitos_campo,
      l.hemacias_campo,
      l.cristais,
      l.bacterias,
      l.resultado_pso || "Negativo",
      l.resultado_proteinuria_rapida || "Negativo",
    ].join("\t"));

    const textoFinal = [colunas.join("\t"), ...linhas].join("\n");
    navigator.clipboard.writeText(textoFinal);
    alert(`${laudosFiltrados.length} exames copiados em formato de tabela! Cole direto na sua extensão ou planilha.`);
  };

  // Helpers de datas rápidas
  const [datasRapidas, setDatasRapidas] = useState({ hoje: "", ontem: "", anteontem: "" });

  useEffect(() => {
    const h = new Date().toISOString().split("T")[0];
    const o = new Date(Date.now() - 86400000).toISOString().split("T")[0];
    const a = new Date(Date.now() - 172800000).toISOString().split("T")[0];
    setDatasRapidas({ hoje: h, ontem: o, anteontem: a });
  }, []);

  const hojeStr = datasRapidas.hoje;
  const ontemStr = datasRapidas.ontem;
  const anteontemStr = datasRapidas.anteontem;

  return (
    <div className="min-h-screen bg-slate-100/70 pb-24">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 pt-4 sm:pt-6">
        {/* CABEÇALHO */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
              <h1 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                Consulta Histórica & Auditoria
              </h1>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Pesquise exames por dias anteriores, paciente ou prontuário e exporte para a extensão de auto-laudo
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={exportarParaExtensaoAutoLaudo}
              className="px-3.5 py-2 bg-indigo-700 hover:bg-indigo-800 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 active:scale-95"
              title="Gera planilha compatível com extensões de preenchimento automático de laudos"
            >
              <span>⚡ Exportar p/ Extensão Auto-Laudo</span>
            </button>

            <button
              type="button"
              onClick={copiarParaClipboardExtensao}
              className="px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-xl border border-slate-300 shadow-2xs transition flex items-center gap-1.5 active:scale-95"
              title="Copia tabela para a área de transferência (Ctrl+V)"
            >
              <span>📋 Copiar Tabela</span>
            </button>

            <button
              type="button"
              onClick={exportarParaExcel}
              className="px-3 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 active:scale-95"
              title="Exportar arquivo Excel completo para auditoria"
            >
              <Download className="w-4 h-4" />
              <span>Excel (.xlsx)</span>
            </button>

            <button
              type="button"
              onClick={carregarLaudos}
              className="p-2 text-slate-600 hover:text-slate-900 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition"
              title="Recarregar"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        {/* BARRA DE FILTROS AVANÇADOS COM SELEÇÃO DE DIAS ANTERIORES */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 mb-5 shadow-xs space-y-3">
          {/* BOTÕES RÁPIDOS DE DIAS ANTERIORES */}
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100 overflow-x-auto">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider shrink-0 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-indigo-600" />
              Período:
            </span>
            {[
              { id: "", label: "🌐 Todos os Dias (Histórico Completo)" },
              { id: hojeStr, label: "📅 Hoje" },
              { id: ontemStr, label: "⏪ Ontem" },
              { id: anteontemStr, label: "🗓️ Anteontem" },
            ].map((btn) => (
              <button
                key={btn.id}
                type="button"
                onClick={() => setDataFiltro(btn.id)}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition shrink-0 ${
                  dataFiltro === btn.id
                    ? "bg-indigo-600 text-white shadow-xs"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                {btn.label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* BUSCA POR TEXTO */}
            <div className="relative sm:col-span-2">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar por nome do paciente ou número do prontuário em qualquer data..."
                className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:border-indigo-500"
              />
            </div>

            {/* SELETOR DE DATA CALENDÁRIO */}
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={dataFiltro}
                onChange={(e) => setDataFiltro(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:border-indigo-500 font-medium text-slate-700"
              />
              {dataFiltro && (
                <button
                  type="button"
                  onClick={() => setDataFiltro("")}
                  className="text-xs text-slate-500 hover:text-slate-800 px-2 py-1 bg-slate-100 rounded-lg shrink-0 font-medium"
                >
                  Ver Todos
                </button>
              )}
            </div>
          </div>

          {/* CHIPS DE STATUS */}
          <div className="flex items-center gap-2 pt-2 border-t border-slate-100 overflow-x-auto">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider shrink-0 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5" />
              Status:
            </span>
            {[
              { id: "todos", label: "Todos" },
              { id: "finalizados", label: "Finalizados" },
              { id: "pendentes", label: "Pendentes (Rascunhos)" },
              { id: "recoletas", label: "Recoletas" },
            ].map((chip) => (
              <button
                key={chip.id}
                type="button"
                onClick={() => setStatusFiltro(chip.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition shrink-0 ${
                  statusFiltro === chip.id
                    ? "bg-slate-900 text-white shadow-xs"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {chip.label}
              </button>
            ))}
          </div>
        </div>

        {/* TABELA DE AUDITORIA */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-3.5 sm:p-4 border-b border-slate-200 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">
              Registros Localizados ({laudosFiltrados.length})
              {dataFiltro ? ` • Filtrado por data: ${dataFiltro}` : " • Todo o Histórico"}
            </span>
          </div>

          {laudosFiltrados.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-sm">
              Nenhum laudo encontrado para este filtro.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-3.5">Data / Hora</th>
                    <th className="py-3 px-3.5">Prontuário</th>
                    <th className="py-3 px-3.5">Paciente</th>
                    <th className="py-3 px-3.5">Proteína</th>
                    <th className="py-3 px-3.5">Glicose</th>
                    <th className="py-3 px-3.5">Leucócitos/c</th>
                    <th className="py-3 px-3.5">Hemácias/c</th>
                    <th className="py-3 px-3.5">Status</th>
                    <th className="py-3 px-3.5 text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                  {laudosFiltrados.map((l) => {
                    const dataStr = (() => {
                      try {
                        const d = new Date(l.data_hora);
                        return d.toLocaleDateString("pt-BR") + " " + d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
                      } catch {
                        return l.data_hora;
                      }
                    })();

                    return (
                      <tr
                        key={l.prontuario + l.data_hora}
                        onClick={() => setEditandoLaudo({ ...l })}
                        className="hover:bg-slate-50 cursor-pointer transition"
                      >
                        <td className="py-3 px-3.5 font-mono text-slate-500">{dataStr}</td>
                        <td className="py-3 px-3.5 font-mono font-bold text-sky-800">
                          {l.prontuario}
                        </td>
                        <td className="py-3 px-3.5">
                          <span className="font-bold text-slate-900 block">{l.nome_paciente}</span>
                          <span className="text-[10px] text-slate-500">{l.posto_unidade}</span>
                        </td>
                        <td className="py-3 px-3.5">{l.proteina}</td>
                        <td className="py-3 px-3.5">{l.glicose}</td>
                        <td className="py-3 px-3.5 font-mono">{l.leucocitos_campo}</td>
                        <td className="py-3 px-3.5 font-mono">{l.hemacias_campo}</td>
                        <td className="py-3 px-3.5">
                          <StatusBadge status={l.status} size="sm" />
                        </td>
                        <td className="py-3 px-3.5 text-right">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditandoLaudo({ ...l });
                            }}
                            className="px-2.5 py-1 text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg text-xs font-semibold inline-flex items-center gap-1 transition"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            Editar
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* GAVETA / MODAL LATERAL DE EDIÇÃO RÁPIDA */}
      {editandoLaudo && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex justify-end">
          <div className="bg-white w-full max-w-2xl h-full shadow-2xl flex flex-col overflow-hidden animate-slide-left border-l border-slate-300">
            {/* Topbar da Gaveta */}
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <span className="text-[10px] text-slate-400 font-mono uppercase block">
                  Auditoria & Edição Rápida de Laudo
                </span>
                <h3 className="font-black text-base text-white">
                  {editandoLaudo.nome_paciente}
                </h3>
                <span className="text-xs text-sky-300 font-mono">
                  Prontuário: {editandoLaudo.prontuario}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setEditandoLaudo(null)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg transition"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Feedback message */}
            {feedback && (
              <div className="bg-emerald-600 text-white p-2.5 text-center text-xs font-bold">
                {feedback}
              </div>
            )}

            {/* Conteúdo com rolagem da edição */}
            <div className="p-5 overflow-y-auto flex-1 space-y-4">
              {/* ALTERAÇÃO DE STATUS */}
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                <label className="block text-xs font-bold text-slate-700 uppercase mb-2">
                  Status do Laudo
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: "finalizado", label: "Finalizado", color: "bg-emerald-600 text-white" },
                    { id: "rascunho", label: "Rascunho", color: "bg-amber-600 text-white" },
                    { id: "recoleta", label: "Recoleta", color: "bg-rose-600 text-white" },
                  ].map((st) => (
                    <button
                      key={st.id}
                      type="button"
                      onClick={() =>
                        setEditandoLaudo({ ...editandoLaudo, status: st.id as StatusLaudo })
                      }
                      className={`py-2 px-3 rounded-lg text-xs font-bold transition text-center border ${
                        editandoLaudo.status === st.id
                          ? `${st.color} shadow-sm border-transparent`
                          : "bg-white text-slate-700 border-slate-300 hover:bg-slate-100"
                      }`}
                    >
                      {st.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* FÍSICO-QUÍMICO */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide border-b pb-1">
                  Exame Físico-Químico
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <QuickChipSelect
                    label="Proteína"
                    value={editandoLaudo.proteina}
                    onChange={(v) => setEditandoLaudo({ ...editandoLaudo, proteina: v })}
                    options={[
                      { label: "Negativo", value: "Negativo" },
                      { label: "Traços", value: "Traços", isAbnormal: true },
                      { label: "(+)", value: "(+)", isAbnormal: true },
                      { label: "(++)", value: "(++)", isAbnormal: true },
                    ]}
                  />

                  <QuickChipSelect
                    label="Glicose"
                    value={editandoLaudo.glicose}
                    onChange={(v) => setEditandoLaudo({ ...editandoLaudo, glicose: v })}
                    options={[
                      { label: "Negativo", value: "Negativo" },
                      { label: "(+)", value: "(+)", isAbnormal: true },
                      { label: "(++)", value: "(++)", isAbnormal: true },
                    ]}
                  />

                  <QuickChipSelect
                    label="Sangue / Hb"
                    value={editandoLaudo.sangue}
                    onChange={(v) => setEditandoLaudo({ ...editandoLaudo, sangue: v })}
                    options={[
                      { label: "Negativo", value: "Negativo" },
                      { label: "Traços", value: "Traços", isAbnormal: true },
                      { label: "(+)", value: "(+)", isAbnormal: true },
                    ]}
                  />

                  <QuickChipSelect
                    label="Nitrito"
                    value={editandoLaudo.nitrito}
                    onChange={(v) => setEditandoLaudo({ ...editandoLaudo, nitrito: v })}
                    options={[
                      { label: "Negativo", value: "Negativo" },
                      { label: "Positivo", value: "Positivo", isAbnormal: true },
                    ]}
                  />
                </div>
              </div>

              {/* MICROSCOPIA */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide border-b pb-1">
                  Microscopia (Sedimento)
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <QuickChipSelect
                    label="Leucócitos"
                    value={editandoLaudo.leucocitos_campo}
                    onChange={(v) => setEditandoLaudo({ ...editandoLaudo, leucocitos_campo: v })}
                    options={[
                      { label: "0 a 4 p/c", value: "0 a 4 p/c" },
                      { label: "5 a 10 p/c", value: "5 a 10 p/c", isAbnormal: true },
                      { label: "10 a 20 p/c", value: "10 a 20 p/c", isAbnormal: true },
                      { label: "Incontáveis", value: "Incontáveis", isAbnormal: true },
                    ]}
                  />

                  <QuickChipSelect
                    label="Hemácias"
                    value={editandoLaudo.hemacias_campo}
                    onChange={(v) => setEditandoLaudo({ ...editandoLaudo, hemacias_campo: v })}
                    options={[
                      { label: "0 a 2 p/c", value: "0 a 2 p/c" },
                      { label: "3 a 5 p/c", value: "3 a 5 p/c", isAbnormal: true },
                      { label: "6 a 10 p/c", value: "6 a 10 p/c", isAbnormal: true },
                      { label: "Maciça", value: "Maciça", isAbnormal: true },
                    ]}
                  />

                  <QuickChipSelect
                    label="Células"
                    value={editandoLaudo.celulas_epiteliais}
                    onChange={(v) => setEditandoLaudo({ ...editandoLaudo, celulas_epiteliais: v })}
                    options={[
                      { label: "Raras", value: "Raras" },
                      { label: "Algumas", value: "Algumas" },
                      { label: "Numerosas", value: "Numerosas", isAbnormal: true },
                    ]}
                  />

                  <QuickChipSelect
                    label="Bactérias"
                    value={editandoLaudo.bacterias}
                    onChange={(v) => setEditandoLaudo({ ...editandoLaudo, bacterias: v })}
                    options={[
                      { label: "Ausentes", value: "Ausentes" },
                      { label: "Raras", value: "Raras / Flora habitual" },
                      { label: "Moderadas", value: "Moderadas", isAbnormal: true },
                      { label: "Aumentadas", value: "Aumentadas", isAbnormal: true },
                    ]}
                  />
                </div>
              </div>

              {/* OBSERVAÇÕES / JUSTIFICATIVA DE RECOLETA */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Observações / Justificativa da Alteração ou Recoleta
                </label>
                <textarea
                  rows={3}
                  value={editandoLaudo.observacoes}
                  onChange={(e) => setEditandoLaudo({ ...editandoLaudo, observacoes: e.target.value })}
                  placeholder="Justifique qualquer alteração ou motivo de recoleta..."
                  className="w-full p-2.5 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:border-indigo-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Rodapé da Gaveta com Botão de Gravação */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditandoLaudo(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isSavingEdit}
                onClick={handleSalvarEdicao}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center gap-1.5 active:scale-95 disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>{isSavingEdit ? "Salvando..." : "Salvar Alterações"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
