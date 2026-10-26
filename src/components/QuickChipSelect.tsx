"use client";

import React from "react";

interface QuickChipSelectProps {
  label: string;
  sublabel?: string;
  value: string;
  options: { label: string; value: string; isAbnormal?: boolean }[];
  onChange: (value: string) => void;
  columns?: "auto" | 2 | 3 | 4 | 5;
  compact?: boolean;
  allowCustom?: boolean;
}

export const QuickChipSelect: React.FC<QuickChipSelectProps> = ({
  label,
  sublabel,
  value,
  options,
  onChange,
  columns = "auto",
  compact = false,
  allowCustom = false,
}) => {
  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap items-baseline justify-between gap-1">
        <label className="text-[11px] sm:text-xs font-bold text-slate-800 tracking-wide uppercase">
          {label}
        </label>
        {sublabel && (
          <span className="text-[10px] sm:text-[11px] text-slate-400 font-mono">{sublabel}</span>
        )}
      </div>

      <div
        className={
          columns === "auto"
            ? "flex flex-wrap gap-1.5"
            : `grid grid-cols-2 sm:grid-cols-${columns} gap-1.5`
        }
      >
        {options.map((opt) => {
          const isSelected = value.trim().toLowerCase() === opt.value.trim().toLowerCase();
          
          let colorClass = "";
          if (isSelected) {
            if (opt.isAbnormal) {
              colorClass = "bg-amber-600 text-white font-bold shadow-sm shadow-amber-200 border-amber-600 ring-2 ring-amber-400/50";
            } else {
              colorClass = "bg-teal-700 text-white font-bold shadow-sm shadow-teal-200 border-teal-700 ring-2 ring-teal-400/50";
            }
          } else {
            if (opt.isAbnormal) {
              colorClass = "bg-slate-50 text-slate-700 hover:bg-amber-50 hover:text-amber-800 border-slate-200";
            } else {
              colorClass = "bg-white text-slate-700 hover:bg-slate-100 border-slate-200";
            }
          }

          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange(opt.value)}
              className={`transition-all duration-150 rounded-xl border text-center select-none active:scale-95 touch-manipulation flex-1 min-w-[74px] sm:flex-initial ${
                compact
                  ? "px-2 py-1.5 text-[11px] min-h-[36px]"
                  : "px-2.5 py-2 text-xs sm:text-sm min-h-[40px] font-semibold"
              } ${colorClass}`}
            >
              {opt.label}
            </button>
          );
        })}
      </div>

      {allowCustom && (
        <div className="flex items-center gap-2 pt-0.5">
          <span className="text-[11px] text-slate-500 font-medium">Outro valor / manual:</span>
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="px-2.5 py-1 text-xs border border-slate-300 rounded-lg font-mono w-36 focus:ring-1 focus:ring-teal-500 focus:border-teal-500 bg-white"
            placeholder="Digite aqui..."
          />
        </div>
      )}
    </div>
  );
};
