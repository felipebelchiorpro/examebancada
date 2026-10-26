export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextRequest, NextResponse } from "next/server";
import {
  listarRotinaDia,
  salvarRotinaDia,
  buscarPacientePorProntuario,
} from "@/lib/googleSheets";
import { RotinaItem } from "@/types/urinalise";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const prontuario = searchParams.get("prontuario");
    const data = searchParams.get("data") || undefined;

    if (prontuario) {
      const { paciente, ultimoLaudo } = await buscarPacientePorProntuario(prontuario);
      return NextResponse.json({
        ok: true,
        paciente,
        ultimoLaudo,
      });
    }

    const rotina = await listarRotinaDia(data);
    return NextResponse.json({ ok: true, rotina });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error.message || "Erro ao buscar rotina" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const itens: RotinaItem[] = body.itens || [];
    const substituir = body.substituir !== false;

    if (!Array.isArray(itens) || itens.length === 0) {
      return NextResponse.json(
        { ok: false, error: "Nenhum paciente fornecido na lista." },
        { status: 400 }
      );
    }

    const resultado = await salvarRotinaDia(itens, substituir);
    return NextResponse.json({ ...resultado, ok: true });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error.message || "Erro ao salvar rotina" },
      { status: 500 }
    );
  }
}
