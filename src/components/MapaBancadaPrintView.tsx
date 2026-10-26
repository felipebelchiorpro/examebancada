"use client";

import React from "react";
import { RotinaItem, LabConfig, DEFAULT_LAB_CONFIG } from "@/types/urinalise";

interface MapaBancadaPrintViewProps {
  pacientes: RotinaItem[];
  dataRotina: string;
  labConfig?: LabConfig;
}

export const MapaBancadaPrintView: React.FC<MapaBancadaPrintViewProps> = ({
  pacientes,
  dataRotina,
  labConfig = DEFAULT_LAB_CONFIG,
}) => {
  const dataFormatada = (() => {
    try {
      const [ano, mes, dia] = dataRotina.split("-");
      return `${dia}/${mes}/${ano}`;
    } catch {
      return dataRotina;
    }
  })();

  const totalUrina = pacientes.filter((p) => p.tem_urina).length;
  const totalPso = pacientes.filter((p) => p.tem_pso).length;
  const totalBeta = pacientes.filter((p) => p.tem_beta_hcg || p.exame?.toUpperCase().includes("BETA") || p.exame?.toUpperCase().includes("HCG")).length;
  const totalVhs = pacientes.filter((p) => p.tem_vhs || p.exame?.toUpperCase().includes("VHS")).length;
  const totalVdrl = pacientes.filter((p) => p.tem_vdrl || p.exame?.toUpperCase().includes("VDRL")).length;
  const totalCoag = pacientes.filter((p) => p.tem_coagulograma || p.exame?.toUpperCase().includes("COAGULO") || p.exame?.toUpperCase().includes("TAP") || p.exame?.toUpperCase().includes("TTPA")).length;

  return (
    <div
      className="bg-white text-black text-xs font-sans p-6 print:p-0 print:m-0 print:w-full print-page-break"
      style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif" }}
    >
      {/* CABEÇALHO DO MAPA */}
      <div className="border-b-2 border-black pb-3 mb-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 border-2 border-black flex flex-col items-center justify-center font-black leading-none text-center">
            <span className="text-[12px]">SUS</span>
            <span className="text-[7px]">LAB</span>
          </div>
          <div>
            <h1 className="text-sm font-black uppercase tracking-tight">
              {labConfig.nomeInstituicao} - {labConfig.nomeLaboratorio}
            </h1>
            <p className="text-[11px] font-bold text-slate-800">
              MAPA DE TRIAGEM DE BANCADA (EXAMES MANUAIS & TESTES RÁPIDOS)
            </p>
          </div>
        </div>
        <div className="text-right text-[10px]">
          <p className="font-bold">Data da Rotina: {dataFormatada}</p>
          <p className="text-slate-600">Total de Amostras: {pacientes.length}</p>
        </div>
      </div>

      {/* RESUMO DOS EXAMES DO DIA */}
      <div className="bg-slate-100 border border-slate-300 p-2 mb-3 rounded flex flex-wrap items-center justify-between text-[10px] font-bold print:bg-transparent print:border-black">
        <span>🧪 Urinálise (EAS): {totalUrina}</span>
        <span>🩸 Sangue Oculto (PSO): {totalPso}</span>
        <span>👶 Beta-HCG: {totalBeta}</span>
        <span>⏱️ VHS: {totalVhs}</span>
        <span>🔬 VDRL: {totalVdrl}</span>
        <span>🩸 Coagulograma: {totalCoag}</span>
      </div>

      {/* TABELA DE BANCADA COM ESPAÇO PARA ANOTAÇÃO */}
      <table className="w-full border-collapse border border-black text-[10.5px]">
        <thead>
          <tr className="bg-slate-200 border-b border-black text-[9px] uppercase font-bold text-black print:bg-slate-100">
            <th className="border border-black py-1 px-1.5 text-center w-10">Nº</th>
            <th className="border border-black py-1 px-2 text-center w-24">Prontuário</th>
            <th className="border border-black py-1 px-2 text-left">Paciente</th>
            <th className="border border-black py-1 px-2 text-left w-36">Unidade / Solicitante</th>
            <th className="border border-black py-1 px-1.5 text-center w-12">Urina</th>
            <th className="border border-black py-1 px-1.5 text-center w-12">PSO</th>
            <th className="border border-black py-1 px-1.5 text-center w-12">Beta</th>
            <th className="border border-black py-1 px-1.5 text-center w-12">VHS</th>
            <th className="border border-black py-1 px-1.5 text-center w-14">VDRL</th>
            <th className="border border-black py-1 px-2 text-left w-48">Anotação / Resultado Manual</th>
          </tr>
        </thead>
        <tbody>
          {pacientes.map((p, idx) => {
            const ehUrina = p.tem_urina || p.exame?.toUpperCase().includes("URINA") || p.exame?.toUpperCase().includes("EAS");
            const ehPso = p.tem_pso || p.exame?.toUpperCase().includes("PSO") || p.exame?.toUpperCase().includes("SANGUE OCULTO");
            const ehBeta = p.tem_beta_hcg || p.exame?.toUpperCase().includes("BETA") || p.exame?.toUpperCase().includes("HCG");
            const ehVhs = p.tem_vhs || p.exame?.toUpperCase().includes("VHS");
            const ehVdrl = p.tem_vdrl || p.exame?.toUpperCase().includes("VDRL");

            return (
              <tr key={p.prontuario + idx} className="border-b border-black" style={{ height: "26px" }}>
                <td className="border border-black py-1 px-1 text-center font-bold">{idx + 1}</td>
                <td className="border border-black py-1 px-1.5 text-center font-mono font-bold">{p.prontuario}</td>
                <td className="border border-black py-1 px-2 font-bold truncate max-w-[180px]">{p.nome_paciente}</td>
                <td className="border border-black py-1 px-2 text-[9px] text-slate-700 truncate max-w-[120px]">
                  {p.posto_unidade}
                </td>
                <td className="border border-black py-1 px-1 text-center font-bold">
                  {ehUrina ? "[ X ]" : "-"}
                </td>
                <td className="border border-black py-1 px-1 text-center font-bold">
                  {ehPso ? "[ X ]" : "-"}
                </td>
                <td className="border border-black py-1 px-1 text-center font-bold">
                  {ehBeta ? "[ X ]" : "-"}
                </td>
                <td className="border border-black py-1 px-1 text-center font-bold">
                  {ehVhs ? "[ X ]" : "-"}
                </td>
                <td className="border border-black py-1 px-1 text-center font-bold">
                  {ehVdrl ? "[ X ]" : "-"}
                </td>
                {/* Espaço em branco para o operador escrever à mão com caneta */}
                <td className="border border-black py-1 px-2 bg-slate-50/50 print:bg-white"></td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* RODAPÉ DO MAPA */}
      <div className="mt-4 pt-2 border-t border-slate-400 flex justify-between items-center text-[9px] text-slate-600">
        <div>Folha de bancada para triagem e anotação manual. Conferir e lançar no aplicativo PWA no celular.</div>
        <div>Responsável da Bancada: _______________________________</div>
      </div>
    </div>
  );
};
