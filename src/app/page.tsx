"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  LaudoUrina,
  RotinaItem,
  StatusLaudo,
  VALORES_PADRAO_NORMAL,
} from "@/types/urinalise";
import { QuickChipSelect } from "@/components/QuickChipSelect";
import { StatusBadge } from "@/components/StatusBadge";
import { RelatorioBancadaDiaPrintView } from "@/components/RelatorioBancadaDiaPrintView";
import {
  Scan,
  UserCheck,
  CheckCircle2,
  AlertTriangle,
  Save,
  RotateCcw,
  Sparkles,
  ClipboardList,
  Search,
  Check,
  ListOrdered,
  ArrowRight,
  FlaskConical,
  Clock,
  UploadCloud,
  FileSpreadsheet,
  RefreshCw,
  Printer,
  Monitor,
  Smartphone,
  CheckCircle,
  Boxes,
  Table,
} from "lucide-react";

export default function BancadaPage() {
  const prontuarioInputRef = useRef<HTMLInputElement>(null);

  // Estados principais
  const [modoTela, setModoTela] = useState<"desktop" | "mobile">("desktop");
  const [bancadaAtiva, setBancadaAtiva] = useState<"urina" | "imuno" | "coag" | "pso">("urina");
  const [rotinaDia, setRotinaDia] = useState<RotinaItem[]>([]);
  const [laudosDia, setLaudosDia] = useState<LaudoUrina[]>([]);
  const [modoRelatorio, setModoRelatorio] = useState<"caixas" | "tabela">("caixas");
  const [dataHoje, setDataHoje] = useState<string>("");
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [prontuario, setProntuario] = useState<string>("");
  const [pacienteInfo, setPacienteInfo] = useState<RotinaItem | null>(null);
  const [mostrarSugestoes, setMostrarSugestoes] = useState<boolean>(false);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: "success" | "warning" | "error" } | null>(null);

  // Form de Laudo
  const [form, setForm] = useState<Omit<LaudoUrina, "prontuario" | "nome_paciente">>({
    data_hora: "",
    ...VALORES_PADRAO_NORMAL,
    observacoes: "",
    status: "finalizado",
  });

  // Estados de PSO (Pesquisa de Sangue Oculto)
  const [temPso, setTemPso] = useState<boolean>(false);
  const [resultadoPso, setResultadoPso] = useState<string>("Negativo");
  const [obsPso, setObsPso] = useState<string>("");

  // Estados de Testes Rápidos e Provas de Bancada
  const [temBetaHcg, setTemBetaHcg] = useState<boolean>(false);
  const [resultadoBetaHcg, setResultadoBetaHcg] = useState<string>("Negativo");

  const [temVhs, setTemVhs] = useState<boolean>(false);
  const [resultadoVhs, setResultadoVhs] = useState<string>("10 mm/1ª hora");

  const [temVdrl, setTemVdrl] = useState<boolean>(false);
  const [resultadoVdrl, setResultadoVdrl] = useState<string>("Não Reagente");
  const [vdrlAcumularLote, setVdrlAcumularLote] = useState<boolean>(false);

  const [temProvasInflamatorias, setTemProvasInflamatorias] = useState<boolean>(false);
  const [resultadoPcr, setResultadoPcr] = useState<string>("Negativo (< 6 mg/L)");
  const [resultadoAslo, setResultadoAslo] = useState<string>("Negativo (< 200 UI/mL)");
  const [resultadoFr, setResultadoFr] = useState<string>("Negativo (< 8 UI/mL)");

  const [temCoagulograma, setTemCoagulograma] = useState<boolean>(false);
  const [coagTpTempo, setCoagTpTempo] = useState<string>("12.0 seg");
  const [coagTpInr, setCoagTpInr] = useState<string>("1.00");
  const [coagTtpaTempo, setCoagTtpaTempo] = useState<string>("31.0 seg");
  const [coagTtpaRelacao, setCoagTtpaRelacao] = useState<string>("1.00");
  const [coagRepetido, setCoagRepetido] = useState<boolean>(false);
  const [coagTp1, setCoagTp1] = useState<string>("");
  const [coagTtpa1, setCoagTtpa1] = useState<string>("");

  // Estado de Teste Rápido de Proteinúria (Gestante / Pré-Eclâmpsia)
  const [temProteinuriaRapida, setTemProteinuriaRapida] = useState<boolean>(false);
  const [resultadoProteinuriaRapida, setResultadoProteinuriaRapida] = useState<string>("Negativo");

  // Nome do paciente manual se não vier da rotina
  const [nomeManual, setNomeManual] = useState<string>("");

  // Carregar rotina do dia para alimentar a estante de tubos da bancada
  const carregarRotinaDia = async () => {
    try {
      const res = await fetch("/api/rotina");
      const data = await res.json();
      if (data.ok && Array.isArray(data.rotina)) {
        setRotinaDia(data.rotina);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Carregar exames já concluídos pela bancada para fiscalização ao vivo no PC
  const carregarLaudosDia = async () => {
    try {
      const res = await fetch("/api/laudos-dia");
      const data = await res.json();
      if (data.ok && Array.isArray(data.laudos)) {
        setLaudosDia(data.laudos);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Upload e extração direta de arquivo (PDF do Conecta SUS ou Planilha/CSV) no computador
  const handleUploadArquivo = async (file: File) => {
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("filtrarApenasRealizado", "true");

      const res = await fetch("/api/extrair-arquivo", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!data.ok) {
        showToast(data.error || "Erro ao processar arquivo.", "error");
        return;
      }

      const listaPacientes = data.pacientes || data.pacientesUnificados || [];

      if (!listaPacientes || listaPacientes.length === 0) {
        showToast("Nenhum paciente de bancada encontrado no arquivo.", "warning");
        return;
      }

      // Alimenta imediatamente a fila de pacientes na tela
      setRotinaDia(listaPacientes);

      const saveRes = await fetch("/api/rotina", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itens: listaPacientes }),
      });

      const saveData = await saveRes.json();

      if (saveData.ok) {
        showToast(`${listaPacientes.length} pacientes de bancada carregados e sincronizados com sucesso!`, "success");
      } else {
        showToast(`${listaPacientes.length} pacientes carregados na bancada (${saveData.message || "modo local"}).`, "warning");
      }
      await carregarRotinaDia();
      await carregarLaudosDia();
    } catch (err: any) {
      console.error(err);
      showToast("Falha de rede ao enviar arquivo: " + (err.message || ""), "error");
    } finally {
      setIsUploading(false);
    }
  };

  // Inicialização, detecção de tela e sincronização
  useEffect(() => {
    document.title = "Urinálise & Bancada SUS";
    prontuarioInputRef.current?.focus();
    setDataHoje(new Date().toISOString().split("T")[0]);
    carregarRotinaDia();
    carregarLaudosDia();

    if (typeof window !== "undefined") {
      // No computador, entra no modo fiscal/arquivos; no celular, na bancada
      if (window.innerWidth < 768) {
        setModoTela("mobile");
      } else {
        setModoTela("desktop");
      }

      const b = new URLSearchParams(window.location.search).get("bancada");
      if (b === "urina" || b === "imuno" || b === "coag" || b === "pso") {
        setBancadaAtiva(b);
        setModoTela("mobile");
      }
    }
  }, []);

  // Fila sequencial da bancada ativa (ordem exata da estante física de tubos)
  const filaBancada = React.useMemo(() => {
    if (!rotinaDia.length) return [];
    if (bancadaAtiva === "urina") {
      const f = rotinaDia.filter((p) => p.tem_urina || (!p.tem_pso && !p.tem_coagulograma && !p.tem_vdrl));
      return f.length > 0 ? f : rotinaDia;
    }
    if (bancadaAtiva === "imuno") {
      const f = rotinaDia.filter(
        (p) =>
          p.tem_vdrl ||
          p.tem_beta_hcg ||
          p.tem_proteinuria_rapida ||
          p.tem_pcr ||
          p.tem_aslo ||
          p.tem_fr ||
          p.tem_vhs
      );
      return f.length > 0 ? f : rotinaDia;
    }
    if (bancadaAtiva === "coag") {
      const f = rotinaDia.filter((p) => p.tem_coagulograma);
      return f.length > 0 ? f : rotinaDia;
    }
    if (bancadaAtiva === "pso") {
      const f = rotinaDia.filter((p) => p.tem_pso);
      return f.length > 0 ? f : rotinaDia;
    }
    return rotinaDia;
  }, [rotinaDia, bancadaAtiva]);

  // Amostra atual na estante de tubos
  const indiceAtual = pacienteInfo
    ? filaBancada.findIndex((p) => p.prontuario === pacienteInfo.prontuario)
    : -1;
  const proximoTubo =
    indiceAtual >= 0 && indiceAtual < filaBancada.length - 1
      ? filaBancada[indiceAtual + 1]
      : null;

  // Sugestões de busca rápida por prontuário ou nome
  const sugestoesBusca = React.useMemo(() => {
    const q = prontuario.trim().toLowerCase();
    if (!q || q.length < 2) return [];
    return rotinaDia
      .filter(
        (p) =>
          p.prontuario.toLowerCase().includes(q) ||
          p.nome_paciente.toLowerCase().includes(q)
      )
      .slice(0, 5);
  }, [rotinaDia, prontuario]);

  const selecionarPaciente = async (p: RotinaItem) => {
    setProntuario(p.prontuario);
    setMostrarSugestoes(false);
    await buscarPaciente(p.prontuario);
  };

  // Fechar toast automaticamente
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 3500);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  const showToast = (text: string, type: "success" | "warning" | "error" = "success") => {
    setToastMessage({ text, type });
  };

  // Buscar paciente na rotina pelo prontuário ou nome
  const buscarPaciente = async (codProntuario: string) => {
    if (!codProntuario.trim()) return;

    setIsSearching(true);
    setMostrarSugestoes(false);
    try {
      const res = await fetch(`/api/paciente?busca=${encodeURIComponent(codProntuario.trim())}`);
      const data = await res.json();

      if (data.ok && data.encontrado) {
        if (data.paciente) {
          setPacienteInfo(data.paciente);
          setNomeManual(data.paciente.nome_paciente);

          const exUpper = (data.paciente.exame || "").toUpperCase();
          setTemPso(Boolean(data.paciente.tem_pso || exUpper.includes("PSO") || exUpper.includes("SANGUE OCULTO") || exUpper.includes("SOF")));
          setTemBetaHcg(Boolean(data.paciente.tem_beta_hcg || exUpper.includes("BETA") || exUpper.includes("HCG") || exUpper.includes("TIG")));
          setTemVhs(Boolean(data.paciente.tem_vhs || exUpper.includes("VHS") || exUpper.includes("HEMOSSEDIMENTA")));
          setTemVdrl(Boolean(data.paciente.tem_vdrl || exUpper.includes("VDRL") || exUpper.includes("SIFILIS")));
          setTemProvasInflamatorias(Boolean(data.paciente.tem_pcr || data.paciente.tem_aslo || data.paciente.tem_fr || exUpper.includes("PCR") || exUpper.includes("ASLO") || exUpper.includes("REUMATOIDE") || exUpper.includes("LATEX")));
          setTemCoagulograma(Boolean(data.paciente.tem_coagulograma || exUpper.includes("COAGULO") || exUpper.includes("TAP") || exUpper.includes("TTPA") || exUpper.includes("INR")));
          setTemProteinuriaRapida(Boolean(data.paciente.tem_proteinuria_rapida || exUpper.includes("PROTEINURIA") || exUpper.includes("PROT RAP") || exUpper.includes("PRE-ECLAMPSIA")));
        }

        // Se já tinha laudo prévio ou rascunho salvo, carrega os dados
        if (data.laudoExistente) {
          const l: LaudoUrina = data.laudoExistente;
          if (l.tem_pso || l.resultado_pso) {
            setTemPso(true);
            setResultadoPso(l.resultado_pso || "Negativo");
            setObsPso(l.obs_pso || "");
          }
          if (l.tem_beta_hcg || l.resultado_beta_hcg) {
            setTemBetaHcg(true);
            setResultadoBetaHcg(l.resultado_beta_hcg || "Negativo");
          }
          if (l.tem_vhs || l.resultado_vhs) {
            setTemVhs(true);
            setResultadoVhs(l.resultado_vhs || "10 mm/1ª hora");
          }
          if (l.tem_vdrl || l.resultado_vdrl) {
            setTemVdrl(true);
            setResultadoVdrl(l.resultado_vdrl || "Não Reagente");
            setVdrlAcumularLote(Boolean(l.vdrl_acumular_lote || l.resultado_vdrl === "Aguardando lote semanal"));
          }
          if (l.tem_pcr || l.resultado_pcr || l.resultado_aslo || l.resultado_fr) {
            setTemProvasInflamatorias(true);
            setResultadoPcr(l.resultado_pcr || "Negativo (< 6 mg/L)");
            setResultadoAslo(l.resultado_aslo || "Negativo (< 200 UI/mL)");
            setResultadoFr(l.resultado_fr || "Negativo (< 8 UI/mL)");
          }
          if (l.tem_coagulograma || l.tp_tempo || l.tp_inr) {
            setTemCoagulograma(true);
            setCoagTpTempo(l.tp_tempo || "12.0 seg");
            setCoagTpInr(l.tp_inr || "1.00");
            setCoagTtpaTempo(l.ttpa_tempo || "31.0 seg");
            setCoagTtpaRelacao(l.ttpa_relacao || "1.00");
            setCoagRepetido(Boolean(l.coagulograma_repetido));
            setCoagTp1(l.coagulograma_tp_1 || "");
            setCoagTtpa1(l.coagulograma_ttpa_1 || "");
          }
          if (l.tem_proteinuria_rapida || l.resultado_proteinuria_rapida) {
            setTemProteinuriaRapida(true);
            setResultadoProteinuriaRapida(l.resultado_proteinuria_rapida || "Negativo");
          }
          setForm({
            data_hora: l.data_hora || new Date().toISOString(),
            cor: l.cor || VALORES_PADRAO_NORMAL.cor,
            aspecto: l.aspecto || VALORES_PADRAO_NORMAL.aspecto,
            densidade: l.densidade || VALORES_PADRAO_NORMAL.densidade,
            ph: l.ph || VALORES_PADRAO_NORMAL.ph,
            proteina: l.proteina || VALORES_PADRAO_NORMAL.proteina,
            glicose: l.glicose || VALORES_PADRAO_NORMAL.glicose,
            cetona: l.cetona || VALORES_PADRAO_NORMAL.cetona,
            bilirrubina: l.bilirrubina || VALORES_PADRAO_NORMAL.bilirrubina,
            urobilinogenio: l.urobilinogenio || VALORES_PADRAO_NORMAL.urobilinogenio,
            sangue: l.sangue || VALORES_PADRAO_NORMAL.sangue,
            nitrito: l.nitrito || VALORES_PADRAO_NORMAL.nitrito,
            leucocitos_fita: l.leucocitos_fita || VALORES_PADRAO_NORMAL.leucocitos_fita,
            celulas_epiteliais: l.celulas_epiteliais || VALORES_PADRAO_NORMAL.celulas_epiteliais,
            leucocitos_campo: l.leucocitos_campo || VALORES_PADRAO_NORMAL.leucocitos_campo,
            hemacias_campo: l.hemacias_campo || VALORES_PADRAO_NORMAL.hemacias_campo,
            bacterias: l.bacterias || VALORES_PADRAO_NORMAL.bacterias,
            cristais: l.cristais || VALORES_PADRAO_NORMAL.cristais,
            cilindros: l.cilindros || VALORES_PADRAO_NORMAL.cilindros,
            observacoes: l.observacoes || "",
            status: l.status || "rascunho",
          });
          showToast(`Laudo anterior carregado (${l.status})`, "warning");
        } else {
          showToast(`Paciente localizado: ${data.paciente.nome_paciente}`, "success");
        }
      } else {
        setPacienteInfo(null);
        showToast("Prontuário não cadastrado na rotina de hoje. Preencha o nome do paciente.", "warning");
      }
    } catch (err) {
      console.error(err);
      showToast("Erro ao consultar prontuário no servidor", "error");
    } finally {
      setIsSearching(false);
    }
  };

  const handleProntuarioKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      buscarPaciente(prontuario);
    }
  };

  const handleProntuarioBlur = () => {
    if (prontuario.trim() && !pacienteInfo) {
      buscarPaciente(prontuario);
    }
  };

  // Salvar laudo com determinado status
  const handleSalvar = async (statusEscolhido: StatusLaudo) => {
    const nomeFinal = pacienteInfo?.nome_paciente || nomeManual.trim();

    if (!prontuario.trim()) {
      showToast("Digite ou bipe o número do prontuário!", "error");
      prontuarioInputRef.current?.focus();
      return;
    }

    if (!nomeFinal) {
      showToast("Informe o nome do paciente antes de salvar!", "error");
      return;
    }

    setIsSaving(true);
    try {
      const payload: LaudoUrina = {
        prontuario: prontuario.trim(),
        nome_paciente: nomeFinal,
        idade_sexo: pacienteInfo?.idade_sexo || "",
        posto_unidade: pacienteInfo?.posto_unidade || "",
        solicitante: pacienteInfo?.solicitante || "",
        tem_pso: temPso,
        resultado_pso: temPso ? resultadoPso : undefined,
        obs_pso: temPso ? obsPso : undefined,
        tem_beta_hcg: temBetaHcg,
        resultado_beta_hcg: temBetaHcg ? resultadoBetaHcg : undefined,
        tem_vhs: temVhs,
        resultado_vhs: temVhs ? resultadoVhs : undefined,
        tem_vdrl: temVdrl,
        resultado_vdrl: temVdrl ? (vdrlAcumularLote ? "Aguardando lote semanal" : resultadoVdrl) : undefined,
        vdrl_acumular_lote: temVdrl ? vdrlAcumularLote : undefined,
        tem_pcr: temProvasInflamatorias,
        resultado_pcr: temProvasInflamatorias ? resultadoPcr : undefined,
        tem_aslo: temProvasInflamatorias,
        resultado_aslo: temProvasInflamatorias ? resultadoAslo : undefined,
        tem_fr: temProvasInflamatorias,
        resultado_fr: temProvasInflamatorias ? resultadoFr : undefined,
        tem_coagulograma: temCoagulograma,
        tp_tempo: temCoagulograma ? coagTpTempo : undefined,
        tp_inr: temCoagulograma ? coagTpInr : undefined,
        ttpa_tempo: temCoagulograma ? coagTtpaTempo : undefined,
        ttpa_relacao: temCoagulograma ? coagTtpaRelacao : undefined,
        coagulograma_repetido: temCoagulograma ? coagRepetido : undefined,
        coagulograma_tp_1: temCoagulograma && coagRepetido ? coagTp1 : undefined,
        coagulograma_ttpa_1: temCoagulograma && coagRepetido ? coagTtpa1 : undefined,
        coagulograma_nota_repeticao: temCoagulograma && coagRepetido ? "Exame repetido e confirmado em duplicata técnica nesta mesma amostra." : undefined,
        tem_proteinuria_rapida: temProteinuriaRapida,
        resultado_proteinuria_rapida: temProteinuriaRapida ? resultadoProteinuriaRapida : undefined,
        ...form,
        data_hora: new Date().toISOString(),
        status: statusEscolhido,
      };

      const res = await fetch("/api/salvar-laudo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (data.ok) {
        // Atualiza a rotina local para marcar que este paciente tem laudo
        setRotinaDia((prev) =>
          prev.map((p) =>
            p.prontuario === payload.prontuario ? { ...p, tem_laudo: true } : p
          )
        );

        if (statusEscolhido === "finalizado") {
          if (proximoTubo) {
            showToast(
              `Tubo #${indiceAtual + 1} finalizado! Avançando para Tubo #${indiceAtual + 2}: ${proximoTubo.nome_paciente}`,
              "success"
            );
            await selecionarPaciente(proximoTubo);
            return;
          } else {
            showToast(`Amostra ${prontuario} finalizada com sucesso! Toda a bancada foi concluída!`, "success");
            limparFormulario();
          }
        } else if (statusEscolhido === "recoleta") {
          showToast(`Amostra ${prontuario} sinalizada para RECOLETA!`, "warning");
          limparFormulario();
        } else {
          showToast(`Rascunho de ${prontuario} salvo com sucesso!`, "success");
        }
      } else {
        showToast(`Erro ao salvar: ${data.message || data.error}`, "error");
      }
    } catch (err: any) {
      console.error(err);
      showToast("Falha de rede ao salvar laudo.", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const limparFormulario = () => {
    setProntuario("");
    setPacienteInfo(null);
    setNomeManual("");
    setTemPso(false);
    setResultadoPso("Negativo");
    setObsPso("");
    setTemBetaHcg(false);
    setResultadoBetaHcg("Negativo");
    setTemVhs(false);
    setResultadoVhs("10 mm/1ª hora");
    setTemVdrl(false);
    setResultadoVdrl("Não Reagente");
    setVdrlAcumularLote(false);
    setTemProvasInflamatorias(false);
    setResultadoPcr("Negativo (< 6 mg/L)");
    setResultadoAslo("Negativo (< 200 UI/mL)");
    setResultadoFr("Negativo (< 8 UI/mL)");
    setTemCoagulograma(false);
    setCoagTpTempo("12.0 seg");
    setCoagTpInr("1.00");
    setCoagTtpaTempo("31.0 seg");
    setCoagTtpaRelacao("1.00");
    setCoagRepetido(false);
    setCoagTp1("");
    setCoagTtpa1("");
    setTemProteinuriaRapida(false);
    setResultadoProteinuriaRapida("Negativo");
    setForm({
      data_hora: "",
      ...VALORES_PADRAO_NORMAL,
      observacoes: "",
      status: "finalizado",
    });
    // Auto-focus no prontuário para o próximo paciente
    setTimeout(() => {
      prontuarioInputRef.current?.focus();
    }, 100);
  };

  const aplicarFraseObservacao = (frase: string) => {
    setForm((prev) => ({
      ...prev,
      observacoes: prev.observacoes ? `${prev.observacoes} ${frase}` : frase,
    }));
  };

  return (
    <div className="min-h-screen bg-slate-100/70 pb-32">
      {/* Toast flutuante sutil */}
      {toastMessage && (
        <div
          className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-xl text-sm font-semibold text-white transition-all transform animate-bounce-short ${
            toastMessage.type === "success"
              ? "bg-emerald-600 shadow-emerald-500/30"
              : toastMessage.type === "warning"
              ? "bg-amber-600 shadow-amber-500/30"
              : "bg-rose-600 shadow-rose-500/30"
          }`}
        >
          {toastMessage.type === "success" && <Check className="w-5 h-5" />}
          {toastMessage.type === "warning" && <AlertTriangle className="w-5 h-5" />}
          {toastMessage.type === "error" && <AlertTriangle className="w-5 h-5" />}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* SELETOR DE MODO: COMPUTADOR (PAINEL FISCAL & ARQUIVOS) vs CELULAR (BANCADA COM LUVAS) */}
      <div className="max-w-6xl mx-auto px-3 sm:px-6 pt-3 pb-1 print:hidden flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 mb-2">
        <div className="flex items-center gap-1 bg-white border border-slate-300 rounded-xl p-1 shadow-2xs">
          <button
            type="button"
            onClick={() => setModoTela("desktop")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
              modoTela === "desktop"
                ? "bg-slate-900 text-white shadow-2xs"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <Monitor className="w-3.5 h-3.5" />
            <span>🖥️ Computador (Painel Fiscal & Arquivos)</span>
          </button>
          <button
            type="button"
            onClick={() => setModoTela("mobile")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
              modoTela === "mobile"
                ? "bg-sky-700 text-white shadow-2xs"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>📱 Celular (Bancada com Luvas)</span>
          </button>
        </div>

        {modoTela === "desktop" && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                carregarRotinaDia();
                carregarLaudosDia();
                showToast("Dados atualizados da bancada!", "success");
              }}
              className="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-xl shadow-2xs transition flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Atualizar</span>
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              disabled={rotinaDia.length === 0 && laudosDia.length === 0}
              className="px-4 py-1.5 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-40 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center gap-1.5"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimir Relatório do Dia (Caixas Menores)</span>
            </button>
          </div>
        )}
      </div>

      {modoTela === "desktop" ? (
        /* PAINEL DO COMPUTADOR: GESTÃO FISCAL, SUBIR ARQUIVOS E ACOMPANHAR BANCADA AO VIVO */
        <div className="max-w-6xl mx-auto px-3 sm:px-6 pt-3 pb-20 print:hidden space-y-4">
          {/* CABEÇALHO DO COMPUTADOR */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
                  <h1 className="text-xl font-black text-slate-900 tracking-tight">
                    Painel Fiscal & Gestão de Bancada
                  </h1>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Suba o arquivo bruto do Conecta SUS, acompanhe o progresso da bancada em tempo real e imprima o relatório em caixas menores para anexar junto às requisições.
                </p>
              </div>

              {/* Indicadores em Tempo Real */}
              <div className="flex items-center gap-3">
                <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-center">
                  <div className="text-xl font-black text-slate-900">{rotinaDia.length}</div>
                  <div className="text-[10px] font-bold text-slate-500 uppercase">Total Amostras</div>
                </div>
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-2 text-center">
                  <div className="text-xl font-black text-emerald-800">
                    {rotinaDia.filter((p) => p.tem_laudo || laudosDia.some((l) => l.prontuario === p.prontuario)).length}
                  </div>
                  <div className="text-[10px] font-bold text-emerald-700 uppercase">Concluídas</div>
                </div>
                <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-2 text-center">
                  <div className="text-xl font-black text-amber-800">
                    {rotinaDia.filter((p) => !p.tem_laudo && !laudosDia.some((l) => l.prontuario === p.prontuario)).length}
                  </div>
                  <div className="text-[10px] font-bold text-amber-700 uppercase">Pendentes</div>
                </div>
              </div>
            </div>

            {/* SEÇÃO DE SUBIR ARQUIVOS (PDF OU PLANILHA SUS) */}
            <div className="mt-4 p-5 bg-gradient-to-r from-sky-50 to-slate-50 border-2 border-dashed border-sky-300 rounded-2xl text-center">
              <UploadCloud className="w-8 h-8 text-sky-600 mx-auto mb-2" />
              <h3 className="font-bold text-sm text-slate-900">
                Subir Arquivo de Coletas do Dia (PDF ou Planilha Conecta SUS)
              </h3>
              <p className="text-xs text-slate-500 max-w-lg mx-auto mt-1 mb-3">
                O sistema lê o arquivo, ignora exames automatizados de rotina e extrai diretamente Urina, PSO, VDRL, Coagulograma e Testes Rápidos.
              </p>
              <label className="inline-flex items-center gap-2 px-5 py-2.5 bg-sky-700 hover:bg-sky-800 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer transition active:scale-95">
                <FileSpreadsheet className="w-4 h-4" />
                <span>{isUploading ? "Processando e Enviando..." : "Selecionar Arquivo (PDF ou Excel)"}</span>
                <input
                  type="file"
                  accept=".pdf,.xlsx,.xls,.csv"
                  disabled={isUploading}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleUploadArquivo(f);
                    e.target.value = "";
                  }}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {/* TABELA DE ACOMPANHAMENTO DA BANCADA (EM TEMPO REAL) */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h2 className="font-black text-sm text-slate-900 uppercase tracking-wide">
                  Acompanhamento Fiscal dos Exames (Ao Vivo)
                </h2>
                <p className="text-xs text-slate-500">
                  Conforme a equipe salva os exames pelo celular, os resultados aparecem aqui para conferência e digitação
                </p>
              </div>
              <div className="text-xs font-semibold text-slate-500">
                {rotinaDia.length} paciente(s) na fila
              </div>
            </div>

            {rotinaDia.length === 0 ? (
              <div className="p-12 text-center text-slate-400">
                <FileSpreadsheet className="w-12 h-12 mx-auto mb-3 opacity-40" />
                <p className="font-bold text-sm text-slate-700">Nenhum exame cadastrado na rotina de hoje</p>
                <p className="text-xs mt-1">Suba o arquivo PDF ou planilha do dia na caixa acima para iniciar.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 font-bold uppercase text-[10px] border-b border-slate-200">
                      <th className="py-2.5 px-3 text-center w-12">Tubo</th>
                      <th className="py-2.5 px-3 text-center w-24">Prontuário</th>
                      <th className="py-2.5 px-3">Paciente / Unidade</th>
                      <th className="py-2.5 px-3">Exames Solicitados</th>
                      <th className="py-2.5 px-3 text-center w-32">Status Bancada</th>
                      <th className="py-2.5 px-3">Resultados Realizados</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {rotinaDia.map((item, idx) => {
                      const laudoGravado = laudosDia.find(
                        (l) => l.prontuario === item.prontuario
                      );
                      const isConcluido = item.tem_laudo || Boolean(laudoGravado);

                      return (
                        <tr key={item.prontuario + idx} className="hover:bg-slate-50/80 transition">
                          <td className="py-2.5 px-3 text-center font-bold text-slate-700">
                            #{idx + 1}
                          </td>
                          <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-900">
                            {item.prontuario}
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="font-bold text-slate-900">{item.nome_paciente}</div>
                            <div className="text-[10.5px] text-slate-500">
                              {item.idade_sexo} • {item.posto_unidade}
                            </div>
                          </td>
                          <td className="py-2.5 px-3 text-slate-700">
                            <span className="font-semibold">{item.exame}</span>
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            {isConcluido ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">
                                <Check className="w-3 h-3" /> Concluído
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-600">
                                <Clock className="w-3 h-3" /> Aguardando
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-slate-800 font-mono text-[11px]">
                            {laudoGravado ? (
                              <div className="space-y-0.5">
                                <div>
                                  <span className="font-bold text-sky-800">Urina:</span>{" "}
                                  D: {laudoGravado.densidade || "1.020"} | pH: {laudoGravado.ph || "6.0"} | Prot: {laudoGravado.proteina || "Neg"} | Leu: {laudoGravado.leucocitos_campo || "1-3 p/c"}
                                </div>
                                {(laudoGravado.resultado_pso || laudoGravado.resultado_vdrl || laudoGravado.tp_tempo) && (
                                  <div className="text-[10px] text-slate-600">
                                    {[
                                      laudoGravado.resultado_pso ? `PSO: ${laudoGravado.resultado_pso}` : null,
                                      laudoGravado.resultado_vdrl ? `VDRL: ${laudoGravado.resultado_vdrl}` : null,
                                      laudoGravado.resultado_beta_hcg ? `Beta: ${laudoGravado.resultado_beta_hcg}` : null,
                                      laudoGravado.tp_tempo ? `TP: ${laudoGravado.tp_tempo} (${laudoGravado.tp_inr})` : null,
                                    ]
                                      .filter(Boolean)
                                      .join(" • ")}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span className="text-slate-400 italic">Aguardando análise na bancada</span>
                            )}
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
      ) : (
        /* MODO CELULAR: BANCADA OPERACIONAL COM LUVAS */
        <div className="max-w-4xl mx-auto px-3 sm:px-6 pt-4 sm:pt-6">
        {/* SELEÇÃO RÁPIDA DE BANCADA (TABS DE TOQUE RÁPIDO) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
          {[
            { id: "urina", label: "🧪 Urinálise (EAS)", desc: "Fita & Sedimento" },
            { id: "imuno", label: "🔬 Imuno / Rápidos", desc: "VDRL, Beta, VHS" },
            { id: "coag", label: "⏱️ Coagulograma", desc: "TP/INR, TTPA" },
            { id: "pso", label: "💩 Sangue Oculto", desc: "Fezes / PSO" },
          ].map((b) => (
            <button
              key={b.id}
              type="button"
              onClick={() => {
                setBancadaAtiva(b.id as any);
                if (b.id === "coag") setTemCoagulograma(true);
                if (b.id === "pso") setTemPso(true);
                if (b.id === "imuno") {
                  setTemVdrl(true);
                  setTemBetaHcg(true);
                }
              }}
              className={`p-2.5 rounded-xl border text-left transition-all active:scale-95 ${
                bancadaAtiva === b.id
                  ? "bg-sky-700 text-white border-sky-700 shadow-md shadow-sky-700/20"
                  : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50 shadow-xs"
              }`}
            >
              <div className="font-bold text-xs sm:text-sm">{b.label}</div>
              <div className={`text-[10.5px] ${bancadaAtiva === b.id ? "text-sky-200" : "text-slate-500"}`}>
                {b.desc}
              </div>
            </button>
          ))}
        </div>

        {/* ESTANTE SEQUENCIAL DE TUBOS DA BANCADA (CARROSSEL COM ORDEM EXATA DOS TUBOS) */}
        {filaBancada.length > 0 && (
          <div className="mb-4 bg-white rounded-2xl border border-slate-200 shadow-xs p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                <ListOrdered className="w-4 h-4 text-sky-600" />
                <span>Estante de Tubos ({filaBancada.length} amostras na fila)</span>
              </div>
              <span className="text-[11px] text-slate-500 font-medium">
                Toque no tubo para carregar
              </span>
            </div>
            <div className="flex items-center gap-2 overflow-x-auto pb-1.5 scrollbar-thin">
              {filaBancada.map((item, idx) => {
                const isAtivo = pacienteInfo?.prontuario === item.prontuario;
                return (
                  <button
                    key={item.prontuario + idx}
                    type="button"
                    onClick={() => selecionarPaciente(item)}
                    className={`shrink-0 flex items-center gap-2 px-3 py-2 rounded-xl border text-left transition-all active:scale-95 ${
                      isAtivo
                        ? "bg-sky-600 text-white border-sky-600 shadow-md shadow-sky-600/20"
                        : item.tem_laudo
                        ? "bg-emerald-50 text-emerald-900 border-emerald-300 hover:bg-emerald-100"
                        : "bg-slate-50 text-slate-800 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    <div
                      className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-black ${
                        isAtivo
                          ? "bg-white/20 text-white"
                          : item.tem_laudo
                          ? "bg-emerald-600 text-white"
                          : "bg-slate-200 text-slate-700"
                      }`}
                    >
                      #{idx + 1}
                    </div>
                    <div>
                      <div className="text-xs font-bold truncate max-w-[120px]">
                        {item.nome_paciente.split(" ")[0]} {item.nome_paciente.split(" ")[1] || ""}
                      </div>
                      <div className={`text-[10px] ${isAtivo ? "text-sky-100" : "text-slate-500"}`}>
                        Pront: {item.prontuario}
                      </div>
                    </div>
                    {item.tem_laudo && !isAtivo && (
                      <Check className="w-3.5 h-3.5 text-emerald-600 ml-1" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* CABEÇALHO DO PRONTUÁRIO / BUSCA DUAL (PRONTUÁRIO OU NOME COM AUTOCOMPLETE) */}
        <section className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-4 sm:p-5 mb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <h1 className="text-base sm:text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
                {bancadaAtiva === "urina" && "Bancada de Urinálise (EAS)"}
                {bancadaAtiva === "imuno" && "Bancada de Imunologia & Rápidos (VDRL, Beta, VHS)"}
                {bancadaAtiva === "coag" && "Bancada de Coagulograma (TP/INR & TTPA)"}
                {bancadaAtiva === "pso" && "Bancada de Pesquisa de Sangue Oculto (PSO)"}
              </h1>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={limparFormulario}
                className="text-xs text-slate-500 hover:text-slate-800 font-medium flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition"
                title="Limpar formulário"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Limpar Campos
              </button>
            </div>
          </div>

          {/* INPUT GIGANTE DE BUSCA DUAL COM AUTOCOMPLETE */}
          <div className="mt-4 relative">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Identificação do Tubo (Prontuário ou Nome do Paciente)
            </label>
            <div className="relative flex items-center">
              <div className="absolute left-3.5 text-slate-400">
                <Scan className="w-6 h-6" />
              </div>
              <input
                ref={prontuarioInputRef}
                type="text"
                value={prontuario}
                onChange={(e) => {
                  setProntuario(e.target.value);
                  setMostrarSugestoes(true);
                }}
                onFocus={() => setMostrarSugestoes(true)}
                onKeyDown={handleProntuarioKeyDown}
                onBlur={handleProntuarioBlur}
                placeholder="Bipe o código de barras, digite o prontuário ou nome..."
                className="w-full pl-12 pr-28 py-3.5 text-lg sm:text-xl font-bold font-mono text-slate-900 bg-slate-50 border-2 border-slate-300 rounded-xl focus:border-sky-600 focus:bg-white focus:outline-none transition-all shadow-inner"
              />
              <button
                type="button"
                onClick={() => buscarPaciente(prontuario)}
                disabled={isSearching || !prontuario.trim()}
                className="absolute right-2 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-white font-semibold text-xs rounded-lg transition-all flex items-center gap-1.5"
              >
                <Search className="w-3.5 h-3.5" />
                {isSearching ? "Buscando..." : "Localizar"}
              </button>
            </div>

            {/* DROPDOWN DE AUTOCOMPLETE COM RESULTADOS DA ROTINA */}
            {mostrarSugestoes && sugestoesBusca.length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-slate-300 rounded-xl shadow-xl z-30 overflow-hidden">
                <div className="p-1.5 bg-slate-50 border-b border-slate-200 text-[10.5px] font-bold text-slate-500 uppercase flex items-center justify-between">
                  <span>Pacientes encontrados na rotina de hoje</span>
                  <span>{sugestoesBusca.length} sugestões</span>
                </div>
                <div className="max-h-60 overflow-y-auto divide-y divide-slate-100">
                  {sugestoesBusca.map((sug) => (
                    <button
                      key={sug.prontuario}
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        selecionarPaciente(sug);
                      }}
                      className="w-full px-3.5 py-2.5 text-left hover:bg-sky-50 flex items-center justify-between transition-colors group"
                    >
                      <div>
                        <div className="font-bold text-xs text-slate-900 group-hover:text-sky-800">
                          {sug.nome_paciente}
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono">
                          Prontuário: {sug.prontuario} • {sug.posto_unidade}
                        </div>
                      </div>
                      <span className="text-[11px] font-bold text-sky-700 bg-sky-100 group-hover:bg-sky-200 px-2.5 py-1 rounded-lg flex items-center gap-1">
                        Carregar <ArrowRight className="w-3 h-3" />
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* DADOS DO PACIENTE IDENTIFICADO */}
          {pacienteInfo ? (
            <div className="mt-3.5 p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-emerald-950">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0">
                  <UserCheck className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-black text-sm sm:text-base">
                      {pacienteInfo.nome_paciente}
                    </span>
                    {pacienteInfo.tem_laudo && (
                      <span className="text-[10px] bg-emerald-200 text-emerald-900 font-bold px-1.5 py-0.5 rounded">
                        Já Laudado
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-emerald-800">
                    {pacienteInfo.idade_sexo} • {pacienteInfo.posto_unidade} • {pacienteInfo.solicitante}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-[11px] font-mono font-bold text-emerald-900 bg-emerald-100 px-2 py-1 rounded">
                  {pacienteInfo.exame}
                </span>
              </div>
            </div>
          ) : (
            <div className="mt-3">
              <label className="block text-[11px] font-semibold text-slate-500 uppercase mb-1">
                Nome do Paciente (Caso não conste na rotina importada)
              </label>
              <input
                type="text"
                value={nomeManual}
                onChange={(e) => setNomeManual(e.target.value)}
                placeholder="Ex: Maria José da Silva"
                className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-800 focus:border-sky-500 focus:outline-none"
              />
            </div>
          )}
        </section>

        {/* SEÇÃO 1: EXAME FÍSICO-QUÍMICO (BOTÕES GRANDES DE TOQUE RÁPIDO) */}
        <section className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-4 sm:p-5 mb-4">
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
            <h2 className="text-sm font-black text-slate-800 uppercase tracking-wide flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center text-xs font-bold">
                1
              </span>
              Exame Físico e Químico (Fita Reativa)
            </h2>
            <span className="text-[11px] text-slate-500 font-medium">
              Valores normais pré-selecionados
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* COR */}
            <QuickChipSelect
              label="Cor da Amostra"
              sublabel="Visual"
              value={form.cor}
              onChange={(val) => setForm({ ...form, cor: val })}
              options={[
                { label: "Amarelo Claro", value: "Amarelo claro" },
                { label: "Amarelo Citrino (Normal)", value: "Amarelo citrino" },
                { label: "Amarelo Ouro / Escuro", value: "Amarelo escuro", isAbnormal: true },
                { label: "Âmbar", value: "Âmbar", isAbnormal: true },
                { label: "Avermelhado / Hemático", value: "Avermelhado", isAbnormal: true },
              ]}
            />

            {/* ASPECTO */}
            <QuickChipSelect
              label="Aspecto"
              sublabel="Transparência"
              value={form.aspecto}
              onChange={(val) => setForm({ ...form, aspecto: val })}
              options={[
                { label: "Límpido (Normal)", value: "Límpido" },
                { label: "Ligeiramente Turvo", value: "Ligeiramente turvo", isAbnormal: true },
                { label: "Turvo", value: "Turvo", isAbnormal: true },
              ]}
            />

            {/* DENSIDADE */}
            <QuickChipSelect
              label="Densidade"
              sublabel="Ref: 1.015 - 1.025"
              value={form.densidade}
              onChange={(val) => setForm({ ...form, densidade: val })}
              options={[
                { label: "1.005", value: "1.005", isAbnormal: true },
                { label: "1.010", value: "1.010" },
                { label: "1.015", value: "1.015" },
                { label: "1.020", value: "1.020" },
                { label: "1.025", value: "1.025" },
                { label: "1.030", value: "1.030", isAbnormal: true },
              ]}
            />

            {/* pH */}
            <QuickChipSelect
              label="pH Urinário"
              sublabel="Ref: 5.0 - 7.0"
              value={form.ph}
              onChange={(val) => setForm({ ...form, ph: val })}
              options={[
                { label: "5.0", value: "5.0" },
                { label: "5.5", value: "5.5" },
                { label: "6.0", value: "6.0" },
                { label: "6.5", value: "6.5" },
                { label: "7.0", value: "7.0" },
                { label: "7.5", value: "7.5", isAbnormal: true },
                { label: "8.0", value: "8.0", isAbnormal: true },
              ]}
            />

            {/* PROTEÍNA */}
            <QuickChipSelect
              label="Proteínas (Proteinúria)"
              value={form.proteina}
              onChange={(val) => setForm({ ...form, proteina: val })}
              options={[
                { label: "Negativo", value: "Negativo" },
                { label: "Traços", value: "Traços", isAbnormal: true },
                { label: "(+)", value: "(+)", isAbnormal: true },
                { label: "(++)", value: "(++)", isAbnormal: true },
                { label: "(+++)", value: "(+++)", isAbnormal: true },
              ]}
            />

            {/* GLICOSE */}
            <QuickChipSelect
              label="Glicose (Glicosúria)"
              value={form.glicose}
              onChange={(val) => setForm({ ...form, glicose: val })}
              options={[
                { label: "Negativo", value: "Negativo" },
                { label: "(+)", value: "(+)", isAbnormal: true },
                { label: "(++)", value: "(++)", isAbnormal: true },
                { label: "(+++)", value: "(+++)", isAbnormal: true },
                { label: "(++++)", value: "(++++)", isAbnormal: true },
              ]}
            />

            {/* SANGUE / HEMOGLOBINA */}
            <QuickChipSelect
              label="Sangue / Hemoglobina"
              value={form.sangue}
              onChange={(val) => setForm({ ...form, sangue: val })}
              options={[
                { label: "Negativo", value: "Negativo" },
                { label: "Traços", value: "Traços", isAbnormal: true },
                { label: "(+)", value: "(+)", isAbnormal: true },
                { label: "(++)", value: "(++)", isAbnormal: true },
                { label: "(+++)", value: "(+++)", isAbnormal: true },
              ]}
            />

            {/* NITRITO */}
            <QuickChipSelect
              label="Nitrito (Bacteriúria)"
              value={form.nitrito}
              onChange={(val) => setForm({ ...form, nitrito: val })}
              options={[
                { label: "Negativo", value: "Negativo" },
                { label: "Positivo", value: "Positivo", isAbnormal: true },
              ]}
            />

            {/* LEUCÓCITOS DA FITA */}
            <QuickChipSelect
              label="Leucócitos (Esterase da Fita)"
              value={form.leucocitos_fita}
              onChange={(val) => setForm({ ...form, leucocitos_fita: val })}
              options={[
                { label: "Negativo", value: "Negativo" },
                { label: "Traços", value: "Traços", isAbnormal: true },
                { label: "(+)", value: "(+)", isAbnormal: true },
                { label: "(++)", value: "(++)", isAbnormal: true },
                { label: "(+++)", value: "(+++)", isAbnormal: true },
              ]}
            />

            {/* CORPOS CETÔNICOS */}
            <QuickChipSelect
              label="Corpos Cetônicos"
              value={form.cetona}
              onChange={(val) => setForm({ ...form, cetona: val })}
              options={[
                { label: "Negativo", value: "Negativo" },
                { label: "Traços", value: "Traços", isAbnormal: true },
                { label: "Positivo (+)", value: "Positivo", isAbnormal: true },
              ]}
            />

            {/* BILIRRUBINA */}
            <QuickChipSelect
              label="Bilirrubina"
              value={form.bilirrubina}
              onChange={(val) => setForm({ ...form, bilirrubina: val })}
              options={[
                { label: "Negativo", value: "Negativo" },
                { label: "Positivo (+)", value: "Positivo", isAbnormal: true },
              ]}
            />

            {/* UROBILINOGÊNIO */}
            <QuickChipSelect
              label="Urobilinogênio"
              value={form.urobilinogenio}
              onChange={(val) => setForm({ ...form, urobilinogenio: val })}
              options={[
                { label: "Normal", value: "Normal" },
                { label: "Aumentado", value: "Aumentado", isAbnormal: true },
              ]}
            />
          </div>
        </section>

        {/* SEÇÃO 2: SEDIMENTOSCOPIA / MICROSCOPIA ÓPTICA */}
        <section className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-4 sm:p-5 mb-4">
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
            <h2 className="text-sm font-black text-slate-800 uppercase tracking-wide flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-teal-100 text-teal-700 flex items-center justify-center text-xs font-bold">
                2
              </span>
              Sedimentoscopia (Microscopia de Bancada)
            </h2>
            <span className="text-[11px] text-slate-500 font-medium">
              Campos de 400x
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* LEUCÓCITOS POR CAMPO */}
            <QuickChipSelect
              label="Leucócitos (Piócitos)"
              sublabel="Ref: até 4 ou 5 p/c"
              value={form.leucocitos_campo}
              onChange={(val) => setForm({ ...form, leucocitos_campo: val })}
              options={[
                { label: "0 a 4 p/c", value: "0 a 4 p/c" },
                { label: "5 a 10 p/c", value: "5 a 10 p/c", isAbnormal: true },
                { label: "10 a 20 p/c", value: "10 a 20 p/c", isAbnormal: true },
                { label: "20 a 50 p/c", value: "20 a 50 p/c", isAbnormal: true },
                { label: "> 50 / Incontáveis", value: "Incontáveis", isAbnormal: true },
              ]}
            />

            {/* HEMÁCIAS POR CAMPO */}
            <QuickChipSelect
              label="Hemácias"
              sublabel="Ref: até 2 p/c"
              value={form.hemacias_campo}
              onChange={(val) => setForm({ ...form, hemacias_campo: val })}
              options={[
                { label: "0 a 2 p/c", value: "0 a 2 p/c" },
                { label: "3 a 5 p/c", value: "3 a 5 p/c", isAbnormal: true },
                { label: "6 a 10 p/c", value: "6 a 10 p/c", isAbnormal: true },
                { label: "10 a 25 p/c", value: "10 a 25 p/c", isAbnormal: true },
                { label: "Maciça / Incontáveis", value: "Maciça", isAbnormal: true },
              ]}
            />

            {/* CÉLULAS EPITELIAIS */}
            <QuickChipSelect
              label="Células Epiteliais de Descamação"
              value={form.celulas_epiteliais}
              onChange={(val) => setForm({ ...form, celulas_epiteliais: val })}
              options={[
                { label: "Raras (Normal)", value: "Raras" },
                { label: "Algumas", value: "Algumas" },
                { label: "Numerosas", value: "Numerosas", isAbnormal: true },
              ]}
            />

            {/* FLORA BACTERIANA */}
            <QuickChipSelect
              label="Flora Bacteriana"
              value={form.bacterias}
              onChange={(val) => setForm({ ...form, bacterias: val })}
              options={[
                { label: "Ausentes", value: "Ausentes" },
                { label: "Raras / Flora Habitual", value: "Raras / Flora habitual" },
                { label: "Moderadas", value: "Moderadas", isAbnormal: true },
                { label: "Aumentadas / Abundante", value: "Aumentadas", isAbnormal: true },
              ]}
            />

            {/* CRISTAIS */}
            <div className="space-y-1.5">
              <QuickChipSelect
                label="Cristais"
                sublabel={
                  parseFloat(form.ph) >= 7.0
                    ? `pH ${form.ph} (Alcalino) ➔ Favorável a Fosfatos`
                    : `pH ${form.ph} (Ácido) ➔ Favorável a Oxalato / Uratos`
                }
                value={form.cristais}
                onChange={(val) => setForm({ ...form, cristais: val })}
                options={[
                  { label: "Ausentes", value: "Ausentes" },
                  { label: "Oxalato de Cálcio", value: "Oxalato de cálcio", isAbnormal: true },
                  { label: "Urato Amorfo", value: "Urato amorfo", isAbnormal: true },
                  { label: "Fosfato Amorfo", value: "Fosfato amorfo", isAbnormal: true },
                  { label: "Fosfato Triplo", value: "Fosfato triplo", isAbnormal: true },
                  { label: "Ácido Úrico", value: "Ácido úrico", isAbnormal: true },
                  { label: "Carbonato de Cálcio", value: "Carbonato de cálcio", isAbnormal: true },
                  { label: "Cistina", value: "Cistina", isAbnormal: true },
                ]}
              />
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="text"
                  value={form.cristais}
                  onChange={(e) => setForm({ ...form, cristais: e.target.value })}
                  placeholder="Texto livre / quantificação (ex: Oxalato de cálcio ++ ou Raros uratos)"
                  className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:border-teal-600 focus:bg-white text-slate-800"
                />
              </div>
            </div>

            {/* CILINDROS */}
            <QuickChipSelect
              label="Cilindros Urinários"
              value={form.cilindros}
              onChange={(val) => setForm({ ...form, cilindros: val })}
              options={[
                { label: "Ausentes", value: "Ausentes" },
                { label: "Hialinos", value: "Hialinos", isAbnormal: true },
                { label: "Granulosos", value: "Granulosos", isAbnormal: true },
                { label: "Leucocitários", value: "Leucocitários", isAbnormal: true },
                { label: "Hemáticos", value: "Hemáticos", isAbnormal: true },
              ]}
            />

            {/* VALIDAÇÃO CLÍNICA INTELIGENTE DE BANCADA: pH vs. CRISTAIS */}
            {(() => {
              const phNum = parseFloat(form.ph) || 6.0;
              const ehAlcalino = phNum >= 7.0;
              const ehAcido = phNum <= 6.0;
              const cristaisNorm = form.cristais.toLowerCase();

              // Urina Alcalina com Urato ou Ácido Úrico
              if (ehAlcalino && (cristaisNorm.includes("urato") || cristaisNorm.includes("ácido úrico") || cristaisNorm.includes("acido urico"))) {
                return (
                  <div className="sm:col-span-2 p-3.5 bg-amber-50 border-2 border-amber-300 rounded-xl text-xs text-amber-950 flex items-start gap-3 shadow-sm animate-pulse-once">
                    <Sparkles className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                    <div className="space-y-1.5 flex-1">
                      <span className="font-black text-amber-900 block uppercase tracking-wide">
                        💡 Alerta Clínico da Bancada: Incompatibilidade de pH vs. Cristais
                      </span>
                      <p className="leading-relaxed">
                        Amostra com <strong>pH alcalino ({form.ph})</strong>. Cristais de <em>Urato Amorfo</em> e <em>Ácido Úrico</em> precipitam tipicamente em urinas ácidas (pH &lt; 6.0). Em urinas alcalinas, o cristal amorfo esperado é <strong>Fosfato Amorfo</strong> ou <strong>Fosfato Triplo (Estruvita)</strong>.
                      </p>
                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => setForm({ ...form, cristais: "Fosfato amorfo" })}
                          className="inline-flex items-center gap-1 text-xs font-bold text-amber-950 bg-amber-200 hover:bg-amber-300 px-3 py-1.5 rounded-lg transition active:scale-95 shadow-xs"
                        >
                          ➔ Corrigir para Fosfato Amorfo
                        </button>
                        <button
                          type="button"
                          onClick={() => setForm({ ...form, cristais: "Fosfato triplo" })}
                          className="inline-flex items-center gap-1 text-xs font-bold text-amber-950 bg-amber-200 hover:bg-amber-300 px-3 py-1.5 rounded-lg transition active:scale-95 shadow-xs"
                        >
                          ➔ Corrigir para Fosfato Triplo
                        </button>
                      </div>
                    </div>
                  </div>
                );
              }

              // Urina Ácida com Fosfatos
              if (ehAcido && (cristaisNorm.includes("fosfato amorfo") || cristaisNorm.includes("fosfato triplo"))) {
                return (
                  <div className="sm:col-span-2 p-3.5 bg-amber-50 border-2 border-amber-300 rounded-xl text-xs text-amber-950 flex items-start gap-3 shadow-sm animate-pulse-once">
                    <Sparkles className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                    <div className="space-y-1.5 flex-1">
                      <span className="font-black text-amber-900 block uppercase tracking-wide">
                        💡 Alerta Clínico da Bancada: Incompatibilidade de pH vs. Cristais
                      </span>
                      <p className="leading-relaxed">
                        Amostra com <strong>pH ácido ({form.ph})</strong>. Fosfatos amorfos e triplos precipitam habitualmente em urinas alcalinas (pH ≥ 7.0). Em urinas ácidas, a precipitação comum esperada é de <strong>Urato Amorfo</strong> ou <strong>Oxalato de Cálcio</strong>.
                      </p>
                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => setForm({ ...form, cristais: "Urato amorfo" })}
                          className="inline-flex items-center gap-1 text-xs font-bold text-amber-950 bg-amber-200 hover:bg-amber-300 px-3 py-1.5 rounded-lg transition active:scale-95 shadow-xs"
                        >
                          ➔ Corrigir para Urato Amorfo
                        </button>
                        <button
                          type="button"
                          onClick={() => setForm({ ...form, cristais: "Oxalato de cálcio" })}
                          className="inline-flex items-center gap-1 text-xs font-bold text-amber-950 bg-amber-200 hover:bg-amber-300 px-3 py-1.5 rounded-lg transition active:scale-95 shadow-xs"
                        >
                          ➔ Corrigir para Oxalato de Cálcio
                        </button>
                      </div>
                    </div>
                  </div>
                );
              }

              return null;
            })()}
          </div>
        </section>

        {/* SEÇÃO 3: OBSERVAÇÕES E MOTIVO DE RECOLETA */}
        <section className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-4 sm:p-5 mb-4">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
            <h2 className="text-sm font-black text-slate-800 uppercase tracking-wide flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center text-xs font-bold">
                3
              </span>
              Observações Clínicas & Motivo de Recoleta
            </h2>
          </div>

          {/* Botões rápidos de observações frequentes em laboratório */}
          <div className="mb-3 flex flex-wrap gap-1.5">
            {[
              "Sedimento dentro da normalidade.",
              "Amostra insuficiente (< 5 mL).",
              "Amostra com moderado muco.",
              "Presença de filamentos de muco.",
              "Paciente em período menstrual relatado.",
              "Frasco inadequado sem identificação.",
            ].map((frase) => (
              <button
                key={frase}
                type="button"
                onClick={() => aplicarFraseObservacao(frase)}
                className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 px-2.5 py-1.5 rounded-lg border border-slate-200 transition active:scale-95"
              >
                + {frase}
              </button>
            ))}
          </div>

          <textarea
            rows={2}
            value={form.observacoes}
            onChange={(e) => setForm({ ...form, observacoes: e.target.value })}
            placeholder="Digite observações técnicas ou o motivo de recoleta (ex: volume insuficiente, urina com precipitado amorfos, etc.)..."
            className="w-full p-3 text-sm text-slate-800 bg-slate-50 border border-slate-300 rounded-xl focus:border-sky-500 focus:bg-white focus:outline-none transition"
          />
        </section>

        {/* SEÇÃO 4: PESQUISA DE SANGUE OCULTO (PSO) NA BANCADA */}
        <section
          className={`rounded-2xl border transition-all p-4 sm:p-5 mb-4 shadow-sm ${
            temPso
              ? "bg-white border-rose-300 ring-2 ring-rose-400/20"
              : "bg-slate-50 border-slate-200"
          }`}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 mb-4 border-b border-slate-200">
            <div className="flex items-center gap-2">
              <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold ${
                temPso ? "bg-rose-100 text-rose-700" : "bg-slate-200 text-slate-600"
              }`}>
                4
              </span>
              <div>
                <h2 className="text-sm font-black text-slate-900 uppercase tracking-wide flex items-center gap-2">
                  Pesquisa de Sangue Oculto (PSO - Fezes)
                  {temPso && (
                    <span className="text-[10px] bg-rose-100 text-rose-800 px-2 py-0.5 rounded-full font-bold">
                      Exame Solicitado
                    </span>
                  )}
                </h2>
                <p className="text-[11px] text-slate-500 font-medium">
                  Triagem rápida de bancada manual junto à urinálise
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setTemPso(!temPso)}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl transition flex items-center gap-1.5 ${
                temPso
                  ? "bg-rose-50 text-rose-700 border border-rose-300 hover:bg-rose-100"
                  : "bg-white text-slate-600 border border-slate-300 hover:bg-slate-100"
              }`}
            >
              {temPso ? "✓ PSO Ativo no Laudo" : "+ Ativar Sangue Oculto (PSO)"}
            </button>
          </div>

          {temPso ? (
            <div className="space-y-4">
              <QuickChipSelect
                label="Resultado da Pesquisa de Sangue Oculto"
                sublabel="Método: Imunocromatográfico / Guáiaco"
                value={resultadoPso}
                onChange={(val) => setResultadoPso(val)}
                options={[
                  { label: "Negativo (Ausência de Sangue)", value: "Negativo" },
                  { label: "Positivo (+)", value: "Positivo", isAbnormal: true },
                  { label: "Traços / Duvidoso", value: "Traços", isAbnormal: true },
                  { label: "Amostra Inadequada / Recoleta", value: "Amostra Inadequada / Recoleta", isAbnormal: true },
                ]}
              />

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
                  Observações do PSO (Restrição Alimentar / Amostra)
                </label>
                <div className="mb-2 flex flex-wrap gap-1.5">
                  {[
                    "Sem restrição dietética prévia relatada.",
                    "Paciente informou preparo e dieta realizados.",
                    "Presença de hemorroida referida.",
                    "Amostra diarreica / volume escasso.",
                  ].map((obs) => (
                    <button
                      key={obs}
                      type="button"
                      onClick={() => setObsPso(obsPso ? `${obsPso} ${obs}` : obs)}
                      className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 px-2 py-1 rounded-lg border border-slate-200 transition"
                    >
                      + {obs}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  value={obsPso}
                  onChange={(e) => setObsPso(e.target.value)}
                  placeholder="Ex: Amostra recebida com fezes formadas; sem interferentes..."
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:border-rose-500 focus:bg-white focus:outline-none"
                />
              </div>
            </div>
          ) : (
            <div className="text-center py-2 text-xs text-slate-400">
              Caso este paciente também tenha pedido de Sangue Oculto (PSO), clique no botão acima para lançar o resultado conjuntamente.
            </div>
          )}
        </section>

        {/* SEÇÃO 5: OUTROS TESTES DE BANCADA (BETA-HCG, VHS, VDRL, PCR, COAGULOGRAMA) */}
        <section className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 mb-4 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 mb-4 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold">
                5
              </span>
              <div>
                <h2 className="text-sm font-black text-slate-900 uppercase tracking-wide">
                  Outros Testes Rápidos & Provas da Bancada
                </h2>
                <p className="text-[11px] text-slate-500 font-medium">
                  Ative os exames solicitados para este paciente para lançar os resultados
                </p>
              </div>
            </div>

            {/* Chips de ativação rápida */}
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => setTemBetaHcg(!temBetaHcg)}
                className={`px-2.5 py-1 text-xs font-bold rounded-lg border transition ${
                  temBetaHcg ? "bg-indigo-600 text-white border-indigo-600" : "bg-slate-50 text-slate-700 border-slate-300"
                }`}
              >
                {temBetaHcg ? "✓ Beta-HCG" : "+ Beta-HCG"}
              </button>

              <button
                type="button"
                onClick={() => setTemVhs(!temVhs)}
                className={`px-2.5 py-1 text-xs font-bold rounded-lg border transition ${
                  temVhs ? "bg-indigo-600 text-white border-indigo-600" : "bg-slate-50 text-slate-700 border-slate-300"
                }`}
              >
                {temVhs ? "✓ VHS" : "+ VHS"}
              </button>

              <button
                type="button"
                onClick={() => setTemVdrl(!temVdrl)}
                className={`px-2.5 py-1 text-xs font-bold rounded-lg border transition ${
                  temVdrl ? "bg-indigo-600 text-white border-indigo-600" : "bg-slate-50 text-slate-700 border-slate-300"
                }`}
              >
                {temVdrl ? "✓ VDRL" : "+ VDRL"}
              </button>

              <button
                type="button"
                onClick={() => setTemProvasInflamatorias(!temProvasInflamatorias)}
                className={`px-2.5 py-1 text-xs font-bold rounded-lg border transition ${
                  temProvasInflamatorias ? "bg-indigo-600 text-white border-indigo-600" : "bg-slate-50 text-slate-700 border-slate-300"
                }`}
              >
                {temProvasInflamatorias ? "✓ PCR/ASLO/FR" : "+ PCR/ASLO/FR"}
              </button>

              <button
                type="button"
                onClick={() => setTemCoagulograma(!temCoagulograma)}
                className={`px-2.5 py-1 text-xs font-bold rounded-lg border transition ${
                  temCoagulograma ? "bg-indigo-600 text-white border-indigo-600" : "bg-slate-50 text-slate-700 border-slate-300"
                }`}
              >
                {temCoagulograma ? "✓ Coagulograma" : "+ Coagulograma"}
              </button>

              <button
                type="button"
                onClick={() => setTemProteinuriaRapida(!temProteinuriaRapida)}
                className={`px-2.5 py-1 text-xs font-bold rounded-lg border transition ${
                  temProteinuriaRapida ? "bg-amber-600 text-white border-amber-600" : "bg-slate-50 text-slate-700 border-slate-300"
                }`}
              >
                {temProteinuriaRapida ? "✓ Proteinúria Rápida" : "+ Proteinúria Rápida (Gestante)"}
              </button>
            </div>
          </div>

          <div className="space-y-4">
            {/* CARD TESTE RÁPIDO DE PROTEINÚRIA (PRÉ-NATAL / PRÉ-ECLÂMPSIA) */}
            {temProteinuriaRapida && (
              <div className="p-3 bg-amber-50/70 border border-amber-300 rounded-xl space-y-2">
                <QuickChipSelect
                  label="Teste Rápido de Proteinúria (Rastreio Gestacional / Pré-Eclâmpsia)"
                  sublabel="Método: Tira Reagente / Precipitação Semiquantitativa"
                  value={resultadoProteinuriaRapida}
                  onChange={(val) => setResultadoProteinuriaRapida(val)}
                  options={[
                    { label: "Negativo (Normal)", value: "Negativo" },
                    { label: "Traços (< 30 mg/dL)", value: "Traços", isAbnormal: true },
                    { label: "(+) 30 mg/dL", value: "(+) 30 mg/dL", isAbnormal: true },
                    { label: "(++) 100 mg/dL", value: "(++) 100 mg/dL", isAbnormal: true },
                    { label: "(+++) 300 mg/dL", value: "(+++) 300 mg/dL", isAbnormal: true },
                    { label: "(++++) > 1000 mg/dL", value: "(++++) > 1000 mg/dL", isAbnormal: true },
                  ]}
                />
              </div>
            )}
            {/* CARD BETA-HCG */}
            {temBetaHcg && (
              <div className="p-3 bg-pink-50/50 border border-pink-200 rounded-xl space-y-2">
                <QuickChipSelect
                  label="Beta-HCG (Teste Rápido de Gravidez)"
                  sublabel="Método: Imunocromatográfico TIG"
                  value={resultadoBetaHcg}
                  onChange={(val) => setResultadoBetaHcg(val)}
                  options={[
                    { label: "Negativo", value: "Negativo" },
                    { label: "Positivo (+)", value: "Positivo", isAbnormal: true },
                    { label: "Inconclusivo / Repetir", value: "Inconclusivo", isAbnormal: true },
                  ]}
                />
              </div>
            )}

            {/* CARD VHS */}
            {temVhs && (
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <QuickChipSelect
                  label="VHS (Velocidade de Hemossedimentação)"
                  sublabel="Método: Westergren / Leitura 1 hora"
                  value={resultadoVhs}
                  onChange={(val) => setResultadoVhs(val)}
                  options={[
                    { label: "5 mm/h", value: "5 mm/1ª hora" },
                    { label: "10 mm/h", value: "10 mm/1ª hora" },
                    { label: "15 mm/h", value: "15 mm/1ª hora" },
                    { label: "20 mm/h", value: "20 mm/1ª hora" },
                    { label: "30 mm/h", value: "30 mm/1ª hora", isAbnormal: true },
                    { label: "> 50 mm/h (Aumentado)", value: "> 50 mm/1ª hora", isAbnormal: true },
                  ]}
                />
              </div>
            )}

            {/* CARD VDRL */}
            {temVdrl && (
              <div className="p-3 bg-purple-50/40 border border-purple-200 rounded-xl space-y-2.5">
                <div className="flex items-center justify-between pb-1.5 border-b border-purple-100 flex-wrap gap-2">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-purple-950 uppercase">
                      VDRL / Sífilis
                    </span>
                    <span className="text-[10px] text-purple-700 bg-purple-100 px-1.5 py-0.5 rounded font-medium">
                      Floculação / Título
                    </span>
                  </div>

                  {/* BOTÃO PARA ACUMULAR EM LOTE SEMANAL */}
                  <button
                    type="button"
                    onClick={() => {
                      const novo = !vdrlAcumularLote;
                      setVdrlAcumularLote(novo);
                      if (novo) {
                        setResultadoVdrl("Aguardando lote semanal");
                      } else {
                        setResultadoVdrl("Não Reagente");
                      }
                    }}
                    className={`px-2.5 py-1 text-xs font-bold rounded-lg border transition flex items-center gap-1 active:scale-95 ${
                      vdrlAcumularLote || resultadoVdrl === "Aguardando lote semanal"
                        ? "bg-purple-700 text-white border-purple-700 shadow-xs"
                        : "bg-white text-purple-700 border-purple-300 hover:bg-purple-100"
                    }`}
                    title="Marque caso este VDRL vá esperar o lote da semana para ser realizado junto"
                  >
                    <span>⏳</span>
                    <span>{vdrlAcumularLote || resultadoVdrl === "Aguardando lote semanal" ? "✓ Marcado: Acumular Lote Semanal" : "Acumular p/ Lote Semanal"}</span>
                  </button>
                </div>

                <QuickChipSelect
                  label="Resultado do VDRL"
                  sublabel={vdrlAcumularLote ? "Amostra guardada para rodar no lote semanal da bancada" : "Selecione o título observado"}
                  value={resultadoVdrl}
                  onChange={(val) => {
                    setResultadoVdrl(val);
                    if (val === "Aguardando lote semanal") {
                      setVdrlAcumularLote(true);
                    } else {
                      setVdrlAcumularLote(false);
                    }
                  }}
                  options={[
                    { label: "Não Reagente", value: "Não Reagente" },
                    { label: "Reagente 1:1", value: "Reagente 1/1", isAbnormal: true },
                    { label: "Reagente 1:2", value: "Reagente 1/2", isAbnormal: true },
                    { label: "Reagente 1:4", value: "Reagente 1/4", isAbnormal: true },
                    { label: "Reagente 1:8", value: "Reagente 1/8", isAbnormal: true },
                    { label: "Reagente ≥ 1:16", value: "Reagente 1/16", isAbnormal: true },
                    { label: "⏳ Aguardando Lote Semanal", value: "Aguardando lote semanal" },
                  ]}
                />
              </div>
            )}

            {/* CARD PROVAS INFLAMATÓRIAS (PCR / ASLO / FR) */}
            {temProvasInflamatorias && (
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl grid grid-cols-1 sm:grid-cols-3 gap-3">
                <QuickChipSelect
                  label="PCR (Proteína C Reativa)"
                  sublabel="Ref: < 6 mg/L"
                  value={resultadoPcr}
                  onChange={(val) => setResultadoPcr(val)}
                  options={[
                    { label: "Negativo (< 6)", value: "Negativo (< 6 mg/L)" },
                    { label: "Positivo (+)", value: "Positivo (> 6 mg/L)", isAbnormal: true },
                  ]}
                />
                <QuickChipSelect
                  label="ASLO (Antiestreptolisina O)"
                  sublabel="Ref: < 200 UI/mL"
                  value={resultadoAslo}
                  onChange={(val) => setResultadoAslo(val)}
                  options={[
                    { label: "Negativo (< 200)", value: "Negativo (< 200 UI/mL)" },
                    { label: "Positivo (+)", value: "Positivo (> 200 UI/mL)", isAbnormal: true },
                  ]}
                />
                <QuickChipSelect
                  label="FR (Fator Reumatoide / Látex)"
                  sublabel="Ref: < 8 UI/mL"
                  value={resultadoFr}
                  onChange={(val) => setResultadoFr(val)}
                  options={[
                    { label: "Negativo (< 8)", value: "Negativo (< 8 UI/mL)" },
                    { label: "Positivo (+)", value: "Positivo (> 8 UI/mL)", isAbnormal: true },
                  ]}
                />
              </div>
            )}

            {/* CARD COAGULOGRAMA */}
            {temCoagulograma && (
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2 pb-1.5 border-b border-slate-200">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-800 uppercase">
                      Coagulograma (TP / INR & TTPA)
                    </span>
                    {/* BOTÃO REPETIR E CONFIRMAR */}
                    <button
                      type="button"
                      onClick={() => {
                        const novo = !coagRepetido;
                        setCoagRepetido(novo);
                        if (novo) {
                          if (!coagTp1 && coagTpTempo) setCoagTp1(coagTpTempo);
                          if (!coagTtpa1 && coagTtpaTempo) setCoagTtpa1(coagTtpaTempo);
                          aplicarFraseObservacao("Exame de coagulograma repetido e confirmado em duplicata técnica nesta mesma amostra.");
                        }
                      }}
                      className={`px-2.5 py-1 text-xs font-bold rounded-lg border transition flex items-center gap-1.5 active:scale-95 ${
                        coagRepetido
                          ? "bg-amber-600 text-white border-amber-600 shadow-xs"
                          : "bg-white text-slate-700 border-slate-300 hover:bg-slate-100"
                      }`}
                      title="Clique caso tenha repetido a dosagem para confirmar resultado alterado"
                    >
                      <span>🔁</span>
                      <span>{coagRepetido ? "✓ Repetido & Confirmado" : "Repetir & Confirmar"}</span>
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setCoagTpTempo("12.0 seg");
                      setCoagTpInr("1.00");
                      setCoagTtpaTempo("31.0 seg");
                      setCoagTtpaRelacao("1.00");
                    }}
                    className="text-[11px] font-bold text-indigo-700 hover:text-indigo-900 underline"
                  >
                    Preencher Valores Normais
                  </button>
                </div>

                {/* PAINEL DE CONFIRMAÇÃO DE DUPLICATA TÉCNICA */}
                {coagRepetido && (
                  <div className="bg-amber-50 border border-amber-300 rounded-lg p-2.5 space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold text-amber-950">
                      <span className="flex items-center gap-1">
                        <span>⚠️</span>
                        <span>Dosagem Repetida em Duplicata Técnica:</span>
                      </span>
                      <span className="text-[10px] text-amber-800 font-normal">
                        Consta na nota do laudo oficial
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <label className="block text-slate-600 font-semibold mb-0.5">1ª Medição (TP anterior)</label>
                        <input
                          type="text"
                          value={coagTp1}
                          onChange={(e) => setCoagTp1(e.target.value)}
                          placeholder="Ex: 18.2 seg"
                          className="w-full px-2 py-1 bg-white border border-amber-300 rounded text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-600 font-semibold mb-0.5">1ª Medição (TTPA anterior)</label>
                        <input
                          type="text"
                          value={coagTtpa1}
                          onChange={(e) => setCoagTtpa1(e.target.value)}
                          placeholder="Ex: 45.0 seg"
                          className="w-full px-2 py-1 bg-white border border-amber-300 rounded text-xs"
                        />
                      </div>
                    </div>
                    <p className="text-[10.5px] text-amber-900 italic">
                      * Preencha nos campos abaixo os valores finais confirmados na segunda corrida.
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">
                      TP {coagRepetido ? "(Confirmado)" : "(Tempo)"}
                    </label>
                    <input
                      type="text"
                      value={coagTpTempo}
                      onChange={(e) => setCoagTpTempo(e.target.value)}
                      placeholder="Ex: 12.5 seg"
                      className={`w-full px-2.5 py-1.5 bg-white border rounded-lg text-xs font-bold ${
                        coagRepetido ? "border-amber-400 text-amber-950" : "border-slate-300"
                      }`}
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">INR (RNI)</label>
                    <input
                      type="text"
                      value={coagTpInr}
                      onChange={(e) => setCoagTpInr(e.target.value)}
                      placeholder="Ex: 1.02"
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">
                      TTPA {coagRepetido ? "(Confirmado)" : "(Tempo)"}
                    </label>
                    <input
                      type="text"
                      value={coagTtpaTempo}
                      onChange={(e) => setCoagTtpaTempo(e.target.value)}
                      placeholder="Ex: 31.0 seg"
                      className={`w-full px-2.5 py-1.5 bg-white border rounded-lg text-xs font-bold ${
                        coagRepetido ? "border-amber-400 text-amber-950" : "border-slate-300"
                      }`}
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">TTPA (Relação)</label>
                    <input
                      type="text"
                      value={coagTtpaRelacao}
                      onChange={(e) => setCoagTtpaRelacao(e.target.value)}
                      placeholder="Ex: 1.00"
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold"
                    />
                  </div>
                </div>
              </div>
            )}

            {!temBetaHcg && !temVhs && !temVdrl && !temProvasInflamatorias && !temCoagulograma && (
              <div className="text-center py-2 text-xs text-slate-400">
                Se este paciente tiver solicitações de outros testes manuais da bancada (Beta-HCG, VHS, VDRL, PCR ou Coagulograma), use os botões acima para ativá-los.
              </div>
            )}
          </div>
        </section>
        </div>
      )}

      {/* BARRA FIXA DE AÇÃO NO RODAPÉ (EXCLUSIVA PARA CELULAR / BANCADA COM LUVAS) */}
      {modoTela === "mobile" && (
        <div className="fixed bottom-14 md:bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-md border-t border-slate-300 shadow-2xl p-3 sm:px-6">
          <div className="max-w-4xl mx-auto flex items-center gap-2 sm:gap-4">
            {/* BOTÃO SALVAR RASCUNHO */}
            <button
              type="button"
              disabled={isSaving}
              onClick={() => handleSalvar("rascunho")}
              className="flex-1 sm:flex-initial sm:px-5 py-3 sm:py-3.5 bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5 text-xs sm:text-sm active:scale-95 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>Rascunho</span>
            </button>

            {/* BOTÃO MARCAR RECOLETA */}
            <button
              type="button"
              disabled={isSaving}
              onClick={() => handleSalvar("recoleta")}
              className="flex-1 sm:flex-initial sm:px-5 py-3 sm:py-3.5 bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5 text-xs sm:text-sm active:scale-95 disabled:opacity-50"
            >
              <AlertTriangle className="w-4 h-4" />
              <span>Recoleta</span>
            </button>

            {/* BOTÃO PRINCIPAL: FINALIZAR AMOSTRA & PRÓXIMO TUBO */}
            <button
              type="button"
              disabled={isSaving}
              onClick={() => handleSalvar("finalizado")}
              className="flex-2 sm:flex-1 py-3 sm:py-3.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-black rounded-xl shadow-lg shadow-emerald-600/30 transition-all flex items-center justify-center gap-2 text-sm sm:text-base active:scale-95 disabled:opacity-50"
            >
              <CheckCircle2 className="w-5 h-5" />
              <span>
                {isSaving
                  ? "Gravando..."
                  : proximoTubo
                  ? `Salvar & Tubo #${indiceAtual + 2} ➔`
                  : "Finalizar Amostra"}
              </span>
            </button>
          </div>
        </div>
      )}

      {/* ÁREA DE IMPRESSÃO (EXCLUSIVA PARA WINDOW.PRINT: RELATÓRIO DO DIA EM CAIXAS MENORES) */}
      <div className="hidden print:block">
        <RelatorioBancadaDiaPrintView
          laudos={
            laudosDia.length > 0
              ? laudosDia
              : rotinaDia.map((r) => ({
                  prontuario: r.prontuario,
                  nome_paciente: r.nome_paciente,
                  idade_sexo: r.idade_sexo,
                  posto_unidade: r.posto_unidade,
                  solicitante: r.solicitante,
                  data_hora: dataHoje || "2026-10-26",
                  status: (r.tem_laudo ? "finalizado" : "rascunho") as StatusLaudo,
                  observacoes: "",
                  ...VALORES_PADRAO_NORMAL,
                }))
          }
          dataSelecionada={dataHoje}
          modo={modoRelatorio}
        />
      </div>
    </div>
  );
}
