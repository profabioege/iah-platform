@echo off
rem Copia de seguranca logica do piloto (so le). O arquivo contem dados
rem pessoais e hashes de senha: guarde FORA do repositorio, com acesso restrito.
rem Uso: piloto-copia-seguranca.cmd C:\piloto\copias\piloto-AAAAMMDD-HHMM.json
setlocal
if "%~1"=="" (echo Uso: %~nx0 ^<arquivo-de-saida.json^> & exit /b 1)
call "%~dp0piloto-checar-ambiente.cmd" || exit /b 1
cd /d "%~dp0..\.."
node scripts\pilot-backup.mjs "--out=%~1" "--confirm-project=%IAH_HOMOLOGATION_PROJECT_REF%"
exit /b %ERRORLEVEL%
