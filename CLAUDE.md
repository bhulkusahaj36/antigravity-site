# CLAUDE.md — Antigravity Project Conventions

## Project Overview
- **Name**: Antigravity (bhulku.com)
- **Goal**: A premium, royal-themed religious articles site (Gujarati-first).
- **Tech Stack**: HTML5, Vanilla CSS, JavaScript (Static Site). No frameworks unless requested.

## Coding Standards
- **CSS**: Use Vanilla CSS variables (defined in `:root`) for consistency.
- **Design**: Premium aesthetics: royal indigo background, gold/saffron accents, glassmorphism, smooth animations.
- **Typography**: Prioritize Gujarati fonts (`Noto Serif Gujarati`, `Noto Sans Gujarati`) with DM Sans for English.
- **Responsive**: Performance-first, responsive design for mobile, tablet, and desktop.
- **Transitions**: Every page change and interactive element should have smooth transitions.

## Project Structure
- `index.html`: Main landing page (hero, latest, featured circles, categories).
- `css/style.css`: Global Stylesheet.
- `js/`: Modular JS files (`home.js`, `utils.js`, `animations.js`, `particles.js`).
- `api/`: Static JSON or API endpoints.

## Task Workflow
- **Research First**: Always check Knowledge Items (KIs) before starting new analysis.
- **Deployment**: Use `deploy.bat` or the manual push workflow (ensure Portable Git is in PATH).
- **Automation**: Do not use placeholders; use `generate_image` for realistic assets.

## Built-in Commands
- `/deploy`: Runs the deployment sequence to GitHub.
- `/revert`: Reverts the last N commits if requested.
