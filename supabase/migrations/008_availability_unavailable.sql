-- Migracja: Dodanie opcji "Brak" (niedyspozycyjny) w dyspozycyjności

ALTER TABLE public.availability ADD COLUMN is_unavailable boolean default false;

-- Zaktualizuj constraint: pozwól na is_unavailable z null times
ALTER TABLE public.availability DROP CONSTRAINT valid_slot;
ALTER TABLE public.availability ADD CONSTRAINT valid_slot CHECK (
    (is_unavailable = true AND is_full_day = false AND start_time IS NULL AND end_time IS NULL)
    OR (is_full_day = true AND (is_unavailable = false OR is_unavailable IS NULL) AND start_time IS NULL AND end_time IS NULL)
    OR (is_full_day = false AND (is_unavailable = false OR is_unavailable IS NULL) AND start_time IS NOT NULL AND end_time IS NOT NULL AND start_time < end_time)
);
