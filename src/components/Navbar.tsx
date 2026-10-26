"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  FlaskConical,
  FileSpreadsheet,
  Printer,
  History,
  Settings,
  ShieldCheck,
  Wifi,
  WifiOff,
  CloudCheck,
  Sparkles,
} from "lucide-react";

export const Navbar: React.FC = () => {
  const pathname = usePathname();
  const [sheetsStatus, setSheetsStatus] = useState<"checking" | "connected" | "local">("checking");
  const [isOnline, setIsOnline] = useState<boolean>(true);

  useEffect(() => {
    setIsOnline(typeof window !== "undefined" ? navigator.onLine : true);

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    const checkConnection = () => {
      fetch("/api/test-sheets")
        .then((res) => res.json())
        .then((data) => {
          if (data.isConfigured && data.ok) {
            setSheetsStatus("connected");
          } else {
            setSheetsStatus("local");
          }
        })
        .catch(() => setSheetsStatus("local"));
    };

    checkConnection();
    const interval = setInterval(checkConnection, 20000);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      clearInterval(interval);
    };
  }, []);

  const navLinks = [
    { href: "/", label: "Painel & Tiragem do Dia", icon: Printer },
    { href: "/importar", label: "Importar Conecta SUS", icon: FileSpreadsheet },
    { href: "/laudos", label: "Relatórios & Canhotos", icon: FlaskConical },
    { href: "/consulta", label: "Histórico", icon: History },
    { href: "/configuracoes", label: "Conexão", icon: Settings },
  ];

  // Bancadas exclusivas para o celular (somente contagem no telefone)
  const mobileBancadas = [
    { id: "urina", href: "/?bancada=urina", label: "Urina I", icon: FlaskConical },
    { id: "imuno", href: "/?bancada=imuno", label: "Rápidos/Imuno", icon: Sparkles },
    { id: "coag", href: "/?bancada=coag", label: "Coag/TAP", icon: History },
    { id: "pso", href: "/?bancada=pso", label: "Sangue Oculto", icon: FileSpreadsheet },
  ];

  const [bancadaAtual, setBancadaAtual] = useState<string>("urina");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const p = new URLSearchParams(window.location.search).get("bancada");
      if (p) setBancadaAtual(p);
    }
  }, [pathname]);

  return (
    <>
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs print:hidden">
        <div className="max-w-7xl mx-auto px-2.5 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14 sm:h-16">
            {/* Logo e Identificação */}
            <div className="flex items-center gap-2">
              <Link href="/" className="flex items-center gap-2 group">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-sky-600 to-teal-600 flex items-center justify-center text-white shadow-sm shadow-sky-500/20">
                  <FlaskConical className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-black text-slate-800 tracking-tight text-sm sm:text-lg">
                      BANCADA
                    </span>
                    <span className="bg-sky-100 text-sky-800 text-[9px] sm:text-[10px] font-black px-1.5 py-0.5 rounded tracking-wider border border-sky-200">
                      SUS
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500 font-medium hidden sm:block">
                    Tiragem Automática & Contagem Mobile
                  </p>
                </div>
              </Link>
            </div>

            {/* Links de navegação exclusivos para Computador (Desktop) */}
            <nav className="hidden md:flex items-center gap-1">
              {navLinks.map((link) => {
                const Icon = link.icon;
                const isActive = pathname === link.href;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs lg:text-sm font-semibold transition-all ${
                      isActive
                        ? "bg-slate-900 text-white shadow-sm"
                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {link.label}
                  </Link>
                );
              })}
            </nav>

            {/* Badges de Conectividade (Modo Produção) */}
            <div className="flex items-center gap-1.5 sm:gap-2">
              <div
                className={`flex items-center gap-1 text-[10px] sm:text-[11px] font-bold px-2 py-1 rounded-full border ${
                  isOnline
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : "bg-rose-50 text-rose-700 border-rose-200"
                }`}
              >
                {isOnline ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
                <span className="hidden xs:inline">{isOnline ? "Online" : "Offline"}</span>
              </div>

              <Link
                href="/configuracoes"
                className={`flex items-center gap-1 text-[10px] sm:text-xs font-bold px-2.5 py-1 rounded-full border transition-all ${
                  sheetsStatus === "connected"
                    ? "bg-teal-50 text-teal-800 border-teal-200 hover:bg-teal-100"
                    : "bg-sky-50 text-sky-800 border-sky-200 hover:bg-sky-100"
                }`}
              >
                {sheetsStatus === "connected" ? (
                  <>
                    <CloudCheck className="w-3.5 h-3.5 text-teal-600" />
                    <span className="hidden sm:inline">Nuvem Sincronizada</span>
                    <span className="sm:hidden">Sincronizado</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-3.5 h-3.5 text-sky-600" />
                    <span className="hidden sm:inline">Produção Ativa</span>
                    <span className="sm:hidden">Produção</span>
                  </>
                )}
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Bottom Nav Mobile (Exclusivo para Contagem no Telefone) */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 md:hidden print:hidden px-1.5 py-1 shadow-lg">
        <div className="grid grid-cols-4 gap-1">
          {mobileBancadas.map((b) => {
            const Icon = b.icon;
            const isSelected = pathname === "/" && bancadaAtual === b.id;

            return (
              <Link
                key={b.id}
                href={b.href}
                onClick={() => {
                  setBancadaAtual(b.id);
                  window.dispatchEvent(new CustomEvent("trocar-bancada", { detail: b.id }));
                }}
                className={`flex flex-col items-center justify-center py-1.5 px-1 rounded-xl text-center transition-all active:scale-95 ${
                  isSelected
                    ? "text-sky-700 bg-sky-50 font-bold shadow-2xs border border-sky-200/70"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                <Icon className={`w-4 h-4 ${isSelected ? "text-sky-600" : "text-slate-400"}`} />
                <span className="text-[10px] mt-0.5 leading-tight tracking-tight truncate max-w-full font-bold">
                  {b.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
};
