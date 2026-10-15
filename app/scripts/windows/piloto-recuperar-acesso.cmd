@echo off
rem Recuperacao assistida de acesso de UM aluno (pedido feito pela escola).
rem Uso: piloto-recuperar-acesso.cmd <email-institucional> <seu-nome> "<motivo>"
rem Gera senha temporaria individual (troca obrigatoria) e encerra sessoes antigas.
rem A senha aparece SO nesta janela: entregue ao aluno e feche a janela.
setlocal
if "%~3"=="" (echo Uso: %~nx0 ^<email^> ^<operador^> "^<motivo^>" & exit /b 1)
call "%~dp0piloto-checar-ambiente.cmd" || exit /b 1
cd /d "%~dp0..\.."
node --experimental-strip-types scripts\pilot-credential-reset.mjs "--email=%~1" --execute "--actor=cli:%~2" "--reason=%~3" "--confirm-project=%IAH_HOMOLOGATION_PROJECT_REF%"
exit /b %ERRORLEVEL%
