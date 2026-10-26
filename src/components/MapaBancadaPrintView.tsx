"use client";

import React from "react";
import { RotinaItem, LabConfig, DEFAULT_LAB_CONFIG } from "@/types/urinalise";

interface MapaBancadaPrintViewProps {
  pacientes: RotinaItem[];
  dataRotina: string;
  labConfig?: LabConfig;
  modoTiragem?: "lista_exames" | "mapa_tubos";
}

export const MapaBancadaPrintView: React.FC<MapaBancadaPrintViewProps> = ({
  pacientes,
  dataRotina,
  labConfig = DEFAULT_LAB_CONFIG,
  modoTiragem = "lista_exames",
}) => {
  const dataFormatada = (() => {
    try {
      const [ano, mes, dia] = dataRotina.split("-");
      return `${dia}/${mes}/${ano}`;
    } catch {
      return dataRotina;
    }
  })();

  // Expandir pacientes em linhas individuais por Exame (idêntico à planilha do laboratório)
  const itensPorExame: { exame: string; paciente: string; prontuario: string }[] = [];

  for (const p of pacientes) {
    const examesLista: string[] = [];

    if (p.tem_urina || p.exame?.toUpperCase().includes("URINA") || p.exame?.toUpperCase().includes("EAS")) {
      examesLista.push("URINA I");
    }
    if (p.tem_pso || p.exame?.toUpperCase().includes("PSO") || p.exame?.toUpperCase().includes("SANGUE OCULTO")) {
      examesLista.push("SANGUE OCULTO NAS FEZES");
    }
    if (p.tem_coagulograma || p.exame?.toUpperCase().includes("COAGULO") || p.exame?.toUpperCase().includes("TAP")) {
      examesLista.push("COAGULOGRAMA");
    }
    if (p.tem_abo_rh || p.exame?.toUpperCase().includes("ABO") || p.exame?.toUpperCase().includes("GRUPO") || p.exame?.toUpperCase().includes("RH")) {
      examesLista.push("GRUPO SANGUÍNEO E FATOR RH");
    }
    if (p.tem_vdrl || p.exame?.toUpperCase().includes("VDRL") || p.exame?.toUpperCase().includes("SIFILIS")) {
      examesLista.push("VDRL");
    }
    if (p.tem_beta_hcg || p.exame?.toUpperCase().includes("BETA") || p.exame?.toUpperCase().includes("HCG")) {
      examesLista.push("TESTE RÁPIDO DE GRAVIDEZ (BETA-HCG)");
    }
    if (p.tem_proteinuria_rapida || p.exame?.toUpperCase().includes("PROTEINURIA")) {
      examesLista.push("PROTEINÚRIA - TESTE RÁPIDO");
    }
    if (p.tem_vhs || p.exame?.toUpperCase().includes("VHS")) {
      examesLista.push("VHS (VELOCIDADE DE HEMOSSEDIMENTAÇÃO)");
    }
    if (p.tem_pcr || p.exame?.toUpperCase().includes("PCR")) {
      examesLista.push("PCR - PROTEÍNA C REATIVA");
    }
    if (p.tem_aslo || p.exame?.toUpperCase().includes("ASLO")) {
      examesLista.push("ANTIESTREPTOLISINA-O (ASLO)");
    }
    if (p.tem_fr || p.exame?.toUpperCase().includes("FATOR") || p.exame?.toUpperCase().includes("LATEX")) {
      examesLista.push("FATOR REUMATOIDE (LATEX)");
    }

    if (examesLista.length === 0) {
      examesLista.push(p.exame || "URINA I");
    }

    for (const ex of examesLista) {
      itensPorExame.push({
        exame: ex,
        paciente: p.nome_paciente,
        prontuario: p.prontuario,
      });
    }
  }

  // Ordenar alfabeticamente por Exame e depois por Paciente (como no Excel)
  itensPorExame.sort((a, b) => {
    if (a.exame === b.exame) {
      return a.paciente.localeCompare(b.paciente);
    }
    return a.exame.localeCompare(b.exame);
  });

  return (
    <div
      className="bg-white text-black text-xs font-sans p-6 print:p-0 print:m-0 print:w-full"
      style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif" }}
    >
      {/* CABEÇALHO DA TIRAGEM DO DIA */}
      <div className="border-b-2 border-black pb-2 mb-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 border-2 border-black flex flex-col items-center justify-center font-black leading-none text-center">
            <span className="text-[11px]">SUS</span>
            <span className="text-[6px]">LAB</span>
          </div>
          <div>
            <h1 className="text-sm font-black uppercase tracking-tight">
              {labConfig.nomeInstituicao} - {labConfig.nomeLaboratorio}
            </h1>
            <p className="text-[10px] font-bold text-slate-800 uppercase">
              TIRAGEM DO DIA - EXAMES DE BANCADA
            </p>
          </div>
        </div>

        <div className="text-right text-[10px]">
          <p className="font-bold">Data: {dataFormatada}</p>
          <p className="text-slate-600">Total: {itensPorExame.length} exames a realizar ({pacientes.length} pacientes)</p>
        </div>
      </div>

      {/* TABELA ESTILO PLANILHA DO LABORATÓRIO (EXAME | PACIENTE | PRONTUÁRIO | RESULTADO) */}
      <table className="w-full border-collapse border border-black text-[10px]">
        <thead>
          <tr className="bg-slate-200 border-b border-black text-black font-black uppercase text-[9.5px]">
            <th className="border border-black py-1.5 px-2 text-left w-56">Exame</th>
            <th className="border border-black py-1.5 px-2 text-left">Paciente</th>
            <th className="border border-black py-1.5 px-2 text-center w-24">Prontuário</th>
            <th className="border border-black py-1.5 px-2 text-left w-48">Resultado</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-black font-medium">
          {itensPorExame.map((item, idx) => (
            <tr key={item.prontuario + item.exame + idx} className="border-b border-black" style={{ height: "24px" }}>
              <td className="border border-black py-1 px-2 font-bold bg-slate-50/50 print:bg-transparent">
                {item.exame}
              </td>
              <td className="border border-black py-1 px-2 uppercase font-semibold truncate max-w-[240px]">
                {item.paciente}
              </td>
              <td className="border border-black py-1 px-2 text-center font-mono font-bold">
                {item.prontuario}
              </td>
              {/* Espaço em branco com linha pontilhada ou linha para anotação a caneta */}
              <td className="border border-black py-1 px-2 bg-white text-slate-400 font-mono text-[9px]">
                &nbsp;
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* RODAPÉ */}
      <div className="mt-4 pt-2 border-t border-black flex justify-between items-center text-[9px] text-slate-600">
        <div>Folha de tiragem da bancada. Conferir amostras e lançar no aplicativo de bancada.</div>
        <div>Assinatura do Técnico/Biomédico: ____________________________________</div>
      </div>
    </div>
  );
};
