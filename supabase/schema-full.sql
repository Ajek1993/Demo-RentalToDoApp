-- =============================================================================
-- RENTAL-APP: Skonsolidowany schemat bazy danych
-- =============================================================================
-- Plik do uruchomienia na nowej instancji Supabase (SQL Editor)
-- Zawiera: tabele, indeksy, RLS, funkcje, triggery, realtime, granty
--
-- PRZED URUCHOMIENIEM:
--   Upewnij się, że baza jest czysta (nowy projekt Supabase)
--
-- PO URUCHOMIENIU:
--   Ustaw sekret dla push notifications:
--   SELECT vault.create_secret('TWOJ_SEKRET', 'push_secret');
-- =============================================================================
--
-- Hardcoded URL Supabase: xpjcopzdbovenbhykfsb.supabase.co - jeśli migrujesz na inną instancję, zamień go w funkcjach push.
--
-- =============================================================================
-- TABELE
-- =============================================================================

-- Profil użytkownika (rozszerzenie auth.users)
CREATE TABLE public.profiles (
  id uuid REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  name text NOT NULL,
  role text NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  created_at timestamptz DEFAULT now()
);

-- Zlecenia
CREATE TABLE public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plate text NOT NULL,
  date date NOT NULL,
  time time,
  location text NOT NULL,
  notes text,
  status text DEFAULT 'active' CHECK (status IN ('active', 'completed', 'deleted')),
  insurance_company text CHECK (insurance_company IN ('PZU', 'WARTA', 'VIG', 'ALLIANZ', 'TUW', 'INNE') OR insurance_company IS NULL),
  is_one_way boolean DEFAULT false,
  created_by uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT location_length CHECK (char_length(location) <= 200),
  CONSTRAINT notes_length CHECK (char_length(notes) <= 2000),
  CONSTRAINT plate_uppercase CHECK (plate = UPPER(plate))
);

-- Przypisania użytkowników do zleceń
CREATE TABLE public.assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES public.orders(id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  assigned_by uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  assigned_at timestamptz DEFAULT now(),
  unassigned_at timestamptz,
  unassigned_by uuid REFERENCES public.profiles(id) ON DELETE CASCADE
);

-- Subskrypcje push notifications
CREATE TABLE public.push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  endpoint text NOT NULL,
  p256dh text NOT NULL,
  auth text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, endpoint)
);

-- Dyspozycyjność pracowników
CREATE TABLE public.availability (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  date date NOT NULL,
  is_full_day boolean DEFAULT false,
  is_unavailable boolean DEFAULT false,
  start_time time,
  end_time time,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT valid_slot CHECK (
    (is_unavailable = true AND is_full_day = false AND start_time IS NULL AND end_time IS NULL)
    OR (is_full_day = true AND (is_unavailable = false OR is_unavailable IS NULL) AND start_time IS NULL AND end_time IS NULL)
    OR (is_full_day = false AND (is_unavailable = false OR is_unavailable IS NULL) AND start_time IS NOT NULL AND end_time IS NOT NULL AND start_time < end_time)
  )
);

-- Feedback od użytkowników
CREATE TABLE public.feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  message text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Historia edycji zleceń
CREATE TABLE public.order_edits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES public.orders(id),
  edited_by uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  edited_at timestamptz DEFAULT now(),
  changes jsonb NOT NULL
);

-- Kursy (rozliczenia kierowców)
CREATE TABLE public.kursy (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  wykonawca_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  order_id uuid REFERENCES public.orders(id),
  data date NOT NULL,
  nr_rej text NOT NULL,
  marka text,
  adres text NOT NULL,
  kwota numeric NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT nr_rej_uppercase CHECK (nr_rej = UPPER(nr_rej))
);

-- =============================================================================
-- INDEKSY
-- =============================================================================

CREATE INDEX idx_availability_date ON public.availability(date);
CREATE INDEX idx_availability_user_date ON public.availability(user_id, date);

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_edits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kursy ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- POLITYKI RLS
-- =============================================================================

-- profiles
CREATE POLICY "Profiles: select all" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Profiles: insert own" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Profiles: update own" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- orders
CREATE POLICY "Orders: select all" ON public.orders FOR SELECT USING (true);
CREATE POLICY "Orders: insert auth" ON public.orders FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Orders: update all" ON public.orders FOR UPDATE USING (true);

-- assignments
CREATE POLICY "Assignments: select all" ON public.assignments FOR SELECT USING (true);
CREATE POLICY "Assignments: insert auth" ON public.assignments FOR INSERT WITH CHECK (true);
CREATE POLICY "Assignments: update own" ON public.assignments FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Assignments: delete own" ON public.assignments FOR DELETE USING (user_id = auth.uid());

-- push_subscriptions
CREATE POLICY "Push: select own" ON public.push_subscriptions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Push: insert own" ON public.push_subscriptions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Push: delete own" ON public.push_subscriptions FOR DELETE USING (auth.uid() = user_id);

-- availability
CREATE POLICY "Availability: select all" ON public.availability FOR SELECT USING (true);
CREATE POLICY "Availability: insert own" ON public.availability FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Availability: update own" ON public.availability FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Availability: delete own" ON public.availability FOR DELETE USING (auth.uid() = user_id);

-- feedback
CREATE POLICY "Feedback: insert own" ON public.feedback FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- order_edits
CREATE POLICY "OrderEdits: select all" ON public.order_edits FOR SELECT USING (true);
CREATE POLICY "OrderEdits: insert auth" ON public.order_edits FOR INSERT WITH CHECK (auth.uid() = edited_by);
CREATE POLICY "OrderEdits: delete own" ON public.order_edits FOR DELETE USING (auth.uid() = edited_by);

-- kursy
CREATE POLICY "Kursy: select own or admin" ON public.kursy FOR SELECT USING (
  auth.uid() = user_id
  OR auth.uid() = wykonawca_id
  OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Kursy: insert own" ON public.kursy FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Kursy: update own" ON public.kursy FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Kursy: delete own" ON public.kursy FOR DELETE USING (auth.uid() = user_id);

-- =============================================================================
-- FUNKCJE
-- =============================================================================

-- Auto-tworzenie profilu przy rejestracji użytkownika
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, name)
  VALUES (new.id, COALESCE(new.raw_user_meta_data->>'name', 'Użytkownik'));
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Push notification: nowe zlecenie
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

-- Push notification: zlecenie zakończone
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

-- Push notification: zlecenie usunięte
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

-- Usuwanie kursu po order_id (SECURITY DEFINER dla obejścia RLS)
CREATE OR REPLACE FUNCTION delete_kurs_by_order_id(p_order_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM kursy WHERE order_id = p_order_id;
END;
$$;

-- Reminder o dyspozycyjności (wywoływana przez pg_cron)
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

-- =============================================================================
-- TRIGGERY
-- =============================================================================

-- Trigger: auto-tworzenie profilu przy rejestracji
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Trigger: push na nowe zlecenie
CREATE TRIGGER on_new_order
  AFTER INSERT ON public.orders
  FOR EACH ROW EXECUTE FUNCTION notify_new_order();

-- Trigger: push na zakończenie zlecenia
CREATE TRIGGER on_order_completed
  AFTER UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION notify_completed_order();

-- Trigger: push na usunięcie zlecenia
CREATE TRIGGER on_order_deleted
  AFTER UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION notify_deleted_order();

-- =============================================================================
-- REALTIME
-- =============================================================================

ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
ALTER PUBLICATION supabase_realtime ADD TABLE public.assignments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.availability;

-- =============================================================================
-- GRANTY
-- =============================================================================

GRANT EXECUTE ON FUNCTION delete_kurs_by_order_id(UUID) TO authenticated;

-- =============================================================================
-- KOMENTARZE
-- =============================================================================

COMMENT ON TABLE public.profiles IS 'Profile użytkowników (rozszerzenie auth.users)';
COMMENT ON TABLE public.orders IS 'Zlecenia do realizacji';
COMMENT ON TABLE public.assignments IS 'Przypisania użytkowników do zleceń';
COMMENT ON TABLE public.push_subscriptions IS 'Subskrypcje push notifications';
COMMENT ON TABLE public.availability IS 'Dyspozycyjność pracowników';
COMMENT ON TABLE public.feedback IS 'Feedback od użytkowników';
COMMENT ON TABLE public.order_edits IS 'Historia edycji zleceń';
COMMENT ON TABLE public.kursy IS 'Rozliczenia kursów kierowców';

COMMENT ON COLUMN public.assignments.unassigned_at IS 'Timestamp wypisania się z zlecenia (NULL = nadal przypisany)';
COMMENT ON COLUMN public.assignments.unassigned_by IS 'Kto wypisał użytkownika (może być sam użytkownik lub ktoś inny)';

COMMENT ON FUNCTION notify_new_order() IS 'Wysyła push notification gdy utworzono nowe zlecenie';
COMMENT ON FUNCTION notify_completed_order() IS 'Wysyła push notification gdy zlecenie zostało zakończone';
COMMENT ON FUNCTION notify_deleted_order() IS 'Wysyła push notification gdy zlecenie zostało usunięte';
COMMENT ON FUNCTION delete_kurs_by_order_id(UUID) IS 'Usuwa kurs powiązany ze zleceniem (SECURITY DEFINER dla obejścia RLS)';
COMMENT ON FUNCTION send_availability_reminder() IS 'Wysyła push reminder o dyspozycyjności do kierowców (role=user)';

-- =============================================================================
-- pg_cron — SCHEDULED JOBS
-- =============================================================================
-- WYMAGA: pg_cron włączone w Supabase Dashboard (Database → Extensions)

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
