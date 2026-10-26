import { NextResponse } from "next/server";
import { ensureSheetsExist, isGoogleSheetsConfigured } from "@/lib/googleSheets";

export async function GET() {
  const isConfigured = isGoogleSheetsConfigured();

  const clientEmail = process.env.GOOGLE_SHEETS_CLIENT_EMAIL || process.env.GOOGLE_CLIENT_EMAIL || process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_SHEETS_PRIVATE_KEY || process.env.GOOGLE_PRIVATE_KEY || process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  const sheetId = process.env.GOOGLE_SHEETS_SHEET_ID || process.env.NEXT_PUBLIC_BANCO_SHEET_ID || process.env.BANCO_SHEET_ID || process.env.SHEET_ID;

  if (!isConfigured) {
    return NextResponse.json({
      ok: false,
      isConfigured: false,
      message: "Variáveis de ambiente do Google Sheets não encontradas. O sistema está rodando no modo de contingência/memória local seguro.",
      missing: {
        GOOGLE_SHEETS_CLIENT_EMAIL: !clientEmail,
        GOOGLE_SHEETS_PRIVATE_KEY: !privateKey,
        GOOGLE_SHEETS_SHEET_ID: !sheetId,
      },
    });
  }

  const result = await ensureSheetsExist();

  return NextResponse.json({
    ok: result.ok,
    isConfigured: true,
    sheetId: sheetId,
    clientEmail: clientEmail,
    message: result.message,
  });
}
