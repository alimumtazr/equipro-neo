# EquiPro (Neobrutal)

Second frontend for **GIKI Lab Equipment Checkout** — same FastAPI backend as [`equipro`](../equipro), separate UI (neobrutalism) and **separate login session** (`localStorage` key `lab_checkout_user_id_nb`).

- **Stack:** React 19 + Vite + Tailwind CSS + React Router + lucide-react  
- **Dev port:** `5174` (classic app uses `5173`)

## Local run (PowerShell)

Prerequisites: Node 20+, [`equipro-be`](../equipro-be) on `http://localhost:8000`.

```powershell
cd c:\UIUX\equipro-neobrutal
npm install
Copy-Item .env.example .env
npm run dev
```

Open `http://localhost:5174`.

## CORS

Add this origin to the backend `CORS_ORIGINS` (comma-separated), then restart the API:

`http://localhost:5174,http://127.0.0.1:5174`

See [`equipro-be/app/config.py`](../equipro-be/app/config.py).

## Usability iteration (CS324)

This build reflects the presentation iteration items: sign-in copy and **Lab manager / Students** grouping, **cart count badge**, **waitlist toast + state**, **Pending-first dashboard** with **red pending badge**, **Process return** on active rows, contextual **empty states**, and **required damage notes** for damaged/lost units on return.
