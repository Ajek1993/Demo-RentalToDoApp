-- Migracja: Poprawa push notifications
-- 1. Nowe zlecenie — dodaj kto utworzył
-- 2. Zakończenie zlecenia — dodaj lokalizację i kto zakończył
-- 3. Usunięcie zlecenia — nowy trigger
-- 4. Usuń trigger przypisania

-- 1. Nowe zlecenie — dodaj kto utworzył
CREATE OR REPLACE FUNCTION notify_new_order()
RETURNS trigger AS $$
DECLARE
  v_service_url text;
  v_user_name text;
BEGIN
  v_service_url := 'https://xpjcopzdbovenbhykfsb.supabase.co';
  SELECT name INTO v_user_name FROM public.profiles WHERE id = NEW.created_by;

  PERFORM net.http_post(
    url := v_service_url || '/functions/v1/send-push',
    headers := jsonb_build_object('Content-Type', 'application/json'),
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

-- 2. Zakończenie zlecenia — dodaj lokalizację i kto zakończył
CREATE OR REPLACE FUNCTION notify_completed_order()
RETURNS trigger AS $$
DECLARE
  v_service_url text;
  v_user_name text;
BEGIN
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    v_service_url := 'https://xpjcopzdbovenbhykfsb.supabase.co';
    SELECT name INTO v_user_name FROM public.profiles WHERE id = auth.uid();

    PERFORM net.http_post(
      url := v_service_url || '/functions/v1/send-push',
      headers := jsonb_build_object('Content-Type', 'application/json'),
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

-- 3. Usunięcie zlecenia — nowy trigger
CREATE OR REPLACE FUNCTION notify_deleted_order()
RETURNS trigger AS $$
DECLARE
  v_service_url text;
BEGIN
  IF NEW.status = 'deleted' AND (OLD.status IS NULL OR OLD.status != 'deleted') THEN
    v_service_url := 'https://xpjcopzdbovenbhykfsb.supabase.co';

    PERFORM net.http_post(
      url := v_service_url || '/functions/v1/send-push',
      headers := jsonb_build_object('Content-Type', 'application/json'),
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

-- Trigger dla usunięcia
CREATE TRIGGER on_order_deleted
  AFTER UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION notify_deleted_order();

-- 4. Usuń trigger przypisania
DROP TRIGGER IF EXISTS on_assignment_created ON public.assignments;
DROP FUNCTION IF EXISTS notify_assignment();
