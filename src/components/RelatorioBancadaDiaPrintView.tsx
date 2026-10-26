"use client";

import React from "react";
import { LaudoUrina, LabConfig, DEFAULT_LAB_CONFIG } from "@/types/urinalise";

interface RelatorioBancadaDiaPrintViewProps {
  laudos: LaudoUrina[];
  dataSelecionada: string;
  labConfig?: LabConfig;
  modo?: "tiras" | "caixas" | "tabela";
}

export const RelatorioBancadaDiaPrintView: React.FC<RelatorioBancadaDiaPrintViewProps> = ({
  laudos,
  dataSelecionada,
  labConfig = DEFAULT_LAB_CONFIG,
  modo = "tiras",
}) => {
  const [dataFormatada, setDataFormatada] = React.useState<string>(() => {
    if (dataSelecionada) {
      try {
        const [ano, mes, dia] = dataSelecionada.split("-");
        return `${dia}/${mes}/${ano}`;
      } catch {
        return dataSelecionada;
      }
    }
    return "";
  });

  const [agoraHora, setAgoraHora] = React.useState<string>("");

  React.useEffect(() => {
    if (!dataFormatada) {
      setDataFormatada(new Date().toLocaleDateString("pt-BR"));
    }
    setAgoraHora(new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }));
  }, [dataFormatada]);

  return (
    <div
      className="bg-white text-black font-sans print:p-0 print:m-0 print:w-full"
      style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif" }}
    >
      {/* CABEÇALHO DO RELATÓRIO DO DIA */}
      <div className="border-b-2 border-black pb-1.5 mb-2.5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 border-2 border-black flex flex-col items-center justify-center font-black leading-none text-center">
            <span className="text-[10px]">SUS</span>
            <span className="text-[6px]">LAB</span>
          </div>
          <div>
            <h1 className="text-xs font-black uppercase tracking-tight">
              {labConfig.nomeInstituicao} - {labConfig.nomeLaboratorio}
            </h1>
            <p className="text-[9.5px] font-bold text-slate-800 uppercase">
              {modo === "tiras"
                ? "CANHOTOS DE BANCADA (TIRAS RECORTÁVEIS PARA ANEXAR À REQUISIÇÃO)"
                : "RELATÓRIO DO DIA - EXAMES DE BANCADA"}
            </p>
          </div>
        </div>

        <div className="text-right text-[9px]">
          <p className="font-bold">Data: {dataFormatada}</p>
          <p className="text-slate-600">Total: {laudos.length} paciente(s)</p>
        </div>
      </div>

      {/* MODO 1: TIRAS / CANHOTOS DE BANCADA (IDÊNTICO AO MODELO FÍSICO DO LABORATÓRIO - CABEM 9 A 12 POR FOLHA) */}
      {modo === "tiras" && (
        <div className="grid grid-cols-2 sm:grid-cols-3 print:grid-cols-3 gap-2 print:gap-1.5">
          {laudos.map((l, idx) => {
            const temOutros =
              l.tem_pso ||
              l.resultado_pso ||
              l.tem_vdrl ||
              l.resultado_vdrl ||
              l.tem_beta_hcg ||
              l.resultado_beta_hcg ||
              l.tem_vhs ||
              l.resultado_vhs ||
              l.tem_pcr ||
              l.resultado_pcr ||
              l.tem_coagulograma ||
              l.tp_tempo ||
              l.tem_proteinuria_rapida ||
              l.resultado_proteinuria_rapida ||
              l.tem_abo_rh ||
              l.resultado_abo_rh;

            return (
              <div
                key={l.prontuario + idx}
                className="border-2 border-black p-2 bg-white break-inside-avoid flex flex-col justify-between"
                style={{ pageBreakInside: "avoid", minHeight: "190px" }}
              >
                {/* TOPO DO CANHOTO */}
                <div className="border-b border-black pb-1 mb-1.5">
                  <div className="flex items-center justify-between text-[9px] font-black font-mono">
                    <span className="bg-black text-white px-1 py-0.2 rounded">#{idx + 1}</span>
                    <span className="font-bold">PRONT: {l.prontuario}</span>
                  </div>
                  <div className="text-[10px] font-black uppercase tracking-tight truncate mt-0.5" title={l.nome_paciente}>
                    {l.nome_paciente}
                  </div>
                </div>

                {/* CAMPOS PADRÃO DA BANCADA: VOL, COR, ASP, PH, DENS, H, L, C, B, CRISTAIS */}
                <div className="space-y-0.5 text-[9.5px] font-mono leading-none">
                  <div className="flex justify-between border-b border-dotted border-slate-300 pb-0.5">
                    <span className="font-black text-black">VOL:</span>
                    <span className="font-sans font-medium text-slate-900">{l.volume || "60 mL"}</span>
                  </div>
                  <div className="flex justify-between border-b border-dotted border-slate-300 pb-0.5">
                    <span className="font-black text-black">COR:</span>
                    <span className="font-sans font-semibold text-slate-900">{l.cor || "Am. citrino"}</span>
                  </div>
                  <div className="flex justify-between border-b border-dotted border-slate-300 pb-0.5">
                    <span className="font-black text-black">ASP:</span>
                    <span className="font-sans font-semibold text-slate-900">{l.aspecto || "Límpido"}</span>
                  </div>
                  <div className="flex justify-between border-b border-dotted border-slate-300 pb-0.5">
                    <span className="font-black text-black">PH:</span>
                    <span className="font-sans font-bold text-slate-900">{l.ph || "6.0"}</span>
                  </div>
                  <div className="flex justify-between border-b border-dotted border-slate-300 pb-0.5">
                    <span className="font-black text-black">DENS:</span>
                    <span className="font-sans font-bold text-slate-900">{l.densidade || "1.020"}</span>
                  </div>
                  <div className="flex justify-between border-b border-dotted border-slate-300 pb-0.5">
                    <span className="font-black text-black">H:</span>
                    <span className="font-sans font-bold text-slate-900">{l.hemacias_campo || "1.000 /mL"}</span>
                  </div>
                  <div className="flex justify-between border-b border-dotted border-slate-300 pb-0.5">
                    <span className="font-black text-black">L:</span>
                    <span className="font-sans font-bold text-slate-900">{l.leucocitos_campo || "4.000 /mL"}</span>
                  </div>
                  <div className="flex justify-between border-b border-dotted border-slate-300 pb-0.5">
                    <span className="font-black text-black">C:</span>
                    <span className="font-sans font-semibold text-slate-900">{l.celulas_epiteliais || "6.000 /mL"}</span>
                  </div>
                  <div className="flex justify-between border-b border-dotted border-slate-300 pb-0.5">
                    <span className="font-black text-black">B:</span>
                    <span className="font-sans font-semibold text-slate-900">{l.bacterias || "Ausentes"}</span>
                  </div>
                  <div className="flex justify-between pb-0.5">
                    <span className="font-black text-black">CRISTAIS:</span>
                    <span className="font-sans font-semibold text-slate-900">{l.cristais || "Ausentes"}</span>
                  </div>
                </div>

                {/* OUTROS EXAMES (SE HOUVER) */}
                {temOutros && (
                  <div className="mt-1 pt-1 border-t-2 border-black text-[8.5px] font-mono leading-tight space-y-0.5 bg-slate-50 p-1 rounded">
                    {(l.tem_abo_rh || l.resultado_abo_rh) && (
                      <div className="font-bold text-black flex justify-between border-b border-slate-300 pb-0.5">
                        <span>ABO/Rh:</span>
                        <span className="font-sans font-black text-slate-900">{l.resultado_abo_rh || "O Positivo (+)"}</span>
                      </div>
                    )}
                    {(l.tem_vdrl || l.resultado_vdrl) && (
                      <div className="font-bold">VDRL: {l.resultado_vdrl || "Não Reagente"}</div>
                    )}
                    {(l.tem_pso || l.resultado_pso) && (
                      <div className="font-bold">PSO: {l.resultado_pso || "Negativo"}</div>
                    )}
                    {(l.tem_beta_hcg || l.resultado_beta_hcg) && (
                      <div className="font-bold">BETA: {l.resultado_beta_hcg || "Negativo"}</div>
                    )}
                    {(l.tp_tempo || l.tem_coagulograma) && (
                      <div className="font-bold">TP: {l.tp_tempo || "12s"} | TTPA: {l.ttpa_tempo || "31s"}</div>
                    )}
                    {(l.tem_vhs || l.resultado_vhs) && (
                      <div className="font-bold">VHS: {l.resultado_vhs || "10mm"}</div>
                    )}
                    {(l.tem_pcr || l.resultado_pcr) && (
                      <div className="font-bold">PCR: {l.resultado_pcr || "Negativo"}</div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* MODO 2: CAIXAS MÉDIAS */}
      {modo === "caixas" && (
        <div className="flex flex-col gap-2.5">
          {laudos.map((l, idx) => (
            <div
              key={l.prontuario + idx}
              className="border border-black rounded p-2 bg-white break-inside-avoid"
              style={{ pageBreakInside: "avoid" }}
            >
              <div className="flex items-center justify-between border-b border-black pb-1 mb-1 font-bold text-[10px]">
                <div className="flex items-center gap-2">
                  <span className="bg-black text-white px-1.5 py-0.2 rounded text-[9px]">#{idx + 1}</span>
                  <span>Pront: {l.prontuario}</span>
                  <span className="uppercase font-black">— {l.nome_paciente}</span>
                </div>
              </div>
              <div className="grid grid-cols-6 gap-1 text-[9px] font-mono">
                <div><b>Cor:</b> {l.cor || "Am. citrino"}</div>
                <div><b>Asp:</b> {l.aspecto || "Límpido"}</div>
                <div><b>Dens:</b> {l.densidade || "1.020"}</div>
                <div><b>pH:</b> {l.ph || "6.0"}</div>
                <div><b>Prot:</b> {l.proteina || "Negativo"}</div>
                <div><b>Glic:</b> {l.glicose || "Negativo"}</div>
              </div>
              <div className="border-t border-slate-200 mt-1 pt-1 grid grid-cols-6 gap-1 text-[9px] font-mono">
                <div><b>Cél:</b> {l.celulas_epiteliais || "Raras"}</div>
                <div><b>Leu:</b> {l.leucocitos_campo || "0-4 p/c"}</div>
                <div><b>Hem:</b> {l.hemacias_campo || "0-2 p/c"}</div>
                <div><b>Bact:</b> {l.bacterias || "Ausentes"}</div>
                <div><b>Cristais:</b> {l.cristais || "Ausentes"}</div>
                <div><b>Cilindros:</b> {l.cilindros || "Ausentes"}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODO 3: TABELA COMPACTA */}
      {modo === "tabela" && (
        <table className="w-full border-collapse border border-black text-[9px]">
          <thead>
            <tr className="bg-slate-200 border-b border-black font-bold uppercase text-[8px]">
              <th className="border border-black p-1 text-center w-8">#</th>
              <th className="border border-black p-1 text-center w-16">Pront.</th>
              <th className="border border-black p-1 text-left w-36">Paciente</th>
              <th className="border border-black p-1 text-left">Físico-Químico</th>
              <th className="border border-black p-1 text-left">Sedimentoscopia</th>
              <th className="border border-black p-1 text-left">Outros</th>
            </tr>
          </thead>
          <tbody>
            {laudos.map((l, idx) => (
              <tr key={l.prontuario + idx} className="border-b border-black">
                <td className="border border-black p-1 text-center font-bold">#{idx + 1}</td>
                <td className="border border-black p-1 text-center font-mono font-bold">{l.prontuario}</td>
                <td className="border border-black p-1 font-bold truncate max-w-[140px]">{l.nome_paciente}</td>
                <td className="border border-black p-1 text-[8.5px] font-mono">
                  D: {l.densidade || "1.020"} | pH: {l.ph || "6.0"} | Cor: {l.cor || "Am. citrino"}
                </td>
                <td className="border border-black p-1 text-[8.5px] font-mono">
                  H: {l.hemacias_campo || "0-2"} | L: {l.leucocitos_campo || "0-4"} | C: {l.celulas_epiteliais || "Raras"} | B: {l.bacterias || "Aus"}
                </td>
                <td className="border border-black p-1 text-[8.5px] font-mono">
                  {[l.resultado_vdrl ? `VDRL: ${l.resultado_vdrl}` : null, l.resultado_pso ? `PSO: ${l.resultado_pso}` : null].filter(Boolean).join(" • ") || "-"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};
