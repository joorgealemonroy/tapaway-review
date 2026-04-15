

# Fix: Add Missing `contact_display_style` Column

## Root Cause
The code references `contact_display_style` on `personal_profiles`, but the column was never created in the database. The API returns `PGRST204` because PostgREST can't find it.

## Fix
Run a single database migration to add the column:

```sql
ALTER TABLE public.personal_profiles 
ADD COLUMN IF NOT EXISTS contact_display_style text NOT NULL DEFAULT 'icon';
```

That's the only change needed. The frontend code is already correct.

