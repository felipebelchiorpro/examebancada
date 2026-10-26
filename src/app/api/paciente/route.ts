export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextRequest, NextResponse } from "next/server";
import { listarRotinaDia, listarLaudos } from "@/lib/googleSheets";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const termo = (searchParams.get("busca") || searchParams.get("prontuario") || "").trim();

    if (!termo) {
      return NextResponse.json(
        { ok: false, error: "Parâmetro prontuário ou nome é obrigatório." },
        { status: 400 }
      );
    }

    const termoNorm = termo.toLowerCase();

    const [rotina, laudos] = await Promise.all([
      listarRotinaDia(),
      listarLaudos(),
    ]);

    // Filtrar sugestões na rotina do dia por prontuário ou nome
    const sugestoes = rotina
      .filter(
        (p) =>
          p.prontuario.toLowerCase().includes(termoNorm) ||
          p.nome_paciente.toLowerCase().includes(termoNorm)
      )
      .slice(0, 8);

    // Correspondência exata ou primeiro match se único
    const pacienteRotina =
      rotina.find(
        (p) =>
          p.prontuario.toLowerCase() === termoNorm ||
          p.nome_paciente.toLowerCase() === termoNorm
      ) || (sugestoes.length === 1 ? sugestoes[0] : null);

    const prontuarioAlvo = pacienteRotina?.prontuario?.toLowerCase() || termoNorm;

    // Busca se já tem laudo lançado
    const laudoExistente = laudos.find(
      (l) =>
        l.prontuario.toLowerCase() === prontuarioAlvo ||
        l.nome_paciente.toLowerCase() === termoNorm
    );

    return NextResponse.json({
      ok: true,
      encontrado: Boolean(pacienteRotina || laudoExistente),
      paciente: pacienteRotina || null,
      laudoExistente: laudoExistente || null,
      sugestoes,
    });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error.message || "Erro ao buscar paciente" },
      { status: 500 }
    );
  }
}
