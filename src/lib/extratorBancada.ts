/**
 * EXTRATOR E CLASSIFICADOR DE BANCADA SUS (100% TYPESCRIPT / ZERO DEPENDÊNCIA PYTHON)
 * 
 * Roda 100% no servidor da Vercel e no browser.
 * Filtra relatórios brutos do Conecta SUS / Laboratório Municipal (Excel, CSV ou PDF),
 * descartando exames de bioquímica/hemograma automatizados e agrupando pacientes
 * por setores de bancada manual.
 */

import { RotinaItem } from "@/types/urinalise";

// Exames automatizados a descartar estritamente
export const EXAMES_DESCARTAR_AUTOMATIZADOS = [
  "GLICEMIA", "GLICOSE", "HEMOGLOBINA GLICADA", "HBA1C", "GLICOHEMOGLOBINA",
  "COLESTEROL", "HDL", "LDL", "VLDL", "LIPIDOGRAMA", "PERFIL LIPIDICO",
  "TRIGLICERIDEOS", "TRIGLICERIDES", "TRIGLICERIDIOS",
  "UREIA", "CREATININA", "CLEARANCE DE CREATININA",
  "TGO", "AST", "TRANSAMINASE OXALACETICA",
  "TGP", "ALT", "TRANSAMINASE PIRUVICA", "TRANSAMINASES",
  "FOSFATASE ALCALINA",
  "GAMA GT", "GAMA GLUTAMIL", "GGT",
  "BILIRRUBINA TOTAL", "BILIRRUBINA DIRETA", "BILIRRUBINA INDIRETA",
  "ACIDO URICO", "URICEMIA",
  "CPK", "CK", "CK MB", "CKMB", "CREATINOFOSFOQUINASE",
  "PROTEINAS TOTAIS", "PROTEINAS TOTAIS E FRACOES", "ALBUMINA",
  "HEMOGRAMA", "HEMOGRAMA COMPLETO", "ERITROGRAMA", "LEUCOGRAMA", "CONTAGEM DE PLAQUETAS",
  "SODIO", "POTASSIO", "CLORETO", "CLORO", "CALCIO", "MAGNESIO", "FOSFORO",
  "FERRO SERICO", "FERRITINA", "TRANSFERRINA", "CAPACIDADE TOTAL DE LIGACAO"
];

export interface ExameClassificado {
  setor: "Urinálise" | "Sangue Oculto" | "Coagulograma" | "VDRL" | "Testes Rápidos" | "Provas Inflamatórias" | "Outro";
  nomePadrao: string;
}

export function normalizarTexto(texto: string): string {
  if (!texto) return "";
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Classifica um nome de exame individual nas regras da bancada SUS
 */
export function classificarExameBancada(textoExame: string): ExameClassificado | null {
  const norm = normalizarTexto(textoExame);
  if (!norm) return null;

  // 1. Urinálise
  if (
    norm.includes("URINA") ||
    /\bEAS\b/.test(norm) ||
    /\bE A S\b/.test(norm) ||
    norm.includes("SEDIMENTO URINARIO") ||
    norm.includes("SEDIMENTOSCOPIA") ||
    norm.includes("SUMARIO DE URINA") ||
    norm.includes("UROFITA") ||
    norm.includes("FITA REAGENTE")
  ) {
    return { setor: "Urinálise", nomePadrao: "Urina Tipo I (EAS)" };
  }

  // 1.1 Proteinúria / Proteinúria Rápida
  if (norm.includes("PROTEINURIA") || norm.includes("PROTEINA URINARIA")) {
    return { setor: "Urinálise", nomePadrao: "Proteinúria Rápida" };
  }

  // 2. Sangue Oculto (PSO / SOF)
  if (
    norm.includes("SANGUE OCULTO") ||
    /\bPSO\b/.test(norm) ||
    /\bP S O\b/.test(norm) ||
    /\bSOF\b/.test(norm) ||
    /\bS O F\b/.test(norm)
  ) {
    return { setor: "Sangue Oculto", nomePadrao: "Pesquisa de Sangue Oculto (PSO)" };
  }

  // 3. Coagulação (Coagulograma, TP, TTPA, TAP, INR)
  if (
    norm.includes("COAGULOGRAMA") ||
    norm.includes("TEMPO DE PROTROMBINA") ||
    /\bTAP\b/.test(norm) ||
    /\bINR\b/.test(norm) ||
    /\bTP\b/.test(norm) ||
    /\bTTPA\b/.test(norm) ||
    /\bKPTT\b/.test(norm) ||
    norm.includes("TROMBOPLASTINA")
  ) {
    return { setor: "Coagulograma", nomePadrao: "Coagulograma (TP/TTPA)" };
  }

  // 4. VDRL / Sífilis
  if (
    norm.includes("VDRL") ||
    norm.includes("SIFILIS") ||
    norm.includes("TREPONEMICO")
  ) {
    return { setor: "VDRL", nomePadrao: "VDRL / Sífilis" };
  }

  // 5. Testes Rápidos / Gravidez
  if (
    norm.includes("BETA HCG") ||
    norm.includes("BHCG") ||
    /\bHCG\b/.test(norm) ||
    /\bTIG\b/.test(norm) ||
    norm.includes("GRAVIDEZ")
  ) {
    return { setor: "Testes Rápidos", nomePadrao: "Beta-HCG (Gravidez)" };
  }

  // 6. Provas Inflamatórias
  if (norm.includes("VHS") || norm.includes("HEMOSSEDIMENTACAO")) {
    return { setor: "Provas Inflamatórias", nomePadrao: "VHS (Hemossedimentação)" };
  }
  if (norm.includes("PCR") || norm.includes("PROTEINA C REATIVA")) {
    return { setor: "Provas Inflamatórias", nomePadrao: "PCR (Proteína C Reativa)" };
  }
  if (norm.includes("ASLO") || norm.includes("ANTIESTREPTOLISINA")) {
    return { setor: "Provas Inflamatórias", nomePadrao: "ASLO" };
  }
  if (norm.includes("FATOR REUMATOIDE") || norm.includes("WAALER ROSE") || /\bFR\b/.test(norm)) {
    return { setor: "Provas Inflamatórias", nomePadrao: "Fator Reumatoide (FR)" };
  }

  return null;
}

export interface ResultadoProcessamentoBancada {
  pacientesUnificados: RotinaItem[];
  setorUrinalise: RotinaItem[];
  setorPso: RotinaItem[];
  setorCoagulograma: RotinaItem[];
  setorVdrl: RotinaItem[];
  setorTestesRapidos: RotinaItem[];
  setorProvasInflamatorias: RotinaItem[];
  totalLidos: number;
  totalDescartadosAutomatizados: number;
  totalAproveitados: number;
}

/**
 * Processa matriz de linhas (proveniente de Excel, CSV ou PDF),
 * unifica múltiplos exames do mesmo paciente ou os organiza por setores separados.
 */
export function processarMatrizLinhasBancada(
  rows: any[][],
  filtrarApenasRealizado: boolean = false
): ResultadoProcessamentoBancada {
  if (!rows || rows.length <= 1) {
    return {
      pacientesUnificados: [],
      setorUrinalise: [],
      setorPso: [],
      setorCoagulograma: [],
      setorVdrl: [],
      setorTestesRapidos: [],
      setorProvasInflamatorias: [],
      totalLidos: 0,
      totalDescartadosAutomatizados: 0,
      totalAproveitados: 0,
    };
  }

  // Identificação flexível de colunas pelo cabeçalho (ou primeiras 5 linhas)
  let linhaCabecalho = 0;
  let headers = (rows[0] || []).map((h: any) => normalizarTexto(h));

  let idxPront = headers.findIndex((h) => h.includes("PRONT") || h.includes("COD") || h.includes("AMOSTRA") || h.includes("CNS"));
  let idxNome = headers.findIndex((h) => h.includes("NOME") || h.includes("PACIENTE") || h.includes("USUARIO"));
  let idxExame = headers.findIndex((h) => h.includes("EXAME") || h.includes("PROCEDIMENTO") || h.includes("DESCRICAO") || h.includes("SOLICITACAO"));
  let idxData = headers.findIndex((h) => h.includes("DATA") || h.includes("DT") || h.includes("COLETA") || h.includes("AGENDAMENTO"));
  let idxIdade = headers.findIndex((h) => h.includes("IDADE") || h.includes("SEXO") || h.includes("NASC"));
  let idxStatus = headers.findIndex((h) => h.includes("STATUS") || h.includes("SITUACAO") || h.includes("COLETA"));

  // Se não achou na linha 0, varre até linha 8 (comum em relatórios do SUS com cabeçalho de prefeitura)
  if (idxNome === -1 && idxExame === -1) {
    for (let r = 1; r < Math.min(10, rows.length); r++) {
      const rowNorm = (rows[r] || []).map((h: any) => normalizarTexto(h));
      const testNome = rowNorm.findIndex((h) => h.includes("NOME") || h.includes("PACIENTE"));
      const testExame = rowNorm.findIndex((h) => h.includes("EXAME") || h.includes("PROCEDIMENTO"));
      if (testNome !== -1 || testExame !== -1) {
        linhaCabecalho = r;
        headers = rowNorm;
        idxPront = rowNorm.findIndex((h) => h.includes("PRONT") || h.includes("COD") || h.includes("AMOSTRA") || h.includes("CNS"));
        idxNome = testNome;
        idxExame = testExame;
        idxData = rowNorm.findIndex((h) => h.includes("DATA") || h.includes("DT"));
        idxIdade = rowNorm.findIndex((h) => h.includes("IDADE") || h.includes("SEXO"));
        idxStatus = rowNorm.findIndex((h) => h.includes("STATUS") || h.includes("SITUACAO"));
        break;
      }
    }
  }

  // Fallback padrão se não encontrou colunas nomeadas
  if (idxPront === -1) idxPront = 0;
  if (idxNome === -1) idxNome = 1;
  if (idxExame === -1) idxExame = 2;

  const hoje = new Date().toISOString().split("T")[0];
  let totalLidos = 0;
  let totalDescartadosAutomatizados = 0;

  // Mapa de unificação por paciente (chave = prontuário limpo ou nome limpo)
  const mapaPacientes = new Map<string, RotinaItem>();

  for (let i = linhaCabecalho + 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length === 0) continue;

    const prontuario = (row[idxPront] || "").toString().trim();
    const nome = (row[idxNome] || "").toString().trim();
    const exameRaw = (row[idxExame] || "").toString().trim();
    const dataRaw = idxData >= 0 ? (row[idxData] || "").toString().trim() : hoje;
    const idadeSexo = idxIdade >= 0 ? (row[idxIdade] || "").toString().trim() : "";
    const statusRaw = idxStatus >= 0 ? (row[idxStatus] || "REALIZADO").toString().trim() : "REALIZADO";

    if (!nome) continue;
    const nomeNorm = normalizarTexto(nome);
    if (["NOME", "PACIENTE", "NOME DO PACIENTE", "USUARIO", "TOTAL"].includes(nomeNorm)) continue;

    totalLidos++;

    // Verifica se status é realizado/coletado quando filtro estiver ativo
    if (filtrarApenasRealizado) {
      const statusNorm = normalizarTexto(statusRaw);
      const ehRealizado =
        statusNorm.includes("REALIZ") ||
        statusNorm.includes("COLET") ||
        statusNorm.includes("TRIAG") ||
        statusNorm.includes("RECEB") ||
        statusNorm.includes("OK") ||
        statusNorm.includes("SIM");
      if (!ehRealizado) continue;
    }

    // Dividir possíveis múltiplos exames na mesma célula (ex: "Urina I, VDRL, Hemograma")
    const partesExames = exameRaw.split(/[,;\n\r\+/|]+/).map((p: string) => p.trim()).filter(Boolean);
    const examesBancadaDetectados: ExameClassificado[] = [];

    for (const parte of partesExames) {
      const classificado = classificarExameBancada(parte);
      if (classificado) {
        if (!examesBancadaDetectados.some((e) => e.nomePadrao === classificado.nomePadrao)) {
          examesBancadaDetectados.push(classificado);
        }
      } else {
        totalDescartadosAutomatizados++;
      }
    }

    // Se nenhum exame da linha pertencer à bancada (ex: paciente só tinha glicose ou hemograma), descarta!
    if (examesBancadaDetectados.length === 0) {
      continue;
    }

    // Chave única para consolidar o mesmo paciente que veio em múltiplas linhas
    const chaveUnica = (prontuario || nomeNorm).toLowerCase();
    let paciente = mapaPacientes.get(chaveUnica);

    if (!paciente) {
      paciente = {
        id: `rot-${prontuario || i}-${Date.now().toString().slice(-4)}`,
        data: dataRaw || hoje,
        prontuario: prontuario || String(i),
        nome_paciente: nome,
        idade_sexo: idadeSexo || "Adulto",
        posto_unidade: "",
        solicitante: "",
        exame: "",
        status_coleta: statusRaw || "REALIZADO",
        status_laudo: "rascunho",
        tem_laudo: false,
        exames_bancada: [],
      };
      mapaPacientes.set(chaveUnica, paciente);
    }

    // Marcar as flags de bancada correspondentes
    for (const ex of examesBancadaDetectados) {
      if (!paciente.exames_bancada?.includes(ex.nomePadrao)) {
        paciente.exames_bancada?.push(ex.nomePadrao);
      }

      if (ex.setor === "Urinálise") {
        if (ex.nomePadrao === "Proteinúria Rápida") {
          paciente.tem_proteinuria_rapida = true;
        } else {
          paciente.tem_urina = true;
        }
      } else if (ex.setor === "Sangue Oculto") {
        paciente.tem_pso = true;
      } else if (ex.setor === "Coagulograma") {
        paciente.tem_coagulograma = true;
      } else if (ex.setor === "VDRL") {
        paciente.tem_vdrl = true;
      } else if (ex.setor === "Testes Rápidos") {
        paciente.tem_beta_hcg = true;
      } else if (ex.setor === "Provas Inflamatórias") {
        if (ex.nomePadrao.includes("VHS")) paciente.tem_vhs = true;
        if (ex.nomePadrao.includes("PCR")) paciente.tem_pcr = true;
        if (ex.nomePadrao.includes("ASLO")) paciente.tem_aslo = true;
        if (ex.nomePadrao.includes("Fator")) paciente.tem_fr = true;
      }
    }

    paciente.exame = (paciente.exames_bancada || []).join(" + ");
  }

  const pacientesUnificados = Array.from(mapaPacientes.values());

  // Gerar listas especializadas e separadinhas por setor
  const setorUrinalise = pacientesUnificados.filter((p) => p.tem_urina || p.tem_proteinuria_rapida);
  const setorPso = pacientesUnificados.filter((p) => p.tem_pso);
  const setorCoagulograma = pacientesUnificados.filter((p) => p.tem_coagulograma);
  const setorVdrl = pacientesUnificados.filter((p) => p.tem_vdrl);
  const setorTestesRapidos = pacientesUnificados.filter((p) => p.tem_beta_hcg);
  const setorProvasInflamatorias = pacientesUnificados.filter((p) => p.tem_vhs || p.tem_pcr || p.tem_aslo || p.tem_fr);

  return {
    pacientesUnificados,
    setorUrinalise,
    setorPso,
    setorCoagulograma,
    setorVdrl,
    setorTestesRapidos,
    setorProvasInflamatorias,
    totalLidos,
    totalDescartadosAutomatizados,
    totalAproveitados: pacientesUnificados.length,
  };
}
