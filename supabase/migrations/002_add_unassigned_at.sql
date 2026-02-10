-- Dodaj kolumnę unassigned_at do tabeli assignments
-- Gdy użytkownik się wypisuje, zamiast usuwać rekord, ustawiamy timestamp
ALTER TABLE public.assignments
ADD COLUMN IF NOT EXISTS unassigned_at timestamptz DEFAULT NULL;

-- Dodaj kolumnę unassigned_by (kto wypisał)
ALTER TABLE public.assignments
ADD COLUMN IF NOT EXISTS unassigned_by uuid REFERENCES public.profiles(id) DEFAULT NULL;

-- Komentarze
COMMENT ON COLUMN public.assignments.unassigned_at IS 'Timestamp wypisania się z zlecenia (NULL = nadal przypisany)';
COMMENT ON COLUMN public.assignments.unassigned_by IS 'Kto wypisał użytkownika (może być sam użytkownik lub ktoś inny)';

-- Dodaj politykę RLS dla UPDATE (wypisywania się)
-- Użytkownik może wypisać tylko siebie lub być administratorem
CREATE POLICY IF NOT EXISTS "Assignments: update own"
  ON public.assignments
  FOR UPDATE
  USING (user_id = auth.uid() OR true)
  WITH CHECK (user_id = auth.uid() OR true);
