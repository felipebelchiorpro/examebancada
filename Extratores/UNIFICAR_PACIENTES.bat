@echo off
setlocal
chcp 65001 >nul
title Conecta SUS - Unificador e Consolidador de Pacientes
color 0B

echo.
echo ======================================================================
echo   CONECTA SUS - UNIFICADOR DE PACIENTES (DRAG ^& DROP)
echo   Consolidacao de Pacientes Duplicados e Agrupamento de Exames
echo ======================================================================
echo.

REM 1. Verifica se algum arquivo foi passado via parametro
if "%~1"=="" (
    color 0E
    echo [AVISO] Nenhum arquivo foi detectado!
    echo.
    echo Modo de uso:
    echo 1. Localize o relatorio bruto do Conecta SUS [Excel .xlsx/.xls ou PDF .pdf].
    echo 2. Arraste e solte o arquivo por cima deste arquivo [.bat]
    echo    ou sobre o atalho dele na sua Area de Trabalho.
    echo.
    echo ======================================================================
    echo.
    echo Pressione qualquer tecla para encerrar...
    pause >nul
    exit /b
)

REM 2. Valida a extensao do arquivo (.xlsx, .xls ou .pdf)
set "EXT=%~x1"
if /i not "%EXT%"==".xlsx" if /i not "%EXT%"==".xls" if /i not "%EXT%"==".pdf" (
    color 0C
    echo [ERRO] Formato de arquivo nao suportado!
    echo Arquivo recebido: "%~nx1"
    echo.
    echo Por favor, arraste apenas arquivos Excel [.xlsx, .xls] ou PDF [.pdf].
    echo ======================================================================
    echo.
    echo Pressione qualquer tecla para encerrar...
    pause >nul
    exit /b
)

REM 3. Define o executavel do Python (prioriza .venv local se existir)
set "SCRIPT_DIR=%~dp0"
if exist "%SCRIPT_DIR%.venv\Scripts\python.exe" (
    set "PYTHON_EXE=%SCRIPT_DIR%.venv\Scripts\python.exe"
) else (
    set "PYTHON_EXE=python"
)

REM 4. Garante as dependencias silenciosamente
echo Verificando ambiente e dependencias (pdfplumber, pandas, openpyxl, xlrd)...
"%PYTHON_EXE%" -m pip install --quiet --disable-pip-version-check pdfplumber pandas openpyxl xlrd >nul 2>&1

REM 5. Executa o unificador_pacientes.py passando o arquivo com aspas
echo Iniciando consolidacao dos pacientes...
echo.
"%PYTHON_EXE%" "%SCRIPT_DIR%unificador_pacientes.py" "%~1"

REM 6. Status final
if errorlevel 1 (
    color 0C
    echo.
    echo [ALERTA] Ocorreram erros durante a consolidacao.
) else (
    color 0A
)

echo.
echo ======================================================================
echo Pressione qualquer tecla para fechar esta janela...
pause >nul
endlocal
