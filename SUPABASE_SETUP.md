# Supabase setup for PLAN AI cloud sync

PLAN AI works without an account. Add Supabase only if you want Google sign-in and chat sync across devices.

Your Gemini API key is **never** uploaded. Only chat history is synced.

## 1. Create a Supabase project

Go to https://supabase.com/dashboard and create a project.

## 2. Enable Google sign-in

In Supabase: **Authentication → Providers → Google**

- Enable Google.
- Add your Google OAuth client ID/secret.
- In Google Cloud Console, authorize this redirect URI:

```text
https://YOUR_PROJECT.supabase.co/auth/v1/callback
```

In Supabase **Authentication → URL Configuration**, add the site URL and redirect URL:

```text
https://dwyanehub.github.io/plan-ai/
```

For local development also add:

```text
http://localhost:5173/
```

## 3. Create the chats table

Run this in **SQL Editor**:

```sql
create table if not exists public.chats (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.chats enable row level security;

create policy "Users can read own chats"
on public.chats for select
using (auth.uid() = user_id);

create policy "Users can insert own chats"
on public.chats for insert
with check (auth.uid() = user_id);

create policy "Users can update own chats"
on public.chats for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
```

If the policy already exists, skip the `create policy` line for that policy.

## 4. Paste the config into PLAN AI

Open **Settings → Cloud sync** in PLAN AI and paste:

- **Project URL** — `https://YOUR_PROJECT.supabase.co`
- **Anon key** — the `anon` / `public` key from **Project Settings → API**

Never paste the `service_role` key. The anon key is safe for a browser app when Row Level Security is enabled.

## 5. Temporary-email blocking

PLAN AI blocks common disposable-email domains when a Google account signs in. Add your own domains in **Settings → Cloud sync → Blocked email domains**, separated by commas.

Google accounts already require verified email addresses, so this is an extra filter, not a replacement for provider checks.

## Notes

- Chat text syncs. Very large chats with generated images/videos may have media stripped before upload to keep the sync reliable; those files stay available in the browser where they were generated.
- Settings, including your Gemini key, stay in localStorage and are not synced.
