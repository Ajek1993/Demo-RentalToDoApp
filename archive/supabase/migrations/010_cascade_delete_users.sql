-- Dodaj ON DELETE CASCADE do foreign keys, żeby usuwanie userów z Supabase działało

-- feedback -> auth.users
ALTER TABLE public.feedback
  DROP CONSTRAINT feedback_user_id_fkey,
  ADD CONSTRAINT feedback_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- assignments -> profiles (user_id)
ALTER TABLE public.assignments
  DROP CONSTRAINT assignments_user_id_fkey,
  ADD CONSTRAINT assignments_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- assignments -> profiles (assigned_by)
ALTER TABLE public.assignments
  DROP CONSTRAINT assignments_assigned_by_fkey,
  ADD CONSTRAINT assignments_assigned_by_fkey
    FOREIGN KEY (assigned_by) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- orders -> profiles (created_by)
ALTER TABLE public.orders
  DROP CONSTRAINT orders_created_by_fkey,
  ADD CONSTRAINT orders_created_by_fkey
    FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- assignments -> profiles (unassigned_by)
ALTER TABLE public.assignments
  DROP CONSTRAINT assignments_unassigned_by_fkey,
  ADD CONSTRAINT assignments_unassigned_by_fkey
    FOREIGN KEY (unassigned_by) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- order_edits -> profiles (edited_by)
ALTER TABLE public.order_edits
  DROP CONSTRAINT order_edits_edited_by_fkey,
  ADD CONSTRAINT order_edits_edited_by_fkey
    FOREIGN KEY (edited_by) REFERENCES public.profiles(id) ON DELETE CASCADE;
