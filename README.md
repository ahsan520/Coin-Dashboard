# Crypto Dashboard — Fixed Panels + AI (GitHub Pages)

This project is a GitHub Pages-ready static frontend with fixed widgets and a server-side AI predictive model template.

## Contents
- index.html
- script.js
- styles.css
- README.md
- server_example/ (FastAPI model template + Dockerfile)

## Deploy to GitHub Pages
1. Create a repo (e.g., Coin-Dashboard)
2. Upload these files to the repository root
3. Settings -> Pages -> Source: main branch / root
4. Wait a minute and open https://<your-username>.github.io/<repo>/

## Server-side AI
See server_example/ for a FastAPI server that exposes `/api/predict?coin=BTC`.
Deploy that somewhere (Render, Railway, Fly.io) and set `API_BASE` in script.js.

Do NOT store API keys in frontend.
