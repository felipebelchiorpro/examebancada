@echo off
setlocal
chcp 65001 >nul
title Conecta SUS - Processador de Relatorios Laboratoriais
color 0B

echo.
echo ======================================================================
echo   CONECTA SUS - AUTOMACAO DE FILTRAGEM DE LAUDOS (DRAG ^& DROP)
echo ======================================================================
echo.

REM 1. Verifica se algum arquivo foi passado via parametro
if "%~1"=="" (
    color 0E
    echo [AVISO] Nenhum arquivo foi detectado!
    echo.
    echo Modo de uso:
    echo 1. Localize o relatorio em PDF baixado do Conecta SUS.
    echo 2. Arraste e solte o arquivo PDF por cima deste arquivo [.bat]
    echo    ou sobre o atalho dele na sua Area de Trabalho.
    echo.
    echo ======================================================================
    echo.
    echo Pressione qualquer tecla para encerrar...
    pause >nul
    exit /b
)

REM 2. Valida se o arquivo arrastado possui extensao .pdf
if /i not "%~x1"==".pdf" (
    color 0C
    echo [ERRO] O arquivo selecionado nao e um documento PDF!
    echo Arquivo recebido: "%~nx1"
    echo.
    echo Por favor, arraste apenas arquivos com extensao .pdf.
    echo ======================================================================
    echo.
    echo Pressione qualquer tecla para encerrar...
    pause >nul
    exit /b
)

REM 3. Define o executavel do Python
set "SCRIPT_DIR=%~dp0"
if exist "%SCRIPT_DIR%.venv\Scripts\python.exe" (
    set "PYTHON_EXE=%SCRIPT_DIR%.venv\Scripts\python.exe"
) else (
    set "PYTHON_EXE=python"
)

REM 4. Garante as dependencias silenciosamente
echo Verificando ambiente e dependencias (pdfplumber, pandas, openpyxl)...
"%PYTHON_EXE%" -m pip install --quiet --disable-pip-version-check pdfplumber pandas openpyxl >nul 2>&1

REM 5. Executa o script processador.py passando o arquivo com aspas
echo Iniciando processamento do relatorio...
echo.
"%PYTHON_EXE%" "%SCRIPT_DIR%processador.py" "%~1"

REM 6. Status final
if errorlevel 1 (
    color 0C
    echo.
    echo [ALERTA] Ocorreram erros durante o processamento.
) else (
    color 0A
)

echo.
echo ======================================================================
echo Pressione qualquer tecla para fechar esta janela...
pause >nul
endlocal
