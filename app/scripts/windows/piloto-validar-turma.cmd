@echo off
rem Validacao previa da lista da 1a serie A (so le; nao grava nada).
rem Uso:
rem   piloto-validar-turma.cmd C:\piloto\piloto-1a.json C:\piloto\alunos-1a.csv            (confere tambem o banco)
rem   piloto-validar-turma.cmd C:\piloto\piloto-1a.json C:\piloto\alunos-1a.csv --offline  (so o arquivo)
rem Os arquivos reais ficam FORA do repositorio. O relatorio mostra linha e
rem e-mail mascarado, nunca nome.
setlocal
if "%~2"=="" (echo Uso: %~nx0 ^<config.json^> ^<alunos.csv^> [--offline] & exit /b 1)
cd /d "%~dp0..\.."
if /i "%~3"=="--offline" (
  node --experimental-strip-types scripts\pilot-import-turma.mjs "--config=%~1" "--csv=%~2" --offline
) else (
  call "%~dp0piloto-checar-ambiente.cmd" || exit /b 1
  node --experimental-strip-types scripts\pilot-import-turma.mjs "--config=%~1" "--csv=%~2" "--confirm-project=%IAH_HOMOLOGATION_PROJECT_REF%"
)
exit /b %ERRORLEVEL%
