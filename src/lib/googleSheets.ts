import { google } from "googleapis";
import { LaudoUrina, RotinaItem } from "@/types/urinalise";
import { MOCK_LAUDOS, MOCK_ROTINA } from "./mockData";

// Em memória para desenvolvimento e fallback caso as chaves não estejam configuradas
let localMemoryLaudos: LaudoUrina[] = [...MOCK_LAUDOS];
let localMemoryRotina: RotinaItem[] = [...MOCK_ROTINA];

export const SHEET_NAME_LAUDOS = "Laudos_Urina";
export const SHEET_NAME_ROTINA = "Rotina_Dia";

export const CABECALHO_LAUDOS = [
  "id",
  "data_hora",
  "prontuario",
  "nome_paciente",
  "cor",
  "aspecto",
  "densidade",
  "ph",
  "proteina",
  "glicose",
  "cetona",
  "bilirrubina",
  "urobilinogenio",
  "sangue",
  "nitrito",
  "leucocitos_fita",
  "celulas_epiteliais",
  "leucocitos_campo",
  "hemacias_campo",
  "bacterias",
  "cristais",
  "cilindros",
  "observacoes",
  "status",
  "resultado_pso",
  "resultado_proteinuria_rapida",
  "resultado_beta_hcg",
  "resultado_vdrl",
  "resultado_vhs",
  "resultado_pcr",
  "coagulograma_tp",
  "coagulograma_ttpa",
];

export const CABECALHO_ROTINA = [
  "id",
  "data",
  "prontuario",
  "nome_paciente",
  "idade_sexo",
  "exame",
  "status_coleta",
  "status_laudo",
];

export function isGoogleSheetsConfigured(): boolean {
  const email = process.env.GOOGLE_SHEETS_CLIENT_EMAIL || process.env.GOOGLE_CLIENT_EMAIL || process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const key = process.env.GOOGLE_SHEETS_PRIVATE_KEY || process.env.GOOGLE_PRIVATE_KEY || process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  const id = process.env.GOOGLE_SHEETS_SHEET_ID || process.env.NEXT_PUBLIC_BANCO_SHEET_ID || process.env.BANCO_SHEET_ID || process.env.SHEET_ID;
  return Boolean(email && key && id);
}

export function getGoogleSheetsClient() {
  const clientEmail = process.env.GOOGLE_SHEETS_CLIENT_EMAIL || process.env.GOOGLE_CLIENT_EMAIL || process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  let privateKey = process.env.GOOGLE_SHEETS_PRIVATE_KEY || process.env.GOOGLE_PRIVATE_KEY || process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  const sheetId = process.env.GOOGLE_SHEETS_SHEET_ID || process.env.NEXT_PUBLIC_BANCO_SHEET_ID || process.env.BANCO_SHEET_ID || process.env.SHEET_ID;

  if (!clientEmail || !privateKey || !sheetId) {
    return null;
  }

  // Tratar quebras de linha na chave privada caso venham como string literal \n
  if (privateKey.includes("\\n")) {
    privateKey = privateKey.replace(/\\n/g, "\n");
  }

  const auth = new google.auth.JWT({
    email: clientEmail,
    key: privateKey,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });

  const sheets = google.sheets({ version: "v4", auth });
  return { sheets, sheetId };
}

/**
 * Garante que as abas necessárias existam na planilha com seus cabeçalhos
 */
export async function ensureSheetsExist(): Promise<{ ok: boolean; message: string }> {
  const gClient = getGoogleSheetsClient();
  if (!gClient) {
    return {
      ok: false,
      message: "Credenciais do Google Sheets não configuradas. Operando em modo de memória local.",
    };
  }

  const { sheets, sheetId } = gClient;

  try {
    const meta = await sheets.spreadsheets.get({ spreadsheetId: sheetId });
    const existingTitles = meta.data.sheets?.map((s) => s.properties?.title) || [];

    const requests: any[] = [];
    if (!existingTitles.includes(SHEET_NAME_LAUDOS)) {
      requests.push({
        addSheet: {
          properties: { title: SHEET_NAME_LAUDOS },
        },
      });
    }

    if (!existingTitles.includes(SHEET_NAME_ROTINA)) {
      requests.push({
        addSheet: {
          properties: { title: SHEET_NAME_ROTINA },
        },
      });
    }

    if (requests.length > 0) {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: sheetId,
        requestBody: { requests },
      });
    }

    // Verificar e inserir cabeçalhos se vazios
    if (!existingTitles.includes(SHEET_NAME_LAUDOS)) {
      await sheets.spreadsheets.values.update({
        spreadsheetId: sheetId,
        range: `${SHEET_NAME_LAUDOS}!A1:AF1`,
        valueInputOption: "RAW",
        requestBody: { values: [CABECALHO_LAUDOS] },
      });
    }

    if (!existingTitles.includes(SHEET_NAME_ROTINA)) {
      await sheets.spreadsheets.values.update({
        spreadsheetId: sheetId,
        range: `${SHEET_NAME_ROTINA}!A1:H1`,
        valueInputOption: "RAW",
        requestBody: { values: [CABECALHO_ROTINA] },
      });
    }

    return { ok: true, message: "Planilha conectada e abas verificadas com sucesso!" };
  } catch (error: any) {
    console.error("Erro ao verificar planilhas:", error);
    return { ok: false, message: error.message || "Erro desconhecido ao conectar com o Google Sheets" };
  }
}

/**
 * Salva ou atualiza um laudo de urina
 */
export async function salvarOuAtualizarLaudo(laudo: LaudoUrina): Promise<{ ok: boolean; message: string; laudo: LaudoUrina }> {
  const gClient = getGoogleSheetsClient();

  if (!gClient) {
    // Modo de memória
    const existingIndex = localMemoryLaudos.findIndex(
      (l) => l.prontuario === laudo.prontuario && l.data_hora.split("T")[0] === laudo.data_hora.split("T")[0]
    );

    if (existingIndex >= 0) {
      localMemoryLaudos[existingIndex] = { ...laudo };
    } else {
      localMemoryLaudos.unshift({ ...laudo });
    }

    // Atualiza status da rotina correspondente
    const rotinaItem = localMemoryRotina.find((r) => r.prontuario === laudo.prontuario);
    if (rotinaItem) {
      rotinaItem.tem_laudo = true;
      rotinaItem.status_laudo = laudo.status;
    }

    return {
      ok: true,
      message: "Laudo salvo com sucesso (Modo Demonstração / Memória).",
      laudo,
    };
  }

  const { sheets, sheetId } = gClient;

  try {
    await ensureSheetsExist();

    // Ler todas as linhas da aba Laudos_Urina
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: `${SHEET_NAME_LAUDOS}!A:AF`,
    });

    const rows = res.data.values || [];
    let targetRowIndex = -1;

    // Inspecionar se o cabeçalho existente tem a coluna "id"
    const headerRow = (rows[0] || []).map((h) => (h || "").toString().toLowerCase().trim());
    const temId = headerRow[0] === "id";

    const laudoId = laudo.id || `LAUDO-${laudo.data_hora.split("T")[0]}-${laudo.prontuario.trim()}`;
    const laudoDate = laudo.data_hora.split("T")[0];

    // Localizar linha por ID ou por prontuário + data
    const idxPront = headerRow.findIndex((h) => h.includes("pront"));
    const idxData = headerRow.findIndex((h) => h.includes("data"));
    const idxId = headerRow.indexOf("id");

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const rId = idxId >= 0 ? (row[idxId] || "").toString().trim() : "";
      const rPront = idxPront >= 0 ? (row[idxPront] || "").toString().trim() : (row[temId ? 2 : 1] || "").toString().trim();
      const rData = idxData >= 0 ? (row[idxData] || "").toString().split("T")[0].trim() : (row[temId ? 1 : 0] || "").toString().split("T")[0].trim();

      if ((rId && rId === laudoId) || (rPront === laudo.prontuario.trim() && rData === laudoDate)) {
        targetRowIndex = i + 1; // 1-based index no sheets
        break;
      }
    }

    const rowValoresBase = [
      laudo.data_hora,
      laudo.prontuario,
      laudo.nome_paciente,
      laudo.cor,
      laudo.aspecto,
      laudo.densidade,
      laudo.ph,
      laudo.proteina,
      laudo.glicose,
      laudo.cetona,
      laudo.bilirrubina,
      laudo.urobilinogenio,
      laudo.sangue,
      laudo.nitrito,
      laudo.leucocitos_fita,
      laudo.celulas_epiteliais,
      laudo.leucocitos_campo,
      laudo.hemacias_campo,
      laudo.bacterias,
      laudo.cristais,
      laudo.cilindros,
      laudo.observacoes,
      laudo.status,
      laudo.resultado_pso || "",
      laudo.resultado_proteinuria_rapida || "",
      laudo.resultado_beta_hcg || "",
      laudo.resultado_vdrl || "",
      laudo.resultado_vhs || "",
      laudo.resultado_pcr || "",
      laudo.tp_inr ? `TP: ${laudo.tp_tempo || ""} (INR: ${laudo.tp_inr})` : (laudo.tp_tempo || ""),
      laudo.ttpa_tempo ? `TTPA: ${laudo.ttpa_tempo || ""} (Rel: ${laudo.ttpa_relacao || ""})` : "",
    ];

    const rowData = temId ? [laudoId, ...rowValoresBase] : rowValoresBase;
    const finalCol = temId ? "AF" : "AE";

    if (targetRowIndex > 0) {
      // Atualizar linha existente
      await sheets.spreadsheets.values.update({
        spreadsheetId: sheetId,
        range: `${SHEET_NAME_LAUDOS}!A${targetRowIndex}:${finalCol}${targetRowIndex}`,
        valueInputOption: "USER_ENTERED",
        requestBody: { values: [rowData] },
      });
    } else {
      // Inserir nova linha
      await sheets.spreadsheets.values.append({
        spreadsheetId: sheetId,
        range: `${SHEET_NAME_LAUDOS}!A:${finalCol}`,
        valueInputOption: "USER_ENTERED",
        insertDataOption: "INSERT_ROWS",
        requestBody: { values: [rowData] },
      });
    }

    return {
      ok: true,
      message: "Laudo gravado no Google Sheets com sucesso!",
      laudo,
    };
  } catch (err: any) {
    console.error("Erro ao salvar no Google Sheets:", err);
    // Fallback de contingência local para não perder o laudo do operador
    localMemoryLaudos.unshift(laudo);
    return {
      ok: false,
      message: `Erro na API do Google Sheets: ${err.message}. Laudo guardado em cache de contingência local.`,
      laudo,
    };
  }
}

/**
 * Retorna os laudos de uma determinada data (YYYY-MM-DD) ou todos
 */
export async function listarLaudos(dataFiltro?: string): Promise<LaudoUrina[]> {
  const gClient = getGoogleSheetsClient();

  if (!gClient) {
    if (!dataFiltro) return localMemoryLaudos;
    return localMemoryLaudos.filter((l) => l.data_hora.split("T")[0] === dataFiltro);
  }

  const { sheets, sheetId } = gClient;

  try {
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: `${SHEET_NAME_LAUDOS}!A:AF`,
    });

    const rows = res.data.values || [];
    if (rows.length <= 1) return [];

    const headerRow = (rows[0] || []).map((h) => (h || "").toString().toLowerCase().trim());
    const temId = headerRow[0] === "id";
    const offset = temId ? 1 : 0;

    const laudos: LaudoUrina[] = [];

    for (let i = 1; i < rows.length; i++) {
      const r = rows[i];
      if (!r || r.length === 0 || !r[offset + 1]) continue;

      const rowDate = (r[offset] || "").toString().split("T")[0];
      if (dataFiltro && rowDate !== dataFiltro) continue;

      laudos.push({
        id: temId ? r[0] : `laudo-row-${i}`,
        data_hora: r[offset] || new Date().toISOString(),
        prontuario: (r[offset + 1] || "").toString(),
        nome_paciente: (r[offset + 2] || "").toString(),
        cor: r[offset + 3] || "Amarelo citrino",
        aspecto: r[offset + 4] || "Límpido",
        densidade: r[offset + 5] || "1.020",
        ph: r[offset + 6] || "6.0",
        proteina: r[offset + 7] || "Negativo",
        glicose: r[offset + 8] || "Negativo",
        cetona: r[offset + 9] || "Negativo",
        bilirrubina: r[offset + 10] || "Negativo",
        urobilinogenio: r[offset + 11] || "Normal",
        sangue: r[offset + 12] || "Negativo",
        nitrito: r[offset + 13] || "Negativo",
        leucocitos_fita: r[offset + 14] || "Negativo",
        celulas_epiteliais: r[offset + 15] || "Raras",
        leucocitos_campo: r[offset + 16] || "0 a 4 p/c",
        hemacias_campo: r[offset + 17] || "0 a 2 p/c",
        bacterias: r[offset + 18] || "Ausentes",
        cristais: r[offset + 19] || "Ausentes",
        cilindros: r[offset + 20] || "Ausentes",
        observacoes: r[offset + 21] || "",
        status: (r[offset + 22] as any) || "finalizado",
        resultado_pso: r[offset + 23] || undefined,
        tem_pso: Boolean(r[offset + 23]),
        resultado_proteinuria_rapida: r[offset + 24] || undefined,
        tem_proteinuria_rapida: Boolean(r[offset + 24]),
        resultado_beta_hcg: r[offset + 25] || undefined,
        tem_beta_hcg: Boolean(r[offset + 25]),
        resultado_vdrl: r[offset + 26] || undefined,
        tem_vdrl: Boolean(r[offset + 26]),
        resultado_vhs: r[offset + 27] || undefined,
        tem_vhs: Boolean(r[offset + 27]),
        resultado_pcr: r[offset + 28] || undefined,
        tem_pcr: Boolean(r[offset + 28]),
        tp_tempo: r[offset + 29] || undefined,
        tem_coagulograma: Boolean(r[offset + 29] || r[offset + 30]),
        ttpa_tempo: r[offset + 30] || undefined,
      });
    }

    return laudos.reverse(); // mais recentes primeiro
  } catch (err) {
    console.error("Erro ao listar laudos:", err);
    if (!dataFiltro) return localMemoryLaudos;
    return localMemoryLaudos.filter((l) => l.data_hora.split("T")[0] === dataFiltro);
  }
}

/**
 * Salva a lista de rotina do dia
 */
export async function salvarRotinaDia(itens: RotinaItem[]): Promise<{ ok: boolean; count: number; message: string }> {
  const gClient = getGoogleSheetsClient();

  if (!gClient) {
    localMemoryRotina = [...itens];
    return {
      ok: true,
      count: itens.length,
      message: `${itens.length} pacientes importados para a rotina diária (Modo Memória/Local).`,
    };
  }

  const { sheets, sheetId } = gClient;

  try {
    await ensureSheetsExist();

    // Ler cabeçalho atual da aba Rotina_Dia
    const metaRes = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: `${SHEET_NAME_ROTINA}!1:1`,
    });

    const headerRow = (metaRes.data.values?.[0] || []).map((h: any) => (h || "").toString().toLowerCase().trim());
    const temId = headerRow.length === 0 || headerRow[0] === "id";

    // Limpar conteúdo anterior da aba de rotina e reescrever cabeçalho + novas linhas
    await sheets.spreadsheets.values.clear({
      spreadsheetId: sheetId,
      range: `${SHEET_NAME_ROTINA}!A:J`,
    });

    const header = temId ? CABECALHO_ROTINA : ["data", "prontuario", "nome_paciente", "idade_sexo", "exame", "status_coleta", "status_laudo"];

    const values = [
      header,
      ...itens.map((item, idx) => {
        const itemId = item.id || `ROT-${item.data || new Date().toISOString().split("T")[0]}-${item.prontuario || idx + 1}`;
        const itemData = item.data || new Date().toISOString().split("T")[0];
        const baseRow = [
          itemData,
          item.prontuario,
          item.nome_paciente,
          item.idade_sexo || "",
          item.exame || "URINA TIPO I (EAS)",
          item.status_coleta || "REALIZADO",
          item.status_laudo || "PENDENTE",
        ];
        return temId ? [itemId, ...baseRow] : baseRow;
      }),
    ];

    await sheets.spreadsheets.values.update({
      spreadsheetId: sheetId,
      range: `${SHEET_NAME_ROTINA}!A1`,
      valueInputOption: "USER_ENTERED",
      requestBody: { values },
    });

    return {
      ok: true,
      count: itens.length,
      message: `${itens.length} pacientes sincronizados com sucesso na aba Rotina_Dia do Google Sheets!`,
    };
  } catch (err: any) {
    console.error("Erro ao salvar rotina no Google Sheets:", err);
    localMemoryRotina = [...itens];
    return {
      ok: false,
      count: itens.length,
      message: `Erro no Sheets (${err.message}). Salvo em memória local.`,
    };
  }
}

/**
 * Retorna os pacientes da rotina do dia
 */
export async function listarRotinaDia(dataFiltro?: string): Promise<RotinaItem[]> {
  const gClient = getGoogleSheetsClient();

  if (!gClient) {
    if (!dataFiltro) return localMemoryRotina;
    return localMemoryRotina.filter((r) => r.data === dataFiltro);
  }

  const { sheets, sheetId } = gClient;

  try {
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: `${SHEET_NAME_ROTINA}!A:J`,
    });

    const rows = res.data.values || [];
    if (rows.length <= 1) return [];

    const headerRow = (rows[0] || []).map((h: any) => (h || "").toString().toLowerCase().trim());
    const idxId = headerRow.indexOf("id");
    const idxData = headerRow.findIndex((h: string) => h.includes("data"));
    const idxPront = headerRow.findIndex((h: string) => h.includes("pront"));
    const idxNome = headerRow.findIndex((h: string) => h.includes("nome") || h.includes("paciente"));
    const idxIdade = headerRow.findIndex((h: string) => h.includes("idade") || h.includes("sexo"));
    const idxExame = headerRow.findIndex((h: string) => h.includes("exame"));
    const idxStatus = headerRow.findIndex((h: string) => h.includes("status_coleta") || (h.includes("status") && !h.includes("laudo")));
    const idxStatusLaudo = headerRow.findIndex((h: string) => h.includes("status_laudo"));

    const rotina: RotinaItem[] = [];

    for (let i = 1; i < rows.length; i++) {
      const r = rows[i];
      if (!r || r.length === 0) continue;

      const prontuario = (idxPront >= 0 ? r[idxPront] : r[1] || "").toString().trim();
      if (!prontuario) continue;

      const rowDate = (idxData >= 0 ? r[idxData] : r[0] || "").toString().trim();
      if (dataFiltro && rowDate !== dataFiltro) continue;

      rotina.push({
        id: idxId >= 0 ? r[idxId] : `rot-row-${i}`,
        data: rowDate || new Date().toISOString().split("T")[0],
        prontuario,
        nome_paciente: (idxNome >= 0 ? r[idxNome] : r[2] || "").toString().trim(),
        idade_sexo: (idxIdade >= 0 ? r[idxIdade] : r[3] || "").toString().trim(),
        posto_unidade: "",
        solicitante: "",
        exame: (idxExame >= 0 ? r[idxExame] : r[4] || "URINA TIPO I (EAS)").toString().trim(),
        status_coleta: (idxStatus >= 0 ? r[idxStatus] : "REALIZADO").toString().trim(),
        status_laudo: (idxStatusLaudo >= 0 ? (r[idxStatusLaudo] as any) : "rascunho"),
      });
    }

    return rotina;
  } catch (err) {
    console.error("Erro ao ler rotina do Google Sheets:", err);
    if (!dataFiltro) return localMemoryRotina;
    return localMemoryRotina.filter((r) => r.data === dataFiltro);
  }
}
