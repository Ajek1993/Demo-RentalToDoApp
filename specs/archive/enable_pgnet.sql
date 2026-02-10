-- Włącz pg_net extension (potrzebna do wysyłania HTTP requestów z triggerów)
create extension if not exists pg_net with schema extensions;

-- Sprawdź czy extension jest włączona
select * from pg_extension where extname = 'pg_net';
