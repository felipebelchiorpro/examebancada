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
}

export const QuickChipSelect: React.FC<QuickChipSelectProps> = ({
  label,
  sublabel,
  value,
  options,
  onChange,
  columns = "auto",
  compact = false,
}) => {
  const isSelectedAbnormal = options.find((opt) => opt.value === value)?.isAbnormal;

  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between">
        <label className="text-xs font-semibold text-slate-700 tracking-wide uppercase">
          {label}
        </label>
        {sublabel && (
          <span className="text-[11px] text-slate-400 font-mono">{sublabel}</span>
        )}
      </div>

      <div
        className={
          columns === "auto"
            ? "flex flex-wrap gap-1.5"
            : `grid grid-cols-${columns} gap-1.5`
        }
      >
        {options.map((opt) => {
          const isSelected = value.trim().toLowerCase() === opt.value.trim().toLowerCase();
          
          let colorClass = "";
          if (isSelected) {
            if (opt.isAbnormal) {
              colorClass = "bg-amber-600 text-white font-bold shadow-md shadow-amber-200 border-amber-600 ring-2 ring-amber-400/50";
            } else {
              colorClass = "bg-teal-700 text-white font-bold shadow-md shadow-teal-200 border-teal-700 ring-2 ring-teal-400/50";
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
              className={`transition-all duration-150 rounded-lg border text-center select-none active:scale-95 touch-manipulation ${
                compact ? "px-2.5 py-1.5 text-xs min-h-[36px]" : "px-3 py-2 text-xs md:text-sm min-h-[42px] font-medium"
              } ${colorClass}`}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
};
