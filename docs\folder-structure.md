# Folder Structure

The project is organized as an npm workspaces monorepo.

```
GATE/
  package.json              # Workspace manager (root)
  package-lock.json         # Unified dependency lockfile
  .nvmrc                    # Node version pinning (v20)
  netlify.toml              # Netlify build configuration
  backend/                  # Backend Workspace
    src/
      controllers/          # Role-based controllers
      lib/
        supabase.js         # Backend Supabase service client
      routes/
        evaluator.routes.js # Evaluator API endpoints
        index.js            # Router entry point
        student.routes.js   # Student API endpoints
      services/             # Business logic (XP, Streaks, Anti-Cheat, etc.)
      utils/
        time.js             # Shared time/date utilities
      server.js             # Express entry point
    .env                    # Private configuration
    package.json            # Backend manifest
  frontend/                 # Frontend Workspace
    src/
      components/           # UI Components
        dashboard/          # Student specific
        evaluator/          # Evaluator specific
      context/
        AuthContext.jsx     # Auth state management
      pages/                # Route pages
        evaluator/
        student/
        RoleLoginPage.jsx
        RoleSelectionPage.jsx
      services/
        api.js              # Axios instance for backend communication
      App.jsx               # Application shell
      main.jsx              # React mounting point
      index.css             # Styling
    public/                 # Static assets
      _redirects            # Netlify routing configuration
    .env                    # Private configuration
    package.json            # Frontend manifest
    vite.config.js          # Build tool config
    tailwind.config.js      # Styling config
    postcss.config.js       # CSS config
  supabase/
    schema.sql              # Database schema
  docs/
    api-routes.md           # API documentation
    folder-structure.md     # This document
  README.md                 # Project overview
```
