@echo off
rem Validacao previa da lista da 1a serie A (so le; nao grava nada).
rem Uso:
rem   piloto-validar-turma.cmd C:\piloto\piloto-1a.json C:\piloto\alunos-1a.csv            (confere tambem o banco)
rem   piloto-validar-turma.cmd C:\piloto\piloto-1a.json C:\piloto\alunos-1a.csv --offline  (so o arquivo)
rem Os arquivos reais ficam FORA do repositorio. O relatorio mostra linha e
rem e-mail mascarado, nunca nome.
rem Codigos de saida:
rem   0 = previa concluida, sem bloqueios (apta)
rem   2 = bloqueios de dados ou conflitos
rem   3 = configuracao ausente ou invalida (argumentos, JSON, variaveis de ambiente)
rem   outro nao zero = falha tecnica inesperada
rem Fluxo linear (goto, sem exit dentro de parenteses nem "||"): o codigo de
rem saida chega intacto ao PowerShell / cmd /c.
setlocal
set "RC=0"
if "%~2"=="" goto :uso
cd /d "%~dp0..\.."
if /i "%~3"=="--offline" goto :offline

call "%~dp0piloto-checar-ambiente.cmd"
if errorlevel 1 goto :sem_ambiente
node --experimental-strip-types scripts\pilot-import-turma.mjs "--config=%~1" "--csv=%~2" "--confirm-project=%IAH_HOMOLOGATION_PROJECT_REF%"
set "RC=%ERRORLEVEL%"
goto :fim

:offline
node --experimental-strip-types scripts\pilot-import-turma.mjs "--config=%~1" "--csv=%~2" --offline
set "RC=%ERRORLEVEL%"
goto :fim

:uso
echo Uso: %~nx0 ^<config.json^> ^<alunos.csv^> [--offline]
set "RC=3"
goto :fim

:sem_ambiente
echo Banco nao consultado: configuracao de ambiente ausente (codigo 3).
set "RC=3"
goto :fim

:fim
endlocal & exit /b %RC%
