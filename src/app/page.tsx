"use client";

import React, { useState, useEffect, useRef } from "react";
import { QuickChipSelect } from "@/components/QuickChipSelect";
import { LaudoUrina, ItemRotina, StatusLaudo } from "@/lib/googleSheets";
import { formatarProntuario } from "@/lib/extratorBancada";
import { MapaBancadaPrintView } from "@/components/MapaBancadaPrintView";
import { RelatorioBancadaDiaPrintView } from "@/components/RelatorioBancadaDiaPrintView";
import {
  Search,
  CheckCircle2,
  AlertTriangle,
  Save,
  RotateCcw,
  UserCheck,
  Sparkles,
  ArrowRight,
  ListOrdered,
  Check,
  Scan,
  UploadCloud,
  Printer,
  FileSpreadsheet,
  Smartphone,
  Clock,
  RefreshCw,
  X,
  Eye,
} from "lucide-react";

const VALORES_PADRAO_NORMAL = {
  volume: "60 mL",
  cor: "Amarelo citrino",
  aspecto: "Límpido",
  densidade: "1.020",
  ph: "6.0",
  proteina: "Negativo",
  glicose: "Negativo",
  cetona: "Negativo",
  bilirrubina: "Negativo",
  urobilinogenio: "Normal",
  sangue: "Negativo",
  nitrito: "Negativo",
  leucocitos_fita: "Negativo",
  celulas_epiteliais: "4.000 /mL",
  leucocitos_campo: "4.000 /mL",
  hemacias_campo: "1.000 /mL",
  bacterias: "fb",
  muco: "Ausente",
  cristais: "Ausentes",
  cilindros: "Ausentes",
  outros_elementos: "Ausentes",
};

export default function BancadaOperacionalPage() {
  // Detecção automática: Computador = Painel de Tiragem & Impressão | Celular = Contagem de Bancada
  const [modoTela, setModoTela] = useState<"desktop" | "mobile">("desktop");

  // Controle de qual impressão exibir no window.print() e no modal de pré-visualização
  const [tipoImpressao, setTipoImpressao] = useState<"triagem" | "resultados">("triagem");
  const [modoRelatorio, setModoRelatorio] = useState<"tiras" | "caixas" | "tabela">("tiras");
  const [previewImpressao, setPreviewImpressao] = useState<"triagem" | "canhotos" | null>(null);

  // Estado de Upload de Arquivo (Conecta SUS)
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [resumoExtracao, setResumoExtracao] = useState<{
    totalExamesBancada: number;
    totalPacientes: number;
    totalDescartadosBioquimica: number;
  } | null>(null);

  // Filtros da Tabela no Painel Desktop
  const [filtroTexto, setFiltroTexto] = useState<string>("");
  const [filtroStatus, setFiltroStatus] = useState<"todos" | "pendentes" | "concluidos">("todos");
  const [filtroTipoExame, setFiltroTipoExame] = useState<string>("todos");

  // Estado de Busca e Identificação do Paciente (Mobile)
  const [prontuario, setProntuario] = useState<string>("");
  const [pacienteInfo, setPacienteInfo] = useState<ItemRotina | null>(null);
  const [nomeManual, setNomeManual] = useState<string>("");
  const [idadeManual, setIdadeManual] = useState<string>("");
  const [postoManual, setPostoManual] = useState<string>("Conecta SUS");
  const [solicitanteManual, setSolicitanteManual] = useState<string>("Conecta SUS");

  // Fila de Rotina do Dia e Laudos Gravados
  const [rotinaDia, setRotinaDia] = useState<ItemRotina[]>([]);
  const [laudosDia, setLaudosDia] = useState<LaudoUrina[]>([]);
  const [dataHoje, setDataHoje] = useState<string>("");
  const [mostrarSugestoes, setMostrarSugestoes] = useState<boolean>(false);

  // Seleção Rápida de Bancada Ativa no Celular
  const [bancadaAtiva, setBancadaAtiva] = useState<"urina" | "imuno" | "coag" | "pso">("urina");

  // Estados do Exame Físico-Químico e Sedimentoscopia (Urina I)
  const [form, setForm] = useState({
    ...VALORES_PADRAO_NORMAL,
    observacoes: "",
  });

  // Estado para Pesquisa de Sangue Oculto nas Fezes (PSO)
  const [temPso, setTemPso] = useState<boolean>(false);
  const [resultadoPso, setResultadoPso] = useState<string>("Negativo");
  const [obsPso, setObsPso] = useState<string>("");

  // Estados para Outros Testes Rápidos & Provas de Bancada Manual
  const [temBetaHcg, setTemBetaHcg] = useState<boolean>(false);
  const [resultadoBetaHcg, setResultadoBetaHcg] = useState<string>("Negativo");

  const [temVhs, setTemVhs] = useState<boolean>(false);
  const [resultadoVhs, setResultadoVhs] = useState<string>("10 mm/1ª hora");

  const [temAboRh, setTemAboRh] = useState<boolean>(false);
  const [resultadoAboRh, setResultadoAboRh] = useState<string>("O Positivo (+)");

  const [temVdrl, setTemVdrl] = useState<boolean>(false);
  const [resultadoVdrl, setResultadoVdrl] = useState<string>("Não Reagente");
  const [vdrlAcumularLote, setVdrlAcumularLote] = useState<boolean>(false);

  const [temProvasInflamatorias, setTemProvasInflamatorias] = useState<boolean>(false);
  const [resultadoPcr, setResultadoPcr] = useState<string>("Negativo (< 6 mg/L)");
  const [resultadoAslo, setResultadoAslo] = useState<string>("Negativo (< 200 UI/mL)");
  const [resultadoFr, setResultadoFr] = useState<string>("Negativo (< 8 UI/mL)");

  const [temCoagulograma, setTemCoagulograma] = useState<boolean>(false);
  const [coagTpTempo, setCoagTpTempo] = useState<string>("12.5 seg");
  const [coagTpInr, setCoagTpInr] = useState<string>("1.00");
  const [coagTtpaTempo, setCoagTtpaTempo] = useState<string>("30.0 seg");
  const [coagTtpaRelacao, setCoagTtpaRelacao] = useState<string>("1.00");
  const [coagRepetido, setCoagRepetido] = useState<boolean>(false);
  const [coagTp1, setCoagTp1] = useState<string>("");
  const [coagTtpa1, setCoagTtpa1] = useState<string>("");

  // Teste Rápido de Proteinúria (Gestantes / Rastreio de Pré-Eclâmpsia)
  const [temProteinuriaRapida, setTemProteinuriaRapida] = useState<boolean>(false);
  const [resultadoProteinuriaRapida, setResultadoProteinuriaRapida] = useState<string>("Negativo");

  // Estados de UI e Feedback
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "warning" | "error";
  } | null>(null);

  const prontuarioInputRef = useRef<HTMLInputElement>(null);

  // Carregar a rotina do dia e detectar automaticamente se é Computador ou Celular
  useEffect(() => {
    setDataHoje(new Date().toISOString().split("T")[0]);
    carregarDadosSincronizados();

    if (typeof window !== "undefined") {
      const atualizarModoPorLargura = () => {
        if (window.innerWidth < 768) {
          setModoTela("mobile");
        } else {
          setModoTela("desktop");
        }
      };
      atualizarModoPorLargura();
      window.addEventListener("resize", atualizarModoPorLargura);

      const params = new URLSearchParams(window.location.search);
      const b = params.get("bancada");
      if (b === "urina" || b === "imuno" || b === "coag" || b === "pso") {
        setBancadaAtiva(b);
      }

      const handleTrocarBancada = (ev: any) => {
        const nova = ev.detail;
        if (nova === "urina" || nova === "imuno" || nova === "coag" || nova === "pso") {
          setBancadaAtiva(nova);
        }
      };
      window.addEventListener("trocar-bancada", handleTrocarBancada);

      return () => {
        window.removeEventListener("resize", atualizarModoPorLargura);
        window.removeEventListener("trocar-bancada", handleTrocarBancada);
      };
    }
  }, []);

  // Sincronização automática a cada 8 segundos para manter Computador e Celular em tempo real
  useEffect(() => {
    const timer = setInterval(() => {
      carregarDadosSincronizados(true);
    }, 8000);
    return () => clearInterval(timer);
  }, []);

  const carregarDadosSincronizados = async (silencioso = false) => {
    if (!silencioso) setIsSyncing(true);
    try {
      const [resRotina, resLaudos] = await Promise.all([
        fetch("/api/rotina", { cache: "no-store" }),
        fetch("/api/laudos", { cache: "no-store" }),
      ]);
      const dataRotina = await resRotina.json();
      const dataLaudos = await resLaudos.json();

      let laudosAtuais: LaudoUrina[] = [];
      if (dataLaudos.ok && Array.isArray(dataLaudos.laudos)) {
        laudosAtuais = dataLaudos.laudos;
        setLaudosDia(laudosAtuais);
      }

      if (dataRotina.ok && Array.isArray(dataRotina.rotina)) {
        const prontuariosComLaudo = new Set(
          laudosAtuais.map((l) => formatarProntuario(l.prontuario))
        );
        const rotinaAtualizada: ItemRotina[] = dataRotina.rotina
          .map((item: ItemRotina) => ({
            ...item,
            prontuario: formatarProntuario(item.prontuario),
            tem_laudo: Boolean(
              item.tem_laudo || prontuariosComLaudo.has(formatarProntuario(item.prontuario))
            ),
          }))
          .sort((a: ItemRotina, b: ItemRotina) =>
            a.nome_paciente.localeCompare(b.nome_paciente, "pt-BR")
          );
        setRotinaDia(rotinaAtualizada);
      }
    } catch (e) {
      console.error("Erro ao sincronizar rotina e laudos:", e);
    } finally {
      if (!silencioso) setIsSyncing(false);
    }
  };

  // Upload direto do arquivo Conecta SUS (CSV, Excel ou PDF) no Computador
  const handleUploadArquivo = async (file: File) => {
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      // Nunca descartar pela coluna "Data coleta"
      formData.append("filtrarApenasRealizado", "false");

      const res = await fetch("/api/extrair-arquivo", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();

      const listaExtraida: ItemRotina[] = data.pacientesUnificados || data.pacientes || [];

      if (!data.ok || listaExtraida.length === 0) {
        mostrarNotificacao(
          data.error || "Nenhum exame de bancada (Urina, PSO, Rápidos, Coag) encontrado neste arquivo.",
          "warning"
        );
        setIsUploading(false);
        return;
      }

      if (data.dataReferencia) {
        setDataHoje(data.dataReferencia);
      }

      setResumoExtracao({
        totalExamesBancada: data.totalExamesBancada || listaExtraida.length,
        totalPacientes: listaExtraida.length,
        totalDescartadosBioquimica: data.totalDescartadosBioquimica || 0,
      });

      // Salvar na rotina do dia (substituindo a rotina anterior) para disponibilizar no celular
      const saveRes = await fetch("/api/rotina", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itens: listaExtraida,
          substituir: true,
        }),
      });
      const saveData = await saveRes.json();

      if (saveData.ok) {
        setRotinaDia(listaExtraida);
        await carregarDadosSincronizados(true);
        mostrarNotificacao(
          `✅ Tiragem gerada! ${data.totalExamesBancada || listaExtraida.length} exames de bancada (${listaExtraida.length} pacientes) prontos e sincronizados com o celular.`,
          "success"
        );
      } else {
        mostrarNotificacao("Erro ao salvar a rotina extraída no servidor.", "error");
      }
    } catch (err) {
      console.error(err);
      mostrarNotificacao("Falha ao processar arquivo. Verifique o formato (.csv, .xlsx ou .pdf).", "error");
    } finally {
      setIsUploading(false);
    }
  };

  // Disparo de Impressão Direta (Tiragem Inicial vs Canhotos Finais)
  const handleImprimirTiragem = () => {
    setTipoImpressao("triagem");
    setTimeout(() => {
      window.print();
    }, 150);
  };

  const handleImprimirCanhotos = () => {
    setTipoImpressao("resultados");
    setTimeout(() => {
      window.print();
    }, 150);
  };

  const mostrarNotificacao = (
    message: string,
    type: "success" | "warning" | "error" = "success"
  ) => {
    setToast({ message, type });
    setTimeout(() => {
      setToast((prev) => (prev?.message === message ? null : prev));
    }, 4500);
  };

  // Buscar paciente ao digitar Prontuário ou Nome
  const buscarPaciente = async (codigoProntuario: string) => {
    const limpo = codigoProntuario.trim();
    if (!limpo) {
      setPacienteInfo(null);
      return;
    }

    setIsSearching(true);
    setMostrarSugestoes(false);
    try {
      const res = await fetch(`/api/rotina?prontuario=${encodeURIComponent(limpo)}`);
      const data = await res.json();

      if (data.ok && data.paciente) {
        selecionarPaciente(data.paciente, data.ultimoLaudo);
      } else {
        setPacienteInfo(null);
        mostrarNotificacao(
          `Prontuário #${limpo} não listado na rotina. Preencha o nome manualmente se desejar.`,
          "warning"
        );
      }
    } catch (error) {
      console.error("Erro ao buscar prontuário:", error);
    } finally {
      setIsSearching(false);
    }
  };

  // Carrega todos os dados e flags de exames do paciente selecionado
  const selecionarPaciente = (pac: ItemRotina, laudoExistente?: LaudoUrina | null) => {
    const prontFormatado = formatarProntuario(pac.prontuario);
    setProntuario(prontFormatado);
    setPacienteInfo(pac);
    setNomeManual(pac.nome_paciente);
    setIdadeManual(pac.idade_sexo);
    setPostoManual(pac.posto_unidade);
    setSolicitanteManual(pac.solicitante);
    setMostrarSugestoes(false);

    // Verificar se já existe laudo salvo hoje para este paciente
    const laudoSalvo =
      laudoExistente ||
      laudosDia.find((l) => formatarProntuario(l.prontuario) === prontFormatado) ||
      null;

    // Ativar automaticamente os exames que o paciente tem na rotina
    setTemPso(Boolean(pac.tem_pso || laudoSalvo?.tem_pso));
    setTemCoagulograma(Boolean(pac.tem_coagulograma || laudoSalvo?.tp_tempo));
    setTemVdrl(Boolean(pac.tem_vdrl || laudoSalvo?.resultado_vdrl));
    setTemBetaHcg(Boolean(pac.tem_beta_hcg || laudoSalvo?.resultado_beta_hcg));
    setTemVhs(Boolean(pac.tem_vhs || laudoSalvo?.resultado_vhs));
    setTemProvasInflamatorias(
      Boolean(
        pac.tem_pcr ||
          pac.tem_aslo ||
          pac.tem_fr ||
          laudoSalvo?.resultado_pcr ||
          laudoSalvo?.resultado_aslo ||
          laudoSalvo?.resultado_fr
      )
    );
    setTemProteinuriaRapida(
      Boolean(pac.tem_proteinuria_rapida || laudoSalvo?.resultado_proteinuria_rapida)
    );
    setTemAboRh(
      Boolean(pac.tem_abo_rh || laudoSalvo?.tem_abo_rh || laudoSalvo?.resultado_abo_rh)
    );

    if (laudoSalvo) {
      setForm({
        volume: laudoSalvo.volume || VALORES_PADRAO_NORMAL.volume,
        cor: laudoSalvo.cor || VALORES_PADRAO_NORMAL.cor,
        aspecto: laudoSalvo.aspecto || VALORES_PADRAO_NORMAL.aspecto,
        densidade: laudoSalvo.densidade || VALORES_PADRAO_NORMAL.densidade,
        ph: laudoSalvo.ph || VALORES_PADRAO_NORMAL.ph,
        proteina: laudoSalvo.proteina || VALORES_PADRAO_NORMAL.proteina,
        glicose: laudoSalvo.glicose || VALORES_PADRAO_NORMAL.glicose,
        cetona: laudoSalvo.cetona || VALORES_PADRAO_NORMAL.cetona,
        bilirrubina: laudoSalvo.bilirrubina || VALORES_PADRAO_NORMAL.bilirrubina,
        urobilinogenio: laudoSalvo.urobilinogenio || VALORES_PADRAO_NORMAL.urobilinogenio,
        sangue: laudoSalvo.sangue || VALORES_PADRAO_NORMAL.sangue,
        nitrito: laudoSalvo.nitrito || VALORES_PADRAO_NORMAL.nitrito,
        leucocitos_fita: laudoSalvo.leucocitos_fita || VALORES_PADRAO_NORMAL.leucocitos_fita,
        celulas_epiteliais:
          laudoSalvo.celulas_epiteliais || VALORES_PADRAO_NORMAL.celulas_epiteliais,
        leucocitos_campo:
          laudoSalvo.leucocitos_campo || VALORES_PADRAO_NORMAL.leucocitos_campo,
        hemacias_campo: laudoSalvo.hemacias_campo || VALORES_PADRAO_NORMAL.hemacias_campo,
        bacterias: laudoSalvo.bacterias || VALORES_PADRAO_NORMAL.bacterias,
        muco: laudoSalvo.muco || VALORES_PADRAO_NORMAL.muco,
        cristais: laudoSalvo.cristais || VALORES_PADRAO_NORMAL.cristais,
        cilindros: laudoSalvo.cilindros || VALORES_PADRAO_NORMAL.cilindros,
        outros_elementos:
          laudoSalvo.outros_elementos || VALORES_PADRAO_NORMAL.outros_elementos,
        observacoes: laudoSalvo.observacoes || "",
      });
      if (laudoSalvo.resultado_pso) setResultadoPso(laudoSalvo.resultado_pso);
      if (laudoSalvo.obs_pso) setObsPso(laudoSalvo.obs_pso);
      if (laudoSalvo.resultado_beta_hcg) setResultadoBetaHcg(laudoSalvo.resultado_beta_hcg);
      if (laudoSalvo.resultado_vhs) setResultadoVhs(laudoSalvo.resultado_vhs);
      if (laudoSalvo.resultado_abo_rh) setResultadoAboRh(laudoSalvo.resultado_abo_rh);
      if (laudoSalvo.resultado_vdrl) setResultadoVdrl(laudoSalvo.resultado_vdrl);
      if (laudoSalvo.resultado_pcr) setResultadoPcr(laudoSalvo.resultado_pcr);
      if (laudoSalvo.resultado_aslo) setResultadoAslo(laudoSalvo.resultado_aslo);
      if (laudoSalvo.resultado_fr) setResultadoFr(laudoSalvo.resultado_fr);
      if (laudoSalvo.tp_tempo) setCoagTpTempo(laudoSalvo.tp_tempo);
      if (laudoSalvo.tp_inr) setCoagTpInr(laudoSalvo.tp_inr);
      if (laudoSalvo.ttpa_tempo) setCoagTtpaTempo(laudoSalvo.ttpa_tempo);
      if (laudoSalvo.ttpa_relacao) setCoagTtpaRelacao(laudoSalvo.ttpa_relacao);
      if (laudoSalvo.resultado_proteinuria_rapida) {
        setResultadoProteinuriaRapida(laudoSalvo.resultado_proteinuria_rapida);
      }
    } else {
      setForm({ ...VALORES_PADRAO_NORMAL, observacoes: "" });
      setResultadoPso("Negativo");
      setObsPso("");
      setResultadoBetaHcg("Negativo");
      setResultadoVhs("10 mm/1ª hora");
      setResultadoAboRh("O Positivo (+)");
      setResultadoVdrl("Não Reagente");
      setVdrlAcumularLote(false);
      setResultadoPcr("Negativo (< 6 mg/L)");
      setResultadoAslo("Negativo (< 200 UI/mL)");
      setResultadoFr("Negativo (< 8 UI/mL)");
      setCoagTpTempo("12.5 seg");
      setCoagTpInr("1.00");
      setCoagTtpaTempo("30.0 seg");
      setCoagTtpaRelacao("1.00");
      setCoagRepetido(false);
      setResultadoProteinuriaRapida("Negativo");
    }
  };

  // Filtrar sugestões de autocomplete por prontuário ou nome
  const sugestoesBusca = React.useMemo(() => {
    const q = prontuario.trim().toLowerCase();
    if (!q) return [];
    return rotinaDia
      .filter(
        (r) =>
          r.prontuario.toLowerCase().includes(q) ||
          r.nome_paciente.toLowerCase().includes(q)
      )
      .slice(0, 8);
  }, [prontuario, rotinaDia]);

  /**
   * FILA SEQUENCIAL DE TUBOS DA BANCADA ATIVA (ORDEM ALFABÉTICA EXATA DA TIRAGEM!)
   * Na Tiragem ("Bancada 15/10"), os pacientes de cada exame estão ordenados de A a Z:
   * URINA I -> #1 ALICE, #2 ANEZIA, #3 CRISTIANA, #4 MARCELA, #5 MIRIAM, #6 SANDRA.
   * Aqui filtramos os pacientes do setor ativo mantendo a EXATA ordem alfabética (1, 2, 3, 4, 5, 6...).
   */
  const filaBancada = React.useMemo(() => {
    const ordenada = [...rotinaDia].sort((a, b) =>
      a.nome_paciente.localeCompare(b.nome_paciente, "pt-BR")
    );
    if (bancadaAtiva === "pso") {
      return ordenada.filter((p) => Boolean(p.tem_pso));
    }
    if (bancadaAtiva === "coag") {
      return ordenada.filter((p) => Boolean(p.tem_coagulograma));
    }
    if (bancadaAtiva === "imuno") {
      return ordenada.filter((p) =>
        Boolean(
          p.tem_vdrl ||
            p.tem_beta_hcg ||
            p.tem_vhs ||
            p.tem_pcr ||
            p.tem_aslo ||
            p.tem_fr ||
            p.tem_proteinuria_rapida ||
            p.tem_abo_rh
        )
      );
    }
    // Bancada de Urina I: somente quem tem Urina I solicitada, na exata ordem 1, 2, 3, 4, 5, 6 da Tiragem!
    const apenasUrina = ordenada.filter((p) => Boolean(p.tem_urina));
    return apenasUrina.length > 0 ? apenasUrina : ordenada;
  }, [rotinaDia, bancadaAtiva]);

  // Selecionar automaticamente o primeiro tubo pendente quando a fila da bancada mudar no celular
  useEffect(() => {
    if (modoTela === "mobile" && filaBancada.length > 0) {
      const atualNaFila =
        pacienteInfo &&
        filaBancada.some(
          (p) =>
            formatarProntuario(p.prontuario) === formatarProntuario(pacienteInfo.prontuario)
        );
      if (!atualNaFila) {
        const primeiroPendente = filaBancada.find((p) => !p.tem_laudo) || filaBancada[0];
        if (primeiroPendente) {
          selecionarPaciente(primeiroPendente);
        }
      }
    }
  }, [bancadaAtiva, filaBancada.length, modoTela]);

  // Próximo paciente pendente na estante da bancada ativa
  const indiceAtual = filaBancada.findIndex(
    (p) =>
      formatarProntuario(p.prontuario) ===
      formatarProntuario(pacienteInfo?.prontuario || prontuario.trim())
  );
  const proximoTubo =
    indiceAtual >= 0 && indiceAtual + 1 < filaBancada.length
      ? filaBancada[indiceAtual + 1]
      : filaBancada.find(
          (p) =>
            !p.tem_laudo &&
            formatarProntuario(p.prontuario) !== formatarProntuario(prontuario.trim())
        );

  const handleProntuarioKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      buscarPaciente(prontuario);
    }
  };

  // Resetar para os valores normais padrão
  const limparFormulario = () => {
    setProntuario("");
    setPacienteInfo(null);
    setNomeManual("");
    setIdadeManual("");
    setPostoManual("Conecta SUS");
    setSolicitanteManual("Conecta SUS");
    setForm({
      ...VALORES_PADRAO_NORMAL,
      observacoes: "",
    });
    setTemPso(false);
    setResultadoPso("Negativo");
    setObsPso("");
    setTemBetaHcg(false);
    setResultadoBetaHcg("Negativo");
    setTemVhs(false);
    setResultadoVhs("10 mm/1ª hora");
    setTemAboRh(false);
    setResultadoAboRh("O Positivo (+)");
    setTemVdrl(false);
    setResultadoVdrl("Não Reagente");
    setVdrlAcumularLote(false);
    setTemProvasInflamatorias(false);
    setResultadoPcr("Negativo (< 6 mg/L)");
    setResultadoAslo("Negativo (< 200 UI/mL)");
    setResultadoFr("Negativo (< 8 UI/mL)");
    setTemCoagulograma(false);
    setCoagTpTempo("12.5 seg");
    setCoagTpInr("1.00");
    setCoagTtpaTempo("30.0 seg");
    setCoagTtpaRelacao("1.00");
    setCoagRepetido(false);
    setCoagTp1("");
    setCoagTtpa1("");
    setTemProteinuriaRapida(false);
    setResultadoProteinuriaRapida("Negativo");
  };

  // Salvar Laudo no Google Sheets / Memória e avançar para o próximo tubo da fila
  const handleSalvar = async (status: StatusLaudo) => {
    const prontuarioFinal = formatarProntuario(prontuario);
    if (!prontuarioFinal) {
      mostrarNotificacao(
        "Selecione um tubo da fila ou informe o prontuário antes de salvar!",
        "error"
      );
      prontuarioInputRef.current?.focus();
      return;
    }

    if (status === "recoleta" && !form.observacoes.trim()) {
      mostrarNotificacao(
        "Para marcar RECOLETA, informe o motivo no campo de Observações.",
        "warning"
      );
      return;
    }

    setIsSaving(true);
    try {
      const payload: Partial<LaudoUrina> = {
        prontuario: prontuarioFinal,
        nome_paciente:
          pacienteInfo?.nome_paciente || nomeManual.trim() || "PACIENTE AVULSO",
        idade_sexo: pacienteInfo?.idade_sexo || idadeManual.trim() || "SUS",
        posto_unidade: pacienteInfo?.posto_unidade || postoManual.trim() || "Conecta SUS",
        solicitante: pacienteInfo?.solicitante || solicitanteManual.trim() || "Conecta SUS",
        status,
        ...form,
        tem_pso: temPso || bancadaAtiva === "pso",
        resultado_pso: temPso || bancadaAtiva === "pso" ? resultadoPso : "",
        obs_pso: temPso || bancadaAtiva === "pso" ? obsPso : "",
        resultado_beta_hcg: temBetaHcg ? resultadoBetaHcg : "",
        resultado_vhs: temVhs ? resultadoVhs : "",
        tem_abo_rh: temAboRh,
        resultado_abo_rh: temAboRh ? resultadoAboRh : "",
        resultado_vdrl: temVdrl ? resultadoVdrl : "",
        resultado_pcr: temProvasInflamatorias ? resultadoPcr : "",
        resultado_aslo: temProvasInflamatorias ? resultadoAslo : "",
        resultado_fr: temProvasInflamatorias ? resultadoFr : "",
        tp_tempo: temCoagulograma || bancadaAtiva === "coag" ? coagTpTempo : "",
        tp_inr: temCoagulograma || bancadaAtiva === "coag" ? coagTpInr : "",
        ttpa_tempo: temCoagulograma || bancadaAtiva === "coag" ? coagTtpaTempo : "",
        ttpa_relacao: temCoagulograma || bancadaAtiva === "coag" ? coagTtpaRelacao : "",
        resultado_proteinuria_rapida: temProteinuriaRapida ? resultadoProteinuriaRapida : "",
      };

      const res = await fetch("/api/laudos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.ok) {
        if (data.laudo) {
          setLaudosDia((prev) => {
            const idx = prev.findIndex(
              (l) => formatarProntuario(l.prontuario) === formatarProntuario(data.laudo.prontuario)
            );
            if (idx >= 0) {
              const copia = [...prev];
              copia[idx] = data.laudo;
              return copia;
            }
            return [data.laudo, ...prev];
          });
        }

        setRotinaDia((prev) =>
          prev.map((r) =>
            formatarProntuario(r.prontuario) === prontuarioFinal
              ? { ...r, tem_laudo: true }
              : r
          )
        );

        const msgStatus =
          status === "finalizado"
            ? proximoTubo
              ? `✅ Tubo #${indiceAtual + 1} salvo! Avançando para Tubo #${indiceAtual + 2} (${proximoTubo.nome_paciente.split(" ")[0]})...`
              : `✅ Amostra #${prontuarioFinal} finalizada e sincronizada!`
            : status === "rascunho"
            ? `📝 Rascunho salvo para #${prontuarioFinal}.`
            : `⚠️ Amostra #${prontuarioFinal} marcada para RECOLETA.`;

        mostrarNotificacao(msgStatus, status === "recoleta" ? "warning" : "success");

        if (status === "finalizado") {
          if (proximoTubo) {
            selecionarPaciente(proximoTubo);
            window.scrollTo({ top: 0, behavior: "smooth" });
          } else {
            limparFormulario();
          }
        }
      } else {
        mostrarNotificacao(data.error || "Erro ao gravar resultado.", "error");
      }
    } catch (error) {
      console.error("Erro ao salvar laudo:", error);
      mostrarNotificacao("Erro de conexão ao salvar resultado.", "error");
    } finally {
      setIsSaving(false);
    }
  };

  // Atalho para adicionar frase rápida nas observações
  const aplicarFraseObservacao = (frase: string) => {
    setForm((prev) => ({
      ...prev,
      observacoes: prev.observacoes
        ? `${prev.observacoes.trim()}; ${frase}`
        : frase,
    }));
  };

  // Filtros e estatísticas do painel Desktop
  const rotinaFiltradaDesktop = React.useMemo(() => {
    return rotinaDia.filter((item) => {
      const q = filtroTexto.trim().toLowerCase();
      const matchTexto =
        !q ||
        item.nome_paciente.toLowerCase().includes(q) ||
        item.prontuario.toLowerCase().includes(q) ||
        (item.exame && item.exame.toLowerCase().includes(q));

      const laudoGravado = laudosDia.find(
        (l) => formatarProntuario(l.prontuario) === formatarProntuario(item.prontuario)
      );
      const concluido = Boolean(item.tem_laudo || laudoGravado);

      const matchStatus =
        filtroStatus === "todos" ||
        (filtroStatus === "concluidos" && concluido) ||
        (filtroStatus === "pendentes" && !concluido);

      const matchExame =
        filtroTipoExame === "todos" ||
        (filtroTipoExame === "urina" && item.tem_urina) ||
        (filtroTipoExame === "pso" && item.tem_pso) ||
        (filtroTipoExame === "abo" && item.tem_abo_rh) ||
        (filtroTipoExame === "vdrl" &&
          (item.tem_vdrl ||
            item.tem_beta_hcg ||
            item.tem_proteinuria_rapida ||
            item.tem_pcr ||
            item.tem_aslo ||
            item.tem_fr ||
            item.tem_vhs)) ||
        (filtroTipoExame === "coag" && item.tem_coagulograma);

      return matchTexto && matchStatus && matchExame;
    });
  }, [rotinaDia, laudosDia, filtroTexto, filtroStatus, filtroTipoExame]);

  const totalExamesContagem = React.useMemo(() => {
    return rotinaDia.reduce((acc, p) => {
      const qtd = (p.exame || "URINA I").split(/\s*\+\s*|\s*,\s*|\s*;\s*/).filter(Boolean).length;
      return acc + Math.max(1, qtd);
    }, 0);
  }, [rotinaDia]);

  const concluidosCount = rotinaDia.filter(
    (r) =>
      r.tem_laudo ||
      laudosDia.some((l) => formatarProntuario(l.prontuario) === formatarProntuario(r.prontuario))
  ).length;
  const pendentesCount = Math.max(0, rotinaDia.length - concluidosCount);

  return (
    <div className="min-h-screen bg-slate-100/80 pb-28 md:pb-12">
      {/* NOTIFICAÇÃO FLUTUANTE (TOAST) */}
      {toast && (
        <div className="fixed top-16 right-3 left-3 sm:left-auto z-50 max-w-md animate-in fade-in slide-in-from-top-4 duration-200 print:hidden">
          <div
            className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl shadow-lg border text-xs sm:text-sm font-semibold ${
              toast.type === "success"
                ? "bg-emerald-950 text-emerald-50 border-emerald-700"
                : toast.type === "warning"
                ? "bg-amber-950 text-amber-50 border-amber-700"
                : "bg-rose-950 text-rose-50 border-rose-700"
            }`}
          >
            {toast.type === "success" && (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            )}
            {toast.type === "warning" && (
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            )}
            {toast.type === "error" && (
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            )}
            <span>{toast.message}</span>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODO COMPUTADOR (DESKTOP): EXCLUSIVO PARA TIRAGEM & IMPRESSÃO  */}
      {/* (Sem formulário de contagem no computador!)                    */}
      {/* ============================================================== */}
      {modoTela === "desktop" ? (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-5 space-y-6 print:hidden">
          {/* 1. CENTRAL DE TIRAGEM DO DIA E IMPRESSÃO */}
          <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-6">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              {/* Esquerda: Título e Status da Sincronização com o Celular */}
              <div className="space-y-2 max-w-xl">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold">
                  <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
                  Modo Produção Ativo • Computador (Tiragem & Impressão)
                </div>
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  Tiragem Automática do Conecta SUS & Relatórios do Dia
                </h1>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  Suba o arquivo bruto de coletas do <b>Conecta SUS</b>. O sistema descarta automaticamente os bioquímicos, unifica os exames de bancada no formato oficial da <b>Tiragem do Dia</b> (com a Urina 1, 2, 3, 4, 5, 6... em ordem alfabética) e envia a mesma fila para o <b>celular</b> realizar as contagens.
                </p>
                <div className="pt-1 flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => carregarDadosSincronizados(false)}
                    disabled={isSyncing}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition cursor-pointer"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? "animate-spin text-sky-600" : ""}`} />
                    <span>{isSyncing ? "Sincronizando com o Celular..." : "Sincronizar Agora"}</span>
                  </button>
                  <span className="text-[11px] text-slate-400 font-medium">
                    Atualização automática a cada 8s
                  </span>
                </div>
              </div>

              {/* Direita: DOIS CARDS DE IMPRESSÃO (1. TIRAGEM | 2. CANHOTOS FINAIS) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 flex-1 max-w-2xl">
                {/* CARD 1: FOLHA DE TIRAGEM DA BANCADA (INÍCIO DO DIA) */}
                <div className="relative overflow-hidden rounded-2xl border-2 border-sky-400/80 bg-gradient-to-br from-sky-50/60 via-white to-sky-50/30 p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
                  <div className="absolute top-0 right-0 bg-sky-600 text-white text-[9.5px] font-black uppercase px-3 py-1 rounded-bl-xl tracking-wider">
                    Início do Plantão
                  </div>
                  <div>
                    <div className="flex items-center gap-2.5 mb-2">
                      <div className="w-9 h-9 rounded-xl bg-sky-600 text-white flex items-center justify-center shadow-md shadow-sky-600/30">
                        <FileSpreadsheet className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-base font-black text-slate-900">
                          1. Tiragem do Dia (Bancada)
                        </h3>
                        <p className="text-[11px] font-bold text-sky-700">
                          Nº | Exame | Paciente | Prontuário | Resultado
                        </p>
                      </div>
                    </div>

                    <p className="text-xs text-slate-600 mb-4 leading-relaxed">
                      Imprime a folha de tiragem igual à planilha de bancada, agrupada por exame e em ordem alfabética (Urina #1, #2, #3, #4, #5, #6...), na exata sequência em que aparece no celular.
                    </p>
                  </div>

                  <div className="space-y-2 pt-3 border-t border-sky-200/80">
                    <div className="flex items-center justify-between text-xs text-slate-600">
                      <span>Total na tiragem de hoje:</span>
                      <span className="font-bold font-mono text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200">
                        {totalExamesContagem} exames ({rotinaDia.length} pacientes)
                      </span>
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={handleImprimirTiragem}
                        disabled={rotinaDia.length === 0}
                        className="flex-1 py-3 px-4 bg-sky-700 hover:bg-sky-800 active:bg-sky-900 disabled:opacity-40 text-white font-black text-xs sm:text-sm rounded-xl shadow-md shadow-sky-700/20 transition flex items-center justify-center gap-2 active:scale-95 cursor-pointer"
                      >
                        <Printer className="w-4 h-4" />
                        <span>Imprimir Tiragem do Dia</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setPreviewImpressao("triagem")}
                        disabled={rotinaDia.length === 0}
                        className="py-3 px-3.5 bg-white border border-slate-300 hover:bg-slate-100 disabled:opacity-40 text-slate-700 font-bold text-xs rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
                        title="Ver prévia da folha de tiragem"
                      >
                        <Eye className="w-4 h-4 text-slate-600" />
                        <span className="hidden sm:inline">Prévia</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* CARD 2: CANHOTOS DE RESULTADOS FINAIS (FIM DA ROTINA) */}
                <div className="relative overflow-hidden rounded-2xl border-2 border-emerald-400/80 bg-gradient-to-br from-emerald-50/60 via-white to-emerald-50/30 p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
                  <div className="absolute top-0 right-0 bg-emerald-600 text-white text-[9.5px] font-black uppercase px-3 py-1 rounded-bl-xl tracking-wider">
                    Fim do Plantão
                  </div>
                  <div>
                    <div className="flex items-center gap-2.5 mb-2">
                      <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-600/30">
                        <Printer className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-base font-black text-slate-900">
                          2. Relatório / Canhotos Finais
                        </h3>
                        <p className="text-[11px] font-bold text-emerald-700">
                          Tiras Recortáveis (9 a 12 por Folha A4)
                        </p>
                      </div>
                    </div>

                    <p className="text-xs text-slate-600 mb-2 leading-relaxed">
                      Imprime os resultados lançados pelo celular com todos os parâmetros: <b>VOL, COR, ASP, PH, DENS, H, L, C, B, CRISTAIS, Rápidos e ABO/Rh</b>.
                    </p>

                    {/* Seletor de Formato do Relatório Final */}
                    <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl w-fit text-[11px] mb-3">
                      <span className="text-slate-500 text-[10px] font-bold px-1.5">Formato:</span>
                      <button
                        type="button"
                        onClick={() => setModoRelatorio("tiras")}
                        className={`px-2.5 py-1 rounded-lg font-bold transition ${
                          modoRelatorio === "tiras"
                            ? "bg-emerald-600 text-white shadow-2xs"
                            : "text-slate-600 hover:text-slate-900"
                        }`}
                      >
                        Tiras (9-12 p/ A4)
                      </button>
                      <button
                        type="button"
                        onClick={() => setModoRelatorio("caixas")}
                        className={`px-2.5 py-1 rounded-lg font-bold transition ${
                          modoRelatorio === "caixas"
                            ? "bg-emerald-600 text-white shadow-2xs"
                            : "text-slate-600 hover:text-slate-900"
                        }`}
                      >
                        Caixas Médias
                      </button>
                      <button
                        type="button"
                        onClick={() => setModoRelatorio("tabela")}
                        className={`px-2.5 py-1 rounded-lg font-bold transition ${
                          modoRelatorio === "tabela"
                            ? "bg-emerald-600 text-white shadow-2xs"
                            : "text-slate-600 hover:text-slate-900"
                        }`}
                      >
                        Tabela
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2 pt-3 border-t border-emerald-200/80">
                    <div className="flex items-center justify-between text-xs text-slate-600">
                      <span>Contagens pelo celular:</span>
                      <span className="font-bold font-mono text-emerald-800 bg-white px-2 py-0.5 rounded border border-emerald-200">
                        {concluidosCount} de {rotinaDia.length} concluídos
                      </span>
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={handleImprimirCanhotos}
                        disabled={laudosDia.length === 0 && rotinaDia.length === 0}
                        className="flex-1 py-3 px-4 bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900 disabled:opacity-40 text-white font-black text-xs sm:text-sm rounded-xl shadow-md shadow-emerald-700/20 transition flex items-center justify-center gap-2 active:scale-95 cursor-pointer"
                      >
                        <Printer className="w-4 h-4" />
                        <span>Imprimir Relatório Final</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setPreviewImpressao("canhotos")}
                        disabled={laudosDia.length === 0 && rotinaDia.length === 0}
                        className="py-3 px-3.5 bg-white border border-slate-300 hover:bg-slate-100 disabled:opacity-40 text-slate-700 font-bold text-xs rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
                        title="Ver prévia dos canhotos recortáveis"
                      >
                        <Eye className="w-4 h-4 text-slate-600" />
                        <span className="hidden sm:inline">Prévia</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* SEÇÃO DE SUBIR ARQUIVO BRUTO DO CONECTA SUS */}
            <div className="mt-6 p-5 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-2xl bg-sky-100 text-sky-700 flex items-center justify-center shrink-0 border border-sky-200">
                  <UploadCloud className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-slate-900 flex items-center gap-2 flex-wrap">
                    Subir Arquivo Bruto de Coletas (Conecta SUS)
                    {rotinaDia.length > 0 && (
                      <span className="text-[10.5px] font-bold text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-full">
                        Rotina Ativa ({rotinaDia.length} pacientes / {totalExamesContagem} exames)
                      </span>
                    )}
                    {resumoExtracao && (
                      <span className="text-[10.5px] font-bold text-sky-800 bg-sky-100 px-2.5 py-0.5 rounded-full">
                        {resumoExtracao.totalDescartadosBioquimica} bioquímicos removidos automaticamente
                      </span>
                    )}
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Aceita Planilha (.csv, .xlsx, .xls) ou PDF do Conecta SUS. Retira automaticamente os bioquímicos, unifica os exames de bancada e organiza a Urina I (1, 2, 3, 4, 5, 6...) em ordem alfabética.
                  </p>
                </div>
              </div>

              <label className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-sm cursor-pointer transition active:scale-95 shrink-0">
                <FileSpreadsheet className="w-4 h-4 text-sky-400" />
                <span>
                  {isUploading
                    ? "Extraindo Exames de Bancada..."
                    : "Selecionar Arquivo Conecta SUS (.CSV / .XLSX / .PDF)"}
                </span>
                <input
                  type="file"
                  accept=".csv,.xlsx,.xls,.pdf"
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

          {/* 2. TABELA DE ACOMPANHAMENTO AO VIVO (SOMENTE LEITURA E CONFERÊNCIA NO COMPUTADOR) */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-200 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="font-black text-base text-slate-900 tracking-tight flex items-center gap-2">
                    Relação da Tiragem do Dia & Resultados Recebidos do Celular
                    <span className="text-xs font-mono font-bold bg-slate-100 text-slate-600 px-2.5 py-0.5 rounded-full">
                      {rotinaFiltradaDesktop.length} pacientes
                    </span>
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    A contagem (Positivo/Negativo e Sedimentoscopia) é feita exclusivamente pelo <b>celular</b>. Os resultados aparecem aqui automaticamente para impressão.
                  </p>
                </div>

                {/* Filtro Status (Todos / Pendentes / Concluídos) */}
                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => setFiltroStatus("todos")}
                    className={`px-3 py-1.5 rounded-lg transition ${
                      filtroStatus === "todos"
                        ? "bg-white text-slate-900 shadow-xs font-black"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    Todos ({rotinaDia.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setFiltroStatus("pendentes")}
                    className={`px-3 py-1.5 rounded-lg transition ${
                      filtroStatus === "pendentes"
                        ? "bg-amber-500 text-white shadow-xs font-black"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    Aguardando Celular ({pendentesCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => setFiltroStatus("concluidos")}
                    className={`px-3 py-1.5 rounded-lg transition ${
                      filtroStatus === "concluidos"
                        ? "bg-emerald-600 text-white shadow-xs font-black"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    Concluídos ({concluidosCount})
                  </button>
                </div>
              </div>

              {/* Linha de Busca e Filtro por Tipo de Exame */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                <div className="relative flex-1 max-w-md">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={filtroTexto}
                    onChange={(e) => setFiltroTexto(e.target.value)}
                    placeholder="Buscar por paciente, prontuário ou exame..."
                    className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition"
                  />
                  {filtroTexto && (
                    <button
                      type="button"
                      onClick={() => setFiltroTexto("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-1.5 overflow-x-auto text-[11px] font-semibold scrollbar-none">
                  <span className="text-slate-400 text-[10px] uppercase font-bold shrink-0">Setor:</span>
                  {[
                    { id: "todos", label: "Todos" },
                    { id: "urina", label: "🧪 Urina I" },
                    { id: "vdrl", label: "🔬 Rápidos / Imuno" },
                    { id: "abo", label: "🩸 ABO/Rh" },
                    { id: "pso", label: "💩 Sangue Oculto" },
                    { id: "coag", label: "⏱️ Coagulograma" },
                  ].map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setFiltroTipoExame(cat.id)}
                      className={`px-2.5 py-1 rounded-lg border transition whitespace-nowrap ${
                        filtroTipoExame === cat.id
                          ? "bg-slate-900 text-white border-slate-900 font-bold"
                          : "bg-white text-slate-600 border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Conteúdo da Tabela */}
            {rotinaFiltradaDesktop.length === 0 ? (
              <div className="p-16 text-center text-slate-400">
                <FileSpreadsheet className="w-12 h-12 mx-auto mb-3 opacity-30 text-slate-400" />
                <p className="font-bold text-sm text-slate-700">
                  {rotinaDia.length === 0
                    ? "Nenhuma tiragem carregada no momento"
                    : "Nenhum paciente corresponde ao filtro selecionado"}
                </p>
                <p className="text-xs mt-1 text-slate-400">
                  {rotinaDia.length === 0
                    ? "Clique no botão 'Selecionar Arquivo Conecta SUS' acima para gerar a tiragem do dia automaticamente."
                    : "Altere os filtros acima para visualizar todos os pacientes."}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-600 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
                      <th className="py-3 px-3.5 text-center w-16">Ordem</th>
                      <th className="py-3 px-3.5 text-center w-28">Prontuário</th>
                      <th className="py-3 px-3.5">Paciente</th>
                      <th className="py-3 px-3.5">Exames de Bancada</th>
                      <th className="py-3 px-3.5 text-center w-36">Status no Celular</th>
                      <th className="py-3 px-3.5">Resultados Sincronizados</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {rotinaFiltradaDesktop.map((item, idx) => {
                      const laudoGravado = laudosDia.find(
                        (l) =>
                          formatarProntuario(l.prontuario) === formatarProntuario(item.prontuario)
                      );
                      const isConcluido = item.tem_laudo || Boolean(laudoGravado);
                      return (
                        <tr key={item.prontuario + idx} className="hover:bg-slate-50/80 transition">
                          <td className="py-3 px-3.5 text-center">
                            <span className="font-black font-mono text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md text-[11px]">
                              #{idx + 1}
                            </span>
                          </td>

                          <td className="py-3 px-3.5 text-center font-mono font-bold text-sky-800">
                            {formatarProntuario(item.prontuario)}
                          </td>

                          <td className="py-3 px-3.5">
                            <div className="font-bold text-slate-900 uppercase">
                              {item.nome_paciente}
                            </div>
                          </td>

                          <td className="py-3 px-3.5">
                            <div className="flex flex-wrap gap-1">
                              {item.tem_urina && (
                                <span className="bg-sky-50 text-sky-700 border border-sky-200 text-[10px] font-bold px-2 py-0.5 rounded">
                                  URINA I
                                </span>
                              )}
                              {item.tem_proteinuria_rapida && (
                                <span className="bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-bold px-2 py-0.5 rounded">
                                  PROTEINÚRIA - TESTE RÁPIDO
                                </span>
                              )}
                              {item.tem_pso && (
                                <span className="bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-bold px-2 py-0.5 rounded">
                                  SANGUE OCULTO NAS FEZES
                                </span>
                              )}
                              {item.tem_abo_rh && (
                                <span className="bg-red-50 text-red-700 border border-red-200 text-[10px] font-bold px-2 py-0.5 rounded">
                                  ABO / FATOR RH
                                </span>
                              )}
                              {item.tem_vdrl && (
                                <span className="bg-purple-50 text-purple-700 border border-purple-200 text-[10px] font-bold px-2 py-0.5 rounded">
                                  VDRL
                                </span>
                              )}
                              {item.tem_beta_hcg && (
                                <span className="bg-pink-50 text-pink-700 border border-pink-200 text-[10px] font-bold px-2 py-0.5 rounded">
                                  BETA-HCG
                                </span>
                              )}
                              {item.tem_pcr && (
                                <span className="bg-indigo-50 text-indigo-700 border border-indigo-200 text-[10px] font-bold px-2 py-0.5 rounded">
                                  PCR
                                </span>
                              )}
                              {item.tem_aslo && (
                                <span className="bg-indigo-50 text-indigo-700 border border-indigo-200 text-[10px] font-bold px-2 py-0.5 rounded">
                                  ASLO
                                </span>
                              )}
                              {item.tem_fr && (
                                <span className="bg-indigo-50 text-indigo-700 border border-indigo-200 text-[10px] font-bold px-2 py-0.5 rounded">
                                  FR
                                </span>
                              )}
                              {item.tem_vhs && (
                                <span className="bg-teal-50 text-teal-700 border border-teal-200 text-[10px] font-bold px-2 py-0.5 rounded">
                                  VHS
                                </span>
                              )}
                              {item.tem_coagulograma && (
                                <span className="bg-slate-100 text-slate-800 border border-slate-300 text-[10px] font-bold px-2 py-0.5 rounded">
                                  COAGULOGRAMA / TAP
                                </span>
                              )}
                              {!item.tem_urina &&
                                !item.tem_proteinuria_rapida &&
                                !item.tem_pso &&
                                !item.tem_abo_rh &&
                                !item.tem_vdrl &&
                                !item.tem_beta_hcg &&
                                !item.tem_pcr &&
                                !item.tem_aslo &&
                                !item.tem_fr &&
                                !item.tem_vhs &&
                                !item.tem_coagulograma && (
                                  <span className="text-slate-700 text-[11px] font-semibold">
                                    {item.exame || "URINA I"}
                                  </span>
                                )}
                            </div>
                          </td>

                          <td className="py-3 px-3.5 text-center">
                            {isConcluido ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                <Check className="w-3.5 h-3.5 text-emerald-600" /> Concluído no Celular
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                                <Smartphone className="w-3.5 h-3.5 text-amber-600" /> Contagem pelo Celular
                              </span>
                            )}
                          </td>

                          <td className="py-3 px-3.5 text-slate-800 font-mono text-[11px]">
                            {laudoGravado ? (
                              <div className="space-y-0.5">
                                {item.tem_urina && (
                                  <div className="text-slate-900">
                                    <span className="font-bold text-sky-800">URINA I:</span>{" "}
                                    VOL: {laudoGravado.volume || "60 mL"} | D: {laudoGravado.densidade} | pH: {laudoGravado.ph} | Leu: {laudoGravado.leucocitos_campo} | Hem: {laudoGravado.hemacias_campo}
                                  </div>
                                )}
                                {(laudoGravado.resultado_proteinuria_rapida ||
                                  laudoGravado.resultado_pso ||
                                  laudoGravado.resultado_abo_rh ||
                                  laudoGravado.resultado_vdrl ||
                                  laudoGravado.resultado_beta_hcg ||
                                  laudoGravado.resultado_pcr ||
                                  laudoGravado.resultado_aslo ||
                                  laudoGravado.resultado_fr ||
                                  laudoGravado.resultado_vhs ||
                                  laudoGravado.tp_tempo) && (
                                  <div className="text-[10.5px] text-slate-700 font-semibold">
                                    {[
                                      laudoGravado.resultado_proteinuria_rapida
                                        ? `Proteinúria Rápida: ${laudoGravado.resultado_proteinuria_rapida}`
                                        : null,
                                      laudoGravado.resultado_pso
                                        ? `PSO: ${laudoGravado.resultado_pso}`
                                        : null,
                                      laudoGravado.resultado_abo_rh
                                        ? `ABO/Rh: ${laudoGravado.resultado_abo_rh}`
                                        : null,
                                      laudoGravado.resultado_vdrl
                                        ? `VDRL: ${laudoGravado.resultado_vdrl}`
                                        : null,
                                      laudoGravado.resultado_beta_hcg
                                        ? `Beta-HCG: ${laudoGravado.resultado_beta_hcg}`
                                        : null,
                                      laudoGravado.resultado_pcr
                                        ? `PCR: ${laudoGravado.resultado_pcr}`
                                        : null,
                                      laudoGravado.resultado_aslo
                                        ? `ASLO: ${laudoGravado.resultado_aslo}`
                                        : null,
                                      laudoGravado.resultado_fr
                                        ? `FR: ${laudoGravado.resultado_fr}`
                                        : null,
                                      laudoGravado.resultado_vhs
                                        ? `VHS: ${laudoGravado.resultado_vhs}`
                                        : null,
                                      laudoGravado.tp_tempo
                                        ? `TAP/TP: ${laudoGravado.tp_tempo} (INR ${laudoGravado.tp_inr})`
                                        : null,
                                    ]
                                      .filter(Boolean)
                                      .join(" • ")}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span className="text-slate-400 italic text-[11px] flex items-center gap-1">
                                <Clock className="w-3 h-3" /> Aguardando contagem pelo celular na bancada
                              </span>
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
        /* ============================================================== */
        /* MODO CELULAR (MOBILE): EXCLUSIVO PARA CONTAGEM DE BANCADA      */
        /* Layout compacto otimizado para telas pequenas                  */
        /* ============================================================== */
        <div className="max-w-lg mx-auto px-2.5 pt-2.5 pb-8 print:hidden">
          {/* ABAS DE SETOR COMPACTAS PARA TELAS PEQUENAS */}
          <div className="grid grid-cols-4 gap-1.5 mb-2.5">
            {[
              { id: "urina", label: "🧪 Urina I", sub: "1, 2, 3..." },
              { id: "imuno", label: "🔬 Rápidos", sub: "Pos / Neg" },
              { id: "coag", label: "⏱️ Coag", sub: "TAP / INR" },
              { id: "pso", label: "💩 PSO", sub: "Fezes" },
            ].map((b) => (
              <button
                key={b.id}
                type="button"
                onClick={() => {
                  setBancadaAtiva(b.id as any);
                  if (b.id === "coag") setTemCoagulograma(true);
                  if (b.id === "pso") setTemPso(true);
                }}
                className={`py-2 px-1.5 rounded-xl border text-center transition-all active:scale-95 ${
                  bancadaAtiva === b.id
                    ? "bg-sky-700 text-white border-sky-700 shadow-sm"
                    : "bg-white text-slate-700 border-slate-200"
                }`}
              >
                <div className="font-black text-[11px] leading-tight truncate">{b.label}</div>
                <div
                  className={`text-[9.5px] leading-tight mt-0.5 truncate ${
                    bancadaAtiva === b.id ? "text-sky-100" : "text-slate-400"
                  }`}
                >
                  {b.sub}
                </div>
              </button>
            ))}
          </div>

          {/* ESTANTE SEQUENCIAL DE TUBOS (NA EXATA ORDEM 1, 2, 3, 4, 5, 6 DA TIRAGEM!) */}
          <div className="mb-2.5 bg-white rounded-2xl border border-slate-200 shadow-2xs p-2.5">
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-1.5 text-[11px] font-black text-slate-800">
                <ListOrdered className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                <span>
                  Ordem da Tiragem ({filaBancada.length}{" "}
                  {bancadaAtiva === "urina" ? " na Urina I" : " na fila"})
                </span>
              </div>
              <button
                type="button"
                onClick={() => carregarDadosSincronizados(false)}
                className="text-[10px] font-bold text-sky-700 bg-sky-50 px-2 py-0.5 rounded-lg border border-sky-200 flex items-center gap-1 active:scale-95"
              >
                <RefreshCw className={`w-3 h-3 ${isSyncing ? "animate-spin" : ""}`} />
                Atualizar
              </button>
            </div>

            {filaBancada.length === 0 ? (
              <div className="text-center py-3 text-xs text-slate-500 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                Nenhum paciente nesta fila. Suba o arquivo do dia pelo computador ou digite abaixo.
              </div>
            ) : (
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
                {filaBancada.map((item, idx) => {
                  const isAtivo =
                    formatarProntuario(pacienteInfo?.prontuario) ===
                    formatarProntuario(item.prontuario);
                  return (
                    <button
                      key={item.prontuario + idx}
                      type="button"
                      onClick={() => selecionarPaciente(item)}
                      className={`shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-left transition-all active:scale-95 ${
                        isAtivo
                          ? "bg-sky-700 text-white border-sky-700 shadow-sm"
                          : item.tem_laudo
                          ? "bg-emerald-50 text-emerald-950 border-emerald-300"
                          : "bg-slate-50 text-slate-800 border-slate-200"
                      }`}
                    >
                      <div
                        className={`w-6 h-6 rounded-lg flex items-center justify-center text-[11px] font-black shrink-0 ${
                          isAtivo
                            ? "bg-white/20 text-white"
                            : item.tem_laudo
                            ? "bg-emerald-600 text-white"
                            : "bg-slate-200 text-slate-800"
                        }`}
                      >
                        #{idx + 1}
                      </div>
                      <div className="min-w-0">
                        <div className="text-[11px] font-black truncate max-w-[105px]">
                          {item.nome_paciente.split(" ")[0]}{" "}
                          {item.nome_paciente.split(" ")[1] || ""}
                        </div>
                        <div
                          className={`text-[9.5px] font-mono ${
                            isAtivo ? "text-sky-100" : "text-slate-500"
                          }`}
                        >
                          {formatarProntuario(item.prontuario)}
                        </div>
                      </div>
                      {item.tem_laudo && !isAtivo && (
                        <Check className="w-3 h-3 text-emerald-600 shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* CARD DO PACIENTE ATUAL + BUSCA RÁPIDA COMPACTA */}
          <section className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-3 mb-2.5">
            {pacienteInfo ? (
              <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between gap-2 text-emerald-950">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-black text-xs shrink-0">
                    {indiceAtual >= 0 ? `#${indiceAtual + 1}` : <UserCheck className="w-4 h-4" />}
                  </div>
                  <div className="min-w-0">
                    <div className="font-black text-xs sm:text-sm truncate uppercase">
                      {pacienteInfo.nome_paciente}
                    </div>
                    <div className="text-[10.5px] text-emerald-800 font-mono truncate">
                      Pront: {formatarProntuario(pacienteInfo.prontuario)} • {pacienteInfo.exame}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={limparFormulario}
                  className="px-2 py-1 text-[10px] font-bold text-slate-600 bg-white border border-slate-200 rounded-lg shrink-0 active:scale-95"
                >
                  Trocar
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="relative flex items-center">
                  <Scan className="w-4 h-4 text-slate-400 absolute left-3" />
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
                    placeholder="Buscar prontuário ou nome..."
                    className="w-full pl-9 pr-20 py-2 text-xs font-bold font-mono text-slate-900 bg-slate-50 border border-slate-300 rounded-xl focus:border-sky-600 focus:bg-white focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => buscarPaciente(prontuario)}
                    disabled={isSearching || !prontuario.trim()}
                    className="absolute right-1.5 px-2.5 py-1 bg-slate-900 text-white font-bold text-[11px] rounded-lg disabled:opacity-40"
                  >
                    Buscar
                  </button>

                  {mostrarSugestoes && sugestoesBusca.length > 0 && (
                    <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-300 rounded-xl shadow-xl z-30 overflow-hidden max-h-52 overflow-y-auto divide-y divide-slate-100">
                      {sugestoesBusca.map((sug) => (
                        <button
                          key={sug.prontuario}
                          type="button"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            selecionarPaciente(sug);
                          }}
                          className="w-full px-3 py-2 text-left hover:bg-sky-50 flex items-center justify-between"
                        >
                          <div className="min-w-0">
                            <div className="font-bold text-xs text-slate-900 truncate">
                              {sug.nome_paciente}
                            </div>
                            <div className="text-[10px] text-slate-500 font-mono">
                              Pront: {formatarProntuario(sug.prontuario)} • {sug.exame}
                            </div>
                          </div>
                          <ArrowRight className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <input
                  type="text"
                  value={nomeManual}
                  onChange={(e) => setNomeManual(e.target.value)}
                  placeholder="Ou digite o nome do paciente avulso..."
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:border-sky-500 focus:outline-none"
                />
              </div>
            )}
          </section>

          {/* ============================================================ */}
          {/* FORMULÁRIO DA BANCADA SELECIONADA NO CELULAR                 */}
          {/* ============================================================ */}

          {/* 1. BANCADA DE URINA I (EAS) */}
          {bancadaAtiva === "urina" && (
            <>
              {/* SEÇÃO 1: EXAME FÍSICO-QUÍMICO (FITA REATIVA) */}
              <section className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-3 mb-2.5">
                <div className="flex items-center justify-between pb-2 mb-2.5 border-b border-slate-100">
                  <h2 className="text-xs font-black text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-md bg-sky-100 text-sky-700 flex items-center justify-center text-[11px] font-bold">
                      1
                    </span>
                    Fita Reativa (Físico-Químico)
                  </h2>
                  <button
                    type="button"
                    onClick={() => setForm({ ...VALORES_PADRAO_NORMAL, observacoes: form.observacoes })}
                    className="text-[10px] text-slate-500 hover:text-slate-800 flex items-center gap-1 font-bold"
                  >
                    <RotateCcw className="w-3 h-3" /> Padrão Normal
                  </button>
                </div>

                <div className="space-y-3">
                  <QuickChipSelect
                    compact
                    label="Volume da Amostra (VOL)"
                    sublabel="Ref: Frasco / mL"
                    value={form.volume || "60 mL"}
                    onChange={(val) => setForm({ ...form, volume: val })}
                    options={[
                      { label: "40 mL", value: "40 mL" },
                      { label: "50 mL", value: "50 mL" },
                      { label: "60 mL (Padrão)", value: "60 mL" },
                      { label: "70 mL", value: "70 mL" },
                      { label: "80 mL", value: "80 mL" },
                      { label: "100 mL", value: "100 mL" },
                      { label: "Frasco", value: "Frasco" },
                    ]}
                    allowCustom
                  />

                  <QuickChipSelect
                    compact
                    label="Cor"
                    value={form.cor}
                    onChange={(val) => setForm({ ...form, cor: val })}
                    options={[
                      { label: "Am. Claro", value: "Amarelo claro" },
                      { label: "Am. Citrino", value: "Amarelo citrino" },
                      { label: "Am. Escuro", value: "Amarelo escuro", isAbnormal: true },
                      { label: "Âmbar", value: "Âmbar", isAbnormal: true },
                      { label: "Avermelhado", value: "Avermelhado", isAbnormal: true },
                    ]}
                  />

                  <QuickChipSelect
                    compact
                    label="Aspecto"
                    value={form.aspecto}
                    onChange={(val) => setForm({ ...form, aspecto: val })}
                    options={[
                      { label: "Límpido", value: "Límpido" },
                      { label: "Lig. Turvo", value: "Ligeiramente turvo", isAbnormal: true },
                      { label: "Turvo", value: "Turvo", isAbnormal: true },
                    ]}
                  />

                  <QuickChipSelect
                    compact
                    label="Densidade"
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

                  <QuickChipSelect
                    compact
                    label="pH"
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

                  <QuickChipSelect
                    compact
                    label="Proteínas"
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

                  <QuickChipSelect
                    compact
                    label="Glicose"
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

                  <QuickChipSelect
                    compact
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

                  <div className="grid grid-cols-2 gap-2">
                    <QuickChipSelect
                      compact
                      label="Nitrito"
                      value={form.nitrito}
                      onChange={(val) => setForm({ ...form, nitrito: val })}
                      options={[
                        { label: "Negativo", value: "Negativo" },
                        { label: "Positivo", value: "Positivo", isAbnormal: true },
                      ]}
                    />

                    <QuickChipSelect
                      compact
                      label="Corpos Cetônicos"
                      value={form.cetona}
                      onChange={(val) => setForm({ ...form, cetona: val })}
                      options={[
                        { label: "Negativo", value: "Negativo" },
                        { label: "Positivo", value: "Positivo", isAbnormal: true },
                      ]}
                    />
                  </div>

                  <QuickChipSelect
                    compact
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

                  <div className="grid grid-cols-2 gap-2">
                    <QuickChipSelect
                      compact
                      label="Bilirrubina"
                      value={form.bilirrubina}
                      onChange={(val) => setForm({ ...form, bilirrubina: val })}
                      options={[
                        { label: "Negativo", value: "Negativo" },
                        { label: "Positivo", value: "Positivo", isAbnormal: true },
                      ]}
                    />

                    <QuickChipSelect
                      compact
                      label="Urobilinogênio"
                      value={form.urobilinogenio}
                      onChange={(val) => setForm({ ...form, urobilinogenio: val })}
                      options={[
                        { label: "Normal", value: "Normal" },
                        { label: "Aumentado", value: "Aumentado", isAbnormal: true },
                      ]}
                    />
                  </div>
                </div>
              </section>

              {/* SEÇÃO 2: SEDIMENTOSCOPIA / MICROSCOPIA */}
              <section className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-3 mb-2.5">
                <div className="flex items-center justify-between pb-2 mb-2.5 border-b border-slate-100">
                  <h2 className="text-xs font-black text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-md bg-teal-100 text-teal-700 flex items-center justify-center text-[11px] font-bold">
                      2
                    </span>
                    Sedimentoscopia (Microscopia 400x)
                  </h2>
                </div>

                <div className="space-y-3">
                  <QuickChipSelect
                    compact
                    label="Leucócitos (L)"
                    sublabel="Em mil /mL"
                    value={form.leucocitos_campo}
                    onChange={(val) => setForm({ ...form, leucocitos_campo: val })}
                    allowCustom
                    options={[
                      { label: "1.000 /mL", value: "1.000 /mL" },
                      { label: "4.000 /mL", value: "4.000 /mL" },
                      { label: "8.000 /mL", value: "8.000 /mL" },
                      { label: "10.000 /mL", value: "10.000 /mL", isAbnormal: true },
                      { label: "14.000 /mL", value: "14.000 /mL", isAbnormal: true },
                      { label: "25.000 /mL", value: "25.000 /mL", isAbnormal: true },
                      { label: "> 100.000 /mL", value: "> 100.000 /mL", isAbnormal: true },
                    ]}
                  />

                  <QuickChipSelect
                    compact
                    label="Hemácias (H)"
                    sublabel="Em mil /mL"
                    value={form.hemacias_campo}
                    onChange={(val) => setForm({ ...form, hemacias_campo: val })}
                    allowCustom
                    options={[
                      { label: "1.000 /mL", value: "1.000 /mL" },
                      { label: "2.000 /mL", value: "2.000 /mL" },
                      { label: "5.000 /mL", value: "5.000 /mL" },
                      { label: "10.000 /mL", value: "10.000 /mL", isAbnormal: true },
                      { label: "14.000 /mL", value: "14.000 /mL", isAbnormal: true },
                      { label: "20.000 /mL", value: "20.000 /mL", isAbnormal: true },
                      { label: "> 50.000 /mL", value: "> 50.000 /mL", isAbnormal: true },
                    ]}
                  />

                  <QuickChipSelect
                    compact
                    label="Células Epiteliais (C)"
                    sublabel="Em mil /mL"
                    value={form.celulas_epiteliais}
                    onChange={(val) => setForm({ ...form, celulas_epiteliais: val })}
                    allowCustom
                    options={[
                      { label: "1.000 /mL", value: "1.000 /mL" },
                      { label: "4.000 /mL", value: "4.000 /mL" },
                      { label: "6.000 /mL", value: "6.000 /mL" },
                      { label: "10.000 /mL", value: "10.000 /mL" },
                      { label: "20.000 /mL", value: "20.000 /mL", isAbnormal: true },
                      { label: "25.000 /mL", value: "25.000 /mL", isAbnormal: true },
                    ]}
                  />

                  <QuickChipSelect
                    compact
                    label="Flora Bacteriana (B)"
                    value={form.bacterias}
                    onChange={(val) => setForm({ ...form, bacterias: val })}
                    options={[
                      { label: "Ausentes", value: "Ausentes" },
                      { label: "fb (Habitual)", value: "fb" },
                      { label: "F.B.A (Aumentada)", value: "F.B.A", isAbnormal: true },
                      { label: "Abundante", value: "Abundante", isAbnormal: true },
                    ]}
                  />

                  <div className="space-y-1.5">
                    <QuickChipSelect
                      compact
                      label="Cristais"
                      value={form.cristais}
                      onChange={(val) => setForm({ ...form, cristais: val })}
                      options={[
                        { label: "Ausentes", value: "Ausentes" },
                        { label: "Oxalato Cálcio", value: "Oxalato de cálcio", isAbnormal: true },
                        { label: "Urato Amorfo", value: "Urato amorfo", isAbnormal: true },
                        { label: "Fosfato Amorfo", value: "Fosfato amorfo", isAbnormal: true },
                        { label: "Fosfato Triplo", value: "Fosfato triplo", isAbnormal: true },
                        { label: "Ácido Úrico", value: "Ácido úrico", isAbnormal: true },
                      ]}
                    />
                    <input
                      type="text"
                      value={form.cristais}
                      onChange={(e) => setForm({ ...form, cristais: e.target.value })}
                      placeholder="Texto livre cristais..."
                      className="w-full text-xs px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-teal-600 focus:bg-white text-slate-800"
                    />
                  </div>

                  <QuickChipSelect
                    compact
                    label="Cilindros"
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

                  {/* Alerta Clínico pH vs Cristais */}
                  {(() => {
                    const phNum = parseFloat(form.ph) || 6.0;
                    const ehAlcalino = phNum >= 7.0;
                    const ehAcido = phNum <= 6.0;
                    const cristaisNorm = form.cristais.toLowerCase();

                    if (
                      ehAlcalino &&
                      (cristaisNorm.includes("urato") ||
                        cristaisNorm.includes("ácido úrico") ||
                        cristaisNorm.includes("acido urico"))
                    ) {
                      return (
                        <div className="p-2.5 bg-amber-50 border border-amber-300 rounded-xl text-[11px] text-amber-950 flex items-start gap-2">
                          <Sparkles className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                          <div className="space-y-1">
                            <span className="font-black block">
                              pH Alcalino ({form.ph}) vs. Cristal Ácido
                            </span>
                            <div className="flex flex-wrap gap-1.5 pt-0.5">
                              <button
                                type="button"
                                onClick={() => setForm({ ...form, cristais: "Fosfato amorfo" })}
                                className="font-bold bg-amber-200 px-2 py-1 rounded-md"
                              >
                                ➔ Mudar p/ Fosfato Amorfo
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    }
                    if (
                      ehAcido &&
                      (cristaisNorm.includes("fosfato amorfo") ||
                        cristaisNorm.includes("fosfato triplo"))
                    ) {
                      return (
                        <div className="p-2.5 bg-amber-50 border border-amber-300 rounded-xl text-[11px] text-amber-950 flex items-start gap-2">
                          <Sparkles className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                          <div className="space-y-1">
                            <span className="font-black block">
                              pH Ácido ({form.ph}) vs. Fosfato
                            </span>
                            <div className="flex flex-wrap gap-1.5 pt-0.5">
                              <button
                                type="button"
                                onClick={() => setForm({ ...form, cristais: "Urato amorfo" })}
                                className="font-bold bg-amber-200 px-2 py-1 rounded-md"
                              >
                                ➔ Mudar p/ Urato Amorfo
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

              {/* SE O PACIENTE DE URINA TAMBÉM TIVER OUTRO EXAME DE BANCADA SOLICITADO (EX: MARCELA -> URINA I + PROTEINÚRIA RÁPIDA), EXIBIR JUNTO! */}
              {(temProteinuriaRapida ||
                temPso ||
                temAboRh ||
                temVdrl ||
                temBetaHcg ||
                temVhs ||
                temProvasInflamatorias ||
                temCoagulograma) && (
                <section className="bg-amber-50/60 rounded-2xl border border-amber-300 p-3 mb-2.5 space-y-2.5">
                  <div className="text-[11px] font-black text-amber-950 uppercase">
                    ⚡ Exames Adicionais deste Paciente na Bancada:
                  </div>
                  {temProteinuriaRapida && (
                    <QuickChipSelect
                      compact
                      label="Proteinúria - Teste Rápido"
                      value={resultadoProteinuriaRapida}
                      onChange={setResultadoProteinuriaRapida}
                      options={[
                        { label: "Negativo", value: "Negativo" },
                        { label: "Traços", value: "Traços", isAbnormal: true },
                        { label: "(+) 30 mg/dL", value: "(+) 30 mg/dL", isAbnormal: true },
                        { label: "(++) 100 mg/dL", value: "(++) 100 mg/dL", isAbnormal: true },
                        { label: "(+++) 300 mg/dL", value: "(+++) 300 mg/dL", isAbnormal: true },
                      ]}
                    />
                  )}
                  {temPso && (
                    <QuickChipSelect
                      compact
                      label="Sangue Oculto nas Fezes (PSO)"
                      value={resultadoPso}
                      onChange={setResultadoPso}
                      options={[
                        { label: "Negativo", value: "Negativo" },
                        { label: "Positivo (+)", value: "Positivo", isAbnormal: true },
                        { label: "Traços", value: "Traços", isAbnormal: true },
                      ]}
                    />
                  )}
                  {temAboRh && (
                    <QuickChipSelect
                      compact
                      label="Tipagem ABO / Fator Rh"
                      value={resultadoAboRh}
                      onChange={setResultadoAboRh}
                      options={[
                        { label: "O Pos (+)", value: "O Positivo (+)" },
                        { label: "A Pos (+)", value: "A Positivo (+)" },
                        { label: "B Pos (+)", value: "B Positivo (+)" },
                        { label: "AB Pos (+)", value: "AB Positivo (+)" },
                        { label: "O Neg (-)", value: "O Negativo (-)", isAbnormal: true },
                        { label: "A Neg (-)", value: "A Negativo (-)", isAbnormal: true },
                        { label: "B Neg (-)", value: "B Negativo (-)", isAbnormal: true },
                        { label: "AB Neg (-)", value: "AB Negativo (-)", isAbnormal: true },
                      ]}
                    />
                  )}
                </section>
              )}
            </>
          )}

          {/* 2. BANCADA DE TESTES RÁPIDOS / IMUNO (POSITIVO / NEGATIVO / ABO-RH / VDRL) */}
          {bancadaAtiva === "imuno" && (
            <section className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-3 mb-2.5 space-y-3">
              <div className="pb-2 border-b border-slate-100">
                <h2 className="text-xs font-black text-slate-900 uppercase">
                  Contagem de Testes Rápidos & Imunologia
                </h2>
                <p className="text-[10.5px] text-slate-500">
                  Toque em Positivo / Negativo para os exames solicitados
                </p>
              </div>

              {/* Seletores rápidos de quais testes exibir */}
              <div className="flex flex-wrap gap-1">
                {[
                  {
                    ativo: temProteinuriaRapida,
                    toggle: () => setTemProteinuriaRapida(!temProteinuriaRapida),
                    label: "Proteinúria Rápida",
                  },
                  {
                    ativo: temAboRh,
                    toggle: () => setTemAboRh(!temAboRh),
                    label: "ABO / Rh",
                  },
                  {
                    ativo: temVdrl,
                    toggle: () => setTemVdrl(!temVdrl),
                    label: "VDRL",
                  },
                  {
                    ativo: temBetaHcg,
                    toggle: () => setTemBetaHcg(!temBetaHcg),
                    label: "Beta-HCG",
                  },
                  {
                    ativo: temProvasInflamatorias,
                    toggle: () => setTemProvasInflamatorias(!temProvasInflamatorias),
                    label: "PCR / ASLO / FR",
                  },
                  {
                    ativo: temVhs,
                    toggle: () => setTemVhs(!temVhs),
                    label: "VHS",
                  },
                ].map((chip) => (
                  <button
                    key={chip.label}
                    type="button"
                    onClick={chip.toggle}
                    className={`px-2 py-1 text-[10.5px] font-bold rounded-lg border transition ${
                      chip.ativo
                        ? "bg-sky-700 text-white border-sky-700"
                        : "bg-slate-50 text-slate-600 border-slate-200"
                    }`}
                  >
                    {chip.ativo ? `✓ ${chip.label}` : `+ ${chip.label}`}
                  </button>
                ))}
              </div>

              {/* Proteinúria Teste Rápido */}
              <div className="p-2.5 bg-amber-50/60 border border-amber-200 rounded-xl">
                <QuickChipSelect
                  compact
                  label="Proteinúria - Teste Rápido"
                  value={resultadoProteinuriaRapida}
                  onChange={(val) => {
                    setTemProteinuriaRapida(true);
                    setResultadoProteinuriaRapida(val);
                  }}
                  options={[
                    { label: "Negativo", value: "Negativo" },
                    { label: "Traços", value: "Traços", isAbnormal: true },
                    { label: "Positivo (+)", value: "(+) 30 mg/dL", isAbnormal: true },
                    { label: "Positivo (++)", value: "(++) 100 mg/dL", isAbnormal: true },
                    { label: "Positivo (+++)", value: "(+++) 300 mg/dL", isAbnormal: true },
                  ]}
                />
              </div>

              {/* Tipagem ABO / Rh */}
              <div className="p-2.5 bg-rose-50/50 border border-rose-200 rounded-xl">
                <QuickChipSelect
                  compact
                  label="Tipagem Sanguínea ABO e Fator Rh"
                  value={resultadoAboRh}
                  onChange={(val) => {
                    setTemAboRh(true);
                    setResultadoAboRh(val);
                  }}
                  options={[
                    { label: "O Pos (+)", value: "O Positivo (+)" },
                    { label: "A Pos (+)", value: "A Positivo (+)" },
                    { label: "B Pos (+)", value: "B Positivo (+)" },
                    { label: "AB Pos (+)", value: "AB Positivo (+)" },
                    { label: "O Neg (-)", value: "O Negativo (-)", isAbnormal: true },
                    { label: "A Neg (-)", value: "A Negativo (-)", isAbnormal: true },
                    { label: "B Neg (-)", value: "B Negativo (-)", isAbnormal: true },
                    { label: "AB Neg (-)", value: "AB Negativo (-)", isAbnormal: true },
                  ]}
                />
              </div>

              {/* VDRL */}
              <div className="p-2.5 bg-purple-50/50 border border-purple-200 rounded-xl">
                <QuickChipSelect
                  compact
                  label="VDRL (Sífilis)"
                  value={resultadoVdrl}
                  onChange={(val) => {
                    setTemVdrl(true);
                    setResultadoVdrl(val);
                  }}
                  options={[
                    { label: "Não Reagente", value: "Não Reagente" },
                    { label: "Reagente 1:1", value: "Reagente 1/1", isAbnormal: true },
                    { label: "Reagente 1:2", value: "Reagente 1/2", isAbnormal: true },
                    { label: "Reagente 1:4", value: "Reagente 1/4", isAbnormal: true },
                    { label: "Reagente 1:8", value: "Reagente 1/8", isAbnormal: true },
                    { label: "Reagente ≥ 1:16", value: "Reagente 1/16", isAbnormal: true },
                  ]}
                />
              </div>

              {/* Beta-HCG */}
              <div className="p-2.5 bg-pink-50/50 border border-pink-200 rounded-xl">
                <QuickChipSelect
                  compact
                  label="Beta-HCG (Teste Rápido)"
                  value={resultadoBetaHcg}
                  onChange={(val) => {
                    setTemBetaHcg(true);
                    setResultadoBetaHcg(val);
                  }}
                  options={[
                    { label: "Negativo", value: "Negativo" },
                    { label: "Positivo (+)", value: "Positivo", isAbnormal: true },
                    { label: "Inconclusivo", value: "Inconclusivo", isAbnormal: true },
                  ]}
                />
              </div>

              {/* PCR / ASLO / FR */}
              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5">
                <QuickChipSelect
                  compact
                  label="PCR (Proteína C Reativa)"
                  value={resultadoPcr}
                  onChange={(val) => {
                    setTemProvasInflamatorias(true);
                    setResultadoPcr(val);
                  }}
                  options={[
                    { label: "Negativo (< 6)", value: "Negativo (< 6 mg/L)" },
                    { label: "Positivo (+)", value: "Positivo (> 6 mg/L)", isAbnormal: true },
                  ]}
                />
                <QuickChipSelect
                  compact
                  label="ASLO (Antiestreptolisina-O)"
                  value={resultadoAslo}
                  onChange={(val) => {
                    setTemProvasInflamatorias(true);
                    setResultadoAslo(val);
                  }}
                  options={[
                    { label: "Negativo (< 200)", value: "Negativo (< 200 UI/mL)" },
                    { label: "Positivo (+)", value: "Positivo (> 200 UI/mL)", isAbnormal: true },
                  ]}
                />
                <QuickChipSelect
                  compact
                  label="FR (Fator Reumatoide)"
                  value={resultadoFr}
                  onChange={(val) => {
                    setTemProvasInflamatorias(true);
                    setResultadoFr(val);
                  }}
                  options={[
                    { label: "Negativo (< 8)", value: "Negativo (< 8 UI/mL)" },
                    { label: "Positivo (+)", value: "Positivo (> 8 UI/mL)", isAbnormal: true },
                  ]}
                />
              </div>

              {/* VHS */}
              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl">
                <QuickChipSelect
                  compact
                  label="VHS (1ª Hora)"
                  value={resultadoVhs}
                  onChange={(val) => {
                    setTemVhs(true);
                    setResultadoVhs(val);
                  }}
                  allowCustom
                  options={[
                    { label: "5 mm/h", value: "5 mm/1ª hora" },
                    { label: "10 mm/h", value: "10 mm/1ª hora" },
                    { label: "15 mm/h", value: "15 mm/1ª hora" },
                    { label: "20 mm/h", value: "20 mm/1ª hora" },
                    { label: "30 mm/h", value: "30 mm/1ª hora", isAbnormal: true },
                    { label: "> 50 mm/h", value: "> 50 mm/1ª hora", isAbnormal: true },
                  ]}
                />
              </div>
            </section>
          )}

          {/* 3. BANCADA DE COAGULOGRAMA / TAP */}
          {bancadaAtiva === "coag" && (
            <section className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-3 mb-2.5 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div>
                  <h2 className="text-xs font-black text-slate-900 uppercase">
                    Coagulograma / TAP (TP & TTPA)
                  </h2>
                  <p className="text-[10.5px] text-slate-500">
                    Tempo de Atividade de Protrombina e INR
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setCoagTpTempo("12.0 seg");
                    setCoagTpInr("1.00");
                    setCoagTtpaTempo("31.0 seg");
                    setCoagTtpaRelacao("1.00");
                  }}
                  className="text-[10.5px] font-bold text-sky-700 underline"
                >
                  Padrão Normal
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2.5 text-xs">
                <div>
                  <label className="block text-slate-700 font-bold mb-1 text-[11px]">
                    TP / TAP (Segundos)
                  </label>
                  <input
                    type="text"
                    value={coagTpTempo}
                    onChange={(e) => setCoagTpTempo(e.target.value)}
                    placeholder="Ex: 12.5 seg"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1 text-[11px]">
                    INR (RNI)
                  </label>
                  <input
                    type="text"
                    value={coagTpInr}
                    onChange={(e) => setCoagTpInr(e.target.value)}
                    placeholder="Ex: 1.00"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1 text-[11px]">
                    TTPA (Segundos)
                  </label>
                  <input
                    type="text"
                    value={coagTtpaTempo}
                    onChange={(e) => setCoagTtpaTempo(e.target.value)}
                    placeholder="Ex: 30.0 seg"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1 text-[11px]">
                    TTPA (Relação)
                  </label>
                  <input
                    type="text"
                    value={coagTtpaRelacao}
                    onChange={(e) => setCoagTtpaRelacao(e.target.value)}
                    placeholder="Ex: 1.00"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold"
                  />
                </div>
              </div>
            </section>
          )}

          {/* 4. BANCADA DE SANGUE OCULTO NAS FEZES (PSO) */}
          {bancadaAtiva === "pso" && (
            <section className="bg-white rounded-2xl border border-rose-200 shadow-2xs p-3 mb-2.5 space-y-3">
              <div className="pb-2 border-b border-slate-100">
                <h2 className="text-xs font-black text-slate-900 uppercase">
                  Sangue Oculto nas Fezes (PSO)
                </h2>
                <p className="text-[10.5px] text-slate-500">
                  Toque no resultado observado na placa
                </p>
              </div>

              <QuickChipSelect
                compact
                label="Resultado do Sangue Oculto (PSO)"
                value={resultadoPso}
                onChange={(val) => {
                  setTemPso(true);
                  setResultadoPso(val);
                }}
                options={[
                  { label: "Negativo", value: "Negativo" },
                  { label: "Positivo (+)", value: "Positivo", isAbnormal: true },
                  { label: "Traços / Duvidoso", value: "Traços", isAbnormal: true },
                  {
                    label: "Amostra Inadequada",
                    value: "Amostra Inadequada / Recoleta",
                    isAbnormal: true,
                  },
                ]}
              />

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  Observações do PSO
                </label>
                <input
                  type="text"
                  value={obsPso}
                  onChange={(e) => setObsPso(e.target.value)}
                  placeholder="Opcional: dieta, aspecto da amostra..."
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl"
                />
              </div>
            </section>
          )}

          {/* OBSERVAÇÕES RÁPIDAS */}
          <section className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-3 mb-4">
            <label className="block text-[11px] font-black text-slate-700 uppercase mb-1.5">
              Observações / Motivo de Recoleta
            </label>
            <div className="mb-2 flex flex-wrap gap-1">
              {[
                "Amostra insuficiente.",
                "Presença de muco.",
                "Período menstrual.",
                "Repetido e confirmado.",
              ].map((frase) => (
                <button
                  key={frase}
                  type="button"
                  onClick={() => aplicarFraseObservacao(frase)}
                  className="text-[10.5px] bg-slate-100 text-slate-700 px-2 py-1 rounded-lg border border-slate-200 active:scale-95"
                >
                  + {frase}
                </button>
              ))}
            </div>
            <input
              type="text"
              value={form.observacoes}
              onChange={(e) => setForm({ ...form, observacoes: e.target.value })}
              placeholder="Observações opcionais..."
              className="w-full px-3 py-2 text-xs text-slate-800 bg-slate-50 border border-slate-300 rounded-xl"
            />
          </section>
        </div>
      )}

      {/* BARRA FIXA DE SALVAMENTO NO RODAPÉ (EXCLUSIVA PARA O CELULAR) */}
      {modoTela === "mobile" && (
        <div className="fixed bottom-12 left-0 right-0 z-30 bg-white/95 backdrop-blur-md border-t border-slate-300 shadow-2xl p-2 print:hidden">
          <div className="max-w-lg mx-auto flex items-center gap-1.5">
            <button
              type="button"
              disabled={isSaving}
              onClick={() => handleSalvar("rascunho")}
              className="px-3 py-2.5 bg-amber-500 active:bg-amber-700 text-white font-bold rounded-xl shadow-sm flex items-center justify-center gap-1 text-xs active:scale-95 disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Rascunho</span>
            </button>

            <button
              type="button"
              disabled={isSaving}
              onClick={() => handleSalvar("recoleta")}
              className="px-3 py-2.5 bg-rose-600 active:bg-rose-800 text-white font-bold rounded-xl shadow-sm flex items-center justify-center gap-1 text-xs active:scale-95 disabled:opacity-50"
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Recoleta</span>
            </button>

            <button
              type="button"
              disabled={isSaving}
              onClick={() => handleSalvar("finalizado")}
              className="flex-1 py-2.5 px-3 bg-emerald-600 active:bg-emerald-800 text-white font-black rounded-xl shadow-md shadow-emerald-600/25 flex items-center justify-center gap-1.5 text-xs sm:text-sm active:scale-95 disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span className="truncate">
                {isSaving
                  ? "Salvando..."
                  : proximoTubo
                  ? `Salvar & Ir p/ #${indiceAtual + 2} ➔`
                  : "Finalizar Contagem"}
              </span>
            </button>
          </div>
        </div>
      )}

      {/* MODAL DE PRÉ-VISUALIZAÇÃO DE IMPRESSÃO (TIRAGEM OU CANHOTOS) */}
      {previewImpressao && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 print:hidden">
          <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden border border-slate-300">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Printer className="w-5 h-5 text-sky-400" />
                <span className="font-bold text-sm">
                  {previewImpressao === "triagem"
                    ? "Pré-visualização: Folha de Tiragem da Bancada (Início do Plantão)"
                    : "Pré-visualização: Canhotos de Resultados Finais (Recortáveis)"}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setTipoImpressao(previewImpressao === "triagem" ? "triagem" : "resultados");
                    setTimeout(() => window.print(), 100);
                  }}
                  className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs rounded-xl flex items-center gap-2 shadow-sm transition active:scale-95 cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  Imprimir Agora
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewImpressao(null)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto bg-slate-100 flex-1">
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                {previewImpressao === "triagem" ? (
                  <MapaBancadaPrintView
                    pacientes={rotinaDia}
                    laudos={laudosDia}
                    dataRotina={dataHoje}
                  />
                ) : (
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
                            tem_abo_rh: r.tem_abo_rh,
                            ...VALORES_PADRAO_NORMAL,
                          }))
                    }
                    dataSelecionada={dataHoje}
                    modo={modoRelatorio}
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ÁREA DE IMPRESSÃO (EXCLUSIVA PARA WINDOW.PRINT NO COMPUTADOR) */}
      <div className="hidden print:block">
        {tipoImpressao === "triagem" ? (
          <MapaBancadaPrintView
            pacientes={rotinaDia}
            laudos={laudosDia}
            dataRotina={dataHoje}
          />
        ) : (
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
                    tem_abo_rh: r.tem_abo_rh,
                    ...VALORES_PADRAO_NORMAL,
                  }))
            }
            dataSelecionada={dataHoje}
            modo={modoRelatorio}
          />
        )}
      </div>
    </div>
  );
}
