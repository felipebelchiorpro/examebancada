@echo off
setlocal
chcp 65001 >nul
title Conecta SUS - Filtrar Apenas Urinálise (EAS) e Sangue Oculto (PSO)
color 0B

echo.
echo ======================================================================
echo   CONECTA SUS - FILTRAR APENAS URINÁLISE (EAS) E SANGUE OCULTO (PSO)
echo   Separa Nome, Prontuário, Urina e PSO descartando exames de rotina
echo ======================================================================
echo.

REM 1. Verifica se algum arquivo foi passado via parametro
if "%~1"=="" (
    color 0E
    echo [AVISO] Nenhum arquivo foi detectado!
    echo.
    echo Modo de uso:
    echo 1. Localize o relatorio do Conecta SUS [Excel .xlsx/.xls ou PDF .pdf].
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

REM 4. Executa o extrator_urina_pso.py passando o arquivo com aspas
echo Processando e separando exclusivamente Urinálise e PSO...
echo.
"%PYTHON_EXE%" "%SCRIPT_DIR%extrator_urina_pso.py" "%~1"

if %ERRORLEVEL% NEQ 0 (
    color 0C
    echo.
    echo [ERRO] Ocorreu uma falha durante o processamento.
) else (
    color 0A
    echo.
    echo [SUCESSO] Arquivo gerado com sucesso!
)

echo.
echo ======================================================================
echo Pressione qualquer tecla para fechar esta janela...
pause >nul
