-- Migracja: Fix Push Notifications triggers - usuń wymaganie service_role_key
-- Edge Functions wywołane z triggerów nie potrzebują Authorization header

-- Trigger na nowe zlecenie (FIXED)
create or replace function notify_new_order()
returns trigger as $$
declare
  v_service_url text;
begin
  -- Użyj hardcoded URL projektu Supabase
  v_service_url := 'https://xpjcopzdbovenbhykfsb.supabase.co';

  -- Wywołaj Edge Function bez Authorization header
  perform
    net.http_post(
      url := v_service_url || '/functions/v1/send-push',
      headers := jsonb_build_object(
        'Content-Type', 'application/json'
      ),
      body := jsonb_build_object(
        'title', 'Nowe zlecenie',
        'body', 'Zlecenie: ' || NEW.plate || ' - ' || NEW.location,
        'url', '/',
        'userId', NEW.created_by
      )
    );

  return NEW;
end;
$$ language plpgsql security definer;

-- Trigger na zakończenie zlecenia (FIXED)
create or replace function notify_completed_order()
returns trigger as $$
declare
  v_service_url text;
begin
  -- Sprawdź czy status zmienił się na 'completed'
  if NEW.status = 'completed' and (OLD.status is null or OLD.status != 'completed') then
    v_service_url := 'https://xpjcopzdbovenbhykfsb.supabase.co';

    -- Wywołaj Edge Function bez Authorization header
    perform
      net.http_post(
        url := v_service_url || '/functions/v1/send-push',
        headers := jsonb_build_object(
          'Content-Type', 'application/json'
        ),
        body := jsonb_build_object(
          'title', 'Zlecenie zakończone',
          'body', 'Zlecenie: ' || NEW.plate,
          'url', '/',
          'userId', null
        )
      );
  end if;

  return NEW;
end;
$$ language plpgsql security definer;

-- Trigger na przypisanie użytkownika do zlecenia (FIXED)
create or replace function notify_assignment()
returns trigger as $$
declare
  v_service_url text;
  v_user_name text;
  v_order_plate text;
begin
  -- Pobierz nazwę użytkownika i numer rejestracyjny
  select name into v_user_name from public.profiles where id = NEW.user_id;
  select plate into v_order_plate from public.orders where id = NEW.order_id;

  v_service_url := 'https://xpjcopzdbovenbhykfsb.supabase.co';

  -- Wywołaj Edge Function bez Authorization header
  perform
    net.http_post(
      url := v_service_url || '/functions/v1/send-push',
      headers := jsonb_build_object(
        'Content-Type', 'application/json'
      ),
      body := jsonb_build_object(
        'title', 'Nowe przypisanie',
        'body', v_user_name || ' przypisał się do zlecenia ' || v_order_plate,
        'url', '/',
        'userId', NEW.user_id
      )
    );

  return NEW;
end;
$$ language plpgsql security definer;
