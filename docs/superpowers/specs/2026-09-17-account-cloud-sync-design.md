# My Homework Account + Cloud Sync Design

## Goal
Allow a user to register once, then sign in from another device using a visible ID plus a secret password and load the same homework data.

## Architecture
- Frontend remains static on GitHub Pages.
- Supabase Auth manages credentials and sessions.
- Supabase Postgres stores homework rows.
- Row Level Security (RLS) restricts every homework row to the authenticated owner via `auth.uid()`.
- The browser only receives the public/publishable Supabase key. Service-role keys are never exposed.

## Login identity
- UI shows `ID` + `Нууц код`.
- Internally the ID is converted to a deterministic private login identifier for Supabase Auth.
- Password must be at least 6 characters; do not use a 4-digit PIN as the only secret.
- Account UI supports Register, Login, Logout, and current ID display.

## Data model
`homework_tasks`
- `id` uuid/text primary key
- `user_id` uuid references auth.users
- `subject` text
- `title` text
- `assigned` date
- `due` date
- `priority` text
- `notes` text
- `completed` boolean
- `created_at` timestamptz
- `completed_at` timestamptz nullable
- `updated_at` timestamptz

RLS policies allow authenticated users to select/insert/update/delete only rows where `user_id = auth.uid()`.

## Data flow
1. Register: user chooses/receives an ID and secret password; Supabase Auth creates the account.
2. Login: ID + password creates a Supabase session.
3. Initial load: cloud tasks are fetched after login.
4. Create/edit/complete/delete: write to Supabase, then update the UI.
5. Refresh/reopen: Supabase restores the session and reloads cloud tasks.
6. Logout: clear the auth session and return to the login screen.

## Existing localStorage migration
- Existing `my-homework:v1` tasks are preserved.
- On the first successful login, the app offers/imports local tasks into the signed-in account once.
- Local data is not deleted automatically.

## UI
- New full-screen auth view before the homework app.
- Tabs/buttons: `Нэвтрэх` and `Бүртгүүлэх`.
- Register: ID, password, confirm password.
- Login: ID, password.
- Main app shows current ID and a `Гарах` button.
- Clear error messages for wrong credentials, offline state, duplicate ID, and sync failure.

## Security
- Never commit a Supabase service-role key.
- Use only the publishable/anon client key in the browser.
- Enable RLS on exposed task tables.
- Passwords are handled by Supabase Auth, not stored in the homework table or localStorage.
- Avoid revealing whether a specific account exists in detailed error text.

## Testing
- Registration/login validation tests.
- ID normalization tests.
- Existing localStorage migration tests.
- CRUD sync tests using a test Supabase project or mocked network boundary.
- RLS policy checks: user A cannot read/write user B rows.
- Mobile and desktop auth UI smoke tests.
