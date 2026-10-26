import { NextRequest, NextResponse } from "next/server";
import { salvarOuAtualizarLaudo } from "@/lib/googleSheets";
import { LaudoUrina } from "@/types/urinalise";

export async function POST(request: NextRequest) {
  try {
    const laudo: LaudoUrina = await request.json();

    if (!laudo.prontuario || !laudo.nome_paciente) {
      return NextResponse.json(
        { ok: false, error: "Prontuário e Nome do Paciente são obrigatórios para emissão do laudo." },
        { status: 400 }
      );
    }

    if (!laudo.data_hora) {
      laudo.data_hora = new Date().toISOString();
    }

    const resultado = await salvarOuAtualizarLaudo(laudo);

    return NextResponse.json({
      ok: resultado.ok,
      message: resultado.message,
      laudo: resultado.laudo,
    });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error.message || "Erro ao salvar laudo de urina" },
      { status: 500 }
    );
  }
}
