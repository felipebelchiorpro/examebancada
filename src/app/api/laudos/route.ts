export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextRequest, NextResponse } from "next/server";
import {
  listarLaudos,
  salvarOuAtualizarLaudo,
  isGoogleSheetsConfigured,
} from "@/lib/googleSheets";
import { LaudoUrina } from "@/types/urinalise";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const data = searchParams.get("data") || undefined;
    const prontuario = searchParams.get("prontuario") || undefined;
    const busca = searchParams.get("busca") || undefined;

    const laudos = await listarLaudos({ data, prontuario, busca });
    return NextResponse.json({
      ok: true,
      total: laudos.length,
      isGoogleSheets: isGoogleSheetsConfigured(),
      laudos,
    });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error.message || "Erro ao consultar laudos" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const laudo: LaudoUrina = await request.json();

    if (!laudo.prontuario || !laudo.nome_paciente) {
      return NextResponse.json(
        { ok: false, error: "Prontuário e Nome do Paciente são obrigatórios." },
        { status: 400 }
      );
    }

    if (!laudo.data_hora) {
      laudo.data_hora = new Date().toISOString();
    }

    const resultado = await salvarOuAtualizarLaudo(laudo);
    if (!resultado.ok) {
      return NextResponse.json(
        { ok: false, error: resultado.message },
        { status: 500 }
      );
    }
    return NextResponse.json({
      ok: true,
      acao: resultado.acao,
      message: resultado.message,
      laudo: resultado.laudo,
    });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error.message || "Erro ao salvar laudo" },
      { status: 500 }
    );
  }
}
