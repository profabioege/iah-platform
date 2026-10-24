@echo off
rem Confere, SEM mostrar valores, se as variaveis do piloto estao definidas
rem nesta janela do CMD. Defina-as antes com:
rem   set NEXT_PUBLIC_SUPABASE_URL=...
rem   set SUPABASE_SERVICE_ROLE_KEY=...
rem   set IAH_HOMOLOGATION_PROJECT_REF=<ref do projeto do piloto>
rem   set IAH_PROTECTED_PROJECT_REFS=<refs que nunca podem ser alvo>
rem Nunca grave essas chaves em arquivo dentro do repositorio.
rem Saida: 0 = todas presentes; 1 = alguma ausente (so os NOMES sao exibidos).
setlocal
set "FALTA=0"
for %%V in (NEXT_PUBLIC_SUPABASE_URL SUPABASE_SERVICE_ROLE_KEY IAH_HOMOLOGATION_PROJECT_REF IAH_PROTECTED_PROJECT_REFS) do (
  if defined %%V (echo   ok      %%V) else (echo   FALTA   %%V& set "FALTA=1")
)
if "%FALTA%"=="0" goto :pronto
echo.
echo Defina as variaveis que faltam nesta janela e rode de novo.
endlocal & exit /b 1

:pronto
echo Ambiente pronto nesta janela.
endlocal & exit /b 0
