@echo off
rem Implanta o piloto no projeto Vercel EXCLUSIVO "iah-piloto-beryon".
rem Rode a partir da pasta exportada do piloto (ex.: ...\.piloto-1a\app\scripts\windows).
rem NAO rode na raiz do repositorio: la o .vercel aponta para iah-platform.
rem Nao contrata plano nem muda cobranca: so publica neste projeto (Hobby).
setlocal
cd /d "%~dp0..\.."
if not exist ".vercel\project.json" (echo Falta .vercel\project.json desta pasta. Pare aqui. & exit /b 1)
findstr /c:"iah-piloto-beryon" ".vercel\project.json" >nul || (echo O .vercel desta pasta nao e o do piloto. Pare aqui. & exit /b 1)

echo == 1/4 Login na Vercel (abre o navegador se precisar)
call npx --yes vercel whoami >nul 2>&1 || call npx --yes vercel login || exit /b 1

echo == 2/4 Variaveis secretas do projeto (so as que faltarem)
call npx --yes vercel env ls production > "%TEMP%\iah-envs.txt" 2>&1
findstr /c:"AUTH_SECRET" "%TEMP%\iah-envs.txt" >nul || (
  for /f %%s in ('node -e "process.stdout.write(require('crypto').randomBytes(32).toString('base64url'))"') do (
    echo %%s| call npx --yes vercel env add AUTH_SECRET production --sensitive >nul
  )
  echo    AUTH_SECRET gerado e gravado (nao exibido^).
)
findstr /c:"SUPABASE_SERVICE_ROLE_KEY" "%TEMP%\iah-envs.txt" >nul || (
  echo    Cole a chave service_role do projeto iah-beryon-piloto (Supabase ^> Project Settings ^> API Keys^):
  call npx --yes vercel env add SUPABASE_SERVICE_ROLE_KEY production --sensitive
)
findstr /c:"SUPABASE_JWT_SECRET" "%TEMP%\iah-envs.txt" >nul || (
  echo    Cole o Legacy JWT Secret do projeto iah-beryon-piloto (Supabase ^> Project Settings ^> JWT Keys^):
  call npx --yes vercel env add SUPABASE_JWT_SECRET production --sensitive
)
del "%TEMP%\iah-envs.txt" >nul 2>&1

echo == 3/4 Publicacao de producao do piloto
set COMMIT=
if exist "PILOTO_COMMIT.txt" set /p COMMIT=<PILOTO_COMMIT.txt
call npx --yes vercel deploy --prod --yes --build-env NEXT_PUBLIC_BUILD_COMMIT=%COMMIT% || exit /b 1

echo == 4/4 Pronto. Endereco: https://iah-piloto-beryon.vercel.app/entrar
echo Avise o Claude para conferir a implantacao.
