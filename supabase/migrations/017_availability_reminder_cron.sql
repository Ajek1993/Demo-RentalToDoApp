-- Migracja: Scheduled push reminder — dyspozycyjność
-- Wysyła push notification do kierowców (role='user') w środy i niedziele o 21:00 CET
--
-- WYMAGANIA:
--   - Rozszerzenie pg_cron musi być włączone w Supabase Dashboard
--     (Database → Extensions → pg_cron → Enable)
--   - Rozszerzenie pg_net musi być włączone (używane już przez istniejące triggery)

-- 1. Funkcja wysyłająca reminder
CREATE OR REPLACE FUNCTION send_availability_reminder()
RETURNS void AS $$
DECLARE
  v_service_url text;
  v_push_secret text;
BEGIN
  v_service_url := 'https://xpjcopzdbovenbhykfsb.supabase.co';
  SELECT decrypted_secret INTO v_push_secret
    FROM vault.decrypted_secrets
    WHERE name = 'push_secret'
    LIMIT 1;

  PERFORM net.http_post(
    url := v_service_url || '/functions/v1/send-push',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'X-Internal-Secret', COALESCE(v_push_secret, '')
    ),
    body := jsonb_build_object(
      'title', 'Dyspozycyjność',
      'body', 'Uzupełnij swoją dyspozycyjność na nadchodzący tydzień',
      'url', '/',
      'targetRole', 'user'
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION send_availability_reminder() IS 'Wysyła push reminder o dyspozycyjności do kierowców (role=user)';

-- 2. pg_cron — środa i niedziela o 20:00 UTC (= 21:00 CET)
SELECT cron.schedule(
  'availability-reminder-wed',
  '0 20 * * 3',
  $$SELECT send_availability_reminder()$$
);

SELECT cron.schedule(
  'availability-reminder-sun',
  '0 20 * * 0',
  $$SELECT send_availability_reminder()$$
);
