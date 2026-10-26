import { NextResponse } from "next/server";
import { ensureSheetsExist, getGoogleSheetsCredentials, isGoogleSheetsConfigured } from "@/lib/googleSheets";

// Garantir que a Vercel sempre execute esta rota dinamicamente e nunca sirva cache estático
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const { clientEmail, privateKey, sheetId } = getGoogleSheetsCredentials();
  const isConfigured = isGoogleSheetsConfigured();

  if (!isConfigured) {
    return NextResponse.json({
      ok: false,
      isConfigured: false,
      message: "Variáveis de ambiente do Google Sheets incompletas na Vercel.",
      missing: {
        GOOGLE_SHEETS_CLIENT_EMAIL: !clientEmail,
        GOOGLE_SHEETS_PRIVATE_KEY: !privateKey,
        GOOGLE_SHEETS_SHEET_ID: !sheetId,
      },
      diagnostico: {
        emailDetectado: clientEmail ? (clientEmail.slice(0, 4) + "..." + clientEmail.slice(-15)) : "NÃO ENCONTRADO",
        sheetIdDetectado: sheetId ? (sheetId.slice(0, 6) + "..." + sheetId.slice(-4)) : "NÃO ENCONTRADO",
        chavePrivadaValida: privateKey.includes("BEGIN PRIVATE KEY"),
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
    },
  });
}
