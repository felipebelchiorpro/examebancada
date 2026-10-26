"use client";

import React, { useState, useEffect } from "react";
import { LaudoUrina, StatusLaudo, LabConfig, DEFAULT_LAB_CONFIG } from "@/types/urinalise";
import { StatusBadge } from "@/components/StatusBadge";
import { LaudoPrintView } from "@/components/LaudoPrintView";
import {
  Printer,
  Search,
  Eye,
  CheckCircle2,
  Clock,
  AlertTriangle,
  RotateCcw,
  Calendar,
  X,
  FileText,
} from "lucide-react";

export default function PainelLaudosPage() {
  const [laudos, setLaudos] = useState<LaudoUrina[]>([]);
  const [dataSelecionada, setDataSelecionada] = useState<string>("");
  const [busca, setBusca] = useState<string>("");
  const [statusFiltro, setStatusFiltro] = useState<string>("todos");
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Laudo selecionado para visualização/impressão individual
  const [laudoAtivo, setLaudoAtivo] = useState<LaudoUrina | null>(null);

  // Modo de impressão em lote de todos os finalizados
  const [imprimindoTodos, setImprimindoTodos] = useState<boolean>(false);

  useEffect(() => {
    setDataSelecionada(new Date().toISOString().split("T")[0]);
  }, []);

  useEffect(() => {
    carregarLaudos();
  }, [dataSelecionada]);

  const carregarLaudos = async () => {
    setIsLoading(true);
    try {
      const url = dataSelecionada ? `/api/laudos-dia?data=${dataSelecionada}` : "/api/laudos-dia";
      const res = await fetch(url);
      const data = await res.json();
      if (data.ok && Array.isArray(data.laudos)) {
        setLaudos(data.laudos);
      }
    } catch (err) {
      console.error("Erro ao carregar laudos:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // Filtragem
  const laudosFiltrados = laudos.filter((l) => {
    const matchBusca =
      l.nome_paciente.toLowerCase().includes(busca.toLowerCase()) ||
      l.prontuario.toLowerCase().includes(busca.toLowerCase());

    const matchStatus = statusFiltro === "todos" || l.status === statusFiltro;

    return matchBusca && matchStatus;
  });

  // Helpers de datas
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

  // Estatísticas
  const totalLaudos = laudos.length;
  const finalizados = laudos.filter((l) => l.status === "finalizado").length;
  const rascunhos = laudos.filter((l) => l.status === "rascunho").length;
  const recoletas = laudos.filter((l) => l.status === "recoleta").length;

  // Imprimir individual
  const handleImprimirIndividual = (laudo: LaudoUrina) => {
    setImprimindoTodos(false);
    setLaudoAtivo(laudo);
    setTimeout(() => {
      window.print();
    }, 200);
  };

  // Imprimir lote de todos os finalizados
  const handleImprimirTodos = () => {
    const finalizadosList = laudos.filter((l) => l.status === "finalizado");
    if (finalizadosList.length === 0) {
      alert("Nenhum laudo com status 'Finalizado' para imprimir.");
      return;
    }
    setImprimindoTodos(true);
    setLaudoAtivo(null);
    setTimeout(() => {
      window.print();
    }, 200);
  };

  return (
    <div className="min-h-screen bg-slate-100/70 pb-24">
      {/* Elementos de tela (Ocultos durante window.print via print:hidden) */}
      <div className="print:hidden">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 pt-4 sm:pt-6">
          {/* CABEÇALHO */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <h1 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                  Relatórios de Bancada (Anexo de Arquivos Físicos)
                </h1>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Impressão de relatórios de bancada para anexar aos prontuários/requisições e facilitar a digitação no sistema do laboratório
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Botões rápidos de dias anteriores */}
              <div className="flex items-center gap-1 bg-white border border-slate-300 rounded-xl p-1 shadow-xs">
                {[
                  { id: "", label: "🌐 Todos" },
                  { id: hojeStr, label: "Hoje" },
                  { id: ontemStr, label: "Ontem" },
                  { id: anteontemStr, label: "Anteontem" },
                ].map((btn) => (
                  <button
                    key={btn.id}
                    type="button"
                    onClick={() => setDataSelecionada(btn.id)}
                    className={`px-2 py-1 text-xs font-bold rounded-lg transition ${
                      dataSelecionada === btn.id
                        ? "bg-slate-900 text-white shadow-2xs"
                        : "text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    {btn.label}
                  </button>
                ))}
              </div>

              {/* Seletor de Data Calendário */}
              <div className="flex items-center gap-1.5 bg-white border border-slate-300 rounded-xl px-2.5 py-1.5 shadow-xs">
                <Calendar className="w-3.5 h-3.5 text-slate-500" />
                <input
                  type="date"
                  value={dataSelecionada}
                  onChange={(e) => setDataSelecionada(e.target.value)}
                  className="text-xs font-semibold text-slate-800 bg-transparent focus:outline-none"
                />
              </div>

              {/* Botão Imprimir Todos */}
              <button
                type="button"
                onClick={handleImprimirTodos}
                disabled={finalizados === 0}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center gap-1.5 active:scale-95"
              >
                <Printer className="w-4 h-4" />
                <span>Imprimir Finalizados ({finalizados})</span>
              </button>
            </div>
          </div>

          {/* CARDS DE RESUMO DE BANCADA */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
            <div className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-xs">
              <span className="text-[11px] font-semibold text-slate-500 uppercase">
                Total de Amostras
              </span>
              <div className="text-2xl font-black text-slate-900 mt-1">{totalLaudos}</div>
            </div>

            <div className="bg-white rounded-xl border border-emerald-200 p-3.5 shadow-xs bg-emerald-50/20">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-emerald-800 uppercase">
                  Finalizados
                </span>
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="text-2xl font-black text-emerald-700 mt-1">{finalizados}</div>
            </div>

            <div className="bg-white rounded-xl border border-amber-200 p-3.5 shadow-xs bg-amber-50/20">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-amber-800 uppercase">
                  Rascunhos
                </span>
                <Clock className="w-4 h-4 text-amber-600" />
              </div>
              <div className="text-2xl font-black text-amber-700 mt-1">{rascunhos}</div>
            </div>

            <div className="bg-white rounded-xl border border-rose-200 p-3.5 shadow-xs bg-rose-50/20">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-rose-800 uppercase">
                  Recoletas
                </span>
                <AlertTriangle className="w-4 h-4 text-rose-600" />
              </div>
              <div className="text-2xl font-black text-rose-700 mt-1">{recoletas}</div>
            </div>
          </div>

          {/* BARRA DE FILTRO E PESQUISA */}
          <div className="bg-white rounded-xl border border-slate-200 p-3.5 mb-4 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Filtrar por paciente ou prontuário..."
                className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:border-sky-500"
              />
            </div>

            <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto">
              {["todos", "finalizado", "rascunho", "recoleta"].map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setStatusFiltro(st)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition ${
                    statusFiltro === st
                      ? "bg-sky-700 text-white shadow-xs"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          {/* TABELA DE LAUDOS */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            {laudosFiltrados.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-sm">
                Nenhum laudo encontrado para os critérios selecionados nesta data.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-3.5">Horário</th>
                      <th className="py-3 px-3.5">Prontuário</th>
                      <th className="py-3 px-3.5">Paciente</th>
                      <th className="py-3 px-3.5">Físico-Químico (Proteína/Glic/Hb)</th>
                      <th className="py-3 px-3.5">Sedimento (Leuc/Hem)</th>
                      <th className="py-3 px-3.5">Status</th>
                      <th className="py-3 px-3.5 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                    {laudosFiltrados.map((laudo) => {
                      const hora = (() => {
                        try {
                          return new Date(laudo.data_hora).toLocaleTimeString("pt-BR", {
                            hour: "2-digit",
                            minute: "2-digit",
                          });
                        } catch {
                          return "--:--";
                        }
                      })();

                      return (
                        <tr key={laudo.prontuario + laudo.data_hora} className="hover:bg-slate-50/80 transition">
                          <td className="py-3 px-3.5 font-mono text-slate-500">{hora}</td>
                          <td className="py-3 px-3.5 font-mono font-bold text-sky-800">
                            {laudo.prontuario}
                          </td>
                          <td className="py-3 px-3.5">
                            <span className="font-bold text-slate-900 block">
                              {laudo.nome_paciente}
                            </span>
                            <span className="text-[10px] text-slate-500">
                              {laudo.idade_sexo || laudo.posto_unidade}
                            </span>
                          </td>
                          <td className="py-3 px-3.5 text-slate-600">
                            <span className="font-mono text-[11px]">
                              P: {laudo.proteina} | G: {laudo.glicose} | S: {laudo.sangue}
                            </span>
                          </td>
                          <td className="py-3 px-3.5 text-slate-600">
                            <span className="font-mono text-[11px]">
                              L: {laudo.leucocitos_campo} | H: {laudo.hemacias_campo}
                            </span>
                          </td>
                          <td className="py-3 px-3.5">
                            <StatusBadge status={laudo.status} size="sm" />
                          </td>
                          <td className="py-3 px-3.5 text-right space-x-1">
                            {/* Botão Ver Prévia */}
                            <button
                              type="button"
                              onClick={() => {
                                setImprimindoTodos(false);
                                setLaudoAtivo(laudo);
                              }}
                              className="px-2.5 py-1.5 text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg text-xs font-semibold transition inline-flex items-center gap-1"
                              title="Visualizar laudo A4"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span className="hidden sm:inline">Ver</span>
                            </button>

                            {/* Botão Imprimir */}
                            <button
                              type="button"
                              onClick={() => handleImprimirIndividual(laudo)}
                              className="px-2.5 py-1.5 text-white bg-sky-700 hover:bg-sky-800 rounded-lg text-xs font-semibold shadow-xs transition inline-flex items-center gap-1"
                              title="Imprimir folha A4"
                            >
                              <Printer className="w-3.5 h-3.5" />
                              <span className="hidden sm:inline">Imprimir</span>
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
      </div>

      {/* MODAL DE PRÉ-VISUALIZAÇÃO DE LAUDO INDIVIDUAL (Apenas em tela) */}
      {laudoAtivo && !imprimindoTodos && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 print:hidden">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden border border-slate-300">
            {/* Topbar do Modal */}
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-sky-400" />
                <span className="font-bold text-sm">
                  Laudo A4: {laudoAtivo.nome_paciente} (Pront. {laudoAtivo.prontuario})
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs rounded-lg flex items-center gap-1.5 transition"
                >
                  <Printer className="w-4 h-4" />
                  Imprimir Folha A4
                </button>
                <button
                  type="button"
                  onClick={() => setLaudoAtivo(null)}
                  className="p-1 text-slate-400 hover:text-white rounded-lg transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Conteúdo com rolagem da folha A4 */}
            <div className="p-6 overflow-y-auto bg-slate-200/50 flex-1">
              <LaudoPrintView laudo={laudoAtivo} />
            </div>
          </div>
        </div>
      )}

      {/* ÁREA DE IMPRESSÃO (Renderizada para @media print) */}
      <div className="hidden print:block">
        {/* Caso seja impressão individual */}
        {laudoAtivo && !imprimindoTodos && (
          <LaudoPrintView laudo={laudoAtivo} showBorder={false} />
        )}

        {/* Caso seja impressão em lote de todos os finalizados */}
        {imprimindoTodos && (
          <div>
            {laudos
              .filter((l) => l.status === "finalizado")
              .map((l, index) => (
                <div key={l.prontuario + index} className="print-page-break">
                  <LaudoPrintView laudo={l} showBorder={false} />
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}
