-- SQL do wykonania w Supabase SQL Editor
-- Ustawia zmienne środowiskowe dla triggerów push notifications

-- 1. Włącz pg_net extension (jeśli jeszcze nie włączona)
create extension if not exists pg_net with schema extensions;

-- 2. Ustaw API URL (zmień na swój URL projektu Supabase)
-- Format: https://[PROJECT_ID].supabase.co
alter database postgres set app.settings.api_external_url = 'https://xpjcopzdbovenbhykfsb.supabase.co';

-- 3. Ustaw service_role_key
-- UWAGA: Zamień poniższy klucz na swój SERVICE_ROLE_KEY z Supabase Dashboard
-- Settings → API → Project API keys → service_role (secret)
alter database postgres set app.settings.service_role_key = 'TWÓJ_SERVICE_ROLE_KEY_TUTAJ';

-- 4. Przeładuj konfigurację
select pg_reload_conf();

-- 5. Sprawdź czy ustawienia są poprawne
select
  current_setting('app.settings.api_external_url', true) as api_url,
  length(current_setting('app.settings.service_role_key', true)) as key_length;
