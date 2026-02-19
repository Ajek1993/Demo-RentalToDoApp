-- Migracja: Constrainty długości pól w tabeli orders
ALTER TABLE orders ADD CONSTRAINT location_length CHECK (char_length(location) <= 200);
ALTER TABLE orders ADD CONSTRAINT notes_length CHECK (char_length(notes) <= 2000);
