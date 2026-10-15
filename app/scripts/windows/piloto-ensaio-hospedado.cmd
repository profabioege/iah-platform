@echo off
rem Ensaio da aula no endereco PUBLICADO, so com contas SINTETICAS.
rem Antes: importe a turma sintetica (alunos-ensaio-35.csv) num projeto de
rem ensaio e guarde o arquivo de credenciais fora do repositorio.
rem Defina tambem nesta janela: set ENSAIO_SENHA_BASE=<texto com 10+ caracteres>
rem Uso:
rem   piloto-ensaio-hospedado.cmd https://<endereco> C:\piloto\ensaio\cred-1a.csv C:\piloto\ensaio\cred-extra.csv C:\piloto\ensaio\resultado.json
setlocal
if "%~4"=="" (echo Uso: %~nx0 ^<url^> ^<cred-1a.csv^> ^<cred-extra.csv^> ^<resultado.json^> & exit /b 1)
call "%~dp0piloto-checar-ambiente.cmd" || exit /b 1
if not defined ENSAIO_SENHA_BASE (echo Defina ENSAIO_SENHA_BASE nesta janela. & exit /b 1)
cd /d "%~dp0..\.."
node --experimental-strip-types scripts\pilot-ensaio-1a.mjs --modo=hospedado --autosave-min=10 "--base-url=%~1" "--contas=%~2" "--contas-extra=%~3" --institution=inst-ensaio-1a --turma=class-ensaio-1a --turma-extra=class-ensaio-extra "--out=%~4" "--confirm-project=%IAH_HOMOLOGATION_PROJECT_REF%"
exit /b %ERRORLEVEL%
