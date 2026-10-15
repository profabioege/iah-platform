@echo off
rem Indicadores agregados da aula (so le; sem nomes nem e-mails).
rem Uso: piloto-metricas-aula.cmd <id-instituicao> <id-turma> <inicio ISO> <fim ISO> <saida.json>
rem Exemplo: piloto-metricas-aula.cmd inst-beryon class-beryon-2026-1a 2026-10-20T10:00:00-03:00 2026-10-20T10:50:00-03:00 C:\piloto\aula\metricas.json
setlocal
if "%~5"=="" (echo Uso: %~nx0 ^<instituicao^> ^<turma^> ^<inicio^> ^<fim^> ^<saida.json^> & exit /b 1)
call "%~dp0piloto-checar-ambiente.cmd" || exit /b 1
cd /d "%~dp0..\.."
node scripts\pilot-metricas-aula.mjs "--institution=%~1" "--turma=%~2" --missao=01-a-fabrica-de-noticias "--inicio=%~3" "--fim=%~4" "--out=%~5" "--confirm-project=%IAH_HOMOLOGATION_PROJECT_REF%"
exit /b %ERRORLEVEL%
