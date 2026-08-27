# Colleagues — Concept of the Month

Small React + Firebase app for a group (&lt;10) studying a shared concept together. One moderator posts assignments and events; everyone tracks their own completion publicly.

Spark (free) plan only: client-side logic, Firestore security rules, Firebase Hosting. No Cloud Functions.

## Features

- Email/password auth
- Concept of the month banner (moderator edits)
- Assignment feed with done checkbox, completion counts, and comments
- Public group progress table
- Events with RSVP (coding challenge / mock interview / other)

## Setup

### 1. Create a Firebase project

1. Go to [Firebase Console](https://console.firebase.google.com/) and create a project.
2. Enable **Authentication → Sign-in method → Email/Password**.
3. Create a **Firestore** database (start in production mode; we deploy rules next).
4. Register a **Web app** and copy the config object.
5. (Optional but recommended) In Authentication, create the moderator account first so you can copy their UID.

### 2. Configure the app

```bash
cp .env.example .env.local
```

Fill in:

| Variable | Source |
| --- | --- |
| `VITE_FIREBASE_*` | Project settings → Your apps → Firebase SDK snippet |
| `VITE_MODERATOR_UID` | Authentication → Users → UID of the moderator |

Also set the same UID in `firestore.rules` inside `moderatorUid()` (replace `REPLACE_WITH_MODERATOR_UID`).

Update `.firebaserc` with your project id:

```json
{
  "projects": {
    "default": "your-project-id"
  }
}
```

### 3. Install and run locally

```bash
npm install
npm run dev
```

Open the printed local URL, register accounts for the group. The account whose UID matches `VITE_MODERATOR_UID` gets moderator controls.

### 4. Deploy security rules and hosting

```bash
npx firebase login
npm run deploy:rules
npm run deploy:hosting
```

Or everything at once:

```bash
npm run deploy
```

Hosting serves the Vite `dist/` build with SPA rewrites to `index.html`.

## Data model

| Collection / doc | Purpose |
| --- | --- |
| `users/{uid}` | `displayName`, `email`, `role`, `createdAt` |
| `concept/current` | Active concept title, description, date range |
| `assignments/{id}` | Title, link, note, date |
| `assignments/{id}/comments/{id}` | Comment text + author |
| `completions/{assignmentId}_{userId}` | `done` boolean |
| `events/{id}` | Title, type, date, description, `rsvps[]` |

## Roles

- **Moderator** — UID from `VITE_MODERATOR_UID` / rules. Can write concept, assignments, events.
- **Member** — everyone authenticated. Can toggle own completion, comment, RSVP.

## Scripts

- `npm run dev` — local Vite server
- `npm run build` — production build
- `npm run deploy:rules` — Firestore rules only
- `npm run deploy:hosting` — build + hosting
- `npm run deploy` — build + full Firebase deploy
