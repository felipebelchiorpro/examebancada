"use client";

import React from "react";
import { LaudoUrina, LabConfig, DEFAULT_LAB_CONFIG } from "@/types/urinalise";

interface RelatorioBancadaDiaPrintViewProps {
  laudos: LaudoUrina[];
  dataSelecionada: string;
  labConfig?: LabConfig;
  modo?: "caixas" | "tabela";
}

export const RelatorioBancadaDiaPrintView: React.FC<RelatorioBancadaDiaPrintViewProps> = ({
  laudos,
  dataSelecionada,
  labConfig = DEFAULT_LAB_CONFIG,
  modo = "caixas",
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
      className="bg-white text-black text-xs font-sans print:p-0 print:m-0 print:w-full"
      style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif" }}
    >
      {/* CABEÇALHO DO RELATÓRIO DO DIA */}
      <div className="border-b-2 border-black pb-2 mb-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 border-2 border-black flex flex-col items-center justify-center font-black leading-none text-center">
            <span className="text-[12px]">SUS</span>
            <span className="text-[7px]">LAB</span>
          </div>
          <div>
            <h1 className="text-sm font-black uppercase tracking-tight">
              {labConfig.nomeInstituicao} - {labConfig.nomeLaboratorio}
            </h1>
            <p className="text-[11px] font-bold text-slate-800 uppercase">
              RELATÓRIO DO DIA - EXAMES DE BANCADA (ANEXO DE ARQUIVOS / DIGITAÇÃO)
            </p>
          </div>
        </div>
        <div className="text-right text-[10px]">
          <p className="font-bold">Data da Bancada: {dataFormatada}</p>
          <p className="text-slate-600">Impresso às {agoraHora} • Total: {laudos.length} paciente(s)</p>
        </div>
      </div>

      {/* MODO CAIXAS MENORES (3 A 4 PACIENTES POR PÁGINA A4) */}
      {modo === "caixas" ? (
        <div className="flex flex-col gap-3">
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
              l.resultado_proteinuria_rapida;

            return (
              <div
                key={l.prontuario + idx}
                className="border border-black rounded p-2.5 bg-white break-inside-avoid shadow-none"
                style={{ pageBreakInside: "avoid" }}
              >
                {/* TOPO DO BLOCO DO PACIENTE */}
                <div className="flex items-center justify-between border-b border-black pb-1 mb-1.5 bg-slate-100 -m-2.5 p-2 rounded-t font-bold text-[11px]">
                  <div className="flex items-center gap-2">
                    <span className="bg-black text-white px-1.5 py-0.5 rounded text-[10px] font-black">
                      TUBO #{idx + 1}
                    </span>
                    <span className="font-mono text-black">Pront: {l.prontuario}</span>
                    <span className="uppercase text-slate-900 font-black">— {l.nome_paciente}</span>
                  </div>
                  <div className="text-[10px] text-slate-700 font-semibold">
                    {l.idade_sexo || ""} {l.posto_unidade ? `• ${l.posto_unidade}` : ""}
                  </div>
                </div>

                {/* CAIXA MENOR 1: URINÁLISE (EAS) */}
                <div className="mt-2">
                  <div className="text-[9.5px] font-black uppercase text-slate-800 mb-0.5 flex items-center gap-1">
                    <span>🧪 URINÁLISE (EAS / SUMÁRIO DE URINA):</span>
                  </div>
                  <div className="bg-slate-50 border border-slate-300 rounded p-1.5 text-[9.5px] leading-tight space-y-1">
                    {/* Linha 1: Físico-Químico */}
                    <div className="grid grid-cols-6 gap-1 font-mono">
                      <div><b className="text-slate-600">Cor:</b> {l.cor || "Am. citrino"}</div>
                      <div><b className="text-slate-600">Asp:</b> {l.aspecto || "Límpido"}</div>
                      <div><b className="text-slate-600">Dens:</b> {l.densidade || "1.020"}</div>
                      <div><b className="text-slate-600">pH:</b> {l.ph || "6.0"}</div>
                      <div><b className="text-slate-600">Prot:</b> {l.proteina || "Negativo"}</div>
                      <div><b className="text-slate-600">Glic:</b> {l.glicose || "Negativo"}</div>
                    </div>
                    {/* Linha 2: Fita Reativa Complementar */}
                    <div className="grid grid-cols-6 gap-1 font-mono">
                      <div><b className="text-slate-600">Cet:</b> {l.cetona || "Negativo"}</div>
                      <div><b className="text-slate-600">Bil:</b> {l.bilirrubina || "Negativo"}</div>
                      <div><b className="text-slate-600">Urob:</b> {l.urobilinogenio || "Normal"}</div>
                      <div><b className="text-slate-600">Sg/Hb:</b> {l.sangue || "Negativo"}</div>
                      <div><b className="text-slate-600">Nit:</b> {l.nitrito || "Negativo"}</div>
                      <div><b className="text-slate-600">Leu(fita):</b> {l.leucocitos_fita || "Negativo"}</div>
                    </div>
                    {/* Linha 3: Sedimentoscopia Microscópica */}
                    <div className="border-t border-slate-200 pt-1 grid grid-cols-6 gap-1 font-mono text-[9px] bg-white p-1 rounded">
                      <div><b className="text-slate-600">Cél:</b> {l.celulas_epiteliais || "Raras"}</div>
                      <div><b className="text-slate-600">Leu:</b> {l.leucocitos_campo || "1-3 p/c"}</div>
                      <div><b className="text-slate-600">Hem:</b> {l.hemacias_campo || "0-1 p/c"}</div>
                      <div><b className="text-slate-600">Bact:</b> {l.bacterias || "Ausentes"}</div>
                      <div><b className="text-slate-600">Cristais:</b> {l.cristais || "Ausentes"}</div>
                      <div><b className="text-slate-600">Cilindros:</b> {l.cilindros || "Ausentes"}</div>
                    </div>
                  </div>
                </div>

                {/* CAIXA MENOR 2: DEMAIS EXAMES DE BANCADA (SE HOUVER) */}
                {temOutros && (
                  <div className="mt-1.5 pt-1 border-t border-dashed border-slate-300">
                    <div className="text-[9.5px] font-black uppercase text-slate-800 mb-0.5">
                      🔬 OUTROS EXAMES DA BANCADA:
                    </div>
                    <div className="bg-slate-50 border border-slate-300 rounded p-1.5 text-[9.5px] flex flex-wrap gap-x-3 gap-y-1 font-mono">
                      {(l.tem_pso || l.resultado_pso) && (
                        <div><b className="text-slate-700">Sangue Oculto (PSO):</b> <span className="font-bold">{l.resultado_pso || "Negativo"}</span></div>
                      )}
                      {(l.tem_proteinuria_rapida || l.resultado_proteinuria_rapida) && (
                        <div><b className="text-slate-700">Proteinúria Rápida:</b> <span className="font-bold">{l.resultado_proteinuria_rapida || "Negativo"}</span></div>
                      )}
                      {(l.tem_vdrl || l.resultado_vdrl) && (
                        <div><b className="text-slate-700">VDRL:</b> <span className="font-bold">{l.resultado_vdrl || "Não Reagente"}</span></div>
                      )}
                      {(l.tem_beta_hcg || l.resultado_beta_hcg) && (
                        <div><b className="text-slate-700">Beta-HCG:</b> <span className="font-bold">{l.resultado_beta_hcg || "Negativo"}</span></div>
                      )}
                      {(l.tem_vhs || l.resultado_vhs) && (
                        <div><b className="text-slate-700">VHS:</b> <span className="font-bold">{l.resultado_vhs || "10 mm/1ªh"}</span></div>
                      )}
                      {(l.tem_pcr || l.resultado_pcr) && (
                        <div><b className="text-slate-700">PCR:</b> <span className="font-bold">{l.resultado_pcr || "Negativo"}</span></div>
                      )}
                      {l.resultado_aslo && (
                        <div><b className="text-slate-700">ASLO:</b> <span className="font-bold">{l.resultado_aslo}</span></div>
                      )}
                      {l.resultado_fr && (
                        <div><b className="text-slate-700">FR:</b> <span className="font-bold">{l.resultado_fr}</span></div>
                      )}
                      {(l.tem_coagulograma || l.tp_tempo) && (
                        <div>
                          <b className="text-slate-700">Coagulograma:</b>{" "}
                          <span className="font-bold">TP: {l.tp_tempo || "12.0s"} (INR {l.tp_inr || "1.00"}) | TTPA: {l.ttpa_tempo || "31.0s"} (Rel {l.ttpa_relacao || "1.00"})</span>
                          {l.coagulograma_repetido && (
                            <span className="ml-1 text-[8.5px] bg-amber-100 text-amber-900 px-1 rounded font-bold border border-amber-300">
                              [Repetido & Confirmado]
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* OBSERVAÇÕES (SE HOUVER) */}
                {l.observacoes && (
                  <div className="mt-1 text-[9px] text-slate-700 italic">
                    <b>Obs:</b> {l.observacoes}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        /* MODO TABELA GERAL ULTRA-COMPACTA */
        <table className="w-full border-collapse border border-black text-[9.5px]">
          <thead>
            <tr className="bg-slate-200 border-b border-black font-bold uppercase text-[8.5px]">
              <th className="border border-black p-1 text-center w-8">Tubo</th>
              <th className="border border-black p-1 text-center w-16">Pront.</th>
              <th className="border border-black p-1 text-left w-36">Paciente</th>
              <th className="border border-black p-1 text-left">Físico-Químico (Fita)</th>
              <th className="border border-black p-1 text-left">Sedimentoscopia (Campo)</th>
              <th className="border border-black p-1 text-left w-48">Outros Exames</th>
            </tr>
          </thead>
          <tbody>
            {laudos.map((l, idx) => (
              <tr key={l.prontuario + idx} className="border-b border-black">
                <td className="border border-black p-1 text-center font-bold">#{idx + 1}</td>
                <td className="border border-black p-1 text-center font-mono font-bold">{l.prontuario}</td>
                <td className="border border-black p-1 font-bold truncate max-w-[140px]">{l.nome_paciente}</td>
                <td className="border border-black p-1 text-[8.5px] font-mono leading-tight">
                  D: {l.densidade || "1.020"} | pH: {l.ph || "6.0"} | Prot: {l.proteina || "Neg"} | Glic: {l.glicose || "Neg"} | Leu: {l.leucocitos_fita || "Neg"} | Sg: {l.sangue || "Neg"} | Nit: {l.nitrito || "Neg"}
                </td>
                <td className="border border-black p-1 text-[8.5px] font-mono leading-tight">
                  Cél: {l.celulas_epiteliais || "Raras"} | Leu: {l.leucocitos_campo || "1-3"} | Hem: {l.hemacias_campo || "0-1"} | Bact: {l.bacterias || "Aus"}
                </td>
                <td className="border border-black p-1 text-[8.5px] font-mono leading-tight">
                  {[
                    l.resultado_pso ? `PSO: ${l.resultado_pso}` : null,
                    l.resultado_vdrl ? `VDRL: ${l.resultado_vdrl}` : null,
                    l.resultado_beta_hcg ? `Beta: ${l.resultado_beta_hcg}` : null,
                    l.tp_tempo ? `TP: ${l.tp_tempo} (${l.tp_inr})` : null,
                    l.ttpa_tempo ? `TTPA: ${l.ttpa_tempo}` : null,
                  ]
                    .filter(Boolean)
                    .join(" • ") || "-"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};
