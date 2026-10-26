"use client";

import React, { useState, useEffect } from "react";
import { LabConfig, DEFAULT_LAB_CONFIG } from "@/types/urinalise";
import {
  ShieldCheck,
  CheckCircle2,
  RefreshCw,
  ExternalLink,
  Save,
  Key,
  Building,
} from "lucide-react";

export default function ConfiguracoesPage() {
  const [sheetsInfo, setSheetsInfo] = useState<{
    ok: boolean;
    isConfigured: boolean;
    sheetId?: string;
    clientEmail?: string;
    message?: string;
    missing?: any;
    diagnostico?: any;
  } | null>(null);

  const [isTesting, setIsTesting] = useState<boolean>(false);
  const [labConfig, setLabConfig] = useState<LabConfig>(DEFAULT_LAB_CONFIG);
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);

  useEffect(() => {
    testarConexaoSheets();
    const salvo = localStorage.getItem("urinalise_lab_config");
    if (salvo) {
      try {
        setLabConfig(JSON.parse(salvo));
      } catch (e) {
        console.error(e);
      }
    }
  }, []);

  const testarConexaoSheets = async () => {
    setIsTesting(true);
    try {
      const res = await fetch("/api/test-sheets");
      const data = await res.json();
      setSheetsInfo(data);
    } catch (err: any) {
      setSheetsInfo({
        ok: false,
        isConfigured: false,
        message: "Erro ao consultar status do servidor.",
      });
    } finally {
      setIsTesting(false);
    }
  };

  const salvarConfiguracoesLab = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem("urinalise_lab_config", JSON.stringify(labConfig));
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div className="min-h-screen bg-slate-100/70 pb-24">
      <div className="max-w-4xl mx-auto px-3 sm:px-6 pt-4 sm:pt-6">
        {/* CABEÇALHO */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-sky-600" />
              <h1 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                Configurações & Google Sheets
              </h1>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Status da integração em nuvem (Modo Produção) e cabeçalho oficial do laudo
            </p>
          </div>
          <button
            type="button"
            onClick={testarConexaoSheets}
            className="p-2 text-slate-600 hover:text-slate-900 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition"
            title="Testar Conexão Novamente"
          >
            <RefreshCw className={`w-4 h-4 ${isTesting ? "animate-spin" : ""}`} />
          </button>
        </div>

        {/* STATUS DO GOOGLE SHEETS */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 mb-5 shadow-sm">
          <div className="flex items-start justify-between gap-3 mb-4">
            <div className="flex items-center gap-2.5">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  sheetsInfo?.isConfigured && sheetsInfo?.ok
                    ? "bg-teal-100 text-teal-700"
                    : "bg-sky-100 text-sky-700"
                }`}
              >
                {sheetsInfo?.isConfigured && sheetsInfo?.ok ? (
                  <CheckCircle2 className="w-6 h-6" />
                ) : (
                  <ShieldCheck className="w-6 h-6" />
                )}
              </div>
              <div>
                <h2 className="text-sm font-black text-slate-900">
                  {sheetsInfo?.isConfigured && sheetsInfo?.ok
                    ? "Planilha do Google Sheets Conectada (Modo Produção)"
                    : "Modo Produção Ativo"}
                </h2>
                <p className="text-xs text-slate-500">
                  {sheetsInfo?.isConfigured && sheetsInfo?.ok
                    ? "Gravação e leitura de laudos e rotina ativas na nuvem"
                    : "Sincronização em tempo real ativa para computador e celular"}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={testarConexaoSheets}
              disabled={isTesting}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-lg transition"
            >
              {isTesting ? "Testando..." : "Testar Conexão"}
            </button>
          </div>

          <div
            className={`p-4 rounded-xl border text-xs space-y-2 ${
              sheetsInfo?.isConfigured && sheetsInfo?.ok
                ? "bg-teal-50 text-teal-900 border-teal-200"
                : "bg-sky-50 text-sky-900 border-sky-200"
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <p className="font-bold text-sm">{sheetsInfo?.message || "Verificando..."}</p>
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                  sheetsInfo?.isConfigured && sheetsInfo?.ok
                    ? "bg-teal-200 text-teal-900"
                    : "bg-sky-200 text-sky-900"
                }`}
              >
                {sheetsInfo?.isConfigured && sheetsInfo?.ok ? "Online / Nuvem" : "Produção"}
              </span>
            </div>

            {sheetsInfo?.clientEmail && (
              <p className="text-[11px] font-mono text-slate-700 bg-white/70 p-1.5 rounded border border-slate-200">
                <b>E-mail da Conta:</b> {sheetsInfo.clientEmail}
              </p>
            )}
            {sheetsInfo?.sheetId && (
              <p className="text-[11px] font-mono text-slate-700 bg-white/70 p-1.5 rounded border border-slate-200">
                <b>ID da Planilha:</b> {sheetsInfo.sheetId}
              </p>
            )}

            {sheetsInfo?.diagnostico?.orientacao && (
              <div className="bg-sky-50 border border-sky-300 text-sky-950 p-3 rounded-lg text-xs leading-relaxed mt-2">
                <p className="font-bold mb-1">ℹ️ Importante sobre a Vercel:</p>
                <p>{sheetsInfo.diagnostico.orientacao}</p>
              </div>
            )}
          </div>
        </div>

        {/* GUIA DE CONFIGURAÇÃO PASSO A PASSO */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 mb-5 shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <Key className="w-5 h-5 text-sky-600" />
            <h2 className="text-sm font-black text-slate-900 uppercase tracking-wide">
              Como Configurar o Google Sheets na Vercel
            </h2>
          </div>

          <p className="text-xs text-slate-600 leading-relaxed">
            O sistema utiliza uma <strong>Conta de Serviço do Google Cloud (Service Account)</strong>:
          </p>

          <ol className="list-decimal list-inside space-y-2.5 text-xs text-slate-700 font-medium">
            <li className="pl-1">
              Compartilhe sua planilha do Google Drive como <strong>Editor</strong> com o e-mail da Service Account.
            </li>
            <li className="pl-1">
              No painel da Vercel (Settings ➔ Environment Variables), configure <code>GOOGLE_CREDENTIALS_BASE64</code> ou as variáveis <code>GOOGLE_SHEET_ID</code>, <code>GOOGLE_CLIENT_EMAIL</code> e <code>GOOGLE_PRIVATE_KEY</code>.
            </li>
          </ol>

          <div className="p-3 bg-sky-50 border border-sky-200 rounded-xl text-xs text-sky-900">
            <strong>Criação Automática das Abas:</strong> Ao salvar o primeiro laudo ou rotina, o sistema cria automaticamente as abas <code>Laudos_Urina</code> e <code>Rotina_Diaria</code> com todos os cabeçalhos.
          </div>
        </div>

        {/* PERSONALIZAÇÃO DO CABEÇALHO DO LAUDO */}
        <form onSubmit={salvarConfiguracoesLab} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <Building className="w-5 h-5 text-teal-600" />
            <h2 className="text-sm font-black text-slate-900 uppercase tracking-wide">
              Dados Institucionais do Laudo Impresso A4
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <label className="block font-bold text-slate-700 uppercase mb-1">
                Instituição Principal
              </label>
              <input
                type="text"
                value={labConfig.nomeInstituicao}
                onChange={(e) => setLabConfig({ ...labConfig, nomeInstituicao: e.target.value })}
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg focus:border-teal-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 uppercase mb-1">
                Subtítulo / Secretaria
              </label>
              <input
                type="text"
                value={labConfig.subtitulo}
                onChange={(e) => setLabConfig({ ...labConfig, subtitulo: e.target.value })}
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg focus:border-teal-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 uppercase mb-1">
                Nome do Laboratório
              </label>
              <input
                type="text"
                value={labConfig.nomeLaboratorio}
                onChange={(e) => setLabConfig({ ...labConfig, nomeLaboratorio: e.target.value })}
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg focus:border-teal-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 uppercase mb-1">
                Município / UF
              </label>
              <input
                type="text"
                value={labConfig.cidadeUf}
                onChange={(e) => setLabConfig({ ...labConfig, cidadeUf: e.target.value })}
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg focus:border-teal-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 uppercase mb-1">
                Responsável Técnico(a)
              </label>
              <input
                type="text"
                value={labConfig.responsavelTecnico}
                onChange={(e) => setLabConfig({ ...labConfig, responsavelTecnico: e.target.value })}
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg focus:border-teal-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 uppercase mb-1">
                Registro Profissional (CRF / CRBM)
              </label>
              <input
                type="text"
                value={labConfig.registroProfissional}
                onChange={(e) => setLabConfig({ ...labConfig, registroProfissional: e.target.value })}
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg focus:border-teal-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            {savedSuccess ? (
              <span className="text-xs text-teal-700 font-bold flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" /> Configurações salvas no navegador!
              </span>
            ) : (
              <span />
            )}

            <button
              type="submit"
              className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 active:scale-95"
            >
              <Save className="w-4 h-4" />
              Salvar Dados do Laudo
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
