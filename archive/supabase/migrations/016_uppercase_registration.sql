-- Migration: Add UPPERCASE constraints for registration numbers
-- Purpose: Enforce that registration numbers are always stored as UPPERCASE
-- Date: 2025-02-22

-- Add CHECK constraint to orders.plate
ALTER TABLE public.orders
ADD CONSTRAINT plate_uppercase CHECK (plate = UPPER(plate));

-- Add CHECK constraint to kursy.nr_rej
ALTER TABLE public.kursy
ADD CONSTRAINT nr_rej_uppercase CHECK (nr_rej = UPPER(nr_rej));

-- Optional: Convert existing data to UPPERCASE (if any lowercase data exists)
UPDATE public.orders SET plate = UPPER(plate) WHERE plate != UPPER(plate);
UPDATE public.kursy SET nr_rej = UPPER(nr_rej) WHERE nr_rej != UPPER(nr_rej);
