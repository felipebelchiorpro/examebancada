export const DEFAULT_SHEET_ID = "1BLgTktM_WrcM_bt2jLVsVxjFLmt-uqukm1NqkJ4ebWQ";
export const DEFAULT_CLIENT_EMAIL = "laboratorio-caconde@citric-inkwell-471303-m8.iam.gserviceaccount.com";

import { google } from "googleapis";
import { LaudoUrina, RotinaItem, StatusLaudo } from "@/types/urinalise";
import { aplicarFlagsExamesNoItem, formatarProntuario } from "./extratorBancada";

export type { LaudoUrina, RotinaItem, StatusLaudo };
export type ItemRotina = RotinaItem;

// Armazenamento em memória global para persistir durante a instância e servir de fallback imediato
const globalForStore = global as unknown as {
  localMemoryLaudos: LaudoUrina[];
  localMemoryRotina: RotinaItem[];
};

if (!globalForStore.localMemoryLaudos) {
  globalForStore.localMemoryLaudos = [];
}
if (!globalForStore.localMemoryRotina) {
  globalForStore.localMemoryRotina = [];
}

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
  "resultado_abo_rh",
  "volume",
  "resultado_aslo",
  "resultado_fr",
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

export function normalizarDataIso(val: string | undefined): string {
  const s = String(val ?? "").trim();
  if (!s) return "";
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
    return s.substring(0, 10);
  }
  const brMatch = s.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (brMatch) {
    return `${brMatch[3]}-${brMatch[2]}-${brMatch[1]}`;
  }
  return s.split("T")[0];
}

export function extractSpreadsheetId(rawId?: string): string {
  if (!rawId) return "";
  const trimmed = rawId.trim();
  const match = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (match && match[1]) {
    return match[1];
  }
  return trimmed.replace(/^["']|["']$/g, "");
}

export function extractPrivateKey(rawKey?: string): string {
  if (!rawKey) return "";
  let key = rawKey.trim();
  if (key.startsWith("{") && key.includes("private_key")) {
    try {
      const parsed = JSON.parse(key);
      if (parsed.private_key) return extractPrivateKey(parsed.private_key);
    } catch (_) {
      const match = key.match(/"private_key"\s*:\s*"([^"]+)"/);
      if (match && match[1]) return extractPrivateKey(match[1]);
    }
  }
  if ((key.startsWith('"') && key.endsWith('"')) || (key.startsWith("'") && key.endsWith("'"))) {
    key = key.slice(1, -1);
  }
  key = key.replace(/\\n/g, "\n").replace(/\\r/g, "\r");
  return key;
}

function tryExtractFromCandidate(rawCandidate: string): { email?: string; key?: string } {
  const trimmed = rawCandidate.trim().replace(/^["']|["']$/g, "").trim();
  if (!trimmed) return {};

  // Caso 1: JSON direto (mesmo que tenha quebras de linha literais)
  if (trimmed.startsWith("{")) {
    try {
      const parsed = JSON.parse(trimmed);
      if (parsed.private_key) {
        return {
          email: parsed.client_email ? String(parsed.client_email).trim() : undefined,
          key: extractPrivateKey(String(parsed.private_key)),
        };
      }
    } catch (_) {
      const emailMatch = trimmed.match(/"client_email"\s*:\s*"([^"]+)"/);
      const keyMatch = trimmed.match(/"private_key"\s*:\s*"([\s\S]*?)"\s*[,}]/);
      if (keyMatch && keyMatch[1]) {
        return {
          email: emailMatch?.[1]?.trim(),
          key: extractPrivateKey(keyMatch[1]),
        };
      }
    }
  }

  // Caso 2: Chave PEM direta ("-----BEGIN PRIVATE KEY-----...")
  if (trimmed.includes("BEGIN PRIVATE KEY")) {
    return { key: extractPrivateKey(trimmed) };
  }

  // Caso 3: Decodificar Base64 (removendo espaços/quebras de linha do Base64)
  try {
    const cleanB64 = trimmed.replace(/\s+/g, "");
    const decoded = Buffer.from(cleanB64, "base64").toString("utf-8").trim();

    if (decoded.startsWith("{") || decoded.includes('"private_key"')) {
      try {
        const parsed = JSON.parse(decoded);
        if (parsed.private_key) {
          return {
            email: parsed.client_email ? String(parsed.client_email).trim() : undefined,
            key: extractPrivateKey(String(parsed.private_key)),
          };
        }
      } catch (_) {
        const emailMatch = decoded.match(/"client_email"\s*:\s*"([^"]+)"/);
        const keyMatch = decoded.match(/"private_key"\s*:\s*"([\s\S]*?)"\s*[,}]/);
        if (keyMatch && keyMatch[1]) {
          return {
            email: emailMatch?.[1]?.trim(),
            key: extractPrivateKey(keyMatch[1]),
          };
        }
      }
    }

    if (decoded.includes("BEGIN PRIVATE KEY")) {
      return { key: extractPrivateKey(decoded) };
    }
  } catch (_) {}

  // Caso 4: Se o usuário colou apenas o corpo Base64 interno da chave PEM (ex: MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...)
  const cleanB64 = trimmed.replace(/\s+/g, "");
  if (cleanB64.startsWith("MII") && cleanB64.length > 500) {
    const wrappedPem = `-----BEGIN PRIVATE KEY-----\n${cleanB64}\n-----END PRIVATE KEY-----\n`;
    return { key: wrappedPem };
  }

  return {};
}

export function getGoogleSheetsCredentials() {
  const allCandidates = [
    process.env.GOOGLE_CREDENTIALS_BASE64,
    process.env.CREDENTIALS_BASE64,
    process.env.GOOGLE_CREDENTIALS,
    process.env.GOOGLE_SERVICE_ACCOUNT,
    process.env.GOOGLE_SERVICE_ACCOUNT_JSON,
    process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON,
    process.env.SERVICE_ACCOUNT_JSON,
    process.env.GOOGLE_SHEETS_CREDENTIALS,
    process.env.CREDENTIALS,
    process.env.GOOGLE_SHEETS_PRIVATE_KEY,
    process.env.GOOGLE_PRIVATE_KEY,
    process.env.GOOGLE_SERVICE_ACCOUNT_KEY,
    process.env.SERVICE_ACCOUNT_KEY,
    process.env.PRIVATE_KEY,
  ];

  let clientEmail = "";
  let privateKey = "";

  for (const candidate of allCandidates) {
    if (!candidate) continue;
    const extracted = tryExtractFromCandidate(candidate);
    if (extracted.email && !clientEmail) {
      clientEmail = extracted.email;
    }
    if (extracted.key && !privateKey) {
      privateKey = extracted.key;
    }
    if (clientEmail && privateKey) break;
  }

  if (!clientEmail) {
    clientEmail = (
      process.env.GOOGLE_SHEETS_CLIENT_EMAIL ||
      process.env.GOOGLE_CLIENT_EMAIL ||
      process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL ||
      process.env.SERVICE_ACCOUNT_EMAIL ||
      process.env.CLIENT_EMAIL ||
      process.env.NEXT_PUBLIC_GOOGLE_CLIENT_EMAIL ||
      DEFAULT_CLIENT_EMAIL
    )
      .trim()
      .replace(/^["']|["']$/g, "");
  }

  const rawSheetId =
    process.env.GOOGLE_SHEETS_SHEET_ID ||
    process.env.NEXT_PUBLIC_BANCO_SHEET_ID ||
    process.env.BANCO_SHEET_ID ||
    process.env.SHEET_ID ||
    process.env.GOOGLE_SHEET_ID ||
    process.env.SPREADSHEET_ID ||
    process.env.NEXT_PUBLIC_SHEET_ID ||
    process.env.NEXT_PUBLIC_GOOGLE_SHEETS_SHEET_ID ||
    "";
  const sheetId = extractSpreadsheetId(rawSheetId) || DEFAULT_SHEET_ID;

  return { clientEmail, privateKey, sheetId };
}

export function isGoogleSheetsConfigured(): boolean {
  const { clientEmail, privateKey, sheetId } = getGoogleSheetsCredentials();
  return Boolean(clientEmail && privateKey && sheetId);
}

export function getGoogleSheetsClient() {
  const { clientEmail, privateKey, sheetId } = getGoogleSheetsCredentials();

  if (!clientEmail || !privateKey || !sheetId) {
    return null;
  }

  const auth = new google.auth.JWT({
    email: clientEmail,
    key: privateKey,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });

  const sheets = google.sheets({ version: "v4", auth });
  return { sheets, sheetId, clientEmail };
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

    if (!existingTitles.includes(SHEET_NAME_LAUDOS)) {
      await sheets.spreadsheets.values.update({
        spreadsheetId: sheetId,
        range: `${SHEET_NAME_LAUDOS}!A1:AJ1`,
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
    let msg = error.message || "Erro desconhecido ao conectar com o Google Sheets";
    if (
      error.code === 403 ||
      msg.includes("The caller does not have permission") ||
      msg.includes("permission")
    ) {
      msg =
        "Permissão Negada (403): O Google Sheets existe, mas você precisa compartilhá-lo com o e-mail da conta de serviço (" +
        (gClient?.clientEmail || "seu service account") +
        ') com permissão de "Editor".';
    } else if (
      error.code === 404 ||
      msg.includes("Requested entity was not found") ||
      msg.includes("not found")
    ) {
      msg =
        'Planilha não encontrada (404): O ID "' +
        sheetId +
        '" não existe ou a conta não tem acesso. Verifique a URL da planilha.';
    } else if (
      msg.includes("PEM") ||
      msg.includes("DECODER") ||
      msg.includes("start line") ||
      msg.includes("unsupported")
    ) {
      msg =
        "Chave Privada inválida: Verifique o formato da variável GOOGLE_SHEETS_PRIVATE_KEY. Ela deve começar com -----BEGIN PRIVATE KEY-----.";
    }
    return { ok: false, message: msg };
  }
}

/**
 * Salva ou atualiza um laudo de urina / bancada
 */
export async function salvarOuAtualizarLaudo(
  laudoInput: LaudoUrina
): Promise<{ ok: boolean; acao?: "criado" | "atualizado"; message: string; laudo: LaudoUrina }> {
  const prontPadrao = formatarProntuario(laudoInput.prontuario);
  const dataHoraFinal = laudoInput.data_hora || new Date().toISOString();
  const laudoDate = normalizarDataIso(dataHoraFinal);

  const laudo: LaudoUrina = {
    ...laudoInput,
    prontuario: prontPadrao,
    data_hora: dataHoraFinal,
  };

  // Atualizar sempre em memória imediatamente
  const existingIndex = globalForStore.localMemoryLaudos.findIndex(
    (l) =>
      formatarProntuario(l.prontuario) === prontPadrao &&
      normalizarDataIso(l.data_hora) === laudoDate
  );

  if (existingIndex >= 0) {
    globalForStore.localMemoryLaudos[existingIndex] = { ...laudo };
  } else {
    globalForStore.localMemoryLaudos.unshift({ ...laudo });
  }

  const rotinaItem = globalForStore.localMemoryRotina.find(
    (r) => formatarProntuario(r.prontuario) === prontPadrao
  );
  if (rotinaItem) {
    rotinaItem.tem_laudo = true;
    rotinaItem.status_laudo = laudo.status;
  }

  const gClient = getGoogleSheetsClient();
  if (!gClient) {
    return {
      ok: true,
      acao: existingIndex >= 0 ? "atualizado" : "criado",
      message: "Laudo salvo com sucesso!",
      laudo,
    };
  }

  const { sheets, sheetId } = gClient;

  try {
    await ensureSheetsExist();

    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: `${SHEET_NAME_LAUDOS}!A:AJ`,
    });

    const rows = res.data.values || [];
    let targetRowIndex = -1;

    const headerRow = (rows[0] || []).map((h) => (h || "").toString().toLowerCase().trim());
    const temId = headerRow.length === 0 || headerRow[0] === "id";

    const laudoId = laudo.id || `LAUDO-${laudoDate}-${prontPadrao}`;

    const idxPront = headerRow.findIndex((h) => h.includes("pront"));
    const idxData = headerRow.findIndex((h) => h.includes("data"));
    const idxId = headerRow.indexOf("id");

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const rId = idxId >= 0 ? (row[idxId] || "").toString().trim() : "";
      const rPront = formatarProntuario(
        idxPront >= 0 ? row[idxPront] : row[temId ? 2 : 1] || ""
      );
      const rData = normalizarDataIso(
        idxData >= 0 ? row[idxData] : row[temId ? 1 : 0] || ""
      );

      if ((rId && rId === laudoId) || (rPront === prontPadrao && rData === laudoDate)) {
        targetRowIndex = i + 1;
        break;
      }
    }

    const rowValoresBase = [
      laudo.data_hora,
      prontPadrao,
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
      laudo.tp_inr ? `TP: ${laudo.tp_tempo || ""} (INR: ${laudo.tp_inr})` : laudo.tp_tempo || "",
      laudo.ttpa_tempo
        ? `TTPA: ${laudo.ttpa_tempo || ""} (Rel: ${laudo.ttpa_relacao || ""})`
        : "",
      laudo.resultado_abo_rh || "",
      laudo.volume || "60 mL",
      laudo.resultado_aslo || "",
      laudo.resultado_fr || "",
    ];
    const rowData = temId ? [laudoId, ...rowValoresBase] : rowValoresBase;
    const finalCol = temId ? "AJ" : "AI";

    if (targetRowIndex > 0) {
      await sheets.spreadsheets.values.update({
        spreadsheetId: sheetId,
        range: `${SHEET_NAME_LAUDOS}!A${targetRowIndex}:${finalCol}${targetRowIndex}`,
        valueInputOption: "RAW",
        requestBody: { values: [rowData] },
      });
    } else {
      await sheets.spreadsheets.values.append({
        spreadsheetId: sheetId,
        range: `${SHEET_NAME_LAUDOS}!A:${finalCol}`,
        valueInputOption: "RAW",
        insertDataOption: "INSERT_ROWS",
        requestBody: { values: [rowData] },
      });
    }

    return {
      ok: true,
      acao: targetRowIndex > 0 ? "atualizado" : "criado",
      message: "Laudo gravado no Google Sheets com sucesso!",
      laudo,
    };
  } catch (err: any) {
    console.error("Erro ao salvar no Google Sheets:", err);
    return {
      ok: true,
      acao: existingIndex >= 0 ? "atualizado" : "criado",
      message: `Laudo salvo em memória do servidor (${err.message}).`,
      laudo,
    };
  }
}

/**
 * Retorna os laudos de uma determinada data (YYYY-MM-DD) ou filtrados por objeto
 */
export async function listarLaudos(
  filtro?: string | { prontuario?: string; data?: string; busca?: string }
): Promise<LaudoUrina[]> {
  const dataFiltro =
    typeof filtro === "string" ? normalizarDataIso(filtro) : normalizarDataIso(filtro?.data);
  const prontFiltro =
    typeof filtro === "object" && filtro?.prontuario
      ? formatarProntuario(filtro.prontuario).toLowerCase()
      : "";
  const buscaFiltro =
    typeof filtro === "object" && filtro?.busca ? filtro.busca.trim().toLowerCase() : "";

  const gClient = getGoogleSheetsClient();
  let laudos: LaudoUrina[] = [];

  if (!gClient) {
    laudos = [...globalForStore.localMemoryLaudos];
  } else {
    const { sheets, sheetId } = gClient;
    try {
      const res = await sheets.spreadsheets.values.get({
        spreadsheetId: sheetId,
        range: `${SHEET_NAME_LAUDOS}!A:AJ`,
      });

      const rows = res.data.values || [];
      if (rows.length > 1) {
        const headerRow = (rows[0] || []).map((h) => (h || "").toString().toLowerCase().trim());
        const temId = headerRow[0] === "id";
        const offset = temId ? 1 : 0;

        for (let i = 1; i < rows.length; i++) {
          const r = rows[i];
          if (!r || r.length === 0 || !r[offset + 1]) continue;

          const rowDate = normalizarDataIso((r[offset] || "").toString());
          if (dataFiltro && rowDate !== dataFiltro) continue;

          laudos.push({
            id: temId ? r[0] : `laudo-row-${i}`,
            data_hora: r[offset] || new Date().toISOString(),
            prontuario: formatarProntuario((r[offset + 1] || "").toString()),
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
            celulas_epiteliais: r[offset + 15] || "4.000 /mL",
            leucocitos_campo: r[offset + 16] || "4.000 /mL",
            hemacias_campo: r[offset + 17] || "1.000 /mL",
            bacterias: r[offset + 18] || "fb",
            cristais: r[offset + 19] || "Ausentes",
            cilindros: r[offset + 20] || "Ausentes",
            observacoes: r[offset + 21] || "",
            status: (r[offset + 22] as StatusLaudo) || "finalizado",
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
            resultado_abo_rh: r[offset + 31] || undefined,
            tem_abo_rh: Boolean(r[offset + 31]),
            volume: r[offset + 32] || "60 mL",
            resultado_aslo: r[offset + 33] || undefined,
            tem_aslo: Boolean(r[offset + 33]),
            resultado_fr: r[offset + 34] || undefined,
            tem_fr: Boolean(r[offset + 34]),
          });
        }
        laudos = laudos.reverse();
        globalForStore.localMemoryLaudos = laudos;
      }
    } catch (err) {
      console.error("Erro ao listar laudos:", err);
      laudos = [...globalForStore.localMemoryLaudos];
    }
  }

  if (dataFiltro) {
    laudos = laudos.filter((l) => normalizarDataIso(l.data_hora) === dataFiltro);
  }
  if (prontFiltro) {
    laudos = laudos.filter(
      (l) => formatarProntuario(l.prontuario).toLowerCase() === prontFiltro
    );
  }
  if (buscaFiltro) {
    laudos = laudos.filter(
      (l) =>
        l.prontuario.toLowerCase().includes(buscaFiltro) ||
        l.nome_paciente.toLowerCase().includes(buscaFiltro)
    );
  }

  return laudos;
}

/**
 * Salva a lista de rotina do dia ordenada alfabeticamente por nome do paciente
 */
export async function salvarRotinaDia(
  itens: RotinaItem[],
  substituirExistente = true
): Promise<{ ok: boolean; count: number; total: number; message: string }> {
  const hojeIso = new Date().toISOString().split("T")[0];

  const itensNormalizados = itens
    .map((item) =>
      aplicarFlagsExamesNoItem({
        ...item,
        data: normalizarDataIso(item.data || item.data_rotina) || hojeIso,
        data_rotina: normalizarDataIso(item.data_rotina || item.data) || hojeIso,
        status_coleta: item.status_coleta || "REALIZADO",
        prontuario: formatarProntuario(item.prontuario),
        nome_paciente: (item.nome_paciente || "").trim().toUpperCase(),
      })
    )
    .sort((a, b) => a.nome_paciente.localeCompare(b.nome_paciente, "pt-BR"));

  if (substituirExistente) {
    globalForStore.localMemoryRotina = [...itensNormalizados];
  } else {
    const mapa = new Map<string, RotinaItem>();
    for (const r of globalForStore.localMemoryRotina) {
      mapa.set(`${formatarProntuario(r.prontuario)}_${r.nome_paciente}`, r);
    }
    for (const novo of itensNormalizados) {
      mapa.set(`${novo.prontuario}_${novo.nome_paciente}`, novo);
    }
    globalForStore.localMemoryRotina = Array.from(mapa.values()).sort((a, b) =>
      a.nome_paciente.localeCompare(b.nome_paciente, "pt-BR")
    );
  }

  const gClient = getGoogleSheetsClient();

  if (!gClient) {
    return {
      ok: true,
      count: globalForStore.localMemoryRotina.length,
      total: globalForStore.localMemoryRotina.length,
      message: `${globalForStore.localMemoryRotina.length} pacientes sincronizados na rotina diária.`,
    };
  }

  const { sheets, sheetId } = gClient;

  try {
    await ensureSheetsExist();

    const metaRes = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: `${SHEET_NAME_ROTINA}!1:1`,
    });

    const headerRow = (metaRes.data.values?.[0] || []).map((h: any) =>
      (h || "").toString().toLowerCase().trim()
    );
    const temId = headerRow.length === 0 || headerRow[0] === "id";

    await sheets.spreadsheets.values.clear({
      spreadsheetId: sheetId,
      range: `${SHEET_NAME_ROTINA}!A:J`,
    });

    const header = temId
      ? CABECALHO_ROTINA
      : ["data", "prontuario", "nome_paciente", "idade_sexo", "exame", "status_coleta", "status_laudo"];

    const values = [
      header,
      ...globalForStore.localMemoryRotina.map((item, idx) => {
        const itemData = item.data || item.data_rotina || hojeIso;
        const itemId = item.id || `ROT-${itemData}-${item.prontuario || idx + 1}`;
        const baseRow = [
          itemData,
          item.prontuario,
          item.nome_paciente,
          item.idade_sexo || "SUS",
          item.exame || "URINA I",
          item.status_coleta || "REALIZADO",
          item.status_laudo || "PENDENTE",
        ];
        return temId ? [itemId, ...baseRow] : baseRow;
      }),
    ];

    await sheets.spreadsheets.values.update({
      spreadsheetId: sheetId,
      range: `${SHEET_NAME_ROTINA}!A1`,
      valueInputOption: "RAW",
      requestBody: { values },
    });

    return {
      ok: true,
      count: globalForStore.localMemoryRotina.length,
      total: globalForStore.localMemoryRotina.length,
      message: `${globalForStore.localMemoryRotina.length} pacientes sincronizados com sucesso na aba Rotina_Dia do Google Sheets!`,
    };
  } catch (err: any) {
    console.error("Erro ao salvar rotina no Google Sheets:", err);
    return {
      ok: true,
      count: globalForStore.localMemoryRotina.length,
      total: globalForStore.localMemoryRotina.length,
      message: `Rotina salva em memória do servidor (${err.message}).`,
    };
  }
}

/**
 * Retorna os pacientes da rotina do dia com todas as flags de exames reconstruídas e em ordem alfabética (1, 2, 3, 4, 5, 6...)
 */
export async function listarRotinaDia(dataFiltro?: string): Promise<RotinaItem[]> {
  const gClient = getGoogleSheetsClient();
  let rotina: RotinaItem[] = [];

  if (!gClient) {
    rotina = globalForStore.localMemoryRotina.map(aplicarFlagsExamesNoItem);
  } else {
    const { sheets, sheetId } = gClient;
    try {
      const res = await sheets.spreadsheets.values.get({
        spreadsheetId: sheetId,
        range: `${SHEET_NAME_ROTINA}!A:J`,
      });

      const rows = res.data.values || [];
      if (rows.length > 1) {
        const headerRow = (rows[0] || []).map((h: any) =>
          (h || "").toString().toLowerCase().trim()
        );
        const idxId = headerRow.indexOf("id");
        const idxData = headerRow.findIndex((h: string) => h.includes("data"));
        const idxPront = headerRow.findIndex((h: string) => h.includes("pront"));
        const idxNome = headerRow.findIndex(
          (h: string) => h.includes("nome") || h.includes("paciente")
        );
        const idxIdade = headerRow.findIndex(
          (h: string) => h.includes("idade") || h.includes("sexo")
        );
        const idxExame = headerRow.findIndex((h: string) => h.includes("exame"));
        const idxStatus = headerRow.findIndex(
          (h: string) =>
            h.includes("status_coleta") || (h.includes("status") && !h.includes("laudo"))
        );
        const idxStatusLaudo = headerRow.findIndex((h: string) => h.includes("status_laudo"));

        for (let i = 1; i < rows.length; i++) {
          const r = rows[i];
          if (!r || r.length === 0) continue;

          const prontuario = formatarProntuario(
            (idxPront >= 0 ? r[idxPront] : r[1] || "").toString().trim()
          );
          if (!prontuario) continue;

          const rowDate = normalizarDataIso(
            (idxData >= 0 ? r[idxData] : r[0] || "").toString().trim()
          );

          rotina.push(
            aplicarFlagsExamesNoItem({
              id: idxId >= 0 ? r[idxId] : `rot-row-${i}`,
              data: rowDate || new Date().toISOString().split("T")[0],
              data_rotina: rowDate || new Date().toISOString().split("T")[0],
              prontuario,
              nome_paciente: (idxNome >= 0 ? r[idxNome] : r[2] || "")
                .toString()
                .trim()
                .toUpperCase(),
              idade_sexo: (idxIdade >= 0 ? r[idxIdade] : r[3] || "SUS").toString().trim(),
              posto_unidade: "Conecta SUS",
              solicitante: "Conecta SUS",
              exame: (idxExame >= 0 ? r[idxExame] : r[4] || "URINA I").toString().trim(),
              status_coleta: (idxStatus >= 0 ? r[idxStatus] : "REALIZADO").toString().trim(),
              status_laudo: idxStatusLaudo >= 0 ? (r[idxStatusLaudo] as any) : "rascunho",
            })
          );
        }
        globalForStore.localMemoryRotina = rotina;
      } else if (globalForStore.localMemoryRotina.length > 0) {
        rotina = globalForStore.localMemoryRotina.map(aplicarFlagsExamesNoItem);
      }
    } catch (err) {
      console.error("Erro ao ler rotina do Google Sheets:", err);
      rotina = globalForStore.localMemoryRotina.map(aplicarFlagsExamesNoItem);
    }
  }

  if (dataFiltro) {
    const alvo = normalizarDataIso(dataFiltro);
    const filtrada = rotina.filter((r) => normalizarDataIso(r.data || r.data_rotina) === alvo);
    if (filtrada.length > 0) {
      rotina = filtrada;
    }
  }

  // Cruzar com os laudos já salvos para marcar `tem_laudo = true`
  const laudos = await listarLaudos();
  const prontuariosComLaudo = new Set(laudos.map((l) => formatarProntuario(l.prontuario)));

  return rotina
    .map((r) => ({
      ...r,
      tem_laudo: Boolean(r.tem_laudo || prontuariosComLaudo.has(formatarProntuario(r.prontuario))),
    }))
    .sort((a, b) => a.nome_paciente.localeCompare(b.nome_paciente, "pt-BR"));
}

export async function buscarPacientePorProntuario(
  prontuario: string
): Promise<{ paciente: RotinaItem | null; ultimoLaudo: LaudoUrina | null }> {
  const termoOriginal = prontuario.trim();
  const termo = termoOriginal.toLowerCase();
  const prontPadrao = formatarProntuario(termoOriginal).toLowerCase();

  const [rotina, laudos] = await Promise.all([
    listarRotinaDia(),
    listarLaudos({ busca: termoOriginal }),
  ]);

  const daRotina =
    rotina.find(
      (r) =>
        r.prontuario.toLowerCase() === prontPadrao ||
        r.prontuario.toLowerCase() === termo
    ) ||
    rotina.find(
      (r) =>
        r.nome_paciente.toLowerCase().includes(termo) ||
        r.prontuario.toLowerCase().includes(termo)
    ) ||
    null;

  const ultimoLaudo = laudos.length > 0 ? laudos[0] : null;

  return { paciente: daRotina, ultimoLaudo };
}
