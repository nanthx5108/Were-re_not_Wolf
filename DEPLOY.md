DEPLOY CHECKLIST — WE'RE NOT WOLF

Purpose
- Short checklist and example environment configuration for deploying the server to a managed host that requires SSL DB connections (Aiven, PlanetScale, etc.) and a typical static hosting / app server (Render). Includes CA options and quick smoke tests.

1) Environment variables (minimum)
- NODE_ENV=production
- PORT=3001 (render usually sets its own PORT; leave blank if platform assigns)
- CLIENT_URL=https://your-frontend-domain.example

Database (Aiven / managed MySQL)
- DB_HOST=<host>
- DB_PORT=<port> (usually 3306)
- DB_USER=<user>
- DB_PASSWORD=<password>
- DB_NAME=<database>
- DB_SSL=true

Optional CA options (choose one):
- DB_SSL_CA_PATH=/run/secrets/aiven_ca.pem
  - Recommended when the platform supports mounting files/secrets to the container filesystem.
- DB_SSL_CA_B64=<base64-encoded PEM contents>
  - Recommended when the platform only supports environment variables for secrets. Set the base64 of the PEM file.

Notes on SSL behavior (how this repo works)
- If DB_SSL is truthy (true/1/yes), the app will enable SSL for MySQL connections.
- If a CA is provided (DB_SSL_CA_PATH or DB_SSL_CA_B64) the connection will use rejectUnauthorized: true (full verification).
- If DB_SSL is true but no CA is provided the app falls back to rejectUnauthorized: false (useful for demos or hosts that don't provide a CA file). For production, prefer providing a CA.

2) Session / cookies and reverse proxy
- SESSION_SECRET=<long random string> (required in production)
- When behind an HTTPS proxy (Render, Cloudflare, etc) set NODE_ENV=production so the app calls app.set('trust proxy', 1) and cookies are marked secure.
- Cookie name is wolf.sid by default. Ensure sameSite and secure settings match your frontend domain setup.

3) WebSockets and Render notes
- Render may spin down WebSocket instances on free plans; plan for reconnection and expect ~15 minute idle spin-down on free tiers.
- Ensure your platform supports long-lived WebSocket connections for the best multiplayer experience or consider a paid tier with stable sockets.

4) How to provide DB_CA on common platforms
- Render (mount file): add a secret and mount it into the filesystem, then set DB_SSL_CA_PATH to the mount path.
- Render (env-only): base64 the PEM: cat aiven-ca.pem | base64 -w0 and set DB_SSL_CA_B64 to that value.
- Aiven: Aiven provides CA; download the CA PEM and either mount it or copy its base64 into DB_SSL_CA_B64.

5) Quick smoke tests after deploy
- Confirm server running: curl -v https://<your-domain>/health
- Confirm socket/API reachable (non-auth): curl -v https://<your-domain>/api/stats/online
- Check logs for DB SSL messages — successful connect prints: "✅ MySQL connected and schema ready — <user>@<host>:<port>/<db>"

6) Example env (Render / Aiven combined)
NODE_ENV=production
PORT=3001
CLIENT_URL=https://app.example.com
SESSION_SECRET=<long-random-string>
DB_HOST=db-12345.aivencloud.com
DB_PORT=3306
DB_USER=were_not_wolf_user
DB_PASSWORD=supersecret
DB_NAME=werenotwolfproject
DB_SSL=true
# Option A (mounted file)
DB_SSL_CA_PATH=/run/secrets/aiven_ca.pem
# Option B (env-only)
# DB_SSL_CA_B64=<base64-of-pem>

7) Post-deploy checklist
- Check server logs for DB connected message
- Run smoke tests (health and /api/stats/online)
- Create/enter a test room and run one full cycle: lobby → start → night actions → day → vote → results

8) Troubleshooting
- If DB connect fails with SSL errors and you set DB_SSL=true: ensure the CA is provided or try DB_SSL_CA_B64 with base64 content.
- If cookies aren't persisting after login on production behind a proxy: ensure NODE_ENV=production and that the platform forwards secure headers and sets the external URL correctly.

9) Security reminders
- Never commit DB credentials, CA files, or SESSION_SECRET into the repository. Use the host's secret store.

---
If you want, I can also:
- Provide exact Render service settings (UI steps) for mounting a secret file and adding environment variables
- Create a Pull Request from branch player-level-bar to main with the changes (I can provide the PR body and title for you to paste)

