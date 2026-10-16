@echo off
rem Verificacao FUNCIONAL no endereco publicado, com 3 contas SINTETICAS
rem (1 por vez; nao e teste de carga). Confere: professor atribui, aluno
rem salva e entrega producao e reflexao, professor orienta, aluno le a
rem orientacao em nova sessao, troca de aluno no mesmo navegador,
rem isolamento entre alunos e entre turmas.
rem Antes: piloto-importar-turma.cmd com os modelos de docs\piloto\modelos\ensaio
rem (copiados para C:\piloto\ensaio\) e "set ENSAIO_SENHA_BASE=<10+ caracteres>".
rem Uso: piloto-verificar-fluxo-hospedado.cmd C:\piloto\ensaio\cred-1a.csv C:\piloto\ensaio\cred-extra.csv C:\piloto\ensaio\verificacao.json
setlocal
if "%~3"=="" (echo Uso: %~nx0 ^<cred-1a.csv^> ^<cred-extra.csv^> ^<saida.json^> & exit /b 1)
call "%~dp0piloto-checar-ambiente.cmd" || exit /b 1
if not defined ENSAIO_SENHA_BASE (echo Defina ENSAIO_SENHA_BASE nesta janela. & exit /b 1)
cd /d "%~dp0..\.."
node --experimental-strip-types scripts\pilot-ensaio-1a.mjs --modo=hospedado --students=3 --peak-submitters=1 --entry-window=0 --drafts=1 --reviews=1 "--base-url=https://iah-piloto-beryon.vercel.app" "--contas=%~1" "--contas-extra=%~2" --institution=inst-ensaio-1a --turma=class-ensaio-1a --turma-extra=class-ensaio-extra "--out=%~3" "--confirm-project=%IAH_HOMOLOGATION_PROJECT_REF%"
echo.
echo Os tempos acima vem de 3 contas, uma por vez: NAO medem capacidade simultanea.
exit /b %ERRORLEVEL%
