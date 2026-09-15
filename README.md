# Connect

An interactive, Facebook-inspired social network built from the original static HTML/CSS layout.

This is a **frontend-only** demo. Posts, comments, messages, and login state persist in the browser (`localStorage`). It is not secure authentication and is not backed by a server.

## Demo login

- Email: `faizan@connect.app`
- Password: `faizan`

The same password works for the other seeded people (`dhrati@connect.app`, `izhar@connect.app`, `shrilekha@connect.app`, `aisha@connect.app`, `nate@connect.app`).

## Local development

```bash
npm install
npm run dev
```

## Production / Netlify

- **Build command:** `npm run build`
- **Publish directory:** `dist`
- SPA fallback is configured in `netlify.toml` and `public/_redirects` so client-side routes keep working after refresh.

Optional environment variable:

```
VITE_APP_NAME=Connect
```

No API keys are required.

## What works

Home feed, stories viewer, post create/edit/delete, reactions, comments, sharing, search, profiles, friends, messages, notifications, settings (including dark mode), and the original sidebar destinations (news, groups, marketplace, watch, events).
