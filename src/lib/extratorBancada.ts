import { RotinaItem } from "@/types/urinalise";
export type ItemRotina = RotinaItem;

export interface LinhaColetaBruta {
  dataColeta: string;
  paciente: string;
  prontuario: string;
  codigoProcedimento: string;
  procedimento: string;
  exame: string;
}

export interface LinhaRelatorioBancada {
  exame: string;
  paciente: string;
  prontuario: string;
  resultado: string;
}

export interface ResultadoExtracaoBancada {
  dataReferencia: string;
  totalLinhasBrutas: number;
  totalExamesBancada: number;
  totalDescartadosBioquimica: number;
  totalLidos: number;
  totalAproveitados: number;
  totalDescartadosAutomatizados: number;
  linhasRelatorioBancada: LinhaRelatorioBancada[];
  pacientesUnificados: ItemRotina[];
}

/**
 * Remove acentos e converte para maiúsculas para comparação segura
 */
export function normalizarTexto(str: string): string {
  return (str || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .trim();
}

/**
 * Formata o prontuário preservando 7 dígitos com zeros à esquerda (padrão Conecta SUS: ex. 0021559)
 */
export function formatarProntuario(valor: any): string {
  const limpo = String(valor ?? "").trim().replace(/^['"]+|['"]+$/g, "");
  if (!limpo) return "";
  if (/^\d+$/.test(limpo)) {
    return limpo.padStart(7, "0");
  }
  return limpo;
}

/**
 * Identifica se um procedimento/exame do Conecta SUS pertence à BANCADA MANUAL
 * (Urina I, Proteinúria Tira, Sangue Oculto/PSO, Coagulograma/TP/TTPA, VDRL, PCR, ASLO, FR, VHS, Beta-HCG, Tipagem ABO/Rh)
 * e descarta automaticamente os exames de Bioquímica/Hematologia/Hormônios/Sorologias automatizadas.
 */
export function classificarExameBancada(
  procedimentoRaw: string,
  exameRaw: string
): {
  ehBancada: boolean;
  nomeExamePadronizado: string;
  categoria:
    | "urina"
    | "proteinuria_rapida"
    | "pso"
    | "coagulograma"
    | "vdrl"
    | "pcr"
    | "aslo"
    | "fr"
    | "vhs"
    | "beta_hcg"
    | "abo_rh"
    | "outro_descartado";
  subTipoCoag?: "tap" | "ttpa" | "ambos";
} {
  const proc = normalizarTexto(procedimentoRaw);
  const ex = normalizarTexto(exameRaw);
  const combinado = `${proc} | ${ex}`;

  // 0. Descarte imediato de exames externos ou bioquímicos/hematológicos automatizados
  // (evita que Hemograma, Hemoglobina Glicada, Ureia, Creatinina, etc., sejam confundidos com bancada)
  if (
    combinado.includes("MICROALBUMINA") ||
    ex === "ALBUMINA" ||
    combinado.includes("CLEARANCE") ||
    combinado.includes("URINA 24") ||
    combinado.includes("UROCULTURA") ||
    combinado.includes("CULTURA DE BACTERIAS") ||
    combinado.includes("SAO JOAO DA B VISTA") ||
    combinado.includes("ANTI-HIV") ||
    combinado.includes("ANTI-HCV") ||
    combinado.includes("HBSAG") ||
    combinado.includes("HEMOGRAMA") ||
    combinado.includes("GLICADA") ||
    combinado.includes("HBA1C") ||
    combinado.includes("ERITROGRAMA") ||
    combinado.includes("LEUCOGRAMA") ||
    combinado.includes("PLAQUETAS") ||
    combinado.includes("GLICOSE") ||
    combinado.includes("GLICEMIA") ||
    combinado.includes("COLESTEROL") ||
    combinado.includes("TRIGLICER") ||
    combinado.includes("LIPIDOGRAMA") ||
    combinado.includes("UREIA") ||
    combinado.includes("CREATININA") ||
    combinado.includes("ACIDO URICO") ||
    combinado.includes("TRANSAMINASE") ||
    combinado.includes("TGO") ||
    combinado.includes("TGP") ||
    combinado.includes("GAMA GT") ||
    combinado.includes("FOSFATASE ALCALINA") ||
    combinado.includes("TSH") ||
    combinado.includes("T4 LIVRE") ||
    combinado.includes("FERRITINA") ||
    combinado.includes("ELETROFORESE") ||
    combinado.includes("TROPONINA") ||
    combinado.includes("CK-MB") ||
    combinado.includes("CPK")
  ) {
    return {
      ehBancada: false,
      nomeExamePadronizado: exameRaw.trim() || procedimentoRaw.trim(),
      categoria: "outro_descartado",
    };
  }

  // 1. TESTE RÁPIDO DE PROTEINÚRIA (Gestantes / Pré-Natal / Fita)
  if (
    combinado.includes("TESTE RAPIDO DE PROTEINURIA") ||
    combinado.includes("PROTEINURIA - TESTE RAPIDO") ||
    combinado.includes("PROTEINURIA TESTE RAPIDO") ||
    combinado.includes("PROTEINURIA") ||
    combinado.includes("PROTEINA NA URINA") ||
    combinado.includes("PROTEINAS NA URINA")
  ) {
    return {
      ehBancada: true,
      nomeExamePadronizado: "PROTEINÚRIA - TESTE RÁPIDO",
      categoria: "proteinuria_rapida",
    };
  }

  // 2. URINA I / ELEMENTOS ANORMAIS DO SEDIMENTO (EAS)
  if (
    ex === "URINA I" ||
    ex === "URINA 1" ||
    ex === "EAS" ||
    combinado.includes("URINA I") ||
    combinado.includes("ELEMENTOS ANORMAIS DO SEDIMENTO") ||
    combinado.includes("ANALISE DE CARACTERES FISICOS, ELEMENTOS E SEDIMENTO DA URINA")
  ) {
    return {
      ehBancada: true,
      nomeExamePadronizado: "URINA I",
      categoria: "urina",
    };
  }

  // 3. PESQUISA DE SANGUE OCULTO NAS FEZES (PSO)
  if (
    combinado.includes("SANGUE OCULTO") ||
    ex === "PSO" ||
    combinado.includes("PESQUISA DE SANGUE OCULTO NAS FEZES")
  ) {
    return {
      ehBancada: true,
      nomeExamePadronizado: "SANGUE OCULTO NAS FEZES",
      categoria: "pso",
    };
  }

  // 4. COAGULOGRAMA / TAP / TP / TTPA
  const ehTap =
    combinado.includes("PROTROMBINA") ||
    /\bTAP\b/.test(ex) ||
    /\bTP\b/.test(ex) ||
    ex.includes("TEMPO DE ATIVIDADE DE PROTROMBINA");
  const ehTtpa =
    combinado.includes("TROMBOPLASTINA") ||
    /\bTTPA\b/.test(ex) ||
    /\bKTPA\b/.test(ex) ||
    ex.includes("TEMPO DE TROMBOPLASTINA");
  const ehCoagulogramaGeral = combinado.includes("COAGULOGRAMA");

  if (ehTap || ehTtpa || ehCoagulogramaGeral) {
    let subTipoCoag: "tap" | "ttpa" | "ambos" = "ambos";
    let padrao = "COAGULOGRAMA";
    if (ehTap && !ehTtpa && !ehCoagulogramaGeral) {
      subTipoCoag = "tap";
      padrao = "TEMPO DE ATIVIDADE DE PROTROMBINA (TAP)";
    } else if (ehTtpa && !ehTap && !ehCoagulogramaGeral) {
      subTipoCoag = "ttpa";
      padrao = "TTPA (TEMPO DE TROMBOPLASTINA ATIVADA)";
    }

    return {
      ehBancada: true,
      nomeExamePadronizado: padrao,
      categoria: "coagulograma",
      subTipoCoag,
    };
  }

  // 5. PCR (PROTEÍNA C REATIVA)
  if (
    combinado.includes("PROTEINA C REATIVA") ||
    ex === "PCR" ||
    ex.startsWith("PCR ") ||
    ex.startsWith("PCR-")
  ) {
    return {
      ehBancada: true,
      nomeExamePadronizado: "PCR - PROTEÍNA C REATIVA",
      categoria: "pcr",
    };
  }

  // 6. ASLO (ANTIESTREPTOLISINA-O)
  if (
    combinado.includes("ANTIESTREPTOLISINA") ||
    ex === "ASLO" ||
    ex === "AEO" ||
    ex.includes("(ASLO)")
  ) {
    return {
      ehBancada: true,
      nomeExamePadronizado: "ANTIESTREPTOLISINA-O (ASLO)",
      categoria: "aslo",
    };
  }

  // 7. VHS (VELOCIDADE DE HEMOSSEDIMENTAÇÃO)
  if (
    combinado.includes("HEMOSSEDIMENTACAO") ||
    ex === "VHS" ||
    ex.startsWith("VHS ")
  ) {
    return {
      ehBancada: true,
      nomeExamePadronizado: "VHS (VELOCIDADE DE HEMOSSEDIMENTAÇÃO)",
      categoria: "vhs",
    };
  }

  // 8. VDRL / SÍFILIS (BANCADA)
  if (
    combinado.includes("VDRL") ||
    combinado.includes("SIFILIS") ||
    combinado.includes("TREPONEMA")
  ) {
    return {
      ehBancada: true,
      nomeExamePadronizado: "VDRL",
      categoria: "vdrl",
    };
  }

  // 9. TIPAGEM SANGUÍNEA ABO / FATOR RH
  // CRÍTICO: NUNCA usar combinado.includes("ABO") solto, pois casa com "LABORATÓRIO", "METABÓLICO", etc.!
  const ehAboRh =
    combinado.includes("FATOR RH") ||
    combinado.includes("GRUPO SANGUINEO") ||
    combinado.includes("TIPAGEM SANGUINEA") ||
    combinado.includes("SISTEMA ABO") ||
    combinado.includes("FENOTIPAGEM") ||
    /\bABO\s*[\/-]?\s*RH\b/.test(combinado) ||
    (/\bABO\b/.test(combinado) &&
      (combinado.includes("SANGU") ||
        combinado.includes("GRUPO") ||
        combinado.includes("TIPAGEM") ||
        combinado.includes("RH") ||
        combinado.includes("AGLUTINACAO")));

  if (ehAboRh) {
    return {
      ehBancada: true,
      nomeExamePadronizado: "GRUPO SANGUÍNEO ABO E FATOR RH",
      categoria: "abo_rh",
    };
  }

  // 10. BETA-HCG / TIG
  if (
    combinado.includes("GONADOTROFINA") ||
    combinado.includes("BETA HCG") ||
    combinado.includes("BETA-HCG") ||
    ex === "TIG" ||
    combinado.includes("GRAVIDEZ")
  ) {
    return {
      ehBancada: true,
      nomeExamePadronizado: "BETA-HCG",
      categoria: "beta_hcg",
    };
  }

  // 11. FATOR REUMATOIDE (FR / LÁTEX)
  if (
    combinado.includes("FATOR REUMATOIDE") ||
    ex === "FR" ||
    ex === "LATEX"
  ) {
    return {
      ehBancada: true,
      nomeExamePadronizado: "FATOR REUMATOIDE (FR)",
      categoria: "fr",
    };
  }

  return {
    ehBancada: false,
    nomeExamePadronizado: exameRaw.trim() || procedimentoRaw.trim(),
    categoria: "outro_descartado",
  };
}

/**
 * Reconstrói as flags booleanas (tem_urina, tem_pso, tem_abo_rh, etc.) a partir da string de exames
 * salva no Google Sheets ou em memória.
 */
export function aplicarFlagsExamesNoItem(item: ItemRotina): ItemRotina {
  const exameTexto = (item.exame || "").trim();
  const partes = exameTexto
    ? exameTexto.split(/\s*\+\s*|\s*,\s*|\s*;\s*/).map((s) => s.trim()).filter(Boolean)
    : [];

  let tem_urina = Boolean(item.tem_urina);
  let tem_pso = Boolean(item.tem_pso);
  let tem_coagulograma = Boolean(item.tem_coagulograma);
  let tem_tap = Boolean(item.tem_tap);
  let tem_ttpa = Boolean(item.tem_ttpa);
  let tem_vdrl = Boolean(item.tem_vdrl);
  let tem_beta_hcg = Boolean(item.tem_beta_hcg);
  let tem_vhs = Boolean(item.tem_vhs);
  let tem_pcr = Boolean(item.tem_pcr);
  let tem_aslo = Boolean(item.tem_aslo);
  let tem_fr = Boolean(item.tem_fr);
  let tem_proteinuria_rapida = Boolean(item.tem_proteinuria_rapida);
  let tem_abo_rh = Boolean(item.tem_abo_rh);

  for (const parte of partes) {
    const c = classificarExameBancada(parte, parte);
    if (c.categoria === "urina") tem_urina = true;
    if (c.categoria === "proteinuria_rapida") tem_proteinuria_rapida = true;
    if (c.categoria === "pso") tem_pso = true;
    if (c.categoria === "coagulograma") {
      tem_coagulograma = true;
      if (c.subTipoCoag === "tap") tem_tap = true;
      else if (c.subTipoCoag === "ttpa") tem_ttpa = true;
      else {
        tem_tap = true;
        tem_ttpa = true;
      }
    }
    if (c.categoria === "vdrl") tem_vdrl = true;
    if (c.categoria === "beta_hcg") tem_beta_hcg = true;
    if (c.categoria === "vhs") tem_vhs = true;
    if (c.categoria === "pcr") tem_pcr = true;
    if (c.categoria === "aslo") tem_aslo = true;
    if (c.categoria === "fr") tem_fr = true;
    if (c.categoria === "abo_rh") tem_abo_rh = true;
  }

  // Se tem_coagulograma mas nenhum subtipo foi registrado, assume ambos
  if (tem_coagulograma && !tem_tap && !tem_ttpa) {
    tem_tap = true;
    tem_ttpa = true;
  }

  // Se nenhum exame foi identificado explicitamente e nem tinha flags prévias, aí sim assume URINA I
  const temAlgumOutro =
    tem_pso ||
    tem_coagulograma ||
    tem_vdrl ||
    tem_beta_hcg ||
    tem_vhs ||
    tem_pcr ||
    tem_aslo ||
    tem_fr ||
    tem_proteinuria_rapida ||
    tem_abo_rh;

  if (!tem_urina && !temAlgumOutro && !exameTexto) {
    tem_urina = true;
  }

  return {
    ...item,
    data: item.data || item.data_rotina || new Date().toISOString().split("T")[0],
    data_rotina: item.data_rotina || item.data || new Date().toISOString().split("T")[0],
    status_coleta: item.status_coleta || "REALIZADO",
    prontuario: formatarProntuario(item.prontuario),
    tem_urina,
    tem_pso,
    tem_coagulograma,
    tem_tap,
    tem_ttpa,
    tem_vdrl,
    tem_beta_hcg,
    tem_vhs,
    tem_pcr,
    tem_aslo,
    tem_fr,
    tem_proteinuria_rapida,
    tem_abo_rh,
  };
}

/**
 * Processa uma matriz de linhas (vinda de CSV, XLSX ou texto colado) do relatório Conecta SUS
 * ou de uma planilha de Bancada já formatada (`Exame,Paciente,Prontuário,Resultado`),
 * e gera tanto a lista da Tiragem (`Bancada 15/10`) quanto os pacientes unificados para o app,
 * ordenados alfabeticamente por nome para que a ordem da Urina (1, 2, 3, 4, 5, 6...) seja idêntica
 * na folha impressa e no celular.
 */
export function processarMatrizLinhasBancada(
  rows: any[][],
  filtrarApenasRealizado: boolean = false
): ResultadoExtracaoBancada {
  let idxData = -1;
  let idxNome = -1;
  let idxPront = -1;
  let idxProcedimento = -1;
  let idxExame = -1;
  let idxStatus = -1;
  let linhaCabecalho = -1;

  // 1. Localizar a linha real de cabeçalho da tabela (ignorando linhas de filtro com ":" como "Período:,Exame:" ou "Paciente:,Prontuário:")
  for (let r = 0; r < Math.min(rows.length, 30); r++) {
    const rawCells = (rows[r] || []).map((c: any) => String(c ?? "").trim());
    const normCells = rawCells.map((c) => normalizarTexto(c));

    // Ignorar linhas de metadados onde as células terminam com ":" (ex: "Período:", "Exame:", "Paciente:", "Prontuário:")
    const célulasNãoVazias = rawCells.filter(Boolean);
    if (célulasNãoVazias.length === 0) continue;
    const qtdComDoisPontos = célulasNãoVazias.filter((c) => c.endsWith(":")).length;
    if (qtdComDoisPontos >= 1 && célulasNãoVazias.length <= 4) {
      continue;
    }

    const posPaciente = normCells.findIndex(
      (h) =>
        (h === "PACIENTE" || h === "NOME" || h === "NOME PACIENTE" || h === "NOME DO PACIENTE" || h === "USUARIO") &&
        !h.endsWith(":")
    );
    const posProntuario = normCells.findIndex(
      (h) =>
        (h === "PRONTUARIO" || h === "CODIGO" || h === "MATRICULA" || h === "CNS") &&
        !h.endsWith(":")
    );
    // Nunca confundir "CÓDIGO PROCEDIMENTO" com o nome do Procedimento/Exame!
    const posExameExato = normCells.findIndex(
      (h) => (h === "EXAME" || h === "EXAMES") && !h.endsWith(":")
    );
    const posProcedimento = normCells.findIndex(
      (h) =>
        (h === "PROCEDIMENTO" || h === "DESCRICAO DO PROCEDIMENTO") &&
        !h.includes("CODIGO") &&
        !h.endsWith(":")
    );

    if (posPaciente !== -1 && (posExameExato !== -1 || posProcedimento !== -1 || posProntuario !== -1)) {
      linhaCabecalho = r;
      idxNome = posPaciente;
      idxPront = posProntuario;
      idxExame = posExameExato !== -1 ? posExameExato : posProcedimento;
      idxProcedimento = posProcedimento !== -1 ? posProcedimento : posExameExato;
      idxData = normCells.findIndex((h) => h.includes("DATA"));
      idxStatus = normCells.findIndex(
        (h) => (h.includes("STATUS") || h.includes("SITUACAO")) && !h.includes("DATA")
      );
      break;
    }
  }

  // Fallback caso o arquivo não tenha cabeçalho explícito (assume formato padrão Conecta SUS de 6 colunas)
  if (linhaCabecalho === -1) {
    idxData = 0;
    idxNome = 1;
    idxPront = 2;
    idxProcedimento = 4;
    idxExame = 5;
  }

  let dataReferencia = new Date().toISOString().split("T")[0];
  let totalLinhasBrutas = 0;
  let totalExamesBancada = 0;
  let totalDescartadosBioquimica = 0;

  const linhasRelatorioBancada: LinhaRelatorioBancada[] = [];
  const mapaPacientes = new Map<
    string,
    {
      item: ItemRotina;
      examesSet: Set<string>;
    }
  >();

  const startRow = linhaCabecalho !== -1 ? linhaCabecalho + 1 : 0;

  for (let i = startRow; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length === 0) continue;

    const nomeRaw = idxNome !== -1 ? String(row[idxNome] ?? "").trim() : "";
    const prontRaw = idxPront !== -1 ? formatarProntuario(row[idxPront]) : "";
    const procRaw = idxProcedimento !== -1 ? String(row[idxProcedimento] ?? "").trim() : "";
    const exameRaw =
      idxExame !== -1 && row[idxExame] !== undefined && String(row[idxExame]).trim() !== ""
        ? String(row[idxExame]).trim()
        : procRaw;
    const dataRaw = idxData !== -1 ? String(row[idxData] ?? "").trim() : "";

    // Ignorar linhas vazias, cabeçalhos repetidos ou rodapés
    const nomeNorm = normalizarTexto(nomeRaw);
    if (
      !nomeRaw ||
      nomeRaw.length < 3 ||
      nomeNorm === "PACIENTE" ||
      nomeNorm.startsWith("PACIENTE:") ||
      nomeNorm.startsWith("RELATORIO") ||
      nomeNorm.startsWith("PERIODO:") ||
      nomeNorm.startsWith("TOTAL") ||
      nomeNorm.startsWith("FILTROS")
    ) {
      continue;
    }

    if (!exameRaw && !procRaw) continue;

    // Filtro opcional de status (apenas se existir coluna real de Status/Situação, nunca Data coleta)
    if (filtrarApenasRealizado && idxStatus !== -1) {
      const statusVal = normalizarTexto(String(row[idxStatus] ?? ""));
      if (
        statusVal &&
        !statusVal.includes("REALIZ") &&
        !statusVal.includes("COLET") &&
        !statusVal.includes("RECEB") &&
        !statusVal.includes("CONCLU") &&
        !statusVal.includes("ATEND")
      ) {
        continue;
      }
    }

    // Extrair data da linha atual (DD/MM/YYYY -> YYYY-MM-DD)
    let dataLinha = dataReferencia;
    if (dataRaw) {
      const matchData = dataRaw.match(/(\d{2})\/(\d{2})\/(\d{4})/);
      if (matchData) {
        dataLinha = `${matchData[3]}-${matchData[2]}-${matchData[1]}`;
        dataReferencia = dataLinha;
      } else if (/^\d{4}-\d{2}-\d{2}/.test(dataRaw)) {
        dataLinha = dataRaw.substring(0, 10);
        dataReferencia = dataLinha;
      }
    }

    totalLinhasBrutas++;

    const classificacao = classificarExameBancada(procRaw, exameRaw);

    if (!classificacao.ehBancada) {
      totalDescartadosBioquimica++;
      continue;
    }

    totalExamesBancada++;

    const prontuarioFinal = prontRaw || `S/P-${totalExamesBancada}`;
    const nomePacienteLimpo = nomeRaw.toUpperCase().trim();

    // Adicionar linha para a Tiragem (estilo Bancada 15/10), evitando duplicar o mesmo exame para o mesmo paciente
    const jaTemLinhaExame = linhasRelatorioBancada.some(
      (l) =>
        l.prontuario === prontuarioFinal &&
        l.paciente === nomePacienteLimpo &&
        l.exame === classificacao.nomeExamePadronizado
    );

    if (!jaTemLinhaExame) {
      linhasRelatorioBancada.push({
        exame: classificacao.nomeExamePadronizado,
        paciente: nomePacienteLimpo,
        prontuario: prontuarioFinal,
        resultado: "",
      });
    }

    // Unificar paciente para o app de bancada (1 registro por paciente com todas as flags dos seus exames)
    const chavePaciente = `${prontuarioFinal}_${nomePacienteLimpo}`;

    if (!mapaPacientes.has(chavePaciente)) {
      mapaPacientes.set(chavePaciente, {
        item: {
          id: `rot-${dataLinha}-${prontuarioFinal}`,
          data: dataLinha,
          data_rotina: dataLinha,
          status_coleta: "REALIZADO",
          prontuario: prontuarioFinal,
          nome_paciente: nomePacienteLimpo,
          idade_sexo: "SUS",
          posto_unidade: "Conecta SUS",
          solicitante: "Conecta SUS",
          exame: classificacao.nomeExamePadronizado,
          tem_laudo: false,
          tem_urina: false,
          tem_pso: false,
          tem_coagulograma: false,
          tem_tap: false,
          tem_ttpa: false,
          tem_vdrl: false,
          tem_beta_hcg: false,
          tem_vhs: false,
          tem_pcr: false,
          tem_aslo: false,
          tem_fr: false,
          tem_proteinuria_rapida: false,
          tem_abo_rh: false,
        },
        examesSet: new Set<string>(),
      });
    }

    const registro = mapaPacientes.get(chavePaciente)!;
    registro.examesSet.add(classificacao.nomeExamePadronizado);

    if (classificacao.categoria === "urina") registro.item.tem_urina = true;
    if (classificacao.categoria === "proteinuria_rapida")
      registro.item.tem_proteinuria_rapida = true;
    if (classificacao.categoria === "pso") registro.item.tem_pso = true;
    if (classificacao.categoria === "coagulograma") {
      registro.item.tem_coagulograma = true;
      if (classificacao.subTipoCoag === "tap") registro.item.tem_tap = true;
      else if (classificacao.subTipoCoag === "ttpa") registro.item.tem_ttpa = true;
      else {
        registro.item.tem_tap = true;
        registro.item.tem_ttpa = true;
      }
    }
    if (classificacao.categoria === "vdrl") registro.item.tem_vdrl = true;
    if (classificacao.categoria === "pcr") registro.item.tem_pcr = true;
    if (classificacao.categoria === "aslo") registro.item.tem_aslo = true;
    if (classificacao.categoria === "fr") registro.item.tem_fr = true;
    if (classificacao.categoria === "vhs") registro.item.tem_vhs = true;
    if (classificacao.categoria === "beta_hcg") registro.item.tem_beta_hcg = true;
    if (classificacao.categoria === "abo_rh") registro.item.tem_abo_rh = true;

    registro.item.exame = Array.from(registro.examesSet).join(" + ");
  }

  // Ordenar as linhas da Tiragem exatamente como na "Bancada 15/10":
  // 1º por Nome do Exame (A-Z), 2º por Nome do Paciente (A-Z)
  linhasRelatorioBancada.sort((a, b) => {
    const cmpExame = a.exame.localeCompare(b.exame, "pt-BR");
    if (cmpExame !== 0) return cmpExame;
    return a.paciente.localeCompare(b.paciente, "pt-BR");
  });

  // Ordenar os pacientes unificados por Nome do Paciente (A-Z)
  // Assim a fila da Urina I no celular (1, 2, 3, 4, 5, 6...) fica na EXATA mesma ordem da Tiragem impressa!
  const pacientesUnificados = Array.from(mapaPacientes.values())
    .map((v) => v.item)
    .sort((a, b) => a.nome_paciente.localeCompare(b.nome_paciente, "pt-BR"));

  return {
    dataReferencia,
    totalLinhasBrutas,
    totalExamesBancada,
    totalDescartadosBioquimica,
    totalLidos: totalLinhasBrutas,
    totalAproveitados: pacientesUnificados.length,
    totalDescartadosAutomatizados: totalDescartadosBioquimica,
    linhasRelatorioBancada,
    pacientesUnificados,
  };
}
