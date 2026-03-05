-- Dodanie kolumny ubezpieczyciela OC sprawcy do zleceń
ALTER TABLE public.orders
ADD COLUMN insurance_company text DEFAULT NULL
CHECK (insurance_company IN ('PZU', 'WARTA', 'VIG', 'ALLIANZ', 'TUW', 'INNE') OR insurance_company IS NULL);
