-- Funkcja do usuwania kursu powiązanego ze zleceniem
-- SECURITY DEFINER pozwala ominąć RLS (potrzebne przy przywracaniu zlecenia przez admina)
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

-- Nadaj uprawnienia do wywoływania funkcji
GRANT EXECUTE ON FUNCTION delete_kurs_by_order_id(UUID) TO authenticated;
