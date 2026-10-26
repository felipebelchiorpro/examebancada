"use client";

import React, { useState, useEffect } from "react";
import * as XLSX from "xlsx";
import { RotinaItem, LabConfig, DEFAULT_LAB_CONFIG } from "@/types/urinalise";
import { MapaBancadaPrintView } from "@/components/MapaBancadaPrintView";
import { processarMatrizLinhasBancada } from "@/lib/extratorBancada";
import {
  UploadCloud,
  FileSpreadsheet,
  CheckCircle,
  AlertCircle,
  Filter,
  UserPlus,
  Trash2,
  RefreshCw,
  Sparkles,
  Printer,
  FileText,
} from "lucide-react";

export default function ImportarRotinaPage() {
  const [activeTab, setActiveTab] = useState<"upload" | "colar" | "manual">("upload");
  const [colarTexto, setColarTexto] = useState<string>("");
  const [filtrarApenasUrina, setFiltrarApenasUrina] = useState<boolean>(true);
  const [filtrarApenasRealizado, setFiltrarApenasRealizado] = useState<boolean>(true);
  const [subFiltro, setSubFiltro] = useState<"todos" | "urina" | "pso" | "coagulograma" | "vdrl" | "testes" | "provas">("todos");

  // Lista de pacientes processados / em pré-visualização
  const [pacientes, setPacientes] = useState<RotinaItem[]>([]);
  const [totalLinhasArquivo, setTotalLinhasArquivo] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);
  const [dataHoje, setDataHoje] = useState<string>("");
  const [labConfig, setLabConfig] = useState<LabConfig>(DEFAULT_LAB_CONFIG);

  // Form manual para paciente avulso
  const [manualForm, setManualForm] = useState({
    prontuario: "",
    nome_paciente: "",
    idade_sexo: "",
    posto_unidade: "UBS Central",
    solicitante: "Clínica Médica",
    tem_urina: true,
    tem_pso: false,
  });

  // Carregar rotina existente na inicialização
  useEffect(() => {
    document.title = "Urinálise & PSO SUS | Importar Rotina";
    setDataHoje(new Date().toISOString().split("T")[0]);
    const savedConfig = localStorage.getItem("urinalise_lab_config");
    if (savedConfig) {
      try {
        setLabConfig(JSON.parse(savedConfig));
      } catch (e) {
        console.error(e);
      }
    }
    carregarRotinaAtual();
  }, []);

  const carregarRotinaAtual = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/rotina");
      const data = await res.json();
      if (data.ok && Array.isArray(data.rotina)) {
        setPacientes(data.rotina);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  // Upload de arquivo Excel (.xlsx, .xls), CSV ou PDF
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    setFeedback(null);

    const isPdf = file.name.toLowerCase().endsWith(".pdf");

    if (isPdf) {
      try {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("filtrarApenasRealizado", String(filtrarApenasRealizado));

        const res = await fetch("/api/extrair-arquivo", {
          method: "POST",
          body: formData,
        });

        const data = await res.json();
        if (data.ok && Array.isArray(data.pacientesUnificados)) {
          setPacientes(data.pacientesUnificados);
          setTotalLinhasArquivo(data.totalLidos);
          setFeedback({
            message: `📄 PDF "${file.name}" processado com sucesso! ${data.pacientesUnificados.length} pacientes de bancada identificados (${data.totalDescartadosAutomatizados} exames de bioquímica/hemograma automatizados foram descartados).`,
            type: "success",
          });
        } else {
          setFeedback({ message: data.error || "Falha ao extrair dados do PDF.", type: "error" });
        }
      } catch (err: any) {
        setFeedback({ message: `Erro ao enviar PDF: ${err.message}`, type: "error" });
      } finally {
        setIsLoading(false);
      }
    } else {
      // Leitura de Excel (.xlsx, .xls) ou CSV direto no cliente
      try {
        const reader = new FileReader();
        reader.onload = (evt) => {
          try {
            const bstr = evt.target?.result;
            const wb = XLSX.read(bstr, { type: "binary" });
            const wsname = wb.SheetNames[0];
            const ws = wb.Sheets[wsname];
            const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });

            const res = processarMatrizLinhasBancada(rows, filtrarApenasRealizado);
            setPacientes(res.pacientesUnificados);
            setTotalLinhasArquivo(res.totalLidos);
            setFeedback({
              message: `📊 Planilha "${file.name}" processada! ${res.totalAproveitados} pacientes de bancada identificados (${res.totalDescartadosAutomatizados} exames de bioquímica/hemograma descartados).`,
              type: "success",
            });
          } catch (err: any) {
            setFeedback({ message: `Erro ao ler planilha: ${err.message}`, type: "error" });
          } finally {
            setIsLoading(false);
          }
        };
        reader.readAsBinaryString(file);
      } catch (err: any) {
        setIsLoading(false);
        setFeedback({ message: `Erro ao abrir arquivo: ${err.message}`, type: "error" });
      }
    }
  };

  // Processa texto colado do Excel/Bloco de Notas
  const handleColarTexto = () => {
    if (!colarTexto.trim()) {
      setFeedback({ message: "Cole os dados da planilha na caixa de texto primeiro.", type: "error" });
      return;
    }

    const lines = colarTexto.trim().split("\n");
    const matrix = lines.map((line) => {
      if (line.includes("\t")) return line.split("\t");
      if (line.includes(";")) return line.split(";");
      return line.split(",");
    });

    const res = processarMatrizLinhasBancada(matrix, filtrarApenasRealizado);
    setPacientes(res.pacientesUnificados);
    setTotalLinhasArquivo(res.totalLidos);
    setFeedback({
      message: `📋 Texto colado processado com sucesso! ${res.totalAproveitados} pacientes de bancada identificados (${res.totalDescartadosAutomatizados} exames de bioquímica/hemograma descartados).`,
      type: "success",
    });
  };

  // Adicionar paciente avulso
  const handleAdicionarAvulso = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualForm.prontuario.trim() || !manualForm.nome_paciente.trim()) {
      setFeedback({ message: "Preencha ao menos o prontuário e o nome do paciente.", type: "error" });
      return;
    }

    const novoItem: RotinaItem = {
      id: `manual-${Date.now()}`,
      data: new Date().toISOString().split("T")[0],
      prontuario: manualForm.prontuario.trim(),
      nome_paciente: manualForm.nome_paciente.trim(),
      idade_sexo: manualForm.idade_sexo.trim() || "Não informado",
      posto_unidade: manualForm.posto_unidade.trim(),
      solicitante: manualForm.solicitante.trim(),
      exame: manualForm.tem_urina && manualForm.tem_pso ? "URINA TIPO I + PSO" : manualForm.tem_pso ? "SANGUE OCULTO (PSO)" : "URINA TIPO I (EAS)",
      status_coleta: "REALIZADO",
      tem_laudo: false,
      tem_urina: manualForm.tem_urina,
      tem_pso: manualForm.tem_pso,
      exames_bancada: [
        ...(manualForm.tem_urina ? ["Urina Tipo I (EAS)"] : []),
        ...(manualForm.tem_pso ? ["Pesquisa de Sangue Oculto (PSO)"] : []),
      ],
    };

    setPacientes([novoItem, ...pacientes]);
    setManualForm({
      prontuario: "",
      nome_paciente: "",
      idade_sexo: "",
      posto_unidade: "UBS Central",
      solicitante: "Clínica Médica",
      tem_urina: true,
      tem_pso: false,
    });
    setFeedback({ message: `Paciente ${novoItem.nome_paciente} adicionado à lista!`, type: "success" });
  };

  // Remover item individual
  const removerItem = (prontuario: string) => {
    setPacientes(pacientes.filter((p) => p.prontuario !== prontuario));
  };

  // Salvar na aba Rotina_Dia do Google Sheets
  const salvarNoGoogleSheets = async () => {
    if (pacientes.length === 0) {
      setFeedback({ message: "Nenhum paciente na lista para salvar.", type: "error" });
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch("/api/rotina", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itens: pacientes }),
      });
      const data = await res.json();

      if (data.ok) {
        setFeedback({ message: data.message || "Rotina sincronizada com o Google Sheets com sucesso!", type: "success" });
      } else {
        setFeedback({ message: `Erro ao salvar: ${data.error}`, type: "error" });
      }
    } catch (err: any) {
      console.error(err);
      setFeedback({ message: "Erro de conexão ao salvar na planilha.", type: "error" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <div className="min-h-screen bg-slate-100/70 pb-24 print:hidden">
      <div className="max-w-5xl mx-auto px-3 sm:px-6 pt-4 sm:pt-6">
        {/* CABEÇALHO */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-sky-500" />
              <h1 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                Importação da Rotina Diária
              </h1>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Filtre e importe a lista de coletas do dia (GAL / Sisreg / Sistema do Posto) para a bancada
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={carregarRotinaAtual}
              className="p-2 text-slate-600 hover:text-slate-900 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition"
              title="Recarregar"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        {/* FEEDBACK ALERT */}
        {feedback && (
          <div
            className={`mb-4 p-3.5 rounded-xl text-xs sm:text-sm font-medium flex items-center justify-between border ${
              feedback.type === "success"
                ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                : feedback.type === "error"
                ? "bg-rose-50 text-rose-800 border-rose-200"
                : "bg-sky-50 text-sky-800 border-sky-200"
            }`}
          >
            <div className="flex items-center gap-2">
              {feedback.type === "success" ? (
                <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              )}
              <span>{feedback.message}</span>
            </div>
            <button
              type="button"
              onClick={() => setFeedback(null)}
              className="text-slate-400 hover:text-slate-700 text-base leading-none"
            >
              ×
            </button>
          </div>
        )}

        {/* CARTÃO DE ENTRADA DE DADOS */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-6 mb-5">
          {/* TABS DE ENTRADA */}
          <div className="flex items-center gap-2 border-b border-slate-200 pb-3 mb-4">
            <button
              type="button"
              onClick={() => setActiveTab("upload")}
              className={`px-3.5 py-2 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                activeTab === "upload"
                  ? "bg-sky-700 text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              <UploadCloud className="w-4 h-4" />
              Upload Planilha (CSV/XLSX)
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("colar")}
              className={`px-3.5 py-2 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                activeTab === "colar"
                  ? "bg-sky-700 text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              <FileSpreadsheet className="w-4 h-4" />
              Colar Dados
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("manual")}
              className={`px-3.5 py-2 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                activeTab === "manual"
                  ? "bg-sky-700 text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              <UserPlus className="w-4 h-4" />
              Adicionar Avulso
            </button>
          </div>

          {/* FILTROS AUTOMÁTICOS EM MEMÓRIA */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 mb-4 flex flex-wrap items-center gap-4 text-xs font-medium text-slate-700">
            <div className="flex items-center gap-1.5 text-slate-800 font-bold">
              <Filter className="w-4 h-4 text-sky-600" />
              Filtro Automático de Rotina:
            </div>
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={filtrarApenasUrina}
                onChange={(e) => setFiltrarApenasUrina(e.target.checked)}
                className="w-4 h-4 rounded text-sky-600 focus:ring-sky-500"
              />
              <span>Apenas Urinálise (EAS / Sumário / Tipo I)</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={filtrarApenasRealizado}
                onChange={(e) => setFiltrarApenasRealizado(e.target.checked)}
                className="w-4 h-4 rounded text-sky-600 focus:ring-sky-500"
              />
              <span>Apenas Status REALIZADO / COLETADO</span>
            </label>
          </div>

          {/* CONTEÚDO DA TAB UPLOAD */}
          {activeTab === "upload" && (
            <div className="border-2 border-dashed border-slate-300 hover:border-sky-500 rounded-2xl p-6 sm:p-8 text-center transition bg-slate-50/50">
              <UploadCloud className="w-12 h-12 text-sky-600 mx-auto mb-2" />
              <p className="text-sm font-bold text-slate-800">
                Selecione o arquivo em PDF, Excel (.xlsx, .xls) ou CSV da rotina do posto
              </p>
              <p className="text-xs text-slate-500 mt-1 mb-4">
                O sistema descarta automaticamente exames de bioquímica/hemograma e separa apenas a bancada manual
              </p>
              <label className="inline-flex items-center gap-2 px-5 py-2.5 bg-sky-700 hover:bg-sky-800 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer transition active:scale-95">
                <FileSpreadsheet className="w-4 h-4" />
                <span>Escolher Arquivo (PDF ou Excel)</span>
                <input
                  type="file"
                  accept=".pdf,.csv,.xlsx,.xls"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>
          )}

          {/* CONTEÚDO DA TAB COLAR */}
          {activeTab === "colar" && (
            <div className="space-y-3">
              <p className="text-xs text-slate-600 font-medium">
                Copie a tabela no Excel / sistema do posto (com cabeçalhos) e cole aqui:
              </p>
              <textarea
                rows={5}
                value={colarTexto}
                onChange={(e) => setColarTexto(e.target.value)}
                placeholder={"Prontuario\tNome\tExame\tStatus\n100452\tMaria da Silva\tEAS\tREALIZADO\n100453\tJoão Pereira\tURINA I\tCOLETADO"}
                className="w-full p-3 font-mono text-xs bg-slate-50 border border-slate-300 rounded-xl focus:border-sky-500 focus:bg-white focus:outline-none"
              />
              <button
                type="button"
                onClick={handleColarTexto}
                className="px-4 py-2 bg-sky-700 hover:bg-sky-800 text-white font-bold text-xs rounded-xl shadow-sm transition flex items-center gap-1.5"
              >
                <CheckCircle className="w-4 h-4" />
                Processar e Filtrar Texto
              </button>
            </div>
          )}

          {/* CONTEÚDO DA TAB MANUAL */}
          {activeTab === "manual" && (
            <form onSubmit={handleAdicionarAvulso} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Prontuário *
                </label>
                <input
                  type="text"
                  required
                  value={manualForm.prontuario}
                  onChange={(e) => setManualForm({ ...manualForm, prontuario: e.target.value })}
                  placeholder="Ex: 100458"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-sky-500"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nome Completo do Paciente *
                </label>
                <input
                  type="text"
                  required
                  value={manualForm.nome_paciente}
                  onChange={(e) => setManualForm({ ...manualForm, nome_paciente: e.target.value })}
                  placeholder="Ex: Carlos Alberto Souza"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-sky-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Idade / Sexo
                </label>
                <input
                  type="text"
                  value={manualForm.idade_sexo}
                  onChange={(e) => setManualForm({ ...manualForm, idade_sexo: e.target.value })}
                  placeholder="Ex: 45 anos / M"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-sky-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Unidade / UBS
                </label>
                <input
                  type="text"
                  value={manualForm.posto_unidade}
                  onChange={(e) => setManualForm({ ...manualForm, posto_unidade: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-sky-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Solicitante
                </label>
                <input
                  type="text"
                  value={manualForm.solicitante}
                  onChange={(e) => setManualForm({ ...manualForm, solicitante: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-sky-500"
                />
              </div>
              <div className="sm:col-span-3 flex justify-end">
                <button
                  type="submit"
                  className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs rounded-xl shadow-sm transition flex items-center gap-1.5"
                >
                  <UserPlus className="w-4 h-4" />
                  Inserir na Rotina
                </button>
              </div>
            </form>
          )}
        </div>

        {/* PRÉ-VISUALIZAÇÃO DA TABELA DE PACIENTES */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-black text-slate-900 uppercase tracking-wide flex items-center gap-2">
                Amostras da Rotina Diária
                <span className="bg-sky-100 text-sky-800 text-xs px-2 py-0.5 rounded-full font-bold">
                  {pacientes.length} pacientes
                </span>
              </h2>
              <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                {[
                  { id: "todos", label: `🌐 Todos (${pacientes.length})` },
                  { id: "urina", label: `🧪 Urinálise (${pacientes.filter((p) => p.tem_urina || p.tem_proteinuria_rapida).length})` },
                  { id: "pso", label: `💩 Sangue Oculto (${pacientes.filter((p) => p.tem_pso).length})` },
                  { id: "coagulograma", label: `⏱️ Coagulograma (${pacientes.filter((p) => p.tem_coagulograma).length})` },
                  { id: "vdrl", label: `🔬 VDRL (${pacientes.filter((p) => p.tem_vdrl).length})` },
                  { id: "testes", label: `🤰 Beta-HCG (${pacientes.filter((p) => p.tem_beta_hcg).length})` },
                  { id: "provas", label: `🌡️ Provas Inflamatórias (${pacientes.filter((p) => p.tem_vhs || p.tem_pcr || p.tem_aslo || p.tem_fr).length})` },
                ].map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setSubFiltro(f.id as any)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                      subFiltro === f.id
                        ? "bg-slate-900 text-white shadow-xs"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              {subFiltro === "vdrl" && (
                <div className="bg-purple-50 border border-purple-200 rounded-xl p-2.5 flex items-center justify-between text-xs mt-3 flex-wrap gap-2">
                  <span className="text-purple-950 font-bold flex items-center gap-1.5">
                    <span>⏳</span>
                    <span>VDRL em Lote Semanal: marque as amostras para aguardar o dia de corrida conjunta:</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setPacientes((prev) =>
                        prev.map((p) => (p.tem_vdrl ? { ...p, vdrl_acumular_lote: true } : p))
                      );
                      setFeedback({
                        message: "Amostras com VDRL marcadas para acumular no Lote Semanal!",
                        type: "success",
                      });
                    }}
                    className="px-3 py-1 bg-purple-700 hover:bg-purple-800 text-white rounded-lg font-bold text-xs shadow-2xs transition active:scale-95"
                  >
                    Marcar Todos VDRL como Lote Semanal
                  </button>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => window.print()}
                disabled={pacientes.length === 0}
                className="px-3 py-1.5 text-xs font-bold text-slate-800 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg shadow-2xs transition flex items-center gap-1.5 active:scale-95 disabled:opacity-40"
                title="Imprimir Mapa de Bancada A4 para anotações manuais"
              >
                <Printer className="w-3.5 h-3.5 text-sky-600" />
                <span>🖨️ Mapa de Bancada A4</span>
              </button>

              <button
                type="button"
                onClick={() => setPacientes([])}
                disabled={pacientes.length === 0}
                className="px-3 py-1.5 text-xs text-rose-700 hover:bg-rose-50 border border-rose-200 rounded-lg transition disabled:opacity-40"
              >
                Limpar Lista
              </button>

              <button
                type="button"
                onClick={salvarNoGoogleSheets}
                disabled={isLoading || pacientes.length === 0}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs sm:text-sm rounded-xl shadow-md transition flex items-center gap-1.5 active:scale-95"
              >
                <CheckCircle className="w-4 h-4" />
                <span>{isLoading ? "Salvando..." : "Salvar na Aba Rotina_Dia (Google Sheets)"}</span>
              </button>
            </div>
          </div>

          {/* TABELA DE PACIENTES */}
          {pacientes.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-sm">
              Nenhuma amostra na lista da rotina. Faça o upload da planilha ou use o botão &quot;Carregar Exemplo SUS&quot;.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">Prontuário</th>
                    <th className="py-2.5 px-3">Nome do Paciente</th>
                    <th className="py-2.5 px-3">Idade / Sexo</th>
                    <th className="py-2.5 px-3">Unidade Posto</th>
                    <th className="py-2.5 px-3">Exames de Bancada</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3 text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                  {pacientes
                    .filter((p) => {
                      if (subFiltro === "urina") return p.tem_urina || p.tem_proteinuria_rapida;
                      if (subFiltro === "pso") return p.tem_pso;
                      if (subFiltro === "coagulograma") return p.tem_coagulograma;
                      if (subFiltro === "vdrl") return p.tem_vdrl;
                      if (subFiltro === "testes") return p.tem_beta_hcg;
                      if (subFiltro === "provas") return p.tem_vhs || p.tem_pcr || p.tem_aslo || p.tem_fr;
                      return true;
                    })
                    .map((p) => (
                    <tr key={p.prontuario} className="hover:bg-slate-50/80 transition">
                      <td className="py-2.5 px-3 font-mono font-bold text-sky-800">
                        {p.prontuario}
                      </td>
                      <td className="py-2.5 px-3 font-bold text-slate-900">
                        {p.nome_paciente}
                      </td>
                      <td className="py-2.5 px-3 text-slate-500">{p.idade_sexo}</td>
                      <td className="py-2.5 px-3 text-slate-600">{p.posto_unidade}</td>
                      <td className="py-2.5 px-3">
                        <div className="flex flex-wrap gap-1">
                          {p.tem_urina && (
                            <span className="bg-sky-50 text-sky-800 border border-sky-200 px-2 py-0.5 rounded text-[10px] font-bold">
                              🧪 Urina (EAS)
                            </span>
                          )}
                          {p.tem_pso && (
                            <span className="bg-rose-50 text-rose-800 border border-rose-200 px-2 py-0.5 rounded text-[10px] font-bold">
                              🩸 Sangue Oculto (PSO)
                            </span>
                          )}
                          {!p.tem_urina && !p.tem_pso && (
                            <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[11px] font-mono">
                              {p.exame}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold px-2 py-0.5 rounded-full">
                          {p.status_coleta}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <button
                          type="button"
                          onClick={() => removerItem(p.prontuario)}
                          className="text-slate-400 hover:text-rose-600 p-1 rounded transition"
                          title="Remover"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>

      {/* VISÃO DE IMPRESSÃO A4 (MAPA DE BANCADA) */}
      <div className="hidden print:block">
        <MapaBancadaPrintView
          pacientes={pacientes.filter((p) => {
            if (subFiltro === "urina") return p.tem_urina;
            if (subFiltro === "pso") return p.tem_pso;
            if (subFiltro === "coagulograma") return p.tem_coagulograma;
            if (subFiltro === "vdrl") return p.tem_vdrl;
            if (subFiltro === "testes") return p.tem_beta_hcg || p.tem_proteinuria_rapida;
            if (subFiltro === "provas") return p.tem_pcr || p.tem_aslo || p.tem_fr || p.tem_vhs;
            return true;
          })}
          dataRotina={dataHoje}
          labConfig={labConfig}
        />
      </div>
    </>
  );
}
