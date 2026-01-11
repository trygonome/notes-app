# CLAUDE.md – Notes App (PWA + Supabase)

## Description
Application de partage de notes synchronisées entre appareils (PC + Samsung).

## Stack technique
- **Frontend** : HTML/CSS/JavaScript vanilla (PWA)
- **Backend** : Supabase (auth + database)
- **Hébergement** : À définir (GitHub Pages, Vercel, ou local)

## Structure du projet
```
gros projet/
├── index.html      # Page principale
├── style.css       # Styles
├── app.js          # Logique de l'app
├── manifest.json   # Config PWA (installation mobile)
├── sw.js           # Service Worker (pour offline futur)
└── CLAUDE.md       # Ce fichier
```

## Supabase Config
- URL: https://rnjcrfsrqunnpafuekrp.supabase.co
- Table: notes (id, created_at, user_id, title, content)

## Règles du projet
- Mobile-first design
- Code simple et commenté
- Pas de framework lourd pour commencer
