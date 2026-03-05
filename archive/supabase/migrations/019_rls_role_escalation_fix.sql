-- Migration: Block role escalation + admin feedback read
-- Fixes: P0 security issue - users could change their own role to 'admin'

-- 1. Drop old profile update policy and create new one with role check
-- In WITH CHECK: bare column = proposed new value, subquery = current value
DROP POLICY IF EXISTS "Profiles: update own" ON public.profiles;
CREATE POLICY "Profiles: update own" ON public.profiles
  FOR UPDATE USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    AND role = (SELECT p.role FROM public.profiles p WHERE p.id = auth.uid())
  );

-- 2. Add admin read access to feedback table
CREATE POLICY "Feedback: admin read" ON public.feedback FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);
