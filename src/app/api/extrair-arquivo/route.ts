import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { processarMatrizLinhasBancada } from "@/lib/extratorBancada";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const filtrarApenasRealizado = formData.get("filtrarApenasRealizado") === "true";

    if (!file) {
      return NextResponse.json({ ok: false, error: "Nenhum arquivo enviado." }, { status: 400 });
    }

    const fileName = file.name.toLowerCase();
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    let rows: any[][] = [];

    if (fileName.endsWith(".pdf")) {
      // Leitura nativa de PDF via pdf-parse no ambiente Node.js / Vercel
      try {
        // dynamic import para evitar problemas de empacotamento em runtime client
        const pdfParseModule: any = await import("pdf-parse");
        const pdfParse = pdfParseModule.default || pdfParseModule;
        const pdfData = await pdfParse(buffer);
        const text = pdfData.text || "";

        // Converte linhas do PDF em matriz de células
        const lines = text.split("\n").map((l: string) => l.trim()).filter(Boolean);
        for (const line of lines) {
          // Divide por 2 ou mais espaços ou por tabulação
          const cols = line.split(/\t+|\s{2,}/).map((c: string) => c.trim()).filter(Boolean);
          if (cols.length >= 2) {
            rows.push(cols);
          }
        }
      } catch (pdfErr: any) {
        console.error("Erro ao ler PDF com pdf-parse:", pdfErr);
        return NextResponse.json({
          ok: false,
          error: `Erro ao extrair texto do PDF: ${pdfErr.message}. Tente salvar como Excel (.xlsx) ou colar o texto.`,
        }, { status: 422 });
      }
    } else {
      // Leitura de Excel (.xlsx, .xls) ou CSV
      const workbook = XLSX.read(buffer, { type: "buffer" });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      rows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "" });
    }

    if (rows.length <= 1) {
      return NextResponse.json({
        ok: false,
        error: "O arquivo foi lido, mas está vazio ou não possui linhas de dados válidas.",
      }, { status: 400 });
    }

    const resultado = processarMatrizLinhasBancada(rows, filtrarApenasRealizado);

    return NextResponse.json({
      ok: true,
      fileName: file.name,
      ...resultado,
    });
  } catch (err: any) {
    console.error("Erro no processamento do arquivo:", err);
    return NextResponse.json(
      { ok: false, error: err.message || "Erro interno ao processar arquivo" },
      { status: 500 }
    );
  }
}
