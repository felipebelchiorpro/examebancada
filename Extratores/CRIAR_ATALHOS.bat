@echo off
setlocal
chcp 65001 >nul
title Criar Atalhos na Area de Trabalho
color 0B

echo.
echo ======================================================================
echo   CRIANDO ATALHOS COM ICONES PERSONALIZADOS NA AREA DE TRABALHO
echo ======================================================================
echo.

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0criar_atalhos.ps1"

if errorlevel 1 (
    color 0C
    echo.
    echo [ERRO] Ocorreu uma falha ao criar os atalhos.
) else (
    color 0A
    echo.
    echo ======================================================================
    echo   ATALHOS CRIADOS COM SUCESSO NA AREA DE TRABALHO!
    echo ======================================================================
    echo.
    echo   [AZUL]     -> 1. Unificar Pacientes SUS
    echo   [VERDE]    -> 2. Triagem de Bancada SUS
    echo   [VERMELHO] -> 3. Filtro de Medicos SUS
    echo.
    echo   Agora o pessoal do laboratorio pode apenas arrastar os relatorios
    echo   para cima do icone colorido desejado na Area de Trabalho!
    echo ======================================================================
)

echo.
echo Pressione qualquer tecla para encerrar...
pause >nul
endlocal
