# GrowEasy AI CSV Importer

An AI-powered CSV importer that maps **any** CSV export — Facebook Lead Ads, Google Ads,
real-estate CRM exports, sales reports, or a hand-made spreadsheet — into GrowEasy's fixed
CRM lead schema, regardless of column names or layout.

Built for the GrowEasy Software Developer (Intern / Full-Time) assignment.

## How it works

1. **Upload** a CSV (drag & drop or file picker).
2. **Preview** — the file is parsed client-side and shown in a scrollable, sticky-header
   table. No AI call happens yet.
3. **Confirm** — only on confirmation does the frontend call the backend.
4. The backend re-parses the CSV, batches the rows, and sends each batch to an LLM with a
   prompt that describes the GrowEasy CRM schema, the allowed enum values, and the mapping
   rules (multiple emails/phones, missing-contact skip rule, date format, etc).
5. Progress streams back to the browser batch-by-batch (NDJSON), and the final screen shows
   imported vs. skipped records with counts.

## Architecture

```
InternTime/
├── backend/     Express + TypeScript API (CSV parsing, batching, AI extraction)
├── frontend/    Next.js (App Router) + TypeScript + Tailwind UI
└── samples/     Example CSVs in different real-world formats
```

The two apps are independent and talk over HTTP — deploy them separately (e.g. backend on
Render, frontend on Vercel) or run both together with Docker Compose.

### Backend

```
backend/src/
├── ai/
│   ├── prompt.ts        System prompt: CRM schema, enums, mapping rules, worked example
│   ├── schema.ts         zod validation for the AI's JSON response
│   ├── factory.ts        Picks a provider from AI_PROVIDER env var
│   └── providers/         openai.ts, gemini.ts, anthropic.ts, heuristic.ts
├── services/
│   ├── csv.ts             CSV -> {headers, rows} parsing
│   ├── importPipeline.ts  Batches rows, runs them through the AI provider with
│   │                      retries/concurrency, reconciles imported vs skipped
│   └── normalize.ts       Server-side re-validation of AI output (enum allow-lists,
│                           date validity) — never trusts the LLM blindly
├── routes/leads.ts        POST /api/leads/import — streams NDJSON progress
└── middleware/            multer upload config, centralized error handling
```

All four LLM providers implement the same `AiProvider` interface, so swapping
`AI_PROVIDER=openai|gemini|anthropic|heuristic` is the only thing that changes. `heuristic`
is a **no-API-key fallback** (fuzzy header aliasing + regex extraction) so the full
pipeline is runnable and demoable without any AI credentials — it's intentionally less
capable at ambiguous columns than a real LLM, which is the primary intended path.

### Frontend

```
frontend/src/
├── app/                 page.tsx orchestrates the 4-step flow as a state machine
├── components/
│   ├── steps/           UploadStep, PreviewStep, ProcessingStep, ResultsStep
│   ├── DataTable.tsx     Reusable virtualized table (sticky header, horiz+vert scroll)
│   └── UploadDropzone, ThemeToggle, StepIndicator, StatTile
└── lib/
    ├── csv.ts            Client-side CSV parsing for the preview step (papaparse)
    ├── api.ts             Streams NDJSON from the backend for live progress
    └── types.ts           Shared CRM record / result types
```

## AI prompt engineering

The prompt (`backend/src/ai/prompt.ts`) is the core of the "any CSV format" requirement.
It gives the model:

- The full GrowEasy CRM field list with descriptions.
- The **exact** allowed enum values for `crm_status` and `data_source`, with instructions
  to leave the field blank rather than guess.
- Explicit rules for multi-value fields (extra emails/phones go into `crm_note`).
- The hard **skip rule**: no email and no phone anywhere in the row → skip with a reason.
- A worked input/output example on a messy, non-standard row, to ground the model's
  behavior on unfamiliar column names.
- A strict output-JSON contract, keyed by `row_id` so no row can silently disappear.

The backend never trusts the AI's output blindly: `normalize.ts` re-validates every enum
and date server-side, and `importPipeline.ts` double-checks the skip rule and reconciles
row IDs so a hallucinated or dropped row can't reach the client unnoticed.

## Getting started

### Prerequisites

- Node.js 18+
- An API key for OpenAI, Gemini, or Anthropic (optional — the app runs without one using
  the `heuristic` fallback provider)

### 1. Backend

```bash
cd backend
cp .env.example .env
# Edit .env: set AI_PROVIDER and the matching *_API_KEY, or leave AI_PROVIDER=heuristic
npm install
npm run dev      # http://localhost:8080
```

### 2. Frontend

```bash
cd frontend
cp .env.local.example .env.local
# NEXT_PUBLIC_API_URL should point at the backend above
npm install
npm run dev      # http://localhost:3000
```

Open http://localhost:3000, upload one of the CSVs in `samples/` (also downloadable from
inside the app), and step through Upload → Preview → Confirm → Results.

### Docker Compose (both services)

```bash
AI_PROVIDER=openai OPENAI_API_KEY=sk-... docker compose up --build
```

## Environment variables

**Backend** (`backend/.env`, see `.env.example`)

| Variable | Purpose |
|---|---|
| `PORT` | API port (default 8080) |
| `CORS_ORIGIN` | Allowed frontend origin(s), comma-separated |
| `AI_PROVIDER` | `openai` \| `gemini` \| `anthropic` \| `heuristic` |
| `OPENAI_API_KEY` / `OPENAI_MODEL` | Used when `AI_PROVIDER=openai` |
| `GEMINI_API_KEY` / `GEMINI_MODEL` | Used when `AI_PROVIDER=gemini` |
| `ANTHROPIC_API_KEY` / `ANTHROPIC_MODEL` | Used when `AI_PROVIDER=anthropic` |
| `AI_BATCH_SIZE` | Rows sent to the AI per batch (default 25) |
| `AI_BATCH_CONCURRENCY` | Max concurrent batch calls (default 3) |
| `AI_BATCH_RETRIES` | Retries per failed batch (default 2) |
| `MAX_UPLOAD_BYTES` | Max CSV upload size (default 5MB) |

**Frontend** (`frontend/.env.local`, see `.env.local.example`)

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_API_URL` | Base URL of the backend API |

## Deployment

- **Backend → Render**: create a Web Service from this repo, root directory `backend`,
  build command `npm install && npm run build`, start command `npm start` (or use the
  included `backend/render.yaml` as a Blueprint). Set the env vars above in the Render
  dashboard.
- **Frontend → Vercel**: import this repo, set the project **Root Directory** to
  `frontend`, and set `NEXT_PUBLIC_API_URL` to the deployed backend URL.

## Testing it with different CSV shapes

`samples/` has five CSVs shaped like real-world exports to exercise the mapping logic:

- `facebook_lead_export.csv` — Facebook Lead Ads style
- `google_ads_export.csv` — Google Ads style
- `real_estate_crm_export.csv` — already in GrowEasy's own schema
- `sales_report.csv` — multiple emails/phones in one cell, needs `crm_note` aggregation
- `manual_spreadsheet.csv` — deliberately ambiguous headers (`When`, `Who`, `How to reach`),
  including one row with no contact info to exercise the skip rule

## Bonus features implemented

- Drag & drop upload
- Live progress indicator during AI batch processing (streamed NDJSON, not a blind spinner)
- Retry mechanism for failed AI batches (exponential backoff, then a graceful per-row skip
  with reason if retries are exhausted — no request-level failure)
- Virtualized results/preview tables (handles large CSVs without lag)
- Dark mode
- Docker + Docker Compose setup
- Downloadable JSON export of the import result

## Notes on production readiness

- The API is stateless — no database required, matching the "Database (Optional)" note in
  the assignment. Each request parses, batches, and returns; nothing is persisted.
- Every AI response is schema-validated (zod) and re-normalized server-side before it
  reaches the client, so a malformed or hallucinated LLM response degrades to a skipped
  row rather than corrupting output.
- CORS, Helmet, and upload size/type limits are enforced on the API.
