export type StatusLaudo = "rascunho" | "recoleta" | "finalizado";

export interface LaudoUrina {
  id?: string;
  id_linha?: number;
  data_hora: string; // ISO string
  prontuario: string;
  nome_paciente: string;
  idade_sexo?: string;
  posto_unidade?: string;
  solicitante?: string;

  // 1. Urinálise (EAS / Sumário)
  tem_urina?: boolean;
  volume?: string;
  cor: string;
  aspecto: string;
  densidade: string;
  ph: string;
  proteina: string;
  glicose: string;
  cetona: string;
  bilirrubina: string;
  urobilinogenio: string;
  sangue: string;
  nitrito: string;
  leucocitos_fita: string;

  // Sedimentoscopia / Microscopia
  celulas_epiteliais: string;
  leucocitos_campo: string;
  hemacias_campo: string;
  bacterias: string;
  muco?: string;
  cristais: string;
  cilindros: string;
  outros_elementos?: string;

  // 2. Pesquisa de Sangue Oculto (PSO)
  tem_pso?: boolean;
  resultado_pso?: string; // "Negativo" | "Positivo" | "Traços" | "Amostra Inadequada / Recoleta"
  obs_pso?: string;

  // 3. Testes Rápidos e Gravidez
  tem_beta_hcg?: boolean;
  resultado_beta_hcg?: string; // "Negativo" | "Positivo" | "Inconclusivo"
  
  tem_vdrl?: boolean;
  resultado_vdrl?: string; // "Não Reagente" | "Reagente 1/1" | "Reagente 1/2" | "Reagente 1/4" | "Reagente 1/8" | "Reagente 1/16" | "Aguardando lote semanal"
  vdrl_acumular_lote?: boolean; // Marca para realização em lote semanal

  // 4. Provas Inflamatórias
  tem_vhs?: boolean;
  resultado_vhs?: string; // ex: "10 mm/1ª hora"

  tem_pcr?: boolean;
  resultado_pcr?: string; // "Negativo (< 6 mg/L)" | "Positivo" | string

  tem_aslo?: boolean;
  resultado_aslo?: string; // "Negativo (< 200 UI/mL)" | "Positivo"

  tem_fr?: boolean;
  resultado_fr?: string; // "Negativo (< 8 UI/mL)" | "Positivo"

  // 5. Coagulação (Coagulograma)
  tem_coagulograma?: boolean;
  tp_tempo?: string; // ex: "12.0 seg"
  tp_atividade?: string; // ex: "98%"
  tp_inr?: string; // ex: "1.00"
  ttpa_tempo?: string; // ex: "30.5 seg"
  ttpa_relacao?: string; // ex: "1.00"
  coagulograma_repetido?: boolean; // Sinaliza que o coagulograma foi repetido e confirmado
  coagulograma_tp_1?: string; // 1ª determinação (ex: 18.5 seg)
  coagulograma_ttpa_1?: string; // 1ª determinação (ex: 45.0 seg)
  coagulograma_nota_repeticao?: string; // "Exame repetido e confirmado em duplicata técnica nesta mesma amostra."

  // 6. Teste Rápido de Proteinúria (Rastreio de Pré-Eclâmpsia / Gestante)
  tem_proteinuria_rapida?: boolean;
  resultado_proteinuria_rapida?: string;
  // 7. Grupo Sanguíneo e Fator Rh
  tem_abo_rh?: boolean;
  resultado_abo_rh?: string;

  observacoes: string;
  status: StatusLaudo;
  responsavel_tecnico?: string;
}

export interface RotinaItem {
  id?: string;
  data: string; // YYYY-MM-DD
  data_rotina?: string; // YYYY-MM-DD
  prontuario: string;
  nome_paciente: string;
  idade_sexo: string;
  posto_unidade: string;
  solicitante: string;
  exame: string;
  status_coleta: string; // 'REALIZADO', 'COLETADO', 'PENDENTE'
  tem_laudo?: boolean;
  status_laudo?: StatusLaudo;
  tem_urina?: boolean;
  tem_pso?: boolean;
  tem_proteinuria_rapida?: boolean;
  tem_beta_hcg?: boolean;
  tem_vdrl?: boolean;
  vdrl_acumular_lote?: boolean;
  tem_vhs?: boolean;
  tem_pcr?: boolean;
  tem_aslo?: boolean;
  tem_fr?: boolean;
  tem_coagulograma?: boolean;
  tem_abo_rh?: boolean;
  exames_bancada?: string[];
}

export interface LabConfig {
  nomeInstituicao: string;
  subtitulo: string;
  nomeLaboratorio: string;
  cidadeUf: string;
  responsavelTecnico: string;
  registroProfissional: string; // ex: CRF-SP 12345 ou CRBM 6789
  cnpj?: string;
}

export const DEFAULT_LAB_CONFIG: LabConfig = {
  nomeInstituicao: "SISTEMA ÚNICO DE SAÚDE - SUS",
  subtitulo: "SECRETARIA MUNICIPAL DE SAÚDE",
  nomeLaboratorio: "LABORATÓRIO MUNICIPAL DE ANÁLISES CLÍNICAS",
  cidadeUf: "Rede Municipal de Saúde",
  responsavelTecnico: "Dra. Mariana S. Rezende",
  registroProfissional: "CRF-SP 48.912 / Resp. Técnica",
};

export const VALORES_PADRAO_NORMAL: Omit<LaudoUrina, "data_hora" | "prontuario" | "nome_paciente" | "status" | "observacoes"> = {
  tem_urina: true,
  volume: "60 mL",
  cor: "AC (Amarelo citrino)",
  aspecto: "L (Límpido)",
  densidade: "1.020",
  ph: "6.0",
  proteina: "Negativo",
  glicose: "Negativo",
  cetona: "Negativo",
  bilirrubina: "Negativo",
  urobilinogenio: "Normal",
  sangue: "Negativo",
  nitrito: "Negativo",
  leucocitos_fita: "Negativo",
  celulas_epiteliais: "6.000 /mL",
  leucocitos_campo: "4.000 /mL",
  hemacias_campo: "1.000 /mL",
  bacterias: "Ausentes",
  muco: "Ausente",
  cristais: "Ausentes",
  cilindros: "Ausentes",
  outros_elementos: "Ausentes",
  tem_pso: false,
  resultado_pso: "Negativo",
  tem_proteinuria_rapida: false,
  resultado_proteinuria_rapida: "Negativo",
  tem_beta_hcg: false,
  resultado_beta_hcg: "Negativo",
  tem_vdrl: false,
  resultado_vdrl: "Não Reagente",
  tem_vhs: false,
  resultado_vhs: "10 mm/1ª hora",
  tem_pcr: false,
  resultado_pcr: "Negativo (< 6 mg/L)",
  tem_aslo: false,
  resultado_aslo: "Negativo (< 200 UI/mL)",
  tem_fr: false,
  resultado_fr: "Negativo (< 8 UI/mL)",
  tem_abo_rh: false,
  resultado_abo_rh: "O Positivo (+)",
  tem_coagulograma: false,
  tp_tempo: "12.0 seg",
  tp_atividade: "100%",
  tp_inr: "1.00",
  ttpa_tempo: "31.0 seg",
  ttpa_relacao: "1.00",
};
