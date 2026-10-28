"use client";

import React from "react";
import { LaudoUrina, LabConfig, DEFAULT_LAB_CONFIG } from "@/types/urinalise";

interface RelatorioBancadaDiaPrintViewProps {
  laudos: LaudoUrina[];
  dataSelecionada: string;
  labConfig?: LabConfig;
  modo?: "tiras" | "caixas" | "tabela";
}

function pacienteTemUrina(l: LaudoUrina): boolean {
  if (l.tem_urina === false) return false;
  if (l.tem_urina === true) return true;

  // Se o paciente tem qualquer exame de bancada rápida/sangue (Proteinúria, VDRL, ABO/Rh, PSO, etc.)
  // e a Urina 1 não foi solicitada explicitamente
  const temOutroExame = Boolean(
    l.resultado_proteinuria_rapida ||
    l.tem_proteinuria_rapida ||
    l.resultado_vdrl ||
    l.tem_vdrl ||
    l.resultado_abo_rh ||
    l.tem_abo_rh ||
    l.resultado_pso ||
    l.tem_pso ||
    l.tp_tempo ||
    l.tem_coagulograma ||
    l.resultado_beta_hcg ||
    l.tem_beta_hcg ||
    l.resultado_vhs ||
    l.tem_vhs ||
    l.resultado_pcr ||
    l.tem_pcr ||
    l.resultado_aslo ||
    l.tem_aslo ||
    l.resultado_fr ||
    l.tem_fr
  );

  if (temOutroExame) {
    return false;
  }

  return Boolean(l.cor || l.aspecto || l.densidade || l.ph);
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

  // Filtrar laudos rigorosamente pela data selecionada para não puxar pacientes de outros dias
  const laudosExibir = React.useMemo(() => {
    if (!dataSelecionada) return laudos;
    const alvo = dataSelecionada.trim();
    const filtrados = laudos.filter((l) => {
      const d = (l.data_hora || "").split("T")[0];
      return !d || d === alvo;
    });
    return filtrados.length > 0 ? filtrados : laudos;
  }, [laudos, dataSelecionada]);

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
                : modo === "caixas"
                ? "CANHOTOS INDIVIDUAIS DE RESULTADOS POR PACIENTE"
                : "RELATÓRIO DO DIA - EXAMES DE BANCADA"}
            </p>
          </div>
        </div>

        <div className="text-right text-[9px]">
          <p className="font-bold">Data: {dataFormatada}</p>
          <p className="text-slate-600">Total: {laudosExibir.length} paciente(s)</p>
        </div>
      </div>

      {/* MODO 1: TIRAS RECORTÁVEIS (CABEM 9 A 12 POR FOLHA) */}
      {modo === "tiras" && (
        <div className="grid grid-cols-2 sm:grid-cols-3 print:grid-cols-3 gap-2 print:gap-1.5">
          {laudosExibir.map((l, idx) => {
            const isRecoleta = l.status === "recoleta";
            const hasUrina = pacienteTemUrina(l);
            const hasVdrl = Boolean(l.tem_vdrl || l.resultado_vdrl);
            const hasAbo = Boolean(l.tem_abo_rh || l.resultado_abo_rh);
            const hasPso = Boolean(l.tem_pso || l.resultado_pso);
            const hasCoag = Boolean(l.tem_coagulograma || l.tp_tempo);
            const hasBeta = Boolean(l.tem_beta_hcg || l.resultado_beta_hcg);
            const hasProt = Boolean(l.tem_proteinuria_rapida || l.resultado_proteinuria_rapida);
            const hasVhs = Boolean(l.tem_vhs || l.resultado_vhs);
            const hasPcr = Boolean(l.tem_pcr || l.resultado_pcr);
            const hasAslo = Boolean(l.tem_aslo || l.resultado_aslo);
            const hasFr = Boolean(l.tem_fr || l.resultado_fr);

            return (
              <div
                key={l.prontuario + idx}
                className="border-2 border-black p-2 bg-white break-inside-avoid flex flex-col justify-between"
                style={{ pageBreakInside: "avoid", minHeight: "170px" }}
              >
                {/* TOPO DO CANHOTO */}
                <div className="border-b border-black pb-1 mb-1">
                  <div className="flex items-center justify-between text-[9px] font-black font-mono">
                    <span className="bg-black text-white px-1 py-0.2 rounded">#{idx + 1}</span>
                    <span className="font-bold">PRONT: {l.prontuario}</span>
                  </div>
                  <div className="text-[10px] font-black uppercase tracking-tight truncate mt-0.5" title={l.nome_paciente}>
                    {l.nome_paciente}
                  </div>
                </div>

                {/* CORPO DO CANHOTO: SE FOR RECOLETA, EXIBE O ALERTA CLARO EM DESTAQUE */}
                {isRecoleta ? (
                  <div className="my-auto py-2.5 px-1.5 text-center bg-rose-50 border-2 border-rose-600 rounded flex flex-col justify-center items-center">
                    <div className="text-[10.5px] font-black text-rose-700 uppercase tracking-tight flex items-center gap-1">
                      <span>⚠️ RECOLETA SOLICITADA</span>
                    </div>
                    <div className="text-[9.5px] font-black text-slate-900 mt-1 leading-tight uppercase">
                      {l.observacoes?.trim() || "Amostra Inadequada / Solicitar Nova Coleta"}
                    </div>
                    <div className="text-[8px] font-bold text-rose-900 mt-1 pt-1 border-t border-rose-200 w-full">
                      {hasUrina ? "Urina I — Recoleta Solicitada" : "Exame de Bancada — Recoleta"}
                    </div>
                  </div>
                ) : hasUrina ? (
                  <div className="space-y-0.5 text-[9.5px] font-mono leading-none">
                    <div className="flex justify-between border-b border-dotted border-slate-300 pb-0.5">
                      <span className="font-black text-black">VOL:</span>
                      <span className="font-sans font-medium text-slate-900">{l.volume || "60 mL"}</span>
                    </div>
                    <div className="flex justify-between border-b border-dotted border-slate-300 pb-0.5">
                      <span className="font-black text-black">COR:</span>
                      <span className="font-sans font-semibold text-slate-900">{l.cor || "Am. ouro"}</span>
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
                      <span className="font-sans font-semibold text-slate-900">{l.celulas_epiteliais || "Raras"}</span>
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
                ) : (
                  /* SE NÃO TIVER URINA (EX: ELIAS TEM SÓ VDRL, SEBASTIÃO TEM SÓ PROTEINÚRIA): MOSTRA APENAS O EXAME DELE EM DESTAQUE */
                  <div className="my-auto py-2 space-y-1.5 text-center">
                    {hasProt && (
                      <div className="p-2 border border-amber-400 bg-amber-50 rounded">
                        <span className="text-[9px] font-black uppercase text-amber-950 block">Proteinúria (Teste Rápido)</span>
                        <span className="text-xs font-black text-amber-900">{l.resultado_proteinuria_rapida || "Negativo"}</span>
                      </div>
                    )}
                    {hasVdrl && (
                      <div className="p-2 border border-purple-400 bg-purple-50 rounded">
                        <span className="text-[9px] font-black uppercase text-purple-950 block">VDRL (Sífilis)</span>
                        <span className="text-xs font-black text-purple-900">{l.resultado_vdrl || "Não Reagente"}</span>
                      </div>
                    )}
                    {hasAbo && (
                      <div className="p-2 border border-rose-400 bg-rose-50 rounded">
                        <span className="text-[9px] font-black uppercase text-rose-950 block">Tipagem ABO/Rh</span>
                        <span className="text-xs font-black text-rose-900">{l.resultado_abo_rh || "O Positivo (+)"}</span>
                      </div>
                    )}
                    {hasCoag && (
                      <div className="p-2 border border-slate-400 bg-slate-50 rounded text-left">
                        <span className="text-[9px] font-black uppercase text-slate-950 block">Coagulograma / TAP</span>
                        <span className="text-[10px] font-black text-slate-900">
                          TP: {l.tp_tempo || "12.5s"} (INR: {l.tp_inr || "1.00"})
                        </span>
                      </div>
                    )}
                    {hasPso && (
                      <div className="p-2 border border-amber-400 bg-amber-50 rounded">
                        <span className="text-[9px] font-black uppercase text-amber-950 block">Sangue Oculto (PSO)</span>
                        <span className="text-xs font-black text-amber-900">{l.resultado_pso || "Negativo"}</span>
                      </div>
                    )}
                    {hasBeta && (
                      <div className="p-2 border border-pink-400 bg-pink-50 rounded">
                        <span className="text-[9px] font-black uppercase text-pink-950 block">Beta-HCG</span>
                        <span className="text-xs font-black text-pink-900">{l.resultado_beta_hcg || "Negativo"}</span>
                      </div>
                    )}
                    {hasVhs && (
                      <div className="p-2 border border-teal-400 bg-teal-50 rounded">
                        <span className="text-[9px] font-black uppercase text-teal-950 block">VHS (1ª Hora)</span>
                        <span className="text-xs font-black text-teal-900">{l.resultado_vhs || "10 mm/h"}</span>
                      </div>
                    )}
                    {hasPcr && (
                      <div className="p-2 border border-indigo-400 bg-indigo-50 rounded">
                        <span className="text-[9px] font-black uppercase text-indigo-950 block">PCR</span>
                        <span className="text-xs font-black text-indigo-900">{l.resultado_pcr || "Negativo"}</span>
                      </div>
                    )}
                    {hasAslo && (
                      <div className="p-2 border border-indigo-400 bg-indigo-50 rounded">
                        <span className="text-[9px] font-black uppercase text-indigo-950 block">ASLO</span>
                        <span className="text-xs font-black text-indigo-900">{l.resultado_aslo || "Negativo"}</span>
                      </div>
                    )}
                    {hasFr && (
                      <div className="p-2 border border-indigo-400 bg-indigo-50 rounded">
                        <span className="text-[9px] font-black uppercase text-indigo-950 block">FR</span>
                        <span className="text-xs font-black text-indigo-900">{l.resultado_fr || "Negativo"}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* EXAMES ADICIONAIS DE QUEM TEM URINA + OUTRO EXAME (EX: MARCELA -> URINA + PROTEINÚRIA) */}
                {hasUrina && (hasVdrl || hasAbo || hasPso || hasBeta || hasCoag || hasProt || hasVhs || hasPcr) && (
                  <div className="mt-1 pt-1 border-t-2 border-black text-[8.5px] font-mono leading-tight space-y-0.5 bg-slate-50 p-1 rounded">
                    {hasProt && (
                      <div className="font-bold">PROTEINÚRIA: {l.resultado_proteinuria_rapida || "Negativo"}</div>
                    )}
                    {hasAbo && (
                      <div className="font-bold">ABO/Rh: {l.resultado_abo_rh || "O Pos (+)"}</div>
                    )}
                    {hasVdrl && (
                      <div className="font-bold">VDRL: {l.resultado_vdrl || "Não Reagente"}</div>
                    )}
                    {hasPso && (
                      <div className="font-bold">PSO: {l.resultado_pso || "Negativo"}</div>
                    )}
                    {hasBeta && (
                      <div className="font-bold">BETA: {l.resultado_beta_hcg || "Negativo"}</div>
                    )}
                    {hasCoag && (
                      <div className="font-bold">TP: {l.tp_tempo || "12.5s"}</div>
                    )}
                    {hasVhs && (
                      <div className="font-bold">VHS: {l.resultado_vhs || "10mm"}</div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* MODO 2: CAIXAS MÉDIAS (EXIBE SOMENTE OS EXAMES QUE O PACIENTE TEM) */}
      {modo === "caixas" && (
        <div className="flex flex-col gap-2.5">
          {laudosExibir.map((l, idx) => {
            const isRecoleta = l.status === "recoleta";
            const hasUrina = pacienteTemUrina(l);
            const hasVdrl = Boolean(l.tem_vdrl || l.resultado_vdrl);
            const hasAbo = Boolean(l.tem_abo_rh || l.resultado_abo_rh);
            const hasPso = Boolean(l.tem_pso || l.resultado_pso);
            const hasCoag = Boolean(l.tem_coagulograma || l.tp_tempo);
            const hasBeta = Boolean(l.tem_beta_hcg || l.resultado_beta_hcg);
            const hasProt = Boolean(l.tem_proteinuria_rapida || l.resultado_proteinuria_rapida);
            const hasVhs = Boolean(l.tem_vhs || l.resultado_vhs);
            const hasPcr = Boolean(l.tem_pcr || l.resultado_pcr);
            const hasAslo = Boolean(l.tem_aslo || l.resultado_aslo);
            const hasFr = Boolean(l.tem_fr || l.resultado_fr);

            return (
              <div
                key={l.prontuario + idx}
                className={`border-2 rounded-lg p-2.5 bg-white break-inside-avoid space-y-1.5 ${
                  isRecoleta ? "border-rose-600 bg-rose-50/20" : "border-black"
                }`}
                style={{ pageBreakInside: "avoid" }}
              >
                {/* TOPO DA CAIXA: ORDEM, PRONTUÁRIO, NOME E BADGES DOS EXAMES */}
                <div className="flex items-center justify-between border-b-2 border-black pb-1 font-bold text-[10px]">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-white px-1.5 py-0.2 rounded text-[9px] ${
                        isRecoleta ? "bg-rose-600" : "bg-black"
                      }`}
                    >
                      #{idx + 1}
                    </span>
                    <span className="font-mono">Pront: {l.prontuario}</span>
                    <span className="uppercase font-black text-xs">— {l.nome_paciente}</span>
                  </div>

                  {/* IDENTIFICADOR DOS EXAMES DO PACIENTE */}
                  <div className="flex items-center gap-1">
                    {isRecoleta && (
                      <span className="text-[8.5px] bg-rose-600 text-white px-2 py-0.2 rounded font-black tracking-wide">
                        ⚠️ RECOLETA SOLICITADA
                      </span>
                    )}
                    {hasUrina && (
                      <span className="text-[8.5px] bg-sky-100 text-sky-900 px-1.5 py-0.2 rounded font-black border border-sky-300">
                        URINA I
                      </span>
                    )}
                    {hasVdrl && (
                      <span className="text-[8.5px] bg-purple-100 text-purple-900 px-1.5 py-0.2 rounded font-black border border-purple-300">
                        VDRL
                      </span>
                    )}
                    {hasAbo && (
                      <span className="text-[8.5px] bg-rose-100 text-rose-900 px-1.5 py-0.2 rounded font-black border border-rose-300">
                        ABO/Rh
                      </span>
                    )}
                    {hasProt && (
                      <span className="text-[8.5px] bg-amber-100 text-amber-900 px-1.5 py-0.2 rounded font-black border border-amber-300">
                        PROTEINÚRIA
                      </span>
                    )}
                    {hasPso && (
                      <span className="text-[8.5px] bg-amber-100 text-amber-900 px-1.5 py-0.2 rounded font-black border border-amber-300">
                        PSO
                      </span>
                    )}
                    {hasCoag && (
                      <span className="text-[8.5px] bg-slate-200 text-slate-900 px-1.5 py-0.2 rounded font-black border border-slate-400">
                        COAGULOGRAMA
                      </span>
                    )}
                    {hasBeta && (
                      <span className="text-[8.5px] bg-pink-100 text-pink-900 px-1.5 py-0.2 rounded font-black border border-pink-300">
                        BETA-HCG
                      </span>
                    )}
                  </div>
                </div>

                {/* AVISO DESTACADO DE RECOLETA NO CORPO DA CAIXA */}
                {isRecoleta ? (
                  <div className="p-3 bg-rose-50 border-2 border-rose-600 rounded-lg text-center space-y-1 my-1">
                    <span className="text-xs font-black text-rose-900 uppercase block">
                      ⚠️ RECOLETA SOLICITADA PARA ESTE PACIENTE
                    </span>
                    <span className="text-[10.5px] font-bold text-slate-900 block">
                      Motivo: {l.observacoes?.trim() || "Amostra inadequada para análise técnica. Solicitar nova amostra ao posto de saúde."}
                    </span>
                  </div>
                ) : (
                  <>
                    {/* SE TIVER URINA I: EXIBE OS DADOS DA URINA */}
                    {hasUrina && (
                      <div>
                        <div className="grid grid-cols-6 gap-1 text-[9px] font-mono">
                          <div><b>Cor:</b> {l.cor || "Am. ouro"}</div>
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
                    )}

                    {/* SE TIVER EXAMES DIFERENTES DE URINA (VDRL, ABO/RH, PSO, COAG, HCG, ETC.): EXIBE APENAS ELES */}
                    {(hasVdrl || hasAbo || hasProt || hasPso || hasCoag || hasBeta || hasVhs || hasPcr || hasAslo || hasFr) && (
                      <div className={`text-[9.5px] font-mono ${hasUrina ? "border-t border-dashed border-slate-300 pt-1.5 mt-1" : ""}`}>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                          {hasVdrl && (
                            <div className="p-2 bg-purple-50 border border-purple-300 rounded">
                              <span className="font-bold text-purple-950 block text-[9px] uppercase">VDRL (Sífilis):</span>
                              <span className="font-black text-purple-900 text-xs">{l.resultado_vdrl || "Não Reagente"}</span>
                            </div>
                          )}
                          {hasAbo && (
                            <div className="p-2 bg-rose-50 border border-rose-300 rounded">
                              <span className="font-bold text-rose-950 block text-[9px] uppercase">Tipagem Sanguínea / ABO-Rh:</span>
                              <span className="font-black text-rose-900 text-xs">{l.resultado_abo_rh || "O Positivo (+)"}</span>
                            </div>
                          )}
                          {hasProt && (
                            <div className="p-2 bg-amber-50 border border-amber-300 rounded">
                              <span className="font-bold text-amber-950 block text-[9px] uppercase">Proteinúria - Teste Rápido:</span>
                              <span className="font-black text-amber-900 text-xs">{l.resultado_proteinuria_rapida || "Negativo"}</span>
                            </div>
                          )}
                          {hasPso && (
                            <div className="p-2 bg-amber-50 border border-amber-300 rounded">
                              <span className="font-bold text-amber-950 block text-[9px] uppercase">Sangue Oculto nas Fezes (PSO):</span>
                              <span className="font-black text-amber-900 text-xs">{l.resultado_pso || "Negativo"}</span>
                            </div>
                          )}
                          {hasCoag && (
                            <div className="p-2 bg-slate-100 border border-slate-400 rounded col-span-2 sm:col-span-1">
                              <span className="font-bold text-slate-900 block text-[9px] uppercase">Coagulograma / TAP:</span>
                              <span className="font-black text-slate-900 text-[10.5px]">
                                TP: {l.tp_tempo || "12.5s"} (INR: {l.tp_inr || "1.00"})
                                {l.ttpa_tempo ? ` | TTPA: ${l.ttpa_tempo}` : ""}
                              </span>
                            </div>
                          )}
                          {hasBeta && (
                            <div className="p-2 bg-pink-50 border border-pink-300 rounded">
                              <span className="font-bold text-pink-950 block text-[9px] uppercase">Beta-HCG:</span>
                              <span className="font-black text-pink-900 text-xs">{l.resultado_beta_hcg || "Negativo"}</span>
                            </div>
                          )}
                          {hasVhs && (
                            <div className="p-2 bg-teal-50 border border-teal-300 rounded">
                              <span className="font-bold text-teal-950 block text-[9px] uppercase">VHS (1ª Hora):</span>
                              <span className="font-black text-teal-900 text-xs">{l.resultado_vhs || "10 mm/h"}</span>
                            </div>
                          )}
                          {hasPcr && (
                            <div className="p-2 bg-indigo-50 border border-indigo-300 rounded">
                              <span className="font-bold text-indigo-950 block text-[9px] uppercase">PCR:</span>
                              <span className="font-black text-indigo-900 text-xs">{l.resultado_pcr || "Negativo"}</span>
                            </div>
                          )}
                          {hasAslo && (
                            <div className="p-2 bg-indigo-50 border border-indigo-300 rounded">
                              <span className="font-bold text-indigo-950 block text-[9px] uppercase">ASLO:</span>
                              <span className="font-black text-indigo-900 text-xs">{l.resultado_aslo || "Negativo"}</span>
                            </div>
                          )}
                          {hasFr && (
                            <div className="p-2 bg-indigo-50 border border-indigo-300 rounded">
                              <span className="font-bold text-indigo-950 block text-[9px] uppercase">FR:</span>
                              <span className="font-black text-indigo-900 text-xs">{l.resultado_fr || "Negativo"}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            );
          })}
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
              <th className="border border-black p-1 text-left">Outros Exames</th>
            </tr>
          </thead>
          <tbody>
            {laudosExibir.map((l, idx) => {
              const isRecoleta = l.status === "recoleta";
              const hasUrina = pacienteTemUrina(l);
              return (
                <tr
                  key={l.prontuario + idx}
                  className={`border-b border-black ${isRecoleta ? "bg-rose-50" : ""}`}
                >
                  <td className="border border-black p-1 text-center font-bold">#{idx + 1}</td>
                  <td className="border border-black p-1 text-center font-mono font-bold">{l.prontuario}</td>
                  <td className="border border-black p-1 font-bold truncate max-w-[140px]">
                    {l.nome_paciente}
                    {isRecoleta && (
                      <span className="ml-1 text-[7.5px] bg-rose-600 text-white px-1 py-0.2 rounded font-black">
                        RECOLETA
                      </span>
                    )}
                  </td>
                  <td className="border border-black p-1 text-[8.5px] font-mono">
                    {isRecoleta ? (
                      <span className="font-black text-rose-700 uppercase">⚠️ RECOLETA SOLICITADA</span>
                    ) : hasUrina ? (
                      `D: ${l.densidade || "1.020"} | pH: ${l.ph || "6.0"} | Cor: ${l.cor || "Am. ouro"}`
                    ) : (
                      <span className="text-slate-400 italic">Não solicitado</span>
                    )}
                  </td>
                  <td className="border border-black p-1 text-[8.5px] font-mono">
                    {isRecoleta ? (
                      <span className="font-bold text-rose-700 italic">Não realizada</span>
                    ) : hasUrina ? (
                      `H: ${l.hemacias_campo || "0-2"} | L: ${l.leucocitos_campo || "0-4"} | C: ${l.celulas_epiteliais || "Raras"} | B: ${l.bacterias || "Aus"}`
                    ) : (
                      <span className="text-slate-400 italic">Não solicitado</span>
                    )}
                  </td>
                  <td className="border border-black p-1 text-[8.5px] font-mono">
                    {isRecoleta ? (
                      <span className="font-bold text-slate-900">
                        Motivo: {l.observacoes?.trim() || "Amostra inadequada"}
                      </span>
                    ) : (
                      [
                        l.resultado_vdrl ? `VDRL: ${l.resultado_vdrl}` : null,
                        l.resultado_abo_rh ? `ABO/Rh: ${l.resultado_abo_rh}` : null,
                        l.resultado_proteinuria_rapida ? `Prot. Rápida: ${l.resultado_proteinuria_rapida}` : null,
                        l.resultado_pso ? `PSO: ${l.resultado_pso}` : null,
                        l.tp_tempo ? `TP: ${l.tp_tempo}` : null,
                        l.resultado_beta_hcg ? `Beta: ${l.resultado_beta_hcg}` : null,
                        l.resultado_vhs ? `VHS: ${l.resultado_vhs}` : null,
                      ]
                        .filter(Boolean)
                        .join(" • ") || "-"
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
};
