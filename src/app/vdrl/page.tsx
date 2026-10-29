"use client";

import React, { useState, useEffect, useMemo } from "react";
import { ItemRotina, LaudoUrina, formatarProntuario } from "@/lib/googleSheets";
import { VALORES_PADRAO_NORMAL } from "@/types/urinalise";
import {
  Package,
  Printer,
  CheckCircle2,
  Search,
  RefreshCw,
  AlertTriangle,
  Calendar,
  Sparkles,
  Layers,
  ArrowRight,
  Eye,
  X,
  FileSpreadsheet,
} from "lucide-react";

export default function LoteVdrlPage() {
  const [rotina, setRotina] = useState<ItemRotina[]>([]);
  const [laudos, setLaudos] = useState<LaudoUrina[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [busca, setBusca] = useState<string>("");
  const [dataRodagem, setDataRodagem] = useState<string>("");
  const [toast, setToast] = useState<{ message: string; type: "success" | "warning" | "error" } | null>(null);

  // Mapa de prontuário -> resultado selecionado ("Não Reagente", "Reagente 1/1", etc.)
  const [titulacoes, setTitulacoes] = useState<Record<string, string>>({});
  // Prontuários selecionados para rodar neste lote
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());
  // Modal de impressão do mapa da bancada
  const [mostrarMapaPrint, setMostrarMapaPrint] = useState<boolean>(false);

  useEffect(() => {
    setDataRodagem(new Date().toISOString().split("T")[0]);
    carregarDados();
  }, []);

  const mostrarNotificacao = (message: string, type: "success" | "warning" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => {
      setToast((prev) => (prev?.message === message ? null : prev));
    }, 4500);
  };

  const carregarDados = async () => {
    setIsLoading(true);
    try {
      const [resRot, resLaudos] = await Promise.all([
        fetch("/api/rotina"),
        fetch("/api/laudos"),
      ]);

      const dataRot = await resRot.json();
      const dataLau = await resLaudos.json();

      const listaRotina: ItemRotina[] = dataRot.ok && Array.isArray(dataRot.rotina) ? dataRot.rotina : [];
      const listaLaudos: LaudoUrina[] = dataLau.ok && Array.isArray(dataLau.laudos) ? dataLau.laudos : [];

      setRotina(listaRotina);
      setLaudos(listaLaudos);

      // Auto-selecionar os que têm VDRL e ainda não foram finalizados
      const prontsPendentes = new Set<string>();
      const titIniciais: Record<string, string> = {};

      listaRotina.forEach((p) => {
        if (!p.tem_vdrl) return;
        const pront = formatarProntuario(p.prontuario);
        const l = listaLaudos.find((la) => formatarProntuario(la.prontuario) === pront);
        const estaFinalizado = l && l.status === "finalizado" && !l.vdrl_acumular_lote && l.resultado_vdrl !== "Aguardando lote semanal";

        if (!estaFinalizado) {
          prontsPendentes.add(pront);
          titIniciais[pront] = (l?.resultado_vdrl && l.resultado_vdrl !== "Aguardando lote semanal") ? l.resultado_vdrl : "Não Reagente";
        }
      });

      setSelecionados(prontsPendentes);
      setTitulacoes(titIniciais);
    } catch (err: any) {
      console.error("Erro ao carregar dados do VDRL:", err);
      mostrarNotificacao("Erro de conexão ao carregar rotina.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  // Filtrar todos os pacientes que têm VDRL solicitado
  const todosVdrl = useMemo(() => {
    return rotina
      .filter((p) => Boolean(p.tem_vdrl))
      .map((p) => {
        const pront = formatarProntuario(p.prontuario);
        const l = laudos.find((la) => formatarProntuario(la.prontuario) === pront);
        const estaAcumulado = Boolean(l?.vdrl_acumular_lote || l?.resultado_vdrl === "Aguardando lote semanal");
        const estaFinalizado = Boolean(l && l.status === "finalizado" && !estaAcumulado);
        return {
          ...p,
          prontuario: pront,
          laudo: l || null,
          estaAcumulado,
          estaFinalizado,
          resultadoGravado: l?.resultado_vdrl || "",
        };
      })
      .sort((a, b) => a.nome_paciente.localeCompare(b.nome_paciente, "pt-BR"));
  }, [rotina, laudos]);

  // Lista com filtro de busca
  const vdrlFiltrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return todosVdrl.filter((p) => {
      if (!q) return true;
      return (
        p.nome_paciente.toLowerCase().includes(q) ||
        p.prontuario.toLowerCase().includes(q) ||
        (p.posto_unidade && p.posto_unidade.toLowerCase().includes(q))
      );
    });
  }, [todosVdrl, busca]);

  const pendentesCount = todosVdrl.filter((p) => !p.estaFinalizado).length;
  const finalizadosCount = todosVdrl.filter((p) => p.estaFinalizado).length;

  // Alternar seleção individual para montagem do dia
  const toggleSelecionado = (pront: string) => {
    setSelecionados((prev) => {
      const novo = new Set(prev);
      if (novo.has(pront)) novo.delete(pront);
      else novo.add(pront);
      return novo;
    });
  };

  // Selecionar todos os pendentes para rodar hoje
  const selecionarTodosPendentes = () => {
    const novo = new Set<string>();
    todosVdrl.forEach((p) => {
      if (!p.estaFinalizado) novo.add(p.prontuario);
    });
    setSelecionados(novo);
  };

  // Desmarcar todos
  const desmarcarTodos = () => {
    setSelecionados(new Set());
  };

  // Definir todos os selecionados como "Não Reagente"
  const definirSelecionadosNaoReagente = () => {
    if (selecionados.size === 0) {
      mostrarNotificacao("Selecione ao menos um paciente para aplicar o resultado.", "warning");
      return;
    }
    const novo = { ...titulacoes };
    selecionados.forEach((pront) => {
      novo[pront] = "Não Reagente";
    });
    setTitulacoes(novo);
    mostrarNotificacao(`${selecionados.size} amostras definidas como 'Não Reagente'. Clique em Salvar Todo o Lote para confirmar no Google Sheets.`, "success");
  };

  // Salvar todo o lote montado
  const salvarLote = async () => {
    if (selecionados.size === 0) {
      mostrarNotificacao("Nenhum paciente selecionado para salvar.", "warning");
      return;
    }
    setIsSaving(true);
    let sucessos = 0;
    try {
      const listaParaSalvar = todosVdrl.filter((p) => selecionados.has(p.prontuario));

      for (const pac of listaParaSalvar) {
        const pront = pac.prontuario;
        const resVdrl = titulacoes[pront] || "Não Reagente";
        const laudoExistente = pac.laudo;

        const payload: Partial<LaudoUrina> = {
          ...(laudoExistente || VALORES_PADRAO_NORMAL),
          prontuario: pront,
          nome_paciente: pac.nome_paciente,
          idade_sexo: pac.idade_sexo || "SUS",
          posto_unidade: pac.posto_unidade || "Conecta SUS",
          solicitante: pac.solicitante || "Conecta SUS",
          status: "finalizado",
          tem_vdrl: true,
          resultado_vdrl: resVdrl,
          vdrl_acumular_lote: false,
          data_hora: laudoExistente?.data_hora || new Date().toISOString(),
        };

        const res = await fetch("/api/laudos", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (data.ok && data.laudo) {
          sucessos++;
          setLaudos((prev) => {
            const idx = prev.findIndex((l) => formatarProntuario(l.prontuario) === pront);
            if (idx >= 0) {
              const copia = [...prev];
              copia[idx] = data.laudo;
              return copia;
            }
            return [data.laudo, ...prev];
          });
        }
      }
      mostrarNotificacao(`Lote concluído com sucesso! ${sucessos} laudos de VDRL salvos e liberados no Google Sheets.`, "success");
      carregarDados();
    } catch (err: any) {
      console.error("Erro ao salvar lote de VDRL:", err);
      mostrarNotificacao(`Erro ao gravar lote: ${err.message}`, "error");
    } finally {
      setIsSaving(false);
    }
  };

  // Salvar individualmente um paciente
  const salvarIndividual = async (pac: typeof todosVdrl[0]) => {
    const pront = pac.prontuario;
    const resVdrl = titulacoes[pront] || "Não Reagente";
    const laudoExistente = pac.laudo;

    try {
      const payload: Partial<LaudoUrina> = {
        ...(laudoExistente || VALORES_PADRAO_NORMAL),
        prontuario: pront,
        nome_paciente: pac.nome_paciente,
        idade_sexo: pac.idade_sexo || "SUS",
        posto_unidade: pac.posto_unidade || "Conecta SUS",
        solicitante: pac.solicitante || "Conecta SUS",
        status: "finalizado",
        tem_vdrl: true,
        resultado_vdrl: resVdrl,
        vdrl_acumular_lote: false,
        data_hora: laudoExistente?.data_hora || new Date().toISOString(),
      };

      const res = await fetch("/api/laudos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.ok && data.laudo) {
        setLaudos((prev) => {
          const idx = prev.findIndex((l) => formatarProntuario(l.prontuario) === pront);
          if (idx >= 0) {
            const copia = [...prev];
            copia[idx] = data.laudo;
            return copia;
          }
          return [data.laudo, ...prev];
        });
        mostrarNotificacao(`VDRL de ${pac.nome_paciente.split(" ")[0]} salvo como '${resVdrl}'!`, "success");
      }
    } catch (err: any) {
      mostrarNotificacao(`Erro ao salvar: ${err.message}`, "error");
    }
  };

  // Marcar para continuar acumulando (outro dia)
  const marcarContinuarAcumulado = async (pac: typeof todosVdrl[0]) => {
    const pront = pac.prontuario;
    try {
      const payload: Partial<LaudoUrina> = {
        ...(pac.laudo || VALORES_PADRAO_NORMAL),
        prontuario: pront,
        nome_paciente: pac.nome_paciente,
        status: "rascunho",
        tem_vdrl: true,
        resultado_vdrl: "Aguardando lote semanal",
        vdrl_acumular_lote: true,
      };

      await fetch("/api/laudos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      mostrarNotificacao(`VDRL de ${pac.nome_paciente.split(" ")[0]} mantido acumulado para o próximo lote.`, "warning");
      carregarDados();
    } catch (err: any) {
      mostrarNotificacao("Erro ao atualizar status.", "error");
    }
  };

  return (
    <div className="min-h-screen bg-slate-100/90 py-6 px-3 sm:px-6 max-w-7xl mx-auto">
      {/* TOAST FLUTUANTE */}
      {toast && (
        <div className="fixed top-16 right-3 left-3 sm:left-auto z-50 max-w-md animate-in fade-in duration-200">
          <div
            className={`p-3 rounded-xl shadow-lg border text-xs sm:text-sm font-semibold ${
              toast.type === "success"
                ? "bg-emerald-950 text-emerald-50 border-emerald-700"
                : toast.type === "warning"
                ? "bg-amber-950 text-amber-50 border-amber-700"
                : "bg-rose-950 text-rose-50 border-rose-700"
            }`}
          >
            {toast.message}
          </div>
        </div>
      )}

      {/* CABEÇALHO DO LOTE */}
      <div className="bg-white rounded-3xl border border-purple-200 shadow-sm p-6 mb-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-100">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-700 to-indigo-800 text-white flex items-center justify-center shadow-lg shadow-purple-700/20">
              <Package className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-purple-100 text-purple-800">
                  Imunologia & Sorologia SUS
                </span>
                <span className="text-[11px] font-bold text-slate-500">
                  Data de Rodagem: {dataRodagem.split("-").reverse().join("/")}
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight mt-0.5">
                Central de Montagem do Lote de VDRL (Sífilis)
              </h1>
              <p className="text-xs sm:text-sm text-slate-600">
                Junte os soros dos dias anteriores para pipetar a placa, titular e liberar todos de uma vez só.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={carregarDados}
              disabled={isLoading}
              className="px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin text-purple-600" : ""}`} />
              <span>Atualizar</span>
            </button>

            <button
              type="button"
              onClick={() => setMostrarMapaPrint(true)}
              disabled={todosVdrl.length === 0}
              className="px-4 py-2.5 rounded-xl bg-purple-800 hover:bg-purple-900 text-white text-xs font-black transition flex items-center gap-2 cursor-pointer shadow-md shadow-purple-800/20 active:scale-95"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimir Mapa da Placa VDRL</span>
            </button>
          </div>
        </div>

        {/* ESTATÍSTICAS E CONTADORES EM TEMPO REAL */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-6">
          <div className="p-3.5 rounded-2xl bg-purple-50/80 border border-purple-200">
            <span className="text-[10px] font-black uppercase text-purple-900 block">Total de VDRLs</span>
            <span className="text-2xl font-black text-purple-950 font-mono">{todosVdrl.length}</span>
            <span className="text-[10.5px] text-purple-800 block mt-0.5">Cadastrados no sistema</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-amber-50/80 border border-amber-200">
            <span className="text-[10px] font-black uppercase text-amber-900 block">📦 Pendentes / Acumulados</span>
            <span className="text-2xl font-black text-amber-950 font-mono">{pendentesCount}</span>
            <span className="text-[10.5px] text-amber-800 block mt-0.5">Aguardando lote semanal</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-sky-50/80 border border-sky-200">
            <span className="text-[10px] font-black uppercase text-sky-900 block">🎯 Selecionados Hoje</span>
            <span className="text-2xl font-black text-sky-950 font-mono">{selecionados.size}</span>
            <span className="text-[10.5px] text-sky-800 block mt-0.5">Montados para rodagem</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-emerald-50/80 border border-emerald-200">
            <span className="text-[10px] font-black uppercase text-emerald-900 block">✅ Liberados / Finalizados</span>
            <span className="text-2xl font-black text-emerald-950 font-mono">{finalizadosCount}</span>
            <span className="text-[10.5px] text-emerald-800 block mt-0.5">Com laudo pronto</span>
          </div>
        </div>
      </div>

      {/* BARRA DE AÇÕES EM MASSA PARA MONTAR O DIA */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 mb-6 shadow-2xs space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-black uppercase text-slate-700 mr-1">Montar o Lote:</span>
            <button
              type="button"
              onClick={selecionarTodosPendentes}
              className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition cursor-pointer active:scale-95"
            >
              Marcar Todos Pendentes ({pendentesCount})
            </button>
            <button
              type="button"
              onClick={desmarcarTodos}
              className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold transition cursor-pointer active:scale-95"
            >
              Desmarcar Todos
            </button>
          </div>

          {/* AÇÕES DE LANÇAMENTO EM MASSA */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={definirSelecionadosNaoReagente}
              disabled={selecionados.size === 0}
              className="px-3.5 py-2 rounded-xl bg-purple-100 hover:bg-purple-200 text-purple-950 text-xs font-black border border-purple-300 transition flex items-center gap-1.5 disabled:opacity-40 cursor-pointer active:scale-95"
            >
              <Sparkles className="w-3.5 h-3.5 text-purple-700" />
              <span>⚡ Definir Marcados como NÃO REAGENTE</span>
            </button>

            <button
              type="button"
              disabled={isSaving || selecionados.size === 0}
              onClick={salvarLote}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black shadow-md shadow-emerald-600/20 transition flex items-center gap-2 disabled:opacity-40 cursor-pointer active:scale-95"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isSaving ? "Gravando no Sheets..." : `Salvar e Liberar Marcados (${selecionados.size})`}</span>
            </button>
          </div>
        </div>

        {/* CAMPO DE BUSCA RÁPIDA */}
        <div className="relative pt-1 border-t border-slate-100">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-4" />
          <input
            type="text"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Filtrar por nome do paciente, prontuário ou posto de saúde..."
            className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:border-purple-600 transition"
          />
          {busca && (
            <button
              type="button"
              onClick={() => setBusca("")}
              className="absolute right-3 top-3.5 text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* LISTA / TABELA DE PACIENTES COM VDRL */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="text-xs font-bold text-slate-700 uppercase">
            Amostras Cadastradas ({vdrlFiltrados.length})
          </div>
          <div className="text-[11px] text-slate-500 font-medium">
            Selecione as amostras para incluir na rodagem da placa e toque no resultado para titular
          </div>
        </div>

        {vdrlFiltrados.length === 0 ? (
          <div className="p-12 text-center text-slate-500 space-y-2">
            <Package className="w-10 h-10 mx-auto text-slate-300" />
            <p className="font-bold text-sm text-slate-700">Nenhum exame de VDRL encontrado.</p>
            <p className="text-xs">
              Quando você importar uma planilha do Conecta SUS com exames de VDRL, eles aparecerão aqui automaticamente.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {vdrlFiltrados.map((pac, idx) => {
              const pront = pac.prontuario;
              const estaSelecionado = selecionados.has(pront);
              const titAtual = titulacoes[pront] || (pac.resultadoGravado !== "Aguardando lote semanal" ? pac.resultadoGravado : "") || "Não Reagente";

              return (
                <div
                  key={pront + idx}
                  className={`p-4 transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-3.5 ${
                    estaSelecionado ? "bg-purple-50/30" : "bg-white hover:bg-slate-50"
                  }`}
                >
                  {/* ESQUERDA: CHECKBOX DE MONTAGEM + DADOS DO PACIENTE */}
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={estaSelecionado}
                      onChange={() => toggleSelecionado(pront)}
                      className="mt-1 w-4 h-4 text-purple-700 rounded border-slate-300 focus:ring-purple-500 cursor-pointer"
                    />

                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs font-black bg-purple-100 text-purple-900 px-2 py-0.5 rounded">
                          Poço #{idx + 1}
                        </span>
                        <span className="font-mono text-xs font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                          {pront}
                        </span>
                        <span className="font-black text-sm text-slate-900 uppercase">
                          {pac.nome_paciente}
                        </span>

                        {pac.estaFinalizado ? (
                          <span className="text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300 px-2 py-0.5 rounded-full flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" />
                            Liberado ({pac.resultadoGravado})
                          </span>
                        ) : pac.estaAcumulado ? (
                          <span className="text-[10px] font-black bg-amber-100 text-amber-900 border border-amber-300 px-2 py-0.5 rounded-full">
                            📦 Acumulado no Lote
                          </span>
                        ) : (
                          <span className="text-[10px] font-black bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full">
                            ⏳ Pendente
                          </span>
                        )}
                      </div>

                      <div className="text-xs text-slate-500 mt-1 flex items-center gap-3 flex-wrap">
                        <span>Data da Coleta: <strong>{pac.data || pac.data_rotina || "Hoje"}</strong></span>
                        <span>Posto: <strong>{pac.posto_unidade || "Conecta SUS"}</strong></span>
                        {pac.idade_sexo && <span>Idade: <strong>{pac.idade_sexo}</strong></span>}
                      </div>
                    </div>
                  </div>

                  {/* DIREITA: SELEÇÃO DA TITULAÇÃO & BOTÕES DE AÇÃO */}
                  <div className="flex items-center gap-1.5 flex-wrap self-end lg:self-center">
                    <span className="text-[10px] font-bold text-slate-400 uppercase mr-1">Titulação:</span>
                    {[
                      { label: "Não Reagente", val: "Não Reagente", cor: "bg-emerald-50 text-emerald-800 border-emerald-300" },
                      { label: "1:1", val: "Reagente 1/1", cor: "bg-purple-50 text-purple-900 border-purple-300" },
                      { label: "1:2", val: "Reagente 1/2", cor: "bg-purple-50 text-purple-900 border-purple-300" },
                      { label: "1:4", val: "Reagente 1/4", cor: "bg-purple-50 text-purple-900 border-purple-300" },
                      { label: "1:8", val: "Reagente 1/8", cor: "bg-purple-50 text-purple-900 border-purple-300" },
                      { label: "1:16", val: "Reagente 1/16", cor: "bg-purple-50 text-purple-900 border-purple-300" },
                      { label: "1:32", val: "Reagente 1/32", cor: "bg-purple-50 text-purple-900 border-purple-300" },
                      { label: "1:64", val: "Reagente 1/64", cor: "bg-purple-50 text-purple-900 border-purple-300" },
                    ].map((chip) => {
                      const ativo = titAtual === chip.val;
                      return (
                        <button
                          key={chip.val}
                          type="button"
                          onClick={() => {
                            setTitulacoes((prev) => ({ ...prev, [pront]: chip.val }));
                            if (!estaSelecionado) toggleSelecionado(pront);
                          }}
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition cursor-pointer active:scale-95 ${
                            ativo
                              ? "bg-purple-800 text-white border-purple-800 shadow-sm font-black"
                              : `${chip.cor} hover:opacity-85`
                          }`}
                        >
                          {chip.label}
                        </button>
                      );
                    })}

                    <div className="flex items-center gap-1 ml-2">
                      <button
                        type="button"
                        onClick={() => salvarIndividual(pac)}
                        className="px-3 py-1 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-lg cursor-pointer active:scale-95 transition"
                        title="Salvar apenas este paciente com a titulação escolhida"
                      >
                        Salvar
                      </button>

                      {!pac.estaFinalizado && (
                        <button
                          type="button"
                          onClick={() => marcarContinuarAcumulado(pac)}
                          className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-bold rounded-lg cursor-pointer active:scale-95"
                          title="Manter guardado no refrigerador para fazer em outro dia"
                        >
                          📦 Acumular
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* MODAL DE PRÉVIA & IMPRESSÃO DO MAPA DE BANCADA DA PLACA VDRL */}
      {mostrarMapaPrint && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 print:hidden">
          <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden border border-slate-300">
            <div className="p-4 bg-purple-950 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Printer className="w-5 h-5 text-purple-300" />
                <div>
                  <h3 className="font-bold text-sm">
                    Mapa de Bancada — Lote de VDRL (Ordem da Placa / Tubos)
                  </h3>
                  <p className="text-[11px] text-purple-200">
                    Folha para o técnico colocar na bancada e anotar as leituras da placa de Kline
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm active:scale-95 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Imprimir Agora</span>
                </button>
                <button
                  type="button"
                  onClick={() => setMostrarMapaPrint(false)}
                  className="p-1.5 hover:bg-white/10 rounded-xl text-slate-300 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 bg-slate-100">
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-300 max-w-3xl mx-auto font-sans text-black">
                {/* Cabeçalho do Mapa Impresso */}
                <div className="text-center border-b-2 border-black pb-3 mb-4">
                  <div className="text-xs font-black uppercase tracking-wider">
                    SISTEMA ÚNICO DE SAÚDE - SUS | REDE MUNICIPAL DE SAÚDE
                  </div>
                  <h2 className="text-base font-black uppercase mt-1">
                    MAPA DE BANCADA — LOTE SEMANAL DE VDRL (SÍFILIS)
                  </h2>
                  <div className="text-xs text-slate-700 mt-0.5 flex items-center justify-center gap-4">
                    <span>Data da Rodagem: <strong>{dataRodagem.split("-").reverse().join("/")}</strong></span>
                    <span>Total de Amostras: <strong>{todosVdrl.length}</strong></span>
                  </div>
                </div>

                {/* Tabela de Pipetagem da Placa */}
                <table className="w-full border-collapse border border-black text-xs">
                  <thead>
                    <tr className="bg-slate-200 border-b border-black text-[10px] uppercase font-bold text-center">
                      <th className="border border-black p-1.5 w-12">Poço #</th>
                      <th className="border border-black p-1.5 w-24">Prontuário</th>
                      <th className="border border-black p-1.5 text-left">Paciente</th>
                      <th className="border border-black p-1.5 w-20">Data Coleta</th>
                      <th className="border border-black p-1.5 w-28">Triagem (R / NR)</th>
                      <th className="border border-black p-1.5 w-32">Titulação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* Controles de Qualidade */}
                    <tr className="bg-purple-50/60 font-bold">
                      <td className="border border-black p-1.5 text-center font-mono">C+</td>
                      <td className="border border-black p-1.5 text-center font-mono">CONTROLE</td>
                      <td className="border border-black p-1.5">CONTROLE POSITIVO (PADRÃO REAGENTE)</td>
                      <td className="border border-black p-1.5 text-center">-</td>
                      <td className="border border-black p-1.5 text-center">REAGENTE</td>
                      <td className="border border-black p-1.5 text-center">1/4 ou 1/8</td>
                    </tr>
                    <tr className="bg-purple-50/60 font-bold">
                      <td className="border border-black p-1.5 text-center font-mono">C-</td>
                      <td className="border border-black p-1.5 text-center font-mono">CONTROLE</td>
                      <td className="border border-black p-1.5">CONTROLE NEGATIVO (PADRÃO NÃO REAGENTE)</td>
                      <td className="border border-black p-1.5 text-center">-</td>
                      <td className="border border-black p-1.5 text-center">NÃO REAGENTE</td>
                      <td className="border border-black p-1.5 text-center">-</td>
                    </tr>

                    {/* Amostras dos Pacientes */}
                    {todosVdrl.map((p, i) => {
                      const res = titulacoes[p.prontuario] || (p.resultadoGravado !== "Aguardando lote semanal" ? p.resultadoGravado : "") || "";
                      return (
                        <tr key={p.prontuario + i} className={i % 2 === 1 ? "bg-slate-50" : "bg-white"}>
                          <td className="border border-black p-2 text-center font-black font-mono">
                            #{i + 1}
                          </td>
                          <td className="border border-black p-2 text-center font-mono font-bold">
                            {p.prontuario}
                          </td>
                          <td className="border border-black p-2 font-bold uppercase">
                            {p.nome_paciente}
                          </td>
                          <td className="border border-black p-2 text-center font-mono text-[11px]">
                            {p.data || p.data_rotina || "-"}
                          </td>
                          <td className="border border-black p-2 text-center font-bold">
                            {res.toLowerCase().includes("reagente 1") ? "REAGENTE" : res || "___________"}
                          </td>
                          <td className="border border-black p-2 text-center font-mono font-black">
                            {res || "___________"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                {/* Rodapé do Mapa */}
                <div className="mt-8 pt-4 border-t border-slate-300 flex items-center justify-between text-xs text-slate-600">
                  <div>Técnico Responsável: ___________________________</div>
                  <div>Data: ____/____/________</div>
                  <div>Visto Resp. Técnica: ___________________________</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
