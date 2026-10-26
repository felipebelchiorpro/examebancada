import { LaudoUrina, RotinaItem } from "@/types/urinalise";

export const HOJE_ISO_DATE = new Date().toISOString().split("T")[0];

// MODO PRODUÇÃO: Lista limpa para receber apenas os dados reais da planilha do laboratório
export const MOCK_ROTINA: RotinaItem[] = [];

export const MOCK_LAUDOS: LaudoUrina[] = [];
