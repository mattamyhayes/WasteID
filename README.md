# WasteID 🌿

**WasteID** is a web application for determining whether a chemical mixture qualifies as a hazardous waste under EPA RCRA (Resource Conservation and Recovery Act) regulations.

## Features

- 🔬 **Listed Waste Check** – Cross-reference against P-list, U-list, F-list, and K-list waste codes
- ⚗️ **Characteristic Waste** – Evaluate D001–D043 (ignitability, corrosivity, reactivity, TCLP toxicity)
- 📋 **Step-by-Step Reasoning** – Full RCRA decision framework with documented justification
- 📄 **PDF Report & CSV Export** – Professional determination reports
- 🌐 **Chemical Database** – 100+ pre-seeded EPA chemicals with hazard properties

## Architecture

| Layer | Technology |
|---|---|
| Backend | Python / Django 4.2 + Django REST Framework |
| Database | SQLite (development) |
| Frontend | React 18 + Vite + React Router v6 |
| Charts | Chart.js + react-chartjs-2 |
| Containerization | Docker Compose |

## Quick Start

### Option A: Docker Compose (recommended)

```bash
docker compose up --build
```

- Frontend: http://localhost:3000
- Backend API: http://localhost:8000/api/
- Django Admin: http://localhost:8000/admin/

### Option B: Manual Setup

**Backend:**
```bash
cd backend
pip install -r requirements.txt
python manage.py migrate
python manage.py seed_chemicals
python manage.py runserver
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/chemicals/?q=benzene` | Search chemicals |
| GET/POST | `/api/mixtures/` | List / create mixtures |
| POST | `/api/mixtures/{id}/determine/` | Run hazardous waste determination |
| GET | `/api/mixtures/{id}/report_pdf/` | Download PDF report |
| GET | `/api/mixtures/{id}/export_csv/` | Export CSV |
| GET | `/api/determinations/` | List all determinations |

## GitHub Pages Deployment

The frontend is automatically deployed to **https://mattamyhayes.github.io/WasteID/** on every push to `main` via GitHub Actions.

### One-time setup (repo owner)

1. **Enable GitHub Pages** in the repository settings:  
   *Settings → Pages → Source → GitHub Actions*

2. **Deploy the Django backend** to a public host (e.g., [Render](https://render.com), [Railway](https://railway.app), or [Fly.io](https://fly.io)).

3. **Set the backend URL** as a repository variable:  
   *Settings → Variables → Actions → New repository variable*  
   Name: `VITE_API_URL`  
   Value: your backend root URL, e.g. `https://wasteid-api.onrender.com`  
   (omit the trailing `/` and the `/api` path — the frontend appends those automatically)

The workflow file lives at `.github/workflows/deploy.yml` and runs `npm ci && npm run build` inside `frontend/`, then publishes the `dist/` directory.

> **Status:** GitHub Pages is enabled and `VITE_API_URL` is configured.

## Disclaimer

WasteID is for **informational purposes only** and does not constitute legal advice. Always verify determination results with qualified environmental professionals. Laboratory testing (EPA SW-846 methods) is required to confirm characteristics. Check applicable state regulations, which may be more stringent than federal RCRA standards.