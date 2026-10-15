@echo off
rem Importacao da 1a serie A. So prossegue com ZERO divergencias.
rem Uso:
rem   piloto-importar-turma.cmd <config.json> <alunos.csv> <id-instituicao> <total-conferido> <credenciais-saida.csv> <seu-nome>
rem Exemplo:
rem   piloto-importar-turma.cmd C:\piloto\piloto-1a.json C:\piloto\alunos-1a.csv inst-beryon 35 C:\piloto\credenciais-1a.csv fabio
rem As senhas iniciais vao SO para o arquivo de saida (fora do repositorio).
setlocal
if "%~6"=="" (echo Uso: %~nx0 ^<config.json^> ^<alunos.csv^> ^<id-instituicao^> ^<total^> ^<credenciais.csv^> ^<operador^> & exit /b 1)
call "%~dp0piloto-checar-ambiente.cmd" || exit /b 1
cd /d "%~dp0..\.."
node --experimental-strip-types scripts\pilot-import-turma.mjs "--config=%~1" "--csv=%~2" --execute "--confirm-institution=%~3" "--confirm-total=%~4" "--credentials-out=%~5" "--actor=cli:%~6" "--confirm-project=%IAH_HOMOLOGATION_PROJECT_REF%"
exit /b %ERRORLEVEL%
