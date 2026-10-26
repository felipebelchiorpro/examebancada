#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
================================================================================
CONECTA SUS - EXTRATOR EXCLUSIVO DE BANCADA: URINÁLISE (EAS) & SANGUE OCULTO (PSO)
================================================================================
Filtra relatórios brutos do Conecta SUS / Laboratório Municipal (Excel ou PDF),
descartando todos os exames automatizados de bioquímica e hemograma, mantendo
estritamente pacientes com solicitações de URINÁLISE e/ou SANGUE OCULTO (PSO).
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

try:
    import pdfplumber
except ImportError:
    pdfplumber = None


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


# Padrões regex para Urinálise
PADROES_URINA = [
    r"\bURINA\s*(?:I|1|TIPO\s*I|TIPO\s*1)\b",
    r"\bEAS\b", r"\bE\s*A\s*S\b",
    r"\bSEDIMENTO\s*URINARIO\b", r"\bSEDIMENTOSCOPIA\b",
    r"\bSUMARIO\s*DE\s*URINA\b", r"\bSUMARIO\b",
    r"\bUROFITA\b", r"\bFITA\s*REAGENTE\b",
    r"\bEXAME\s*(?:FISICO\s*E\s*QUIMICO\s*DE\s*)?URINA\b",
    r"\bPROTEINURIA\b", r"\bPROTEINA\s*URINARIA\b"
]

# Padrões regex para Sangue Oculto (PSO / SOF)
PADROES_PSO = [
    r"\bSANGUE\s*OCULTO\b",
    r"\bPSO\b", r"\bP\s*S\s*O\b",
    r"\bSOF\b", r"\bS\s*O\s*F\b",
    r"\bPESQUISA\s*DE\s*SANGUE\s*OCULTO\b",
    r"\bSANGUE\s*OCULTO\s*NAS\s*FEZES\b",
    r"\bSANGUE\s*OCULTO\s*FEZES\b"
]


def eh_urina(texto: str) -> bool:
    norm = normalizar_texto(texto)
    return any(re.search(p, norm) for p in PADROES_URINA)


def eh_pso(texto: str) -> bool:
    norm = normalizar_texto(texto)
    return any(re.search(p, norm) for p in PADROES_PSO)


def mapear_colunas(nomes_colunas: list[str]) -> dict[str, int]:
    colunas_norm = [normalizar_texto(c) for c in nomes_colunas]
    
    sinonimos = {
        'data': ['DATA COLETA', 'DT COLETA', 'DATA', 'DT AGENDAMENTO', 'AGENDAMENTO', 'DATA ATENDIMENTO', 'COLETA'],
        'prontuario': ['PRONTUARIO', 'PRONT', 'N PRONTUARIO', 'N PRONT', 'PRONT NO', 'CNS', 'CARTAO SUS', 'CODIGO', 'COD PACIENTE'],
        'paciente': ['NOME DO PACIENTE', 'PACIENTE', 'NOME', 'USUARIO', 'NOME PACIENTE'],
        'idade': ['IDADE', 'ID', 'ANOS', 'FAIXA ETARIA', 'DT NASC'],
        'medico': ['MEDICO SOLICITANTE', 'MEDICO', 'SOLICITANTE', 'PROFISSIONAL', 'NOME DO MEDICO', 'PRESCRITOR'],
        'exame': ['PROCEDIMENTO EXAME', 'EXAME PROCEDIMENTO', 'PROCEDIMENTO', 'EXAME', 'EXAMES', 'PROCEDIMENTOS', 'DESCRICAO', 'SOLICITACAO']
    }
    
    mapeamento = {}
    for chave, lista_sin in sinonimos.items():
        idx_encontrado = -1
        for sin in lista_sin:
            for i, col in enumerate(colunas_norm):
                if sin == col:
                    idx_encontrado = i
                    break
            if idx_encontrado != -1:
                break
                
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


def ler_excel(caminho: str) -> list[dict]:
    df_raw = pd.read_excel(caminho, sheet_name=0, header=None)
    linha_cabecalho = 0
    mapeamento = {}
    
    for r_idx in range(min(12, len(df_raw))):
        candidatos = [limpar_celula(val) for val in df_raw.iloc[r_idx]]
        mapa_teste = mapear_colunas(candidatos)
        if mapa_teste.get('paciente', -1) != -1 or mapa_teste.get('exame', -1) != -1:
            linha_cabecalho = r_idx
            mapeamento = mapa_teste
            break
            
    if not mapeamento or mapeamento.get('paciente', -1) == -1:
        candidatos = [limpar_celula(val) for val in df_raw.iloc[0]]
        mapeamento = mapear_colunas(candidatos)
        linha_cabecalho = 0

    registros = []
    for r_idx in range(linha_cabecalho + 1, len(df_raw)):
        linha = df_raw.iloc[r_idx]
        def obter_val(k):
            idx = mapeamento.get(k, -1)
            return limpar_celula(linha[idx]) if idx != -1 and idx < len(linha) else ""
            
        paciente = obter_val('paciente')
        if not paciente or normalizar_texto(paciente) in ['NOME', 'PACIENTE', 'NOME DO PACIENTE']:
            continue
            
        registros.append({
            'data': obter_val('data'),
            'prontuario': obter_val('prontuario'),
            'paciente': paciente,
            'idade': obter_val('idade'),
            'medico': obter_val('medico'),
            'exame': obter_val('exame')
        })
    return registros


def ler_pdf(caminho: str) -> list[dict]:
    if not pdfplumber:
        raise ImportError("pdfplumber necessário para ler PDF.")
    registros = []
    with pdfplumber.open(caminho) as pdf:
        mapeamento_ativo = None
        for pag in pdf.pages:
            tabelas = pag.extract_tables() or []
            for tab in tabelas:
                if not tab or len(tab) < 1: continue
                candidato = [limpar_celula(c) for c in tab[0]]
                mapa_teste = mapear_colunas(candidato)
                inicio = 0
                if mapa_teste.get('paciente', -1) != -1 or mapa_teste.get('exame', -1) != -1:
                    mapeamento_ativo = mapa_teste
                    inicio = 1
                elif mapeamento_ativo is None:
                    mapeamento_ativo = {'data': 0, 'prontuario': 1, 'paciente': 2, 'idade': 3, 'medico': 4, 'exame': 5}
                
                for linha in tab[inicio:]:
                    def obter_col(k):
                        idx = mapeamento_ativo.get(k, -1)
                        return limpar_celula(linha[idx]) if idx != -1 and idx < len(linha) else ""
                    paciente = obter_col('paciente')
                    if not paciente or normalizar_texto(paciente) in ['NOME', 'PACIENTE']:
                        continue
                    registros.append({
                        'data': obter_col('data'),
                        'prontuario': obter_col('prontuario'),
                        'paciente': paciente,
                        'idade': obter_col('idade'),
                        'medico': obter_col('medico'),
                        'exame': obter_col('exame')
                    })
    return registros


def processar_urina_e_pso(registros: list[dict]) -> tuple[list[dict], int]:
    """Filtra estritamente Urina e PSO e unifica por paciente."""
    pacientes_map = {}
    descartados = 0

    for reg in registros:
        exame = reg['exame']
        tem_u = eh_urina(exame)
        tem_p = eh_pso(exame)

        if not tem_u and not tem_p:
            descartados += 1
            continue

        chave = (reg['prontuario'] or reg['paciente']).strip().upper()
        if chave not in pacientes_map:
            pacientes_map[chave] = {
                'data': reg['data'],
                'prontuario': reg['prontuario'],
                'paciente': reg['paciente'],
                'idade': reg['idade'],
                'medico': reg['medico'],
                'tem_urina': tem_u,
                'tem_pso': tem_p
            }
        else:
            if tem_u: pacientes_map[chave]['tem_urina'] = True
            if tem_p: pacientes_map[chave]['tem_pso'] = True
            if not pacientes_map[chave]['medico'] and reg['medico']:
                pacientes_map[chave]['medico'] = reg['medico']

    return list(pacientes_map.values()), descartados


def exportar_excel(pacientes: list[dict], caminho_saida: str):
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Bancada_Urina_PSO"

    # Cabeçalho
    cabecalho = ["Nº", "Prontuário", "Nome do Paciente", "Idade", "Urinálise (EAS)", "Sangue Oculto (PSO)", "Médico Solicitante", "Data Coleta"]
    ws.append(cabecalho)

    # Estilização
    fill_cab = PatternFill(start_color="1E3A8A", end_color="1E3A8A", fill_type="solid") # Navy blue
    font_cab = Font(name="Calibri", size=11, bold=True, color="FFFFFF")
    border_thin = Border(left=Side(style='thin', color='CBD5E1'),
                         right=Side(style='thin', color='CBD5E1'),
                         top=Side(style='thin', color='CBD5E1'),
                         bottom=Side(style='thin', color='CBD5E1'))

    for col_idx in range(1, len(cabecalho) + 1):
        cell = ws.cell(row=1, column=col_idx)
        cell.fill = fill_cab
        cell.font = font_cab
        cell.alignment = Alignment(horizontal="center", vertical="center")

    fill_sim_urina = PatternFill(start_color="E0F2FE", end_color="E0F2FE", fill_type="solid") # azul claro
    fill_sim_pso = PatternFill(start_color="FFE4E6", end_color="FFE4E6", fill_type="solid")   # rose claro
    font_bold = Font(name="Calibri", size=10, bold=True)
    font_normal = Font(name="Calibri", size=10)

    for idx, p in enumerate(pacientes, 1):
        row_data = [
            idx,
            p['prontuario'],
            p['paciente'],
            p['idade'],
            "SIM" if p['tem_urina'] else "NÃO",
            "SIM" if p['tem_pso'] else "NÃO",
            p['medico'],
            p['data']
        ]
        ws.append(row_data)
        current_row = ws.max_row
        ws.row_dimensions[current_row].height = 22

        for col_idx in range(1, len(row_data) + 1):
            c = ws.cell(row=current_row, column=col_idx)
            c.border = border_thin
            c.font = font_normal

            if col_idx in [1, 2, 4, 8]:
                c.alignment = Alignment(horizontal="center", vertical="center")
            elif col_idx in [5, 6]:
                c.alignment = Alignment(horizontal="center", vertical="center")
                c.font = font_bold
                if col_idx == 5 and p['tem_urina']:
                    c.fill = fill_sim_urina
                elif col_idx == 6 and p['tem_pso']:
                    c.fill = fill_sim_pso
            else:
                c.alignment = Alignment(horizontal="left", vertical="center")

    # Ajuste automático de largura de colunas
    larguras = {1: 6, 2: 14, 3: 35, 4: 12, 5: 18, 6: 22, 7: 30, 8: 14}
    for col_num, width in larguras.items():
        ws.column_dimensions[get_column_letter(col_num)].width = width

    wb.save(caminho_saida)


def main():
    if len(sys.argv) < 2:
        print("[!] Arraste o arquivo do Conecta SUS (.xlsx, .xls ou .pdf) para cima deste executável.")
        input("Pressione Enter para sair...")
        sys.exit(1)

    caminho_entrada = sys.argv[1]
    if not os.path.exists(caminho_entrada):
        print(f"[X] Arquivo não encontrado: {caminho_entrada}")
        input("Pressione Enter para sair...")
        sys.exit(1)

    ext = os.path.splitext(caminho_entrada)[1].lower()
    print(f"[*] Processando: {os.path.basename(caminho_entrada)}")

    try:
        if ext in ['.xlsx', '.xls']:
            registros = ler_excel(caminho_entrada)
        elif ext == '.pdf':
            registros = ler_pdf(caminho_entrada)
        else:
            print("[X] Formato não suportado. Use Excel (.xlsx, .xls) ou PDF (.pdf).")
            input("Pressione Enter para sair...")
            sys.exit(1)

        pacientes, descartados = processar_urina_e_pso(registros)

        base_nome = os.path.splitext(caminho_entrada)[0]
        caminho_saida = f"{base_nome}_URINA_PSO.xlsx"
        exportar_excel(pacientes, caminho_saida)

        qtd_urina = sum(1 for p in pacientes if p['tem_urina'])
        qtd_pso = sum(1 for p in pacientes if p['tem_pso'])
        qtd_ambos = sum(1 for p in pacientes if p['tem_urina'] and p['tem_pso'])

        print("="*60)
        print("          EXTRAÇÃO CONECTA SUS - URINÁLISE & PSO")
        print("="*60)
        print(f"[+] Total de pacientes para a Bancada : {len(pacientes)}")
        print(f"    - Com Urinálise (EAS)            : {qtd_urina}")
        print(f"    - Com Sangue Oculto (PSO)        : {qtd_pso}")
        print(f"    - Com ambos (Urina + PSO)        : {qtd_ambos}")
        print(f"[-] Exames de rotina descartados     : {descartados}")
        print(f"[✓] Planilha gerada com sucesso:")
        print(f"    -> {caminho_saida}")
        print("="*60)

    except Exception as e:
        print(f"[X] Erro ao processar arquivo: {e}")
        import traceback
        traceback.print_exc()

    print("\nProcesso finalizado com sucesso!")


if __name__ == "__main__":
    main()
