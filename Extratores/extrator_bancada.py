#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
================================================================================
CONECTA SUS - EXTRATOR DE TRIAGEM DE BANCADA (EXAMES MANUAIS & TESTES RÁPIDOS)
================================================================================
Automação laboratorial para triagem de bancada do Laboratório Municipal de Saúde.
Processa relatórios em formato Excel (.xlsx, .xls) ou PDF (.pdf), descartando
exames de bioquímica e hematologia de rotina automatizada e gerando um mapa
de bancada pronto para impressão e anotação manual de resultados.
================================================================================
"""

import sys
import os
import re
import unicodedata
from datetime import datetime
import pandas as pd
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter

# Leitor de PDF
try:
    import pdfplumber
except ImportError:
    pdfplumber = None


# ==============================================================================
# 1. FUNÇÕES DE NORMALIZAÇÃO E LIMPEZA
# ==============================================================================

def normalizar_texto(texto: str) -> str:
    """Remove acentuação, caracteres especiais e converte para MAIÚSCULAS."""
    if not texto:
        return ""
    nfkd = unicodedata.normalize('NFKD', str(texto))
    ascii_txt = nfkd.encode('ASCII', 'ignore').decode('utf-8')
    limpo = re.sub(r'[^a-zA-Z0-9\s]', ' ', ascii_txt.upper())
    return " ".join(limpo.split())


def limpar_celula(valor) -> str:
    """Limpa quebras de linha e múltiplos espaços de uma célula."""
    if valor is None or pd.isna(valor):
        return ""
    texto = str(valor)
    texto = texto.replace('\r\n', ' ').replace('\n', ' ').replace('\r', ' ')
    return " ".join(texto.split()).strip()


# ==============================================================================
# 2. DEFINIÇÃO DAS REGRAS DE FILTRAGEM DE EXAMES DE BANCADA
# ==============================================================================

# Exames automatizados de rotina a DESCARTAR estritamente
DESCARTAR_EXAMES_ROUTINA = [
    "GLICEMIA", "GLICOSE", "HEMOGLOBINA GLICADA", "HBA1C", "GLICOHEMOGLOBINA",
    "COLESTEROL", "HDL", "LDL", "VLDL", "LIPIDOGRAMA", "PERFIL LIPIDICO",
    "TRIGLICERIDEOS", "TRIGLICERIDES", "TRIGLICERIDIOS",
    "UREIA", "CREATININA", "CLEARANCE DE CREATININA",
    "TGO", "AST", "TRANSAMINASE OXALACETICA",
    "TGP", "ALT", "TRANSAMINASE PIRUVICA", "TRANSAMINASES",
    "FOSFATASE ALCALINA",
    "GAMA GT", "GAMA GLUTAMIL", "GGT",
    "BILIRRUBINA", "BILIRRUBINAS", "BILIRRUBINA TOTAL", "BILIRRUBINA DIRETA", "BILIRRUBINA INDIRETA",
    "ACIDO URICO", "URICEMIA",
    "CPK", "CK", "CK MB", "CKMB", "CREATINOFOSFOQUINASE",
    "PROTEINAS TOTAIS", "PROTEINAS TOTAIS E FRACOES", "ALBUMINA",
    "HEMOGRAMA", "HEMOGRAMA COMPLETO", "ERITROGRAMA", "LEUCOGRAMA", "CONTAGEM DE PLAQUETAS",
    "SODIO", "POTASSIO", "CLORETO", "CLORO", "CALCIO", "MAGNESIO", "FOSFORO",
    "FERRO SERICO", "FERRITINA", "TRANSFERRINA", "CAPACIDADE TOTAL DE LIGACAO"
]

# Regras de inclusão para Bancada / Triagem Manual
# Cada item: (Setor_Bancada, Nome_Padrao, [Padroes_Regex])
REGRAS_BANCADA = [
    # 1. Urinálise
    ("Urinálise", "Urina Tipo I (EAS)", [
        r"\bURINA\s*(?:I|1|TIPO\s*I|TIPO\s*1)\b",
        r"\bEAS\b", r"\bE\s*A\s*S\b",
        r"\bSEDIMENTO\s*URINARIO\b", r"\bSEDIMENTOSCOPIA\b",
        r"\bSUMARIO\s*DE\s*URINA\b",
        r"\bUROFITA\b", r"\bFITA\s*REAGENTE\b",
        r"\bEXAME\s*(?:FISICO\s*E\s*QUIMICO\s*DE\s*)?URINA\b"
    ]),
    ("Urinálise", "Proteinúria", [
        r"\bPROTEINURIA\b", r"\bPROTEINA\s*URINARIA\b", r"\bPROTEINAS\s*URINARIAS\b",
        r"\bPROTEINURIA\s*(?:DE\s*)?(?:24H|24\s*HORAS|ISOLADA|AMOSTRA\s*ISOLADA)\b",
        r"\bPROTEINA\s*(?:DE\s*)?(?:24H|24\s*HORAS|ISOLADA)\b"
    ]),

    # 2. Provas Inflamatórias
    ("Provas Inflamatórias", "VHS (Velocidade de Hemossedimentação)", [
        r"\bVHS\b", r"\bVELOCIDADE\s*(?:DE\s*)?HEMOSSEDIMENTACAO\b", r"\BHEMOSSEDIMENTACAO\b"
    ]),
    ("Provas Inflamatórias", "PCR (Proteína C Reativa)", [
        r"\bPCR\b", r"\bPROTEINA\s*C\s*REATIVA\b", r"\bPCR\s*LATEX\b"
    ]),
    ("Provas Inflamatórias", "ASLO (Antiestreptolisina O)", [
        r"\bASLO\b", r"\bASO\b", r"\bANTIESTREPTOLISINA\b"
    ]),
    ("Provas Inflamatórias", "Fator Reumatoide (FR / Látex)", [
        r"\bFATOR\s*REUMATOIDE\b", r"\bFATOR\s*REUMATOIDE\s*LATEX\b",
        r"\bFR\s*LATEX\b", r"\bPROVA\s*DO\s*LATEX\b", r"\bWAALER\s*ROSE\b",
        r"\bFR\b"
    ]),

    # 3. Testes Rápidos e Gravidez
    ("Testes Rápidos", "Beta-HCG (Teste de Gravidez)", [
        r"\bBETA\s*HCG\b", r"\bBETA\s*-\s*HCG\b", r"\bBHCG\b", r"\bHCG\b",
        r"\bTIG\b", r"\bTESTE\s*(?:RAPIDO\s*DE\s*)?GRAVIDEZ\b", r"\bGRAVIDEZ\b"
    ]),
    ("Testes Rápidos", "Dengue (NS1 / IgM / IgG)", [
        r"\bDENGUE\b", r"\bNS1\b", r"\bDENGUE\s*RAPIDO\b", r"\bTESTE\s*RAPIDO\s*DENGUE\b"
    ]),
    ("Testes Rápidos", "VDRL / Sífilis (Teste Rápido)", [
        r"\bVDRL\b", r"\bSIFILIS\b", r"\bTREPONEMICO\b", r"\bTESTE\s*RAPIDO\s*SIFILIS\b"
    ]),
    ("Testes Rápidos", "Chikungunya (Teste Rápido)", [
        r"\bCHIKUNGUNYA\b", r"\bCHICUNGUNHA\b"
    ]),
    ("Testes Rápidos", "Zika Vírus (Teste Rápido)", [
        r"\bZIKA\b", r"\bZIKA\s*VIRUS\b"
    ]),

    # 4. Coagulação
    ("Coagulação", "Coagulograma Completo", [
        r"\bCOAGULOGRAMA\b", r"\bCOAGULOGRAMA\s*COMPLETO\b"
    ]),
    ("Coagulação", "Tempo de Protrombina (TP / INR)", [
        r"\bTEMPO\s*DE\s*PROTROMBINA\b", r"\bTAP\b", r"\bINR\b", r"\bTP\b"
    ]),
    ("Coagulação", "TTPA (Tempo de Tromboplastina)", [
        r"\bTTPA\b", r"\bKPTT\b", r"\bTEMPO\s*DE\s*TROMBOPLASTINA\b"
    ]),
    ("Coagulação", "Tempo de Sangramento / Coagulação (TS / TC)", [
        r"\bTEMPO\s*DE\s*SANGRAMENTO\b", r"\bTEMPO\s*DE\s*COAGULACAO\b", r"\bTS\s*TC\b"
    ]),

    # 5. Parasitologia
    ("Parasitologia", "Parasitológico de Fezes (EPF)", [
        r"\bPARASITOLOGICO\b", r"\bEPF\b", r"\bEXAME\s*PARASITOLOGICO\b",
        r"\bPROTOPARASITOLOGICO\b", r"\bMIF\b"
    ]),
    ("Parasitologia", "Pesquisa de Sangue Oculto (SOF)", [
        r"\bSANGUE\s*OCULTO\b", r"\bSOF\b", r"\bPESQUISA\s*DE\s*SANGUE\s*OCULTO\b"
    ])
]


def classificar_exame_bancada(texto_exame: str) -> tuple[str, str] | None:
    """
    Verifica se o item é um exame de bancada.
    Retorna (Setor, Nome_Padronizado) ou None se for automatizado/descartado.
    """
    norm = normalizar_texto(texto_exame)
    if not norm:
        return None
        
    # 1. Verifica se casa com as regras de bancada
    for setor, nome_padrao, padroes in REGRAS_BANCADA:
        for padrao in padroes:
            if re.search(padrao, norm):
                return setor, nome_padrao
                
    # 2. Caso não tenha casado com bancada, descarta
    return None


def separar_e_filtrar_exames(texto_exames: str) -> list[tuple[str, str]]:
    """
    Recebe um texto com um ou múltiplos exames separados por vírgula, ponto e vírgula,
    quebra de linha ou barra, e retorna a lista de exames de bancada detectados.
    """
    if not texto_exames:
        return []
        
    # Separa por vírgulas, ponto e vírgula, barras, quebras de linha
    itens = re.split(r'[,;\n\r\+/|]+', str(texto_exames))
    exames_encontrados = []
    
    for item in itens:
        item_limpo = item.strip()
        if not item_limpo:
            continue
            
        resultado = classificar_exame_bancada(item_limpo)
        if resultado:
            setor, nome_padrao = resultado
            # Evita duplicar o mesmo exame para o mesmo paciente na mesma linha
            if (setor, nome_padrao) not in exames_encontrados:
                exames_encontrados.append((setor, nome_padrao))
                
    return exames_encontrados


# ==============================================================================
# 3. MAPEAMENTO DINÂMICO DE COLUNAS
# ==============================================================================

def mapear_colunas(nomes_colunas: list[str]) -> dict[str, int]:
    """Mapeia dinamicamente os índices das colunas a partir do cabeçalho."""
    colunas_norm = [normalizar_texto(c) for c in nomes_colunas]
    
    sinonimos = {
        'data': ['DATA COLETA', 'DT COLETA', 'DATA', 'DT AGENDAMENTO', 'AGENDAMENTO', 'DATA ATENDIMENTO', 'COLETA'],
        'prontuario': ['PRONTUARIO', 'PRONT', 'N PRONTUARIO', 'N PRONT', 'PRONT NO', 'CNS', 'CARTAO SUS', 'CODIGO', 'COD PACIENTE'],
        'paciente': ['NOME DO PACIENTE', 'PACIENTE', 'NOME', 'USUARIO', 'NOME PACIENTE'],
        'idade': ['IDADE', 'ID', 'ANOS', 'FAIXA ETARIA', 'DT NASC'],
        'exame': ['PROCEDIMENTO EXAME', 'EXAME PROCEDIMENTO', 'PROCEDIMENTO', 'EXAME', 'EXAMES', 'PROCEDIMENTOS', 'DESCRICAO', 'SOLICITACAO']
    }
    
    mapeamento = {}
    for chave, lista_sin in sinonimos.items():
        idx_encontrado = -1
        # Correspondência exata
        for sin in lista_sin:
            for i, col in enumerate(colunas_norm):
                if sin == col:
                    idx_encontrado = i
                    break
            if idx_encontrado != -1:
                break
                
        # Substring
        if idx_encontrado == -1:
            for sin in lista_sin:
                for i, col in enumerate(colunas_norm):
                    if sin in col:
                        idx_encontrado = i
                        break
                if idx_encontrado != -1:
                    break
                    
        mapeamento[chave] = idx_encontrado
        
    return mapeamento


# ==============================================================================
# 4. LEITURA DE DADOS (EXCEL E PDF)
# ==============================================================================

def ler_arquivo_excel(caminho_excel: str) -> list[dict]:
    """Lê relatórios em formato Excel (.xlsx ou .xls) e extrai os registros."""
    # Lê a primeira aba sem assumir cabeçalho fixo na linha 0
    df_raw = pd.read_excel(caminho_excel, sheet_name=0, header=None)
    
    # Localiza em qual linha está o cabeçalho (busca nas primeiras 10 linhas)
    linha_cabecalho = 0
    mapeamento = {}
    
    for r_idx in range(min(12, len(df_raw))):
        candidatos = [limpar_celula(val) for val in df_raw.iloc[r_idx]]
        mapa_teste = mapear_colunas(candidatos)
        # Se encontrou pelo menos paciente ou exame
        if mapa_teste.get('paciente', -1) != -1 or mapa_teste.get('exame', -1) != -1:
            linha_cabecalho = r_idx
            mapeamento = mapa_teste
            break
            
    # Se não achou cabeçalho claro, usa linha 0
    if not mapeamento or mapeamento.get('paciente', -1) == -1:
        candidatos = [limpar_celula(val) for val in df_raw.iloc[0]]
        mapeamento = mapear_colunas(candidatos)
        linha_cabecalho = 0

    registros = []
    for r_idx in range(linha_cabecalho + 1, len(df_raw)):
        linha = df_raw.iloc[r_idx]
        
        def obter_val(chave):
            idx = mapeamento.get(chave, -1)
            if idx != -1 and idx < len(linha):
                return limpar_celula(linha[idx])
            return ""
            
        paciente = obter_val('paciente')
        exame = obter_val('exame')
        
        if not paciente or normalizar_texto(paciente) in ['NOME', 'PACIENTE', 'NOME DO PACIENTE']:
            continue
            
        registros.append({
            'data': obter_val('data'),
            'prontuario': obter_val('prontuario'),
            'paciente': paciente,
            'idade': obter_val('idade'),
            'exames_brutos': exame
        })
        
    return registros


def ler_arquivo_pdf(caminho_pdf: str) -> list[dict]:
    """Lê todas as páginas de um relatório em PDF via pdfplumber e extrai registros."""
    if not pdfplumber:
        raise ImportError("A biblioteca 'pdfplumber' é necessária para leitura de PDFs.")
        
    registros = []
    with pdfplumber.open(caminho_pdf) as pdf:
        total_pags = len(pdf.pages)
        print(f"[*] Analisando {total_pags} pagina(s) do PDF...")
        
        mapeamento_ativo = None
        
        for num_pag, pagina in enumerate(pdf.pages, 1):
            tabelas = pagina.extract_tables()
            if not tabelas:
                tabela_unica = pagina.extract_table()
                if tabela_unica:
                    tabelas = [tabela_unica]
                    
            if not tabelas:
                continue
                
            for tabela in tabelas:
                if not tabela or len(tabela) < 1:
                    continue
                    
                inicio_dados = 0
                candidato_cab = [limpar_celula(c) for c in tabela[0]]
                mapa_teste = mapear_colunas(candidato_cab)
                
                if mapa_teste.get('paciente', -1) != -1 or mapa_teste.get('exame', -1) != -1:
                    mapeamento_ativo = mapa_teste
                    inicio_dados = 1
                elif mapeamento_ativo is None:
                    mapeamento_ativo = {
                        'data': 0 if len(tabela[0]) > 0 else -1,
                        'prontuario': 1 if len(tabela[0]) > 1 else -1,
                        'paciente': 2 if len(tabela[0]) > 2 else -1,
                        'idade': 3 if len(tabela[0]) > 3 else -1,
                        'exame': 5 if len(tabela[0]) > 5 else -1,
                    }
                    
                for linha in tabela[inicio_dados:]:
                    if not linha:
                        continue
                        
                    def obter_col(chave):
                        idx = mapeamento_ativo.get(chave, -1)
                        if idx != -1 and idx < len(linha):
                            return limpar_celula(linha[idx])
                        return ""
                        
                    paciente = obter_col('paciente')
                    exame = obter_col('exame')
                    
                    if not paciente or normalizar_texto(paciente) in ['NOME', 'PACIENTE', 'NOME DO PACIENTE']:
                        continue
                        
                    registros.append({
                        'data': obter_col('data'),
                        'prontuario': obter_col('prontuario'),
                        'paciente': paciente,
                        'idade': obter_col('idade'),
                        'exames_brutos': exame
                    })
                    
    return registros


# ==============================================================================
# 5. PROCESSAMENTO E GERAÇÃO DA TRIAGEM DE BANCADA
# ==============================================================================

def processar_triagem_bancada(registros_brutos: list[dict]) -> tuple[list[dict], int, int]:
    """
    Processa todos os registros:
    - Separa cada exame solicitado.
    - Elimina os exames de bioquímica/hematologia automatizados de rotina.
    - Mantém estritamente os exames de bancada/manual.
    - Gera uma linha sequencial para cada amostra de bancada.
    
    Retorna: (amostras_bancada, total_linhas_lidas, total_exames_descartados)
    """
    amostras_bancada = []
    total_linhas_lidas = len(registros_brutos)
    total_descartados = 0
    
    for reg in registros_brutos:
        exames_texto = reg.get('exames_brutos', '')
        exames_bancada = separar_e_filtrar_exames(exames_texto)
        
        # Conta descartados aproximados
        itens_originais = [i.strip() for i in re.split(r'[,;\n\r\+/|]+', str(exames_texto)) if i.strip()]
        total_descartados += (len(itens_originais) - len(exames_bancada))
        
        for setor, nome_exame in exames_bancada:
            amostras_bancada.append({
                'data_coleta': reg.get('data', ''),
                'prontuario': reg.get('prontuario', ''),
                'paciente': reg.get('paciente', ''),
                'idade': reg.get('idade', ''),
                'setor': setor,
                'exame_bancada': nome_exame,
                'resultado': ""  # Espaço para anotação manual
            })
            
    # Ordena por Setor da Bancada (agrupando por tipo de teste) e por Paciente
    amostras_bancada.sort(key=lambda x: (x['setor'], normalizar_texto(x['paciente'])))
    
    return amostras_bancada, total_linhas_lidas, max(0, total_descartados)


# ==============================================================================
# 6. EXPORTAÇÃO DA PLANILHA DE BANCADA FORMATADA PARA IMPRESSÃO
# ==============================================================================

def exportar_planilha_bancada(amostras: list[dict], caminho_saida: str, nome_origem: str):
    """
    Gera uma planilha Excel (.xlsx) profissional configurada para impressão e uso na bancada:
    - Orientação Paisagem (Landscape) ajustada para 1 página de largura.
    - Cabeçalho institucional azul escuro.
    - Altura de linha generosa (28pt) para anotação manual clara com caneta.
    - Linhas de grade e bordas nítidas em todas as células.
    - Campo de 'Resultado / Anotação da Bancada' e 'Visto/Resp.'.
    """
    linhas_tabela = []
    for a in amostras:
        linhas_tabela.append({
            'Nº Amostra': '',                       # Espaço em branco para numeração manual pelo operador
            'Data Coleta': a['data_coleta'],
            'Prontuário': a['prontuario'],
            'Nome do Paciente': a['paciente'],
            'Idade': a['idade'],
            'Setor da Bancada': a['setor'],
            'Exame de Bancada': a['exame_bancada'],
            'Resultado / Anotação da Bancada': '',  # Amplo espaço para anotação
            'Visto / Resp.': ''                     # Espaço para rubrica
        })
        
    df = pd.DataFrame(linhas_tabela)
    
    with pd.ExcelWriter(caminho_saida, engine='openpyxl') as writer:
        df.to_excel(writer, sheet_name='Triagem de Bancada', index=False, startrow=2)
        workbook = writer.book
        worksheet = writer.sheets['Triagem de Bancada']
        
        # Configuração de Impressão da Página
        worksheet.page_setup.orientation = worksheet.ORIENTATION_LANDSCAPE
        worksheet.page_setup.paperSize = worksheet.PAPERSIZE_A4
        worksheet.page_setup.fitToWidth = 1
        worksheet.page_setup.fitToHeight = 0
        worksheet.sheet_properties.pageSetUpPr.fitToPage = True
        worksheet.print_title_rows = '3:3'  # Repete o cabeçalho em todas as páginas impressas
        
        # Paleta de Estilos
        azul_primario = PatternFill(start_color="1F4E79", end_color="1F4E79", fill_type="solid")
        fonte_cabecalho = Font(name="Calibri", size=10, bold=True, color="FFFFFF")
        fonte_titulo = Font(name="Calibri", size=13, bold=True, color="1F4E79")
        fonte_sub = Font(name="Calibri", size=9, italic=True, color="475569")
        
        zebrado_par = PatternFill(start_color="F8FAFC", end_color="F8FAFC", fill_type="solid")
        zebrado_impar = PatternFill(start_color="FFFFFF", end_color="FFFFFF", fill_type="solid")
        
        # Borda nítida em todas as células para preenchimento de bancada
        borda_grade = Border(
            left=Side(style='thin', color='CBD5E1'),
            right=Side(style='thin', color='CBD5E1'),
            top=Side(style='thin', color='CBD5E1'),
            bottom=Side(style='thin', color='CBD5E1')
        )
        
        # Linha 1: Título Principal
        worksheet.merge_cells("A1:I1")
        cel_t = worksheet["A1"]
        cel_t.value = "MAPA DE TRIAGEM DE BANCADA - EXAMES MANUAIS E TESTES RÁPIDOS"
        cel_t.font = fonte_titulo
        cel_t.alignment = Alignment(horizontal="left", vertical="center")
        worksheet.row_dimensions[1].height = 24
        
        # Linha 2: Metadados
        worksheet.merge_cells("A2:I2")
        cel_sub = worksheet["A2"]
        cel_sub.value = (
            f"Laboratório Municipal de Saúde • Emissão: {datetime.now().strftime('%d/%m/%Y às %H:%M:%S')}  |  "
            f"Total de Amostras de Bancada: {len(amostras)}  |  Origem: {nome_origem}"
        )
        cel_sub.font = fonte_sub
        cel_sub.alignment = Alignment(horizontal="left", vertical="center")
        worksheet.row_dimensions[2].height = 18
        worksheet.row_dimensions[3].height = 26
        
        # Linha 3: Cabeçalho das Colunas
        for col_idx in range(1, len(df.columns) + 1):
            cel = worksheet.cell(row=3, column=col_idx)
            cel.fill = azul_primario
            cel.font = fonte_cabecalho
            cel.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
            cel.border = borda_grade
            
        # Linhas de Dados (Linha 4 em diante)
        for row_idx in range(4, len(df) + 4):
            # Altura generosa de 28pt para anotação com caneta na bancada!
            worksheet.row_dimensions[row_idx].height = 28
            fundo = zebrado_par if (row_idx % 2 == 0) else zebrado_impar
            
            for col_idx in range(1, len(df.columns) + 1):
                cel = worksheet.cell(row=row_idx, column=col_idx)
                cel.fill = fundo
                cel.border = borda_grade
                cel.font = Font(name="Calibri", size=10)
                
                col_nome = df.columns[col_idx - 1]
                
                if col_nome == 'Nº Amostra':
                    cel.font = Font(name="Calibri", size=11, bold=True, color="1F4E79")
                    cel.alignment = Alignment(horizontal="center", vertical="center")
                elif col_nome in ['Data Coleta', 'Prontuário', 'Idade', 'Setor da Bancada']:
                    cel.alignment = Alignment(horizontal="center", vertical="center")
                    if col_nome == 'Prontuário':
                        cel.number_format = '@'
                elif col_nome == 'Nome do Paciente':
                    cel.font = Font(name="Calibri", size=10, bold=True)
                    cel.alignment = Alignment(horizontal="left", vertical="center")
                elif col_nome == 'Exame de Bancada':
                    cel.alignment = Alignment(horizontal="left", vertical="center")
                elif col_nome == 'Resultado / Anotação da Bancada':
                    # Espaço aberto para anotação manual com caneta
                    cel.alignment = Alignment(horizontal="left", vertical="center")
                elif col_nome == 'Visto / Resp.':
                    cel.alignment = Alignment(horizontal="center", vertical="center")
                    
        # Larguras personalizadas de colunas
        larguras = {
            'A': 13,  # Nº Amostra
            'B': 14,  # Data Coleta
            'C': 15,  # Prontuário
            'D': 30,  # Nome do Paciente
            'E': 9,   # Idade
            'F': 22,  # Setor da Bancada
            'G': 32,  # Exame de Bancada
            'H': 38,  # Resultado / Anotação da Bancada (espaçoso!)
            'I': 14   # Visto / Resp.
        }
        for col_letra, largura in larguras.items():
            worksheet.column_dimensions[col_letra].width = largura


# ==============================================================================
# 7. PONTO DE ENTRADA PRINCIPAL
# ==============================================================================

def main():
    print("=" * 75)
    print("   CONECTA SUS - TRIAGEM DE BANCADA (EXAMES MANUAIS & TESTES RAPIDOS)")
    print("=" * 75)
    
    if len(sys.argv) < 2:
        print("\n[ERRO] Nenhum arquivo foi informado!")
        print("Uso: python extrator_bancada.py \"caminho\\para\\arquivo.(xlsx|xls|pdf)\"")
        print("Ou simplesmente arraste o arquivo sobre TRIAGEM_BANCADA.bat.\n")
        sys.exit(1)
        
    caminho_arquivo = sys.argv[1].strip()
    if caminho_arquivo.startswith('"') and caminho_arquivo.endswith('"'):
        caminho_arquivo = caminho_arquivo[1:-1]
        
    if not os.path.exists(caminho_arquivo):
        print(f"\n[ERRO] Arquivo nao encontrado:\n{caminho_arquivo}\n")
        sys.exit(1)
        
    extensao = os.path.splitext(caminho_arquivo)[1].lower()
    if extensao not in ['.xlsx', '.xls', '.pdf']:
        print("\n[ERRO] Formato nao suportado. Utilize arquivos Excel (.xlsx, .xls) ou PDF (.pdf).\n")
        sys.exit(1)
        
    nome_arquivo = os.path.basename(caminho_arquivo)
    pasta_destino = os.path.dirname(os.path.abspath(caminho_arquivo))
    nome_base = os.path.splitext(nome_arquivo)[0]
    caminho_saida = os.path.join(pasta_destino, f"{nome_base}_BANCADA.xlsx")
    
    print(f"\n[1/3] Arquivo recebido: {nome_arquivo}")
    print(f"      Pasta de destino: {pasta_destino}")
    
    # Leitura conforme formato
    try:
        if extensao in ['.xlsx', '.xls']:
            print("      Formato: Planilha Excel detectada.")
            registros_brutos = ler_arquivo_excel(caminho_arquivo)
        else:
            print("      Formato: Relatorio PDF detectado.")
            registros_brutos = ler_arquivo_pdf(caminho_arquivo)
    except Exception as e:
        print(f"\n[FALHA] Erro ao ler o arquivo: {e}")
        sys.exit(1)
        
    if not registros_brutos:
        print("\n[AVISO] Nenhum registro ou tabela foi encontrado no arquivo fornecido.")
        sys.exit(1)
        
    print(f"[2/3] Registros lidos do documento: {len(registros_brutos)}")
    
    # Processamento e Filtragem
    amostras_bancada, total_lidos, total_descartados = processar_triagem_bancada(registros_brutos)
    
    print(f"      -> Exames de rotina automatizada eliminados: ~{total_descartados}")
    print(f"      -> Amostras de bancada mantidas: {len(amostras_bancada)}")
    
    if not amostras_bancada:
        print("\n[AVISO] Nao foram encontrados exames de bancada (Urinálise, VHS, Beta-HCG, etc.)")
        print("        neste arquivo. Todos os exames eram de rotina automatizada.\n")
        sys.exit(0)
        
    # Exportação para Excel
    print("\n[3/3] Gerando mapa de bancada para impressao...")
    try:
        exportar_planilha_bancada(amostras_bancada, caminho_saida, nome_arquivo)
    except Exception as e:
        print(f"\n[FALHA] Erro ao gravar a planilha: {e}")
        sys.exit(1)
        
    print("=" * 75)
    print("   TRIAGEM DE BANCADA CONCLUIDA COM SUCESSO!")
    print("=" * 75)
    print(f"Planilha gerada: {os.path.basename(caminho_saida)}")
    print(f"Localizacao:     {caminho_saida}")
    print("\nPronta para impressao em papel A4 Paisagem para anotação na bancada!\n")


if __name__ == "__main__":
    main()
