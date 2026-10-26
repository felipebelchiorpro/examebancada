$WshShell = New-Object -ComObject WScript.Shell
$Desktop = [Environment]::GetFolderPath('Desktop')
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

# 1. Atalho Unificar Pacientes (Ícone Azul)
$s1 = $WshShell.CreateShortcut("$Desktop\1. Unificar Pacientes SUS.lnk")
$s1.TargetPath = "$ScriptDir\UNIFICAR_PACIENTES.bat"
$s1.WorkingDirectory = $ScriptDir
$s1.IconLocation = "$ScriptDir\icone_unificar.ico,0"
$s1.Description = "Arraste relatorios brutos aqui para consolidar pacientes duplicados"
$s1.Save()

# 2. Atalho Triagem de Bancada (Ícone Verde)
$s2 = $WshShell.CreateShortcut("$Desktop\2. Triagem de Bancada SUS.lnk")
$s2.TargetPath = "$ScriptDir\TRIAGEM_BANCADA.bat"
$s2.WorkingDirectory = $ScriptDir
$s2.IconLocation = "$ScriptDir\icone_bancada.ico,0"
$s2.Description = "Arraste relatorios aqui para gerar mapa de bancada para impressao"
$s2.Save()

# 3. Atalho Filtro de Médicos Alvo (Ícone Vermelho)
$s3 = $WshShell.CreateShortcut("$Desktop\3. Filtro de Medicos SUS.lnk")
$s3.TargetPath = "$ScriptDir\FILTRAR_PDF.bat"
$s3.WorkingDirectory = $ScriptDir
$s3.IconLocation = "$ScriptDir\icone_medicos.ico,0"
$s3.Description = "Arraste relatorios PDF aqui para filtrar Dr. Douglas e Dra. Livia"
$s3.Save()

Write-Host "Atalhos criados com sucesso na Area de Trabalho!"
