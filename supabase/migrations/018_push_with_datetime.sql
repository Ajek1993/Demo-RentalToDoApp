-- Migracja: Push notifications z datą/godziną zlecenia i deep linkiem do zlecenia

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
      'body', NEW.plate || ' | ' ||
              TO_CHAR(NEW.date, 'DD.MM') ||
              CASE WHEN NEW.time IS NOT NULL
                   THEN ' ' || LEFT(NEW.time::text, 5)
                   ELSE '' END ||
              ' - ' || NEW.location ||
              ' (dodał: ' || COALESCE(v_user_name, 'nieznany') || ')',
      'url', '/?order=' || NEW.id,
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
        'body', NEW.plate || ' | ' ||
                TO_CHAR(NEW.date, 'DD.MM') ||
                CASE WHEN NEW.time IS NOT NULL
                     THEN ' ' || LEFT(NEW.time::text, 5)
                     ELSE '' END ||
                ' - ' || NEW.location ||
                ' (zakończył: ' || COALESCE(v_user_name, 'nieznany') || ')',
        'url', '/?order=' || NEW.id,
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
  v_user_name text;
  v_push_secret text;
BEGIN
  IF NEW.status = 'deleted' AND (OLD.status IS NULL OR OLD.status != 'deleted') THEN
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
        'title', 'Zlecenie usunięte',
        'body', NEW.plate || ' | ' ||
                TO_CHAR(NEW.date, 'DD.MM') ||
                CASE WHEN NEW.time IS NOT NULL
                     THEN ' ' || LEFT(NEW.time::text, 5)
                     ELSE '' END ||
                ' - ' || NEW.location ||
                ' (usunął: ' || COALESCE(v_user_name, 'nieznany') || ')',
        'url', '/?order=' || NEW.id,
        'userId', auth.uid()
      )
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
