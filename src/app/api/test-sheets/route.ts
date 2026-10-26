import { NextResponse } from "next/server";
import { ensureSheetsExist, isGoogleSheetsConfigured } from "@/lib/googleSheets";

export async function GET() {
  const isConfigured = isGoogleSheetsConfigured();

  if (!isConfigured) {
    return NextResponse.json({
      ok: false,
      isConfigured: false,
      message: "Variáveis de ambiente do Google Sheets não encontradas. O sistema está rodando no modo de contingência/memória local seguro.",
      missing: {
        GOOGLE_SHEETS_CLIENT_EMAIL: !process.env.GOOGLE_SHEETS_CLIENT_EMAIL,
        GOOGLE_SHEETS_PRIVATE_KEY: !process.env.GOOGLE_SHEETS_PRIVATE_KEY,
        GOOGLE_SHEETS_SHEET_ID: !process.env.GOOGLE_SHEETS_SHEET_ID,
      },
    });
  }

  const result = await ensureSheetsExist();

  return NextResponse.json({
    ok: result.ok,
    isConfigured: true,
    sheetId: process.env.GOOGLE_SHEETS_SHEET_ID,
    clientEmail: process.env.GOOGLE_SHEETS_CLIENT_EMAIL,
    message: result.message,
  });
}
