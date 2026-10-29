"use client";

import React from "react";
import { LaudoUrina, LabConfig, DEFAULT_LAB_CONFIG } from "@/types/urinalise";

interface LaudoPrintViewProps {
  laudo: LaudoUrina;
  labConfig?: LabConfig;
  showBorder?: boolean;
}

export const LaudoPrintView: React.FC<LaudoPrintViewProps> = ({
  laudo,
  labConfig = DEFAULT_LAB_CONFIG,
  showBorder = true,
}) => {
  const [dataImpressao, setDataImpressao] = React.useState<string>("");

  React.useEffect(() => {
    setDataImpressao(new Date().toLocaleString("pt-BR"));
  }, []);

  // Formatar data/hora no padrão brasileiro
  const dataFormatada = React.useMemo(() => {
    if (!laudo.data_hora) return "--/--/----";
    try {
      const d = new Date(laudo.data_hora);
      return (
        d.toLocaleDateString("pt-BR") +
        " às " +
        d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
      );
    } catch {
      return laudo.data_hora;
    }
  }, [laudo.data_hora]);

  return (
    <div
      className={`bg-white text-black text-xs leading-relaxed font-sans ${
        showBorder ? "border border-slate-300 shadow-md p-6 sm:p-8 rounded-lg max-w-4xl mx-auto" : "p-0"
      } print:border-none print:shadow-none print:p-0 print:m-0 print:max-w-none print:w-full print-page-break`}
      style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif" }}
    >
      {/* CABEÇALHO INSTITUCIONAL SUS / MUNICIPAL */}
      <div className="border-b-2 border-slate-900 pb-3 mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Emblema SUS estilizado */}
            <div className="w-12 h-12 bg-sky-700 text-white font-black rounded-lg flex flex-col items-center justify-center leading-none text-center shadow-xs print:border print:border-black print:bg-white print:text-black">
              <span className="text-[14px]">SUS</span>
              <span className="text-[8px] font-normal tracking-tighter">BRASIL</span>
            </div>
            <div>
              <h1 className="text-sm sm:text-base font-black tracking-tight text-slate-950 uppercase">
                {labConfig.nomeInstituicao}
              </h1>
              <p className="text-[11px] font-semibold text-slate-700 uppercase">
                {labConfig.subtitulo}
              </p>
              <p className="text-[11px] font-bold text-sky-900 print:text-black">
                {labConfig.nomeLaboratorio}
              </p>
            </div>
          </div>
          <div className="text-right text-[10px] text-slate-600 print:text-black">
            <p className="font-semibold">{labConfig.cidadeUf}</p>
            <p className="font-bold text-slate-900 uppercase">Relatório de Bancada (Anexo de Arquivo)</p>
            <p className="text-[9px] text-slate-500">Para conferência e digitação de resultados no sistema</p>
            <p className="font-mono text-[9px] text-slate-500">
              ID: {laudo.prontuario}-{laudo.data_hora.slice(0, 10).replace(/-/g, "")}
            </p>
          </div>
        </div>
      </div>

      {/* DADOS DO PACIENTE */}
      <div className="bg-slate-50 border border-slate-300 rounded p-2.5 mb-4 text-[11px] print:bg-transparent print:border-slate-800">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <div className="col-span-2">
            <span className="text-slate-500 font-semibold block text-[9px] uppercase">Paciente</span>
            <span className="font-black text-slate-950 text-xs sm:text-sm">{laudo.nome_paciente}</span>
          </div>
          <div>
            <span className="text-slate-500 font-semibold block text-[9px] uppercase">Prontuário / Código</span>
            <span className="font-mono font-bold text-slate-900">{laudo.prontuario}</span>
          </div>
          <div>
            <span className="text-slate-500 font-semibold block text-[9px] uppercase">Data / Horário</span>
            <span className="font-semibold text-slate-800">{dataFormatada}</span>
          </div>
          <div>
            <span className="text-slate-500 font-semibold block text-[9px] uppercase">Idade / Sexo</span>
            <span className="text-slate-800">{laudo.idade_sexo || "Não informado"}</span>
          </div>
          <div>
            <span className="text-slate-500 font-semibold block text-[9px] uppercase">Unidade de Saúde</span>
            <span className="text-slate-800">{laudo.posto_unidade || "Posto Municipal"}</span>
          </div>
          <div className="col-span-2">
            <span className="text-slate-500 font-semibold block text-[9px] uppercase">Médico Solicitante</span>
            <span className="text-slate-800">{laudo.solicitante || "Rede de Atenção Básica SUS"}</span>
          </div>
        </div>
      </div>

      {/* TÍTULO DO EXAME */}
      <div className={`text-white font-bold py-1 px-3 text-center rounded-t text-xs uppercase tracking-wider mb-2 print:border print:border-black ${
        laudo.status === "recoleta"
          ? "bg-rose-700 print:bg-slate-200 print:text-black"
          : "bg-slate-800 print:bg-slate-200 print:text-black"
      }`}>
        {laudo.status === "recoleta"
          ? "LAUDO LABORATORIAL — SOLICITAÇÃO DE RECOLETA"
          : laudo.tem_urina !== false && Boolean(laudo.cor || laudo.aspecto || laudo.densidade)
          ? "URINA TIPO I - ELEMENTOS ANORMAIS E SEDIMENTO (EAS / SUMÁRIO DE URINA)"
          : "EXAMES DE BANCADA & TESTES RÁPIDOS LABORATORIAIS"}
      </div>

      {/* SE FOR RECOLETA: EXIBE PAINEL EXCLUSIVO E DESTACADO DE RECOLETA */}
      {laudo.status === "recoleta" ? (
        <div className="border-2 border-rose-600 bg-rose-50/40 rounded-xl p-6 mb-6 text-center space-y-4 avoid-break print:border-black print:bg-slate-50">
          <div className="inline-block bg-rose-600 text-white font-black text-sm px-4 py-1.5 rounded uppercase tracking-wider print:bg-black">
            ⚠️ SOLICITAÇÃO DE RECOLETA DE AMOSTRA
          </div>
          
          <div className="text-slate-900 font-bold text-xs max-w-lg mx-auto">
            A análise laboratorial desta amostra não pôde ser concluída e necessita de nova coleta para garantir a confiabilidade técnica do resultado.
          </div>

          <div className="bg-white border-2 border-rose-300 rounded-xl p-4 text-left max-w-xl mx-auto print:border-black">
            <span className="text-[11px] font-black uppercase text-rose-800 block mb-1">
              Motivo da Recoleta / Justificativa Técnica:
            </span>
            <p className="text-sm font-bold text-slate-950 uppercase">
              {laudo.observacoes?.trim() || "Amostra insuficiente ou inadequada para análise técnica. Solicitar nova coleta ao paciente."}
            </p>
          </div>

          <div className="text-[11px] text-slate-600 font-medium max-w-md mx-auto">
            Por gentileza, orientar o paciente para nova coleta e encaminhar a nova amostra devidamente identificada ao Laboratório Municipal.
          </div>
        </div>
      ) : (
        <>
          {/* TABELAS DO EXAME FÍSICO-QUÍMICO E SEDIMENTOSCOPIA (SOMENTE SE URINA ESTIVER SOLICITADA) */}
          {laudo.tem_urina !== false && Boolean(laudo.cor || laudo.aspecto || laudo.densidade) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4 avoid-break">
        {/* PARTE 1: EXAME FÍSICO-QUÍMICO */}
        <div className="border border-slate-300 rounded overflow-hidden print:border-slate-800">
          <div className="bg-slate-200 px-2.5 py-1 font-bold text-[11px] text-slate-800 border-b border-slate-300 uppercase print:bg-slate-100">
            1. Exame Físico e Químico
          </div>
          <table className="w-full text-[10.5px]">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 text-[9px] uppercase">
                <th className="py-1 px-2 text-left font-semibold">Parâmetro</th>
                <th className="py-1 px-2 text-left font-semibold">Resultado</th>
                <th className="py-1 px-2 text-right font-semibold">Valor de Referência</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              <tr>
                <td className="py-1 px-2 font-medium">Volume da Amostra</td>
                <td className="py-1 px-2 font-bold text-slate-900">{laudo.volume || "60 mL"}</td>
                <td className="py-1 px-2 text-right text-slate-500">-</td>
              </tr>
              <tr>
                <td className="py-1 px-2 font-medium">Cor</td>
                <td className="py-1 px-2 font-bold text-slate-900">{laudo.cor}</td>
                <td className="py-1 px-2 text-right text-slate-500">Amarelo citrino</td>
              </tr>
              <tr>
                <td className="py-1 px-2 font-medium">Aspecto</td>
                <td className="py-1 px-2 font-bold text-slate-900">{laudo.aspecto}</td>
                <td className="py-1 px-2 text-right text-slate-500">Límpido</td>
              </tr>
              <tr>
                <td className="py-1 px-2 font-medium">Densidade</td>
                <td className="py-1 px-2 font-bold text-slate-900">{laudo.densidade}</td>
                <td className="py-1 px-2 text-right text-slate-500">1.015 a 1.025</td>
              </tr>
              <tr>
                <td className="py-1 px-2 font-medium">pH</td>
                <td className="py-1 px-2 font-bold text-slate-900">{laudo.ph}</td>
                <td className="py-1 px-2 text-right text-slate-500">5.0 a 7.0</td>
              </tr>
              <tr>
                <td className="py-1 px-2 font-medium">Proteínas</td>
                <td className="py-1 px-2 font-bold text-slate-900">{laudo.proteina}</td>
                <td className="py-1 px-2 text-right text-slate-500">Negativo</td>
              </tr>
              <tr>
                <td className="py-1 px-2 font-medium">Glicose</td>
                <td className="py-1 px-2 font-bold text-slate-900">{laudo.glicose}</td>
                <td className="py-1 px-2 text-right text-slate-500">Negativo</td>
              </tr>
              <tr>
                <td className="py-1 px-2 font-medium">Corpos Cetônicos</td>
                <td className="py-1 px-2 font-bold text-slate-900">{laudo.cetona}</td>
                <td className="py-1 px-2 text-right text-slate-500">Negativo</td>
              </tr>
              <tr>
                <td className="py-1 px-2 font-medium">Bilirrubina</td>
                <td className="py-1 px-2 font-bold text-slate-900">{laudo.bilirrubina}</td>
                <td className="py-1 px-2 text-right text-slate-500">Negativo</td>
              </tr>
              <tr>
                <td className="py-1 px-2 font-medium">Urobilinogênio</td>
                <td className="py-1 px-2 font-bold text-slate-900">{laudo.urobilinogenio}</td>
                <td className="py-1 px-2 text-right text-slate-500">Normal (&lt; 1.0 mg/dL)</td>
              </tr>
              <tr>
                <td className="py-1 px-2 font-medium">Sangue / Hb</td>
                <td className="py-1 px-2 font-bold text-slate-900">{laudo.sangue}</td>
                <td className="py-1 px-2 text-right text-slate-500">Negativo</td>
              </tr>
              <tr>
                <td className="py-1 px-2 font-medium">Nitrito</td>
                <td className="py-1 px-2 font-bold text-slate-900">{laudo.nitrito}</td>
                <td className="py-1 px-2 text-right text-slate-500">Negativo</td>
              </tr>
              <tr>
                <td className="py-1 px-2 font-medium">Leucócitos (Fita)</td>
                <td className="py-1 px-2 font-bold text-slate-900">{laudo.leucocitos_fita}</td>
                <td className="py-1 px-2 text-right text-slate-500">Negativo</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* PARTE 2: SEDIMENTOSCOPIA / MICROSCOPIA */}
        <div className="border border-slate-300 rounded overflow-hidden print:border-slate-800">
          <div className="bg-slate-200 px-2.5 py-1 font-bold text-[11px] text-slate-800 border-b border-slate-300 uppercase print:bg-slate-100">
            2. Sedimentoscopia (Microscopia Óptica)
          </div>
          <table className="w-full text-[10.5px]">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 text-[9px] uppercase">
                <th className="py-1 px-2 text-left font-semibold">Elemento</th>
                <th className="py-1 px-2 text-left font-semibold">Resultado</th>
                <th className="py-1 px-2 text-right font-semibold">Valor de Referência</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              <tr>
                <td className="py-1.5 px-2 font-medium">Células Epiteliais</td>
                <td className="py-1.5 px-2 font-bold text-slate-900">{laudo.celulas_epiteliais}</td>
                <td className="py-1.5 px-2 text-right text-slate-500">Raras</td>
              </tr>
              <tr>
                <td className="py-1.5 px-2 font-medium">Leucócitos (Piócitos)</td>
                <td className="py-1.5 px-2 font-bold text-slate-900">{laudo.leucocitos_campo}</td>
                <td className="py-1.5 px-2 text-right text-slate-500">Até 4 por campo</td>
              </tr>
              <tr>
                <td className="py-1.5 px-2 font-medium">Hemácias</td>
                <td className="py-1.5 px-2 font-bold text-slate-900">{laudo.hemacias_campo}</td>
                <td className="py-1.5 px-2 text-right text-slate-500">Até 2 por campo</td>
              </tr>
              <tr>
                <td className="py-1.5 px-2 font-medium">Flora Bacteriana</td>
                <td className="py-1.5 px-2 font-bold text-slate-900">{laudo.bacterias}</td>
                <td className="py-1.5 px-2 text-right text-slate-500">Ausente / Flora habitual</td>
              </tr>
              <tr>
                <td className="py-1.5 px-2 font-medium">Filamentos de Muco</td>
                <td className="py-1.5 px-2 font-bold text-slate-900">{laudo.muco || "Ausentes"}</td>
                <td className="py-1.5 px-2 text-right text-slate-500">Ausentes</td>
              </tr>
              <tr>
                <td className="py-1.5 px-2 font-medium">Cristais</td>
                <td className="py-1.5 px-2 font-bold text-slate-900">{laudo.cristais}</td>
                <td className="py-1.5 px-2 text-right text-slate-500">Ausentes</td>
              </tr>
              <tr>
                <td className="py-1.5 px-2 font-medium">Cilindros</td>
                <td className="py-1.5 px-2 font-bold text-slate-900">{laudo.cilindros}</td>
                <td className="py-1.5 px-2 text-right text-slate-500">Ausentes</td>
              </tr>
            </tbody>
          </table>

          {/* Destaque Metodologia */}
          <div className="p-2 border-t border-slate-200 bg-slate-50 text-[9.5px] text-slate-600 print:bg-white print:border-slate-400">
            <span className="font-semibold text-slate-800">Métodos:</span> Fita Reativa por Reflectância Fotométrica / Sedimentoscopia após centrifugação padronizada (10 mL de urina a 1500 RPM por 5 minutos).
          </div>
        </div>
      </div>
      )}

      {/* SEÇÃO 3: PESQUISA DE SANGUE OCULTO (PSO) SE SOLICITADO */}
      {(laudo.tem_pso || laudo.resultado_pso) && (
        <div className="border border-slate-300 rounded overflow-hidden mb-4 avoid-break print:border-slate-800">
          <div className="bg-slate-200 px-2.5 py-1 font-bold text-[11px] text-slate-800 border-b border-slate-300 uppercase print:bg-slate-100 flex items-center justify-between">
            <span>3. Pesquisa de Sangue Oculto (PSO - Fezes)</span>
            <span className="text-[9.5px] font-normal">Método: Teste Imunocromatográfico de Alta Sensibilidade</span>
          </div>
          <table className="w-full text-[10.5px]">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 text-[9px] uppercase">
                <th className="py-1 px-2 text-left font-semibold">Exame</th>
                <th className="py-1 px-2 text-left font-semibold">Resultado</th>
                <th className="py-1 px-2 text-right font-semibold">Valor de Referência</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="py-1.5 px-2 font-medium">Pesquisa de Sangue Oculto nas Fezes</td>
                <td className="py-1.5 px-2 font-black text-slate-950 text-xs">
                  {laudo.resultado_pso || "Negativo"}
                </td>
                <td className="py-1.5 px-2 text-right text-slate-500">Negativo (Ausência de hemoglobina humana)</td>
              </tr>
            </tbody>
          </table>
          {laudo.obs_pso && (
            <div className="p-1.5 px-2 bg-slate-50 border-t border-slate-200 text-[9.5px] text-slate-700 italic">
              Nota técnica PSO: {laudo.obs_pso}
            </div>
          )}
        </div>
      )}

      {/* SEÇÃO 4: TESTES RÁPIDOS (BETA-HCG / VDRL) SE SOLICITADO */}
      {(laudo.tem_beta_hcg || laudo.resultado_beta_hcg || laudo.tem_vdrl || laudo.resultado_vdrl || laudo.tem_dengue || laudo.resultado_dengue) && (
        <div className="border border-slate-300 rounded overflow-hidden mb-4 avoid-break print:border-slate-800">
          <div className="bg-slate-200 px-2.5 py-1 font-bold text-[11px] text-slate-800 border-b border-slate-300 uppercase print:bg-slate-100 flex items-center justify-between">
            <span>Testes Rápidos / Triagem Sorológica</span>
            <span className="text-[9.5px] font-normal">Método: Imunocromatografia / Floculação</span>
          </div>
          <table className="w-full text-[10.5px]">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 text-[9px] uppercase">
                <th className="py-1 px-2 text-left font-semibold">Exame</th>
                <th className="py-1 px-2 text-left font-semibold">Resultado</th>
                <th className="py-1 px-2 text-right font-semibold">Valor de Referência</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(laudo.tem_beta_hcg || laudo.resultado_beta_hcg) && (
                <tr>
                  <td className="py-1.5 px-2 font-medium">Beta-HCG (Teste Imunológico de Gravidez)</td>
                  <td className="py-1.5 px-2 font-black text-slate-950">{laudo.resultado_beta_hcg || "Negativo"}</td>
                  <td className="py-1.5 px-2 text-right text-slate-500">Negativo (&lt; 25 mUI/mL)</td>
                </tr>
              )}
              {(laudo.tem_vdrl || laudo.resultado_vdrl) && (
                <tr>
                  <td className="py-1.5 px-2 font-medium">VDRL / Teste Rápido Sífilis</td>
                  <td className="py-1.5 px-2 font-black text-slate-950">
                    {laudo.vdrl_acumular_lote || laudo.resultado_vdrl === "Aguardando lote semanal"
                      ? "Aguardando lote semanal (acumulado)"
                      : laudo.resultado_vdrl || "Não Reagente"}
                  </td>
                  <td className="py-1.5 px-2 text-right text-slate-500">Não Reagente</td>
                </tr>
              )}
              {(laudo.tem_dengue || laudo.resultado_dengue) && (
                <tr>
                  <td className="py-1.5 px-2 font-medium">Teste Rápido Dengue (NS1 / IgG / IgM)</td>
                  <td className="py-1.5 px-2 font-black text-slate-950">{laudo.resultado_dengue || "Não Reagente"}</td>
                  <td className="py-1.5 px-2 text-right text-slate-500">Não Reagente</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* SEÇÃO 5: PROVAS INFLAMATÓRIAS / VHS SE SOLICITADO */}
      {(laudo.tem_vhs || laudo.resultado_vhs || laudo.tem_pcr || laudo.resultado_pcr || laudo.tem_aslo || laudo.resultado_aslo || laudo.tem_fr || laudo.resultado_fr) && (
        <div className="border border-slate-300 rounded overflow-hidden mb-4 avoid-break print:border-slate-800">
          <div className="bg-slate-200 px-2.5 py-1 font-bold text-[11px] text-slate-800 border-b border-slate-300 uppercase print:bg-slate-100 flex items-center justify-between">
            <span>Provas Inflamatórias & Reumatológicas</span>
            <span className="text-[9.5px] font-normal">Métodos: Westergren / Aglutinação em Látex</span>
          </div>
          <table className="w-full text-[10.5px]">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 text-[9px] uppercase">
                <th className="py-1 px-2 text-left font-semibold">Exame</th>
                <th className="py-1 px-2 text-left font-semibold">Resultado</th>
                <th className="py-1 px-2 text-right font-semibold">Valor de Referência</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(laudo.tem_vhs || laudo.resultado_vhs) && (
                <tr>
                  <td className="py-1.5 px-2 font-medium">VHS (Velocidade de Hemossedimentação)</td>
                  <td className="py-1.5 px-2 font-black text-slate-950">{laudo.resultado_vhs || "10 mm/1ª hora"}</td>
                  <td className="py-1.5 px-2 text-right text-slate-500">Homens: até 15 mm | Mulheres: até 20 mm</td>
                </tr>
              )}
              {(laudo.tem_pcr || laudo.resultado_pcr) && (
                <tr>
                  <td className="py-1.5 px-2 font-medium">Proteína C-Reativa (PCR)</td>
                  <td className="py-1.5 px-2 font-black text-slate-950">{laudo.resultado_pcr || "Negativo (< 6 mg/L)"}</td>
                  <td className="py-1.5 px-2 text-right text-slate-500">Inferior a 6.0 mg/L</td>
                </tr>
              )}
              {(laudo.tem_aslo || laudo.resultado_aslo) && (
                <tr>
                  <td className="py-1.5 px-2 font-medium">Antiestreptolisina O (ASLO)</td>
                  <td className="py-1.5 px-2 font-black text-slate-950">{laudo.resultado_aslo || "Negativo (< 200 UI/mL)"}</td>
                  <td className="py-1.5 px-2 text-right text-slate-500">Até 200 UI/mL</td>
                </tr>
              )}
              {(laudo.tem_fr || laudo.resultado_fr) && (
                <tr>
                  <td className="py-1.5 px-2 font-medium">Fator Reumatoide (FR / Waaler-Rose)</td>
                  <td className="py-1.5 px-2 font-black text-slate-950">{laudo.resultado_fr || "Negativo (< 8 UI/mL)"}</td>
                  <td className="py-1.5 px-2 text-right text-slate-500">Inferior a 8.0 UI/mL</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* SEÇÃO 6: COAGULOGRAMA / TAP / TTPA SE SOLICITADO */}
      {(() => {
        const hasTp = Boolean(laudo.tem_tap || laudo.tp_tempo);
        const hasTtpa = Boolean(laudo.tem_ttpa || laudo.ttpa_tempo);
        const hasCoag = Boolean(laudo.tem_coagulograma || hasTp || hasTtpa);
        if (!hasCoag) return null;

        return (
          <div className="border border-slate-300 rounded overflow-hidden mb-4 avoid-break print:border-slate-800">
            <div className="bg-slate-200 px-2.5 py-1 font-bold text-[11px] text-slate-800 border-b border-slate-300 uppercase print:bg-slate-100 flex items-center justify-between">
              <span>
                {hasTp && !hasTtpa
                  ? "Tempo de Atividade de Protrombina (TAP / TP)"
                  : hasTtpa && !hasTp
                  ? "Tempo de Tromboplastina Parcial Ativada (TTPA)"
                  : "Coagulograma de Bancada (TAP & TTPA)"}
              </span>
              <span className="text-[9.5px] font-normal">Método: Coagulométrico / Manual de Banho-Maria</span>
            </div>
            <table className="w-full text-[10.5px]">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 text-[9px] uppercase">
                  <th className="py-1 px-2 text-left font-semibold">Parâmetro</th>
                  <th className="py-1 px-2 text-left font-semibold">Resultado</th>
                  <th className="py-1 px-2 text-right font-semibold">Valor de Referência</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(hasTp || (!hasTp && !hasTtpa)) && (
                  <tr>
                    <td className="py-1.5 px-2 font-medium">Tempo de Protrombina (TP / TAP)</td>
                    <td className="py-1.5 px-2 font-black text-slate-950">
                      {laudo.tp_tempo || "12.0 seg"} {laudo.tp_inr ? `(INR: ${laudo.tp_inr})` : ""}
                    </td>
                    <td className="py-1.5 px-2 text-right text-slate-500">11.0 a 14.0 seg (INR: 0.8 a 1.2)</td>
                  </tr>
                )}
                {(hasTtpa || (!hasTp && !hasTtpa)) && (
                  <tr>
                    <td className="py-1.5 px-2 font-medium">Tempo de Tromboplastina Parcial Ativada (TTPA)</td>
                    <td className="py-1.5 px-2 font-black text-slate-950">
                      {laudo.ttpa_tempo || "30.0 seg"} {laudo.ttpa_relacao ? `(Relação: ${laudo.ttpa_relacao})` : ""}
                    </td>
                    <td className="py-1.5 px-2 text-right text-slate-500">25.0 a 35.0 seg (Relação: até 1.20)</td>
                  </tr>
                )}
              </tbody>
            </table>
          {laudo.coagulograma_repetido && (
            <div className="bg-amber-50 border-t border-amber-300 p-2 text-[10px] text-amber-950 font-bold flex items-center justify-between print:bg-slate-50 print:border-slate-400">
              <span className="flex items-center gap-1.5">
                <span>🔁</span>
                <span>NOTA: EXAME REPETIDO E CONFIRMADO EM DUPLICATA TÉCNICA NESTA MESMA AMOSTRA.</span>
              </span>
              {(laudo.coagulograma_tp_1 || laudo.coagulograma_ttpa_1) && (
                <span className="text-[9px] font-normal text-slate-700">
                  (1ª Medição: {laudo.coagulograma_tp_1 ? `TP ${laudo.coagulograma_tp_1}` : ""} {laudo.coagulograma_ttpa_1 ? `| TTPA ${laudo.coagulograma_ttpa_1}` : ""})
                </span>
              )}
            </div>
          )}
        </div>
        );
      })()}

      {/* SEÇÃO 7: TESTE RÁPIDO DE PROTEINÚRIA (PRÉ-NATAL / GESTANTE) */}
      {(laudo.tem_proteinuria_rapida || laudo.resultado_proteinuria_rapida) && (
        <div className="border border-slate-300 rounded overflow-hidden mb-4 avoid-break print:border-slate-800">
          <div className="bg-slate-200 px-2.5 py-1 font-bold text-[11px] text-slate-800 border-b border-slate-300 uppercase print:bg-slate-100 flex items-center justify-between">
            <span>Teste Rápido de Proteinúria (Rastreio Gestacional / Pré-Eclâmpsia)</span>
            <span className="text-[9.5px] font-normal">Método: Tira Reagente / Precipitação Semiquantitativa</span>
          </div>
          <table className="w-full text-[10.5px]">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 text-[9px] uppercase">
                <th className="py-1 px-2 text-left font-semibold">Exame</th>
                <th className="py-1 px-2 text-left font-semibold">Resultado</th>
                <th className="py-1 px-2 text-right font-semibold">Valor de Referência</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              <tr>
                <td className="py-1.5 px-2 font-medium">Proteinúria de Rastreio Rápido (Amostra Isolada)</td>
                <td className="py-1.5 px-2 font-black text-slate-950">
                  {laudo.resultado_proteinuria_rapida || "Negativo"}
                </td>
                <td className="py-1.5 px-2 text-right text-slate-500">Negativo (&lt; 30 mg/dL)</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
      </>
      )}

      {/* OBSERVAÇÕES DO LAUDO */}
      <div className={`border rounded p-3 mb-6 text-[10.5px] avoid-break ${
        laudo.status === "recoleta" ? "border-rose-400 bg-rose-50/30 print:border-black" : "border-slate-300 print:border-slate-800"
      }`}>
        <span className="font-bold text-slate-800 uppercase block text-[9.5px] mb-0.5">
          Observações Clínico-Laboratoriais:
        </span>
        <p className="text-slate-900 font-semibold italic">
          {laudo.observacoes?.trim() || (laudo.status === "recoleta" ? "Amostra com solicitação de recoleta técnica." : "Sem observações adicionais. Exame realizado sob controle interno de qualidade.")}
        </p>
        {laudo.status === "recoleta" && (
          <div className="mt-1 text-rose-700 font-black text-[10px] uppercase">
            * ATENÇÃO: AMOSTRA SINALIZADA PARA RECOLETA CONFORME JUSTIFICATIVA TÉCNICA ACIMA.
          </div>
        )}
      </div>

      {/* RODAPÉ E CARIMBO / ASSINATURA */}
      <div className="pt-4 border-t border-slate-300 flex justify-between items-end avoid-break print:border-slate-800">
        <div className="text-[9px] text-slate-500 max-w-xs print:text-black">
          <p>Laudo emitido por sistema automatizado de bancada de Urinálise.</p>
          <p>Valores de referência conforme Diretrizes da SBPC/ML.</p>
          <p>Impresso em: {dataImpressao || "--/--/----"}</p>
        </div>

        <div className="text-center w-64">
          <div className="border-b border-slate-900 mb-1 w-full h-8 flex items-end justify-center">
            {/* Linha para assinatura manual ou carimbo */}
          </div>
          <p className="font-bold text-slate-900 text-[11px] uppercase">
            {labConfig.responsavelTecnico}
          </p>
          <p className="text-[9.5px] text-slate-600 print:text-black">
            {labConfig.registroProfissional}
          </p>
        </div>
      </div>
    </div>
  );
};
