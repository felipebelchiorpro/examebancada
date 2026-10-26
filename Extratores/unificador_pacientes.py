#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
================================================================================
CONECTA SUS - UNIFICADOR E CONSOLIDADOR GERAL DE PACIENTES (DRAG & DROP)
================================================================================
Automação para receber relatórios brutos do Conecta SUS / Laboratório Municipal
em formato Excel (.xlsx, .xls) ou PDF (.pdf), consolidando pacientes duplicados
em uma única linha por pessoa, agrupando todos os seus exames solicitados e
unificando os médicos solicitantes.
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
# 2. MAPEAMENTO DINÂMICO DE COLUNAS (FLEXÍVEL PARA RELATÓRIOS DO SUS)
# ==============================================================================

def mapear_colunas(nomes_colunas: list[str]) -> dict[str, int]:
    """Mapeia dinamicamente os índices das colunas a partir do cabeçalho."""
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
# 3. LEITURA DE DADOS (EXCEL E PDF)
# ==============================================================================

def ler_arquivo_excel(caminho_excel: str) -> list[dict]:
    """Lê relatórios em formato Excel (.xlsx ou .xls) e extrai os registros."""
    df_raw = pd.read_excel(caminho_excel, sheet_name=0, header=None)
    
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
            'medico': obter_val('medico'),
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
                        'medico': 4 if len(tabela[0]) > 4 else -1,
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
                        'medico': obter_col('medico'),
                        'exames_brutos': exame
                    })
                    
    return registros


# ==============================================================================
# 4. UNIFICAÇÃO E CONSOLIDAÇÃO DE PACIENTES
# ==============================================================================

def consolidar_pacientes(registros_brutos: list[dict]) -> tuple[list[dict], int, int]:
    """
    Agrupa pacientes duplicados em uma única linha por pessoa.
    - Unifica exames múltiplos em lista única ordenada sem repetições.
    - Unifica médicos solicitantes.
    - Retorna lista consolidada ordenada alfabeticamente pelo nome do paciente.
    """
    total_linhas_lidas = len(registros_brutos)
    agrupados = {}
    
    for reg in registros_brutos:
        prontuario = reg.get('prontuario', '').strip()
        paciente = reg.get('paciente', '').strip()
        paciente_norm = normalizar_texto(paciente)
        
        # Chave composta estável: Prontuário + Nome normalizado
        chave = f"{prontuario}|{paciente_norm}" if prontuario else f"SEM_PRONT|{paciente_norm}"
        
        # Coleta exames da linha atual (podem vir separados por vírgula, barra ou ponto e vírgula)
        exames_texto = reg.get('exames_brutos', '')
        itens_exame = [i.strip() for i in re.split(r'[,;\n\r\+/|]+', str(exames_texto)) if i.strip()]
        
        medico_atual = reg.get('medico', '').strip()
        
        if chave not in agrupados:
            agrupados[chave] = {
                'data': reg.get('data', '').strip(),
                'prontuario': prontuario,
                'paciente': paciente,
                'idade': reg.get('idade', '').strip(),
                'medicos_set': {medico_atual} if medico_atual else set(),
                'exames_set': set(itens_exame)
            }
        else:
            # Agrega exames
            for ex in itens_exame:
                agrupados[chave]['exames_set'].add(ex)
            # Agrega médicos
            if medico_atual:
                agrupados[chave]['medicos_set'].add(medico_atual)
            # Atualiza dados faltantes se presentes nesta linha
            if not agrupados[chave]['idade'] and reg.get('idade'):
                agrupados[chave]['idade'] = reg.get('idade').strip()
            if not agrupados[chave]['data'] and reg.get('data'):
                agrupados[chave]['data'] = reg.get('data').strip()
                
    # Montagem da lista final consolidada
    consolidados = []
    total_exames_geral = 0
    
    for item in agrupados.values():
        exames_ordenados = sorted(list(item['exames_set']))
        total_exames_geral += len(exames_ordenados)
        exames_str = "; ".join(exames_ordenados) if exames_ordenados else "N/A"
        
        medicos_ordenados = sorted(list(item['medicos_set']))
        medico_str = " / ".join(medicos_ordenados) if medicos_ordenados else "Não informado"
        
        consolidados.append({
            'Data Coleta': item['data'],
            'Prontuário': item['prontuario'],
            'Nome do Paciente': item['paciente'],
            'Idade': item['idade'],
            'Médico(s) Solicitante(s)': medico_str,
            'Qtd. Exames': len(exames_ordenados),
            'Exames Solicitados': exames_str
        })
        
    # Ordenação por Nome do Paciente em ordem alfabética
    consolidados.sort(key=lambda x: normalizar_texto(x['Nome do Paciente']))
    
    return consolidados, total_linhas_lidas, total_exames_geral


# ==============================================================================
# 5. EXPORTAÇÃO PARA EXCEL COM FORMATAÇÃO PROFISSIONAL
# ==============================================================================

def exportar_excel_consolidado(dados: list[dict], caminho_saida: str, nome_origem: str):
    """Gera planilha Excel (.xlsx) consolidada e auto-ajustada."""
    df = pd.DataFrame(dados)
    
    with pd.ExcelWriter(caminho_saida, engine='openpyxl') as writer:
        df.to_excel(writer, sheet_name='Pacientes Consolidados', index=False, startrow=2)
        workbook = writer.book
        worksheet = writer.sheets['Pacientes Consolidados']
        
        # Paleta de Estilos
        azul_primario = PatternFill(start_color="1F4E79", end_color="1F4E79", fill_type="solid")
        fonte_cabecalho = Font(name="Calibri", size=10, bold=True, color="FFFFFF")
        fonte_titulo = Font(name="Calibri", size=13, bold=True, color="1F4E79")
        fonte_sub = Font(name="Calibri", size=9, italic=True, color="475569")
        
        zebrado_par = PatternFill(start_color="F8FAFC", end_color="F8FAFC", fill_type="solid")
        zebrado_impar = PatternFill(start_color="FFFFFF", end_color="FFFFFF", fill_type="solid")
        
        borda_fina = Border(
            left=Side(style='thin', color='CBD5E1'),
            right=Side(style='thin', color='CBD5E1'),
            top=Side(style='thin', color='CBD5E1'),
            bottom=Side(style='thin', color='CBD5E1')
        )
        
        # Título Superior
        worksheet.merge_cells("A1:G1")
        cel_t = worksheet["A1"]
        cel_t.value = "RELATÓRIO CONSOLIDADO DE PACIENTES - CONECTA SUS"
        cel_t.font = fonte_titulo
        cel_t.alignment = Alignment(horizontal="left", vertical="center")
        worksheet.row_dimensions[1].height = 24
        
        # Metadados
        worksheet.merge_cells("A2:G2")
        cel_sub = worksheet["A2"]
        cel_sub.value = (
            f"Laboratório Municipal de Saúde • Emissão: {datetime.now().strftime('%d/%m/%Y às %H:%M:%S')}  |  "
            f"Total de Pacientes Únicos: {len(dados)}  |  Origem: {nome_origem}"
        )
        cel_sub.font = fonte_sub
        cel_sub.alignment = Alignment(horizontal="left", vertical="center")
        worksheet.row_dimensions[2].height = 18
        worksheet.row_dimensions[3].height = 26
        
        # Cabeçalho da Tabela (Linha 3)
        for col_idx in range(1, len(df.columns) + 1):
            cel = worksheet.cell(row=3, column=col_idx)
            cel.fill = azul_primario
            cel.font = fonte_cabecalho
            cel.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
            cel.border = borda_fina
            
        # Linhas de Dados (Linha 4 em diante)
        for row_idx in range(4, len(df) + 4):
            worksheet.row_dimensions[row_idx].height = 22
            fundo = zebrado_par if (row_idx % 2 == 0) else zebrado_impar
            
            for col_idx in range(1, len(df.columns) + 1):
                cel = worksheet.cell(row=row_idx, column=col_idx)
                cel.fill = fundo
                cel.border = borda_fina
                cel.font = Font(name="Calibri", size=10)
                
                col_nome = df.columns[col_idx - 1]
                
                if col_nome in ['Data Coleta', 'Prontuário', 'Idade', 'Qtd. Exames']:
                    cel.alignment = Alignment(horizontal="center", vertical="center")
                    if col_nome == 'Prontuário':
                        cel.number_format = '@'
                    elif col_nome == 'Qtd. Exames':
                        cel.font = Font(name="Calibri", size=10, bold=True, color="1F4E79")
                elif col_nome == 'Nome do Paciente':
                    cel.font = Font(name="Calibri", size=10, bold=True)
                    cel.alignment = Alignment(horizontal="left", vertical="center")
                elif col_nome == 'Exames Solicitados':
                    cel.alignment = Alignment(horizontal="left", vertical="center", wrap_text=True)
                else:
                    cel.alignment = Alignment(horizontal="left", vertical="center")
                    
        # Larguras automáticas ajustadas
        larguras = {
            'A': 14,  # Data Coleta
            'B': 16,  # Prontuário
            'C': 34,  # Nome do Paciente
            'E': 10,  # Idade
            'F': 32,  # Médicos Solicitantes
            'G': 13,  # Qtd. Exames
            'H': 60   # Exames Solicitados
        }
        worksheet.column_dimensions['A'].width = 14
        worksheet.column_dimensions['B'].width = 16
        worksheet.column_dimensions['C'].width = 34
        worksheet.column_dimensions['D'].width = 10
        worksheet.column_dimensions['E'].width = 32
        worksheet.column_dimensions['F'].width = 13
        worksheet.column_dimensions['G'].width = 65


# ==============================================================================
# 6. PONTO DE ENTRADA PRINCIPAL
# ==============================================================================

def main():
    print("=" * 75)
    print("   CONECTA SUS - UNIFICADOR E CONSOLIDADOR DE PACIENTES")
    print("=" * 75)
    
    if len(sys.argv) < 2:
        print("\n[ERRO] Nenhum arquivo foi informado!")
        print("Uso: python unificador_pacientes.py \"caminho\\para\\arquivo.(xlsx|xls|pdf)\"")
        print("Ou simplesmente arraste o arquivo sobre UNIFICAR_PACIENTES.bat.\n")
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
    caminho_saida = os.path.join(pasta_destino, f"{nome_base}_CONSOLIDADO.xlsx")
    
    print(f"\n[1/3] Arquivo recebido: {nome_arquivo}")
    print(f"      Pasta de destino: {pasta_destino}")
    
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
        
    print(f"[2/3] Total de linhas brutas lidas: {len(registros_brutos)}")
    
    # Consolidação dos pacientes
    consolidados, total_lidos, total_exames = consolidar_pacientes(registros_brutos)
    
    print(f"      -> Pacientes unicos consolidados: {len(consolidados)}")
    print(f"      -> Duplicidades eliminadas: {total_lidos - len(consolidados)} linhas")
    print(f"      -> Total de exames agrupados: {total_exames}")
    
    # Exportação para Excel
    print("\n[3/3] Gerando planilha Excel consolidada...")
    try:
        exportar_excel_consolidado(consolidados, caminho_saida, nome_arquivo)
    except Exception as e:
        print(f"\n[FALHA] Erro ao gravar a planilha: {e}")
        sys.exit(1)
        
    print("=" * 75)
    print("   CONSOLIDACAO CONCLUIDA COM SUCESSO!")
    print("=" * 75)
    print(f"Planilha gerada: {os.path.basename(caminho_saida)}")
    print(f"Localizacao:     {caminho_saida}\n")


if __name__ == "__main__":
    main()
