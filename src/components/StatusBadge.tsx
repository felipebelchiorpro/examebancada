import React from "react";
import { StatusLaudo } from "@/types/urinalise";
import { CheckCircle2, Clock, AlertTriangle } from "lucide-react";

interface StatusBadgeProps {
  status: StatusLaudo;
  size?: "sm" | "md" | "lg";
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = "md" }) => {
  const sizeClasses = {
    sm: "text-xs px-2 py-0.5 gap-1",
    md: "text-xs px-2.5 py-1 gap-1.5 font-medium",
    lg: "text-sm px-3.5 py-1.5 gap-2 font-semibold",
  };

  switch (status) {
    case "finalizado":
      return (
        <span
          className={`inline-flex items-center rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/80 shadow-xs ${sizeClasses[size]}`}
        >
          <CheckCircle2 className={size === "sm" ? "w-3 h-3" : "w-3.5 h-3.5"} />
          Finalizado
        </span>
      );
    case "recoleta":
      return (
        <span
          className={`inline-flex items-center rounded-full bg-rose-50 text-rose-700 border border-rose-200/80 shadow-xs ${sizeClasses[size]}`}
        >
          <AlertTriangle className={size === "sm" ? "w-3 h-3" : "w-3.5 h-3.5"} />
          Recoleta
        </span>
      );
    case "rascunho":
    default:
      return (
        <span
          className={`inline-flex items-center rounded-full bg-amber-50 text-amber-700 border border-amber-200/80 shadow-xs ${sizeClasses[size]}`}
        >
          <Clock className={size === "sm" ? "w-3 h-3" : "w-3.5 h-3.5"} />
          Rascunho
        </span>
      );
  }
};
