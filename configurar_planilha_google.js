/**
 * SCRIPT DE CONFIGURAÇÃO AUTOMÁTICA DA PLANILHA - PWA URINÁLISE SUS
 * 
 * Como usar:
 * 1. Abra a sua planilha no Google Sheets (drive.google.com)
 * 2. No menu superior, clique em: Extensões > Apps Script
 * 3. Apague qualquer código existente e cole este script completo
 * 4. Clique no ícone de disquete (Salvar) e depois em "Executar" (Run)
 * 5. Pronto! Suas abas "Rotina_Dia" e "Laudos_Urina" serão criadas e formatadas na hora.
 */

function configurarPlanilhaLaboratorio() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // ==========================================
  // 1. CONFIGURAR ABA: Rotina_Dia
  // ==========================================
  let abaRotina = ss.getSheetByName("Rotina_Dia");
  if (!abaRotina) {
    abaRotina = ss.insertSheet("Rotina_Dia", 0);
  }

  const cabecalhoRotina = [
    "id",
    "data",
    "prontuario",
    "nome_paciente",
    "idade_sexo",
    "exame",
    "status_coleta",
    "status_laudo"
  ];

  // Inserir cabeçalho na linha 1
  abaRotina.getRange(1, 1, 1, cabecalhoRotina.length).setValues([cabecalhoRotina]);
  
  // Estilização profissional do cabeçalho da rotina (Azul Escuro / Slate)
  const headerRotinaRange = abaRotina.getRange(1, 1, 1, cabecalhoRotina.length);
  headerRotinaRange
    .setFontWeight("bold")
    .setFontFamily("Arial")
    .setFontSize(10)
    .setBackground("#1e293b")
    .setFontColor("#ffffff")
    .setHorizontalAlignment("center")
    .setVerticalAlignment("middle");
  
  abaRotina.setRowHeight(1, 32);
  abaRotina.setFrozenRows(1);
  abaRotina.autoResizeColumns(1, cabecalhoRotina.length);


  // ==========================================
  // 2. CONFIGURAR ABA: Laudos_Urina
  // ==========================================
  let abaLaudos = ss.getSheetByName("Laudos_Urina");
  if (!abaLaudos) {
    abaLaudos = ss.insertSheet("Laudos_Urina", 1);
  }

  const cabecalhoLaudos = [
    "id",
    "data_hora",
    "prontuario",
    "nome_paciente",
    "cor",
    "aspecto",
    "densidade",
    "ph",
    "proteina",
    "glicose",
    "cetona",
    "bilirrubina",
    "urobilinogenio",
    "sangue",
    "nitrito",
    "leucocitos_fita",
    "celulas_epiteliais",
    "leucocitos_campo",
    "hemacias_campo",
    "bacterias",
    "cristais",
    "cilindros",
    "observacoes",
    "status",
    "resultado_pso",
    "resultado_proteinuria_rapida",
    "resultado_beta_hcg",
    "resultado_vdrl",
    "resultado_vhs",
    "resultado_pcr",
    "coagulograma_tp",
    "coagulograma_ttpa"
  ];

  // Inserir cabeçalho na linha 1
  abaLaudos.getRange(1, 1, 1, cabecalhoLaudos.length).setValues([cabecalhoLaudos]);

  // Estilização profissional do cabeçalho de laudos (Verde Esmeralda Laboratorial)
  const headerLaudosRange = abaLaudos.getRange(1, 1, 1, cabecalhoLaudos.length);
  headerLaudosRange
    .setFontWeight("bold")
    .setFontFamily("Arial")
    .setFontSize(10)
    .setBackground("#065f46")
    .setFontColor("#ffffff")
    .setHorizontalAlignment("center")
    .setVerticalAlignment("middle");

  abaLaudos.setRowHeight(1, 32);
  abaLaudos.setFrozenRows(1);
  abaLaudos.autoResizeColumns(1, cabecalhoLaudos.length);

  // ==========================================
  // 3. LIMPEZA DA ABA PADRÃO INICIAL (se existir e estiver vazia)
  // ==========================================
  const abaPadrao = ss.getSheetByName("Página1") || ss.getSheetByName("Sheet1");
  if (abaPadrao && ss.getSheets().length > 2) {
    try {
      if (abaPadrao.getLastRow() <= 1 && abaPadrao.getLastColumn() <= 1) {
        ss.deleteSheet(abaPadrao);
      }
    } catch (e) {
      // Ignora se não puder deletar
    }
  }

  // Notificação visual na planilha
  ss.toast(
    "✅ Abas 'Rotina_Dia' e 'Laudos_Urina' criadas com sucesso com suporte a ID e Teste Rápido de Proteinúria!",
    "Configuração Concluída",
    8
  );
}
