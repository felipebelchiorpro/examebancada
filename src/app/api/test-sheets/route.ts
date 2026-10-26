import { NextResponse } from "next/server";
import { ensureSheetsExist, getGoogleSheetsCredentials, isGoogleSheetsConfigured } from "@/lib/googleSheets";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const { clientEmail, privateKey, sheetId } = getGoogleSheetsCredentials();
  const isConfigured = isGoogleSheetsConfigured();

  const envsFound = {
    GOOGLE_CREDENTIALS_BASE64: Boolean(process.env.GOOGLE_CREDENTIALS_BASE64),
    GOOGLE_SHEETS_PRIVATE_KEY: Boolean(process.env.GOOGLE_SHEETS_PRIVATE_KEY || process.env.GOOGLE_PRIVATE_KEY || process.env.PRIVATE_KEY),
    GOOGLE_SHEETS_CLIENT_EMAIL: Boolean(process.env.GOOGLE_SHEETS_CLIENT_EMAIL || process.env.CLIENT_EMAIL),
    GOOGLE_SHEETS_SHEET_ID: Boolean(process.env.GOOGLE_SHEETS_SHEET_ID || process.env.SHEET_ID),
  };

  if (!isConfigured) {
    return NextResponse.json({
      ok: false,
      isConfigured: false,
      message: "Chave Privada não detectada no ambiente desta versão na Vercel.",
      diagnostico: {
        emailDetectado: clientEmail || "NÃO ENCONTRADO",
        sheetIdDetectado: sheetId || "NÃO ENCONTRADO",
        chavePrivadaValida: privateKey ? privateKey.includes("BEGIN PRIVATE KEY") : false,
        variaveisDetectadas: envsFound,
        orientacao: "Na Vercel, após cadastrar ou alterar variáveis de ambiente em Settings > Environment Variables, é obrigatório clicar em 'Redeploy' no painel da Vercel para que as variáveis entrem em vigor.",
      },
    });
  }

  const result = await ensureSheetsExist();

  return NextResponse.json({
    ok: result.ok,
    isConfigured: true,
    sheetId: sheetId ? (sheetId.slice(0, 6) + "..." + sheetId.slice(-4)) : null,
    clientEmail: clientEmail,
    message: result.message,
    diagnostico: {
      emailConfigurado: true,
      chavePrivadaValida: privateKey.includes("BEGIN PRIVATE KEY"),
      sheetIdConfigurado: true,
      variaveisDetectadas: envsFound,
      detalhesGoogle: result.ok ? "Conexão com Google Sheets bem-sucedida!" : result.message,
    },
  });
}
