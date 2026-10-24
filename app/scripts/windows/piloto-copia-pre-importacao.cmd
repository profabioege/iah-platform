@echo off
rem Copia de seguranca RESTRITA, imediatamente antes da importacao real.
rem So le o banco; roda a previa completa antes e so copia se estiver apta.
rem Grava SO em C:\piloto\restrito\backups\ (dados pessoais e hashes de senha:
rem acesso restrito; nunca versionar nem enviar).
rem Uso:
rem   piloto-copia-pre-importacao.cmd <config.json> <alunos.csv> <ref-do-projeto>
rem   piloto-copia-pre-importacao.cmd --verificar <pasta-da-copia>
rem O ref e digitado pelo operador e precisa bater com o ambiente e a URL.
rem Codigos de saida:
rem   0 = copia criada / verificada
rem   2 = previa com bloqueio, colisao de identificador ou copia divergente
rem   3 = configuracao, ambiente ou alvo invalido
rem   outro nao zero = falha tecnica inesperada
setlocal
set "RC=0"
cd /d "%~dp0..\.."
if /i "%~1"=="--verificar" goto :verificar
if "%~3"=="" goto :uso
call "%~dp0piloto-checar-ambiente.cmd"
if errorlevel 1 goto :sem_ambiente
node --experimental-strip-types scripts\pilot-backup-pre-importacao.mjs "--config=%~1" "--csv=%~2" "--confirm-project=%~3"
set "RC=%ERRORLEVEL%"
goto :fim

:verificar
if "%~2"=="" goto :uso
node --experimental-strip-types scripts\pilot-backup-pre-importacao.mjs "--verify=%~2"
set "RC=%ERRORLEVEL%"
goto :fim

:uso
echo Uso: %~nx0 ^<config.json^> ^<alunos.csv^> ^<ref-do-projeto^>
echo      %~nx0 --verificar ^<pasta-da-copia^>
set "RC=3"
goto :fim

:sem_ambiente
echo Banco nao consultado: configuracao de ambiente ausente (codigo 3).
set "RC=3"
goto :fim

:fim
endlocal & exit /b %RC%
