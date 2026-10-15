@echo off
rem Confere, SEM mostrar valores, se as variaveis do piloto estao definidas
rem nesta janela do CMD. Defina-as antes com:
rem   set NEXT_PUBLIC_SUPABASE_URL=...
rem   set SUPABASE_SERVICE_ROLE_KEY=...
rem   set IAH_HOMOLOGATION_PROJECT_REF=<ref do projeto do piloto>
rem   set IAH_PROTECTED_PROJECT_REFS=<refs que nunca podem ser alvo>
rem Nunca grave essas chaves em arquivo dentro do repositorio.
setlocal
set FALTA=0
for %%V in (NEXT_PUBLIC_SUPABASE_URL SUPABASE_SERVICE_ROLE_KEY IAH_HOMOLOGATION_PROJECT_REF IAH_PROTECTED_PROJECT_REFS) do (
  if defined %%V (echo   ok      %%V) else (echo   FALTA   %%V & set FALTA=1)
)
if "%FALTA%"=="1" (echo. & echo Defina as variaveis que faltam nesta janela e rode de novo. & exit /b 1)
echo Ambiente pronto nesta janela.
