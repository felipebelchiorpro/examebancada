"use client";

import React from "react";
import Link from "next/link";

interface LogoProps {
  compact?: boolean;
}

export const Logo: React.FC<LogoProps> = ({ compact = false }) => {
  return (
    <Link href="/" className="flex items-center gap-2.5 group select-none">
      {/* Ícone de Logomarca Criativo: Frasco Erlenmeyer estilizado com gradiente e cruz clínica */}
      <div className="relative w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-gradient-to-br from-teal-500 via-sky-600 to-indigo-700 p-0.5 shadow-md shadow-sky-600/25 group-hover:shadow-sky-600/40 group-hover:scale-105 transition-all duration-200">
        <div className="w-full h-full bg-slate-950/20 backdrop-blur-xs rounded-[14px] flex items-center justify-center relative overflow-hidden">
          {/* Brilho interno */}
          <div className="absolute -top-3 -right-3 w-8 h-8 bg-sky-300/30 rounded-full blur-xs" />
          
          {/* Desenho do Frasco / Pipeta em SVG */}
          <svg
            className="w-5 h-5 text-white drop-shadow-sm"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            {/* Frasco */}
            <path d="M10 2v5.5L4.5 18a2.5 2.5 0 0 0 2.2 3.5h10.6a2.5 2.5 0 0 0 2.2-3.5L14 7.5V2" />
            <path d="M8.5 2h7" />
            {/* Linha de líquido com reflexo dourado */}
            <path
              d="M7 14.5c1.5-.8 3.5-.8 5 0s3.5.8 5 0"
              stroke="#facc15"
              strokeWidth="2"
            />
          </svg>

          {/* Mini cruz médica no canto */}
          <div className="absolute bottom-1 right-1 w-2.5 h-2.5 bg-emerald-400 rounded-full flex items-center justify-center text-[7px] font-black text-slate-950 leading-none shadow-xs">
            +
          </div>
        </div>
      </div>

      {/* Tipografia da Marca */}
      <div className="flex flex-col">
        <div className="flex items-center gap-1.5">
          <span className="font-black text-slate-900 tracking-tight text-base sm:text-lg flex items-center">
            <span>Uro</span>
            <span className="bg-gradient-to-r from-sky-600 to-teal-600 bg-clip-text text-transparent">
              Lab
            </span>
          </span>
          <span className="bg-gradient-to-r from-sky-600 to-teal-600 text-white text-[9.5px] font-black px-1.5 py-0.5 rounded-md tracking-wider shadow-2xs">
            SUS
          </span>
        </div>
        {!compact && (
          <span className="text-[10px] text-slate-500 font-semibold tracking-tight hidden sm:block -mt-0.5">
            Automação de Bancada & Laudos
          </span>
        )}
      </div>
    </Link>
  );
};
