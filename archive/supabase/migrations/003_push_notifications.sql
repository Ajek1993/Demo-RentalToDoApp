-- Migracja: Push Notifications triggers
-- Ta migracja dodaje triggery do wysyłania push notifications

-- Trigger na nowe zlecenie
create or replace function notify_new_order()
returns trigger as $$
declare
  v_service_url text;
begin
  -- Pobierz URL projektu z current_setting (dostępne w Supabase)
  v_service_url := current_setting('app.settings.api_external_url', true);

  if v_service_url is null then
    -- Fallback do hardcoded URL (zmień na właściwy)
    v_service_url := 'https://xpjcopzdbovenbhykfsb.supabase.co';
  end if;

  -- Wywołaj Edge Function asynchronicznie używając pg_net
  perform
    net.http_post(
      url := v_service_url || '/functions/v1/send-push',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
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

-- Usuń stary trigger jeśli istnieje
drop trigger if exists on_new_order on public.orders;

-- Utwórz nowy trigger
create trigger on_new_order
  after insert on public.orders
  for each row execute function notify_new_order();

-- Trigger na zakończenie zlecenia
create or replace function notify_completed_order()
returns trigger as $$
declare
  v_service_url text;
begin
  -- Sprawdź czy status zmienił się na 'completed'
  if NEW.status = 'completed' and (OLD.status is null or OLD.status != 'completed') then
    -- Pobierz URL projektu
    v_service_url := current_setting('app.settings.api_external_url', true);

    if v_service_url is null then
      v_service_url := 'https://xpjcopzdbovenbhykfsb.supabase.co';
    end if;

    -- Wywołaj Edge Function
    perform
      net.http_post(
        url := v_service_url || '/functions/v1/send-push',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
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

-- Usuń stary trigger jeśli istnieje
drop trigger if exists on_order_completed on public.orders;

-- Utwórz nowy trigger
create trigger on_order_completed
  after update on public.orders
  for each row execute function notify_completed_order();

-- Trigger na przypisanie użytkownika do zlecenia
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

  -- Pobierz URL projektu
  v_service_url := current_setting('app.settings.api_external_url', true);

  if v_service_url is null then
    v_service_url := 'https://xpjcopzdbovenbhykfsb.supabase.co';
  end if;

  -- Wywołaj Edge Function
  perform
    net.http_post(
      url := v_service_url || '/functions/v1/send-push',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
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

-- Usuń stary trigger jeśli istnieje
drop trigger if exists on_assignment_created on public.assignments;

-- Utwórz nowy trigger
create trigger on_assignment_created
  after insert on public.assignments
  for each row execute function notify_assignment();

-- Dodaj komentarze
comment on function notify_new_order() is 'Wysyła push notification gdy utworzono nowe zlecenie';
comment on function notify_completed_order() is 'Wysyła push notification gdy zlecenie zostało zakończone';
comment on function notify_assignment() is 'Wysyła push notification gdy użytkownik przypisał się do zlecenia';
