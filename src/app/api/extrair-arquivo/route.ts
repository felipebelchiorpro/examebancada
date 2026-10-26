// Execução dinâmica sem cache estático no Vercel Serverless
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { processarMatrizLinhasBancada } from "@/lib/extratorBancada";

async function extractTextFromPdf(buffer: Buffer): Promise<string> {
  const pdfParseModule: any = await import("pdf-parse");
  // Suporte a pdf-parse v2 (classe PDFParse)
  if (pdfParseModule.PDFParse) {
    const parser = new pdfParseModule.PDFParse(new Uint8Array(buffer));
    const result = await parser.getText();
    return result.text || "";
  }
  // Suporte a pdf-parse v1 (função default)
  const parseFn = pdfParseModule.default || pdfParseModule;
  if (typeof parseFn === "function") {
    const data = await parseFn(buffer);
    return data.text || "";
  }
  throw new Error("Módulo pdf-parse incompatível.");
}

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
      try {
        const text = await extractTextFromPdf(buffer);
        const lines = text.split("\n").map((l: string) => l.trim()).filter(Boolean);

        rows.push(["data", "nome_paciente", "prontuario", "codigo", "procedimento", "exame"]);

        for (const line of lines) {
          // No relatório Conecta SUS / SUS padrão, as colunas são separadas por tabulação ou múltiplos espaços
          const cols = line.split(/\t+|\s{2,}/).map((c: string) => c.trim()).filter(Boolean);
          
          if (cols.length >= 4) {
            const col0 = cols[0];
            // Se a data estiver colada no nome do paciente (ex: 26/10/2026IOLANDA DE MEIRA SOUZA)
            const dateMatch = col0.match(/^(\d{2}\/\d{2}\/\d{4})(.*)$/);
            if (dateMatch) {
              const data = dateMatch[1];
              const nome = dateMatch[2].trim();
              const prontuario = cols[1];
              const codigo = cols[2];
              const procedimento = cols[3];
              const exame = cols[4] || cols[3];
              rows.push([data, nome, prontuario, codigo, procedimento, exame]);
            } else {
              rows.push(cols);
            }
          } else if (cols.length >= 2) {
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
      pacientes: resultado.pacientesUnificados,
      pacientesUnificados: resultado.pacientesUnificados,
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
