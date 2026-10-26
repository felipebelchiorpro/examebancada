# ⚕️ Conecta SUS - Automações Laboratoriais (Drag & Drop)

Soluções ágeis e leves para Windows para o dia a dia do Laboratório Municipal de Saúde. O operador apenas arrasta o relatório baixado do Conecta SUS para cima do atalho correspondente na Área de Trabalho.

---

## 📁 Automações Disponíveis na Pasta

```
Extratores/
├── 1. UNIFICADOR GERAL DE PACIENTES (Excel ou PDF):
│   ├── UNIFICAR_PACIENTES.bat   # Executável de lote (Drag & Drop)
│   └── unificador_pacientes.py  # Junta pacientes duplicados em 1 linha e agrupa todos os exames
│
├── 2. TRIAGEM DE BANCADA (Excel ou PDF):
│   ├── TRIAGEM_BANCADA.bat      # Executável de lote (Drag & Drop)
│   └── extrator_bancada.py      # Filtra exames manuais/rápidos e gera mapa com espaço para anotação
│
├── 3. FILTRO DE MÉDICOS ALVO (PDF):
│   ├── FILTRAR_PDF.bat          # Executável de lote (Drag & Drop)
│   └── processador.py           # Filtra Dr. Douglas / Dra. Lívia e deduplica
│
├── requirements.txt             # Dependências (pdfplumber, pandas, openpyxl, xlrd)
├── Extratores_ConectaSUS.zip    # Pacote compactado ultraleve (17 KB) para envio ao Google Drive
└── README.md                    # Guia de uso
```

---

## 👥 1. Unificador de Pacientes (`UNIFICAR_PACIENTES.bat`)

**Finalidade:** Elimina todas as repetições de pacientes de relatórios brutos do Conecta SUS, gerando uma planilha onde cada paciente aparece **estritamente em 1 única linha**, com todos os seus exames e médicos agrupados.

- **Entrada suportada:** Planilhas Excel (`.xlsx`, `.xls`) **OU** relatórios em PDF (`.pdf`).
- **Colunas consolidadas:**
  1. `Data Coleta`
  2. `Prontuário`
  3. `Nome do Paciente`
  4. `Idade`
  5. `Médico(s) Solicitante(s)` (unificados caso haja pedidos de mais de um profissional)
  6. `Qtd. Exames` (contador do total de exames do paciente)
  7. `Exames Solicitados` (todos os exames do paciente organizados em ordem alfabética separados por `; `)
- **Saída gerada:** `[Nome_Original]_CONSOLIDADO.xlsx`

---

## 🧪 2. Triagem de Bancada (`TRIAGEM_BANCADA.bat`)

**Finalidade:** Elimina exames automatizados de rotina (bioquímica e hemograma) e cria um mapa de bancada para testes manuais e rápidos com coluna `Nº Amostra` e `Resultado` em branco para anotação à mão.

- **Entrada suportada:** Planilhas Excel (`.xlsx`, `.xls`) **OU** relatórios em PDF (`.pdf`).
- **Exames mantidos:**
  - **Urinálise:** Urina Tipo I (EAS), Proteinúria (Isolada / 24h / Fita).
  - **Provas Inflamatórias:** VHS, PCR Látex, ASLO, Fator Reumatoide (FR / Látex).
  - **Testes Rápidos e Gravidez:** Beta-HCG (TIG), Dengue (NS1, IgM, IgG), VDRL / Sífilis, Chikungunya, Zika.
  - **Coagulação:** Coagulograma Completo, TP / INR, TTPA, Tempo de Sangramento / Coagulação.
  - **Parasitologia:** Parasitológico de Fezes (EPF), Sangue Oculto (SOF).
- **Saída gerada:** `[Nome_Original]_BANCADA.xlsx` (A4 Paisagem, linhas de 28pt para anotação com caneta).

---

## 👨‍⚕️ 3. Filtro de Médicos Solicitantes (`FILTRAR_PDF.bat`)

**Finalidade:** Filtra pacientes atendidos pelo Dr. Douglas Otávio J. Júnior e Dra. Lívia Zavão Zanetti em relatórios PDF.

- **Entrada suportada:** Relatório em PDF (`.pdf`).
- **Saída gerada:** `[Nome_Original]_FILTRADO.xlsx`

---

## 🚀 Como Criar os Atalhos na Área de Trabalho

1. Abra a pasta `c:\Users\conta\OneDrive\Desktop\Extratores` no Windows Explorer.
2. Clique com o botão direito sobre o arquivo `.bat` desejado:
   - **`UNIFICAR_PACIENTES.bat`** ➔ **"Enviar para"** ➔ **"Área de trabalho (criar atalho)"**
   - **`TRIAGEM_BANCADA.bat`** ➔ **"Enviar para"** ➔ **"Área de trabalho (criar atalho)"**
   - **`FILTRAR_PDF.bat`** ➔ **"Enviar para"** ➔ **"Área de trabalho (criar atalho)"**
3. Na Área de Trabalho, basta arrastar o arquivo bruto sobre o atalho.
