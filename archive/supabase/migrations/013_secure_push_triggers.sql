-- Migracja: Zabezpieczenie triggerów push — shared secret
-- Wszystkie 3 funkcje triggerów przekazują X-Internal-Secret z ustawień bazy.
--
-- PRZED uruchomieniem tej migracji ustaw sekret w bazie:
--   SELECT vault.create_secret('Abacus2026', 'push_secret');
-- Oraz dodaj ten sam sekret jako PUSH_SECRET w Supabase Dashboard
-- → Edge Functions → send-push → Secrets

-- 1. Nowe zlecenie
CREATE OR REPLACE FUNCTION notify_new_order()
RETURNS trigger AS $$
DECLARE
  v_service_url text;
  v_user_name text;
  v_push_secret text;
BEGIN
  v_service_url := 'https://xpjcopzdbovenbhykfsb.supabase.co';
  SELECT name INTO v_user_name FROM public.profiles WHERE id = NEW.created_by;
  SELECT decrypted_secret INTO v_push_secret FROM vault.decrypted_secrets WHERE name = 'push_secret' LIMIT 1;

  PERFORM net.http_post(
    url := v_service_url || '/functions/v1/send-push',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'X-Internal-Secret', COALESCE(v_push_secret, '')
    ),
    body := jsonb_build_object(
      'title', 'Nowe zlecenie',
      'body', 'Zlecenie: ' || NEW.plate || ' - ' || NEW.location || ' (dodał: ' || COALESCE(v_user_name, 'nieznany') || ')',
      'url', '/',
      'userId', NEW.created_by
    )
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Zakończenie zlecenia
CREATE OR REPLACE FUNCTION notify_completed_order()
RETURNS trigger AS $$
DECLARE
  v_service_url text;
  v_user_name text;
  v_push_secret text;
BEGIN
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    v_service_url := 'https://xpjcopzdbovenbhykfsb.supabase.co';
    SELECT name INTO v_user_name FROM public.profiles WHERE id = auth.uid();
    SELECT decrypted_secret INTO v_push_secret FROM vault.decrypted_secrets WHERE name = 'push_secret' LIMIT 1;

    PERFORM net.http_post(
      url := v_service_url || '/functions/v1/send-push',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'X-Internal-Secret', COALESCE(v_push_secret, '')
      ),
      body := jsonb_build_object(
        'title', 'Zlecenie zakończone',
        'body', 'Zlecenie: ' || NEW.plate || ' - ' || NEW.location || ' (zakończył: ' || COALESCE(v_user_name, 'nieznany') || ')',
        'url', '/',
        'userId', auth.uid()
      )
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Usunięcie zlecenia
CREATE OR REPLACE FUNCTION notify_deleted_order()
RETURNS trigger AS $$
DECLARE
  v_service_url text;
  v_push_secret text;
BEGIN
  IF NEW.status = 'deleted' AND (OLD.status IS NULL OR OLD.status != 'deleted') THEN
    v_service_url := 'https://xpjcopzdbovenbhykfsb.supabase.co';
    SELECT decrypted_secret INTO v_push_secret FROM vault.decrypted_secrets WHERE name = 'push_secret' LIMIT 1;

    PERFORM net.http_post(
      url := v_service_url || '/functions/v1/send-push',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'X-Internal-Secret', COALESCE(v_push_secret, '')
      ),
      body := jsonb_build_object(
        'title', 'Zlecenie usunięte',
        'body', 'Zlecenie: ' || NEW.plate || ' - ' || NEW.location,
        'url', '/',
        'userId', auth.uid()
      )
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
