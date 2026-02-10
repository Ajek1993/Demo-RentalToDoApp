# Konfiguracja VAPID Keys w Supabase

## Klucze VAPID

**Public Key** (już dodany do .env):
```
BOyMR1o0Fjjk91ytTaz9tuh3SSBOGx0t6nC8XGM768OWJxDP5Z7JFFpGPCbkOCQY4xCf7hM1E0RqI8p-GKlloPY
```

**Private Key** (do dodania w Supabase):
```
s26hQN2v3Ceb1it7v0g5zSZVIDPXIVLvUb1iYoMXm8c
```

## Instrukcja dodania Private Key do Supabase

1. Wejdź na [Supabase Dashboard](https://app.supabase.com)
2. Wybierz projekt: **rental-app**
3. Przejdź do **Settings** → **Edge Functions**
4. W sekcji **Secrets** kliknij **Add new secret**
5. Dodaj następujące sekrety:

### Sekret 1: VAPID_PRIVATE_KEY
- **Name**: `VAPID_PRIVATE_KEY`
- **Value**: `s26hQN2v3Ceb1it7v0g5zSZVIDPXIVLvUb1iYoMXm8c`

### Sekret 2: VAPID_PUBLIC_KEY
- **Name**: `VAPID_PUBLIC_KEY`
- **Value**: `BOyMR1o0Fjjk91ytTaz9tuh3SSBOGx0t6nC8XGM768OWJxDP5Z7JFFpGPCbkOCQY4xCf7hM1E0RqI8p-GKlloPY`

### Sekret 3: VAPID_EMAIL
- **Name**: `VAPID_EMAIL`
- **Value**: `admin@example.com` (lub Twój email)

## Weryfikacja

Po dodaniu sekretów, Edge Function `send-push` będzie miała dostęp do tych zmiennych środowiskowych.
