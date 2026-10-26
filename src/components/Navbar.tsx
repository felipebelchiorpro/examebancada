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
  const [sheetsStatus, setSheetsStatus] = useState<"checking" | "connected" | "demo">("checking");
  const [isOnline, setIsOnline] = useState<boolean>(true);

  useEffect(() => {
    setIsOnline(typeof window !== "undefined" ? navigator.onLine : true);

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Checar conexão do Google Sheets
    fetch("/api/test-sheets")
      .then((res) => res.json())
      .then((data) => {
        if (data.isConfigured && data.ok) {
          setSheetsStatus("connected");
        } else {
          setSheetsStatus("demo");
        }
      })
      .catch(() => setSheetsStatus("demo"));

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const navLinks = [
    { href: "/", label: "Bancada", icon: FlaskConical },
    { href: "/importar", label: "Rotina do Dia", icon: FileSpreadsheet },
    { href: "/laudos", label: "Laudos & Impressão", icon: Printer },
    { href: "/consulta", label: "Histórico & Auditoria", icon: History },
    { href: "/configuracoes", label: "Ajustes", icon: Settings },
  ];

  // Bancadas diretas para o celular (Mobile-First de Bancada)
  const mobileBancadas = [
    { id: "urina", href: "/?bancada=urina", label: "Urinálise", icon: FlaskConical },
    { id: "imuno", href: "/?bancada=imuno", label: "Imuno/VDRL", icon: Sparkles },
    { id: "coag", href: "/?bancada=coag", label: "Coag", icon: History },
    { id: "pso", href: "/?bancada=pso", label: "PSO", icon: FileSpreadsheet },
    { id: "pc", href: "/laudos", label: "Painel PC", icon: Printer },
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
      {/* Top Navbar Desktop & Tablet */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs print:hidden">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo e Identificação Institucional */}
            <div className="flex items-center gap-3">
              <Link href="/" className="flex items-center gap-2.5 group">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-600 to-teal-600 flex items-center justify-center text-white shadow-md shadow-sky-500/20 group-hover:scale-105 transition-transform">
                  <FlaskConical className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-black text-slate-800 tracking-tight text-base sm:text-lg">
                      URINÁLISE
                    </span>
                    <span className="bg-sky-100 text-sky-800 text-[10px] font-black px-1.5 py-0.5 rounded tracking-wider border border-sky-200">
                      SUS
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 font-medium hidden sm:block">
                    Automação de Bancada & Laudos EAS
                  </p>
                </div>
              </Link>
            </div>

            {/* Links de navegação para Desktop */}
            <nav className="hidden md:flex items-center gap-1">
              {navLinks.map((link) => {
                const Icon = link.icon;
                const isActive = pathname === link.href;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-semibold transition-all ${
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

            {/* Badges de Conectividade e Google Sheets */}
            <div className="flex items-center gap-2">
              {/* Online / Offline status */}
              <div
                className={`hidden lg:flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded-full border ${
                  isOnline
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : "bg-rose-50 text-rose-700 border-rose-200"
                }`}
                title={isOnline ? "Conectado à Internet" : "Sem conexão de rede"}
              >
                {isOnline ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
                <span>{isOnline ? "Online" : "Offline"}</span>
              </div>

              {/* Status do Google Sheets */}
              <Link
                href="/configuracoes"
                className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border transition-all ${
                  sheetsStatus === "connected"
                    ? "bg-teal-50 text-teal-800 border-teal-200 hover:bg-teal-100"
                    : "bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100"
                }`}
                title={
                  sheetsStatus === "connected"
                    ? "Google Sheets Conectado e Auditável"
                    : "Modo Local Ativo - Toque para configurar as chaves do Google Sheets"
                }
              >
                {sheetsStatus === "connected" ? (
                  <>
                    <CloudCheck className="w-3.5 h-3.5 text-teal-600" />
                    <span className="hidden sm:inline">Google Sheets Conectado</span>
                    <span className="sm:hidden">Sheets ON</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
                    <span className="hidden sm:inline">Modo Demonstração / Local</span>
                    <span className="sm:hidden">Demo / Local</span>
                  </>
                )}
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Bottom Nav Mobile (Focado EXCLUSIVAMENTE nas bancadas para digitação rápida com luvas) */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 md:hidden print:hidden px-2 py-1 shadow-lg">
        <div className="grid grid-cols-5 gap-1">
          {mobileBancadas.map((b) => {
            const Icon = b.icon;
            const isSelected =
              b.id === "pc"
                ? pathname === "/laudos"
                : pathname === "/" && bancadaAtual === b.id;

            return (
              <Link
                key={b.id}
                href={b.href}
                onClick={() => {
                  if (b.id !== "pc") setBancadaAtual(b.id);
                }}
                className={`flex flex-col items-center justify-center py-1.5 px-1 rounded-xl text-center transition-all active:scale-95 ${
                  isSelected
                    ? "text-sky-700 bg-sky-50 font-bold shadow-2xs"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                <Icon className={`w-5 h-5 ${isSelected ? "text-sky-600" : "text-slate-400"}`} />
                <span className="text-[10.5px] mt-0.5 leading-tight tracking-tight truncate max-w-full font-bold">
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
