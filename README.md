# My Homework

My Homework is a responsive homework tracker for the 10V class workflow. It runs as a static GitHub Pages site and uses Firebase Authentication + Firestore for account-based cloud storage.

## Smart Refresh update

The **Ухаалаг санал болгох** composer improves quick homework entry. Choose a type such as `Хуудас`, `Дасгал`, `Мэдээлэл хайх`, `Цээжлэх`, `Бодлого`, or `Унших`, enter the relevant page/problem/topic, then choose a suggested follow-up action. The app builds a clean task title automatically.

Examples:
- `Хуудас 12–15 · Унших`
- `Дасгал 5, 6, 7 · Бодох`
- `Мэдээлэл хайх: Нельсон Мандела · Тэмдэглэл`

The feature logic is split between `enhancement-utils.js`, `enhancements.js`, and `smart-suggestions.css` so the presets, UI controller, and styles remain easy to understand.

## Firebase setup

This project reuses the Firebase web project used by Message, while My Homework data is stored separately under `my_homework/{uid}`.

Enable these Authentication providers in Firebase Console:
- Email/Password
- Google

Add your GitHub Pages domain to Authentication → Settings → Authorized domains.

Merge the My Homework Firestore rule into the Firebase project's existing rules without deleting unrelated Message rules:

```text
match /my_homework/{uid} {
  allow read, create, update, delete:
    if request.auth != null && request.auth.uid == uid;
}
```

## Main pages

- `index.html` — homework dashboard
- `login.html` — sign in, Google sign in, password reset
- `signup.html` — create account
- `profile.html` — profile and sign out

## Storage

Homework remains compatible with the existing localStorage model and is synchronized to the signed-in user's Firestore document. On first sync, existing local homework can be uploaded when the remote account has no homework yet.

## Deployment

GitHub Pages can deploy directly from `main` / repository root. No build step is required.
