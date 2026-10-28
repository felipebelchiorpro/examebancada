"use client";

import React from "react";
import { ItemRotina, LaudoUrina } from "@/lib/googleSheets";
import { formatarProntuario } from "@/lib/extratorBancada";

interface MapaBancadaPrintViewProps {
  pacientes: ItemRotina[];
  laudos?: LaudoUrina[];
  dataRotina?: string;
  labConfig?: any;
}

interface LinhaBancadaIndividual {
  numeroNoGrupo: number;
  exame: string;
  paciente: string;
  prontuario: string;
  resultado: string;
}

export const MapaBancadaPrintView: React.FC<MapaBancadaPrintViewProps> = ({
  pacientes,
  laudos = [],
  dataRotina,
}) => {
  const dataFormatada = dataRotina
    ? dataRotina.split("-").reverse().join("/")
    : new Date().toLocaleDateString("pt-BR");

  // Filtrar pacientes e laudos rigorosamente pela data caso dataRotina esteja preenchida
  const pacientesFiltrados = React.useMemo(() => {
    if (!dataRotina) return pacientes;
    const alvo = dataRotina.trim();
    const filtrados = pacientes.filter((p) => {
      const d = (p.data || p.data_rotina || "").split("T")[0];
      return !d || d === alvo;
    });
    return filtrados.length > 0 ? filtrados : pacientes;
  }, [pacientes, dataRotina]);

  // Mapa rápido de laudos por prontuário para preencher a coluna Resultado caso já tenha sido contado no celular
  const mapaLaudos = new Map<string, LaudoUrina>();
  laudos.forEach((l) => {
    const d = (l.data_hora || "").split("T")[0];
    if (!dataRotina || !d || d === dataRotina) {
      mapaLaudos.set(formatarProntuario(l.prontuario), l);
    }
  });

  const obterResumoResultado = (prontuario: string, exameUpper: string): string => {
    const l = mapaLaudos.get(formatarProntuario(prontuario));
    if (!l) return "";

    // SE O LAUDO FOR MARCADO COMO RECOLETA, EXIBE O ALERTA CLARO
    if (l.status === "recoleta") {
      return `⚠️ RECOLETA SOLICITADA (${l.observacoes || "Amostra inadequada"})`;
    }

    if (exameUpper.includes("PROTEINÚRIA") || exameUpper.includes("PROTEINURIA")) {
      return l.resultado_proteinuria_rapida || l.proteina || "";
    }
    if (exameUpper.includes("URINA") || exameUpper.includes("EAS")) {
      return `VOL:${l.volume || "60mL"} D:${l.densidade} pH:${l.ph} Leu:${l.leucocitos_campo} Hem:${l.hemacias_campo}`;
    }
    if (exameUpper.includes("SANGUE OCULTO") || exameUpper.includes("PSO")) {
      if (l.resultado_pso && l.resultado_pso.toLowerCase().includes("recoleta")) {
        return `⚠️ RECOLETA: ${l.resultado_pso}`;
      }
      return l.resultado_pso || "";
    }
    if (
      /\bABO\b/.test(exameUpper) ||
      exameUpper.includes("FATOR RH") ||
      exameUpper.includes("GRUPO SANGU") ||
      exameUpper.includes("TIPAGEM")
    ) {
      return l.resultado_abo_rh || "";
    }
    if (exameUpper.includes("COAGULOGRAMA") || exameUpper.includes("PROTROMBINA") || exameUpper.includes("TAP")) {
      return [
        l.tp_tempo ? `TP: ${l.tp_tempo}` : "",
        l.tp_inr ? `INR: ${l.tp_inr}` : "",
        l.ttpa_tempo ? `TTPA: ${l.ttpa_tempo}` : "",
      ]
        .filter(Boolean)
        .join(" | ");
    }
    if (exameUpper.includes("PCR")) return l.resultado_pcr || "";
    if (exameUpper.includes("ASLO")) return l.resultado_aslo || "";
    if (exameUpper.includes("FR") || exameUpper.includes("REUMATOIDE")) return l.resultado_fr || "";
    if (exameUpper.includes("VDRL")) return l.resultado_vdrl || "";
    if (exameUpper.includes("VHS") || exameUpper.includes("HEMOSSEDIMENTA")) return l.resultado_vhs || "";
    if (exameUpper.includes("BETA") || exameUpper.includes("HCG")) return l.resultado_beta_hcg || "";
    return "";
  };

  // Expandir os pacientes nas linhas exatas de cada exame (padrão "Bancada 15/10")
  const linhasBrutas: Omit<LinhaBancadaIndividual, "numeroNoGrupo">[] = [];

  pacientesFiltrados.forEach((p) => {
    const listaExames = (p.exame || "URINA I")
      .split(/\s*\+\s*|\s*,\s*|\s*;\s*/)
      .map((s) => s.trim())
      .filter(Boolean);

    const pront = formatarProntuario(p.prontuario);
    const nome = (p.nome_paciente || "").toUpperCase().trim();

    if (listaExames.length === 0) {
      linhasBrutas.push({
        exame: "URINA I",
        paciente: nome,
        prontuario: pront,
        resultado: obterResumoResultado(pront, "URINA I"),
      });
    } else {
      listaExames.forEach((ex) => {
        const exUpper = ex.toUpperCase();
        const jaExiste = linhasBrutas.some(
          (item) =>
            item.prontuario === pront &&
            item.paciente === nome &&
            item.exame === exUpper
        );
        if (!jaExiste) {
          linhasBrutas.push({
            exame: exUpper,
            paciente: nome,
            prontuario: pront,
            resultado: obterResumoResultado(pront, exUpper),
          });
        }
      });
    }
  });

  // Ordenar: 1º por Exame (A-Z), 2º por Paciente (A-Z) -> Exatamente igual à "Bancada 15/10"
  linhasBrutas.sort((a, b) => {
    const cmpExame = a.exame.localeCompare(b.exame, "pt-BR");
    if (cmpExame !== 0) return cmpExame;
    return a.paciente.localeCompare(b.paciente, "pt-BR");
  });

  // Numerar sequencialmente dentro de cada tipo de exame (ex: URINA I: 1, 2, 3, 4, 5, 6...)
  // Assim o número na folha impressa bate 100% com o número do tubo no celular!
  const contadoresPorExame: Record<string, number> = {};
  const itensPorExame: LinhaBancadaIndividual[] = linhasBrutas.map((item) => {
    contadoresPorExame[item.exame] = (contadoresPorExame[item.exame] || 0) + 1;
    return {
      ...item,
      numeroNoGrupo: contadoresPorExame[item.exame],
    };
  });

  return (
    <div className="print:block bg-white text-black font-sans w-full max-w-[210mm] mx-auto p-2 print:p-0">
      {/* CABEÇALHO SIMPLES E DIRETO (PADRÃO TIRAGEM DE BANCADA) */}
      <div className="flex items-center justify-between border-b-2 border-black pb-2 mb-3">
        <div>
          <h1 className="text-base font-black uppercase tracking-tight">
            TIRAGEM DE BANCADA — RELAÇÃO DE EXAMES DO DIA ({dataFormatada})
          </h1>
          <p className="text-[10.5px] font-medium text-neutral-700">
            Ordem alfabética por Exame e Paciente (numeração #1, #2, #3... idêntica à fila do celular)
          </p>
        </div>
        <div className="text-right text-xs font-bold">
          <span>Total de Exames: {itensPorExame.length}</span>
          <span className="block text-[10px] font-normal text-neutral-600">
            Pacientes: {pacientesFiltrados.length}
          </span>
        </div>
      </div>

      {/* TABELA IDÊNTICA À PLANILHA "Bancada 15/10": Nº | Exame | Paciente | Prontuário | Resultado */}
      <table className="w-full border-collapse border border-black text-[11px]">
        <thead>
          <tr className="bg-neutral-200 text-black font-bold border-b border-black">
            <th className="border border-black py-1.5 px-2 text-center w-[7%]">
              Nº
            </th>
            <th className="border border-black py-1.5 px-2.5 text-left w-[27%]">
              Exame
            </th>
            <th className="border border-black py-1.5 px-2.5 text-left w-[36%]">
              Paciente
            </th>
            <th className="border border-black py-1.5 px-2 text-center w-[12%]">
              Prontuário
            </th>
            <th className="border border-black py-1.5 px-2.5 text-left w-[18%]">
              Resultado
            </th>
          </tr>
        </thead>
        <tbody>
          {itensPorExame.map((row, index) => {
            const mudouGrupo =
              index > 0 && itensPorExame[index - 1].exame !== row.exame;
            return (
              <tr
                key={`${row.prontuario}-${row.exame}-${index}`}
                className={`break-inside-avoid ${
                  mudouGrupo ? "border-t-2 border-t-black" : ""
                } ${index % 2 === 1 ? "bg-neutral-50/70" : "bg-white"}`}
              >
                <td className="border border-black py-2 px-2 text-center font-mono font-black text-neutral-900">
                  {row.numeroNoGrupo}
                </td>
                <td className="border border-black py-2 px-2.5 font-bold text-neutral-900">
                  {row.exame}
                </td>
                <td className="border border-black py-2 px-2.5 font-semibold text-neutral-900 uppercase">
                  {row.paciente}
                </td>
                <td className="border border-black py-2 px-2 text-center font-mono font-bold text-neutral-900">
                  {row.prontuario}
                </td>
                <td className="border border-black py-2 px-2.5 text-neutral-900 font-mono text-[10px]">
                  {row.resultado}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
