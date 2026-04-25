# IncidentBrain Advanced

IncidentBrain Advanced is an AI-powered cloud reliability copilot that turns postmortems into prevention, prediction, and operational intelligence.

Instead of letting incident reviews remain static documents, IncidentBrain transforms them into structured Failure DNA, prevention artifacts, blast radius simulations, recurrence forecasts, and fix workflows that help teams stop the same outages from happening again.

## Why This Project Matters

Modern engineering teams write postmortems after incidents, but those learnings often stay trapped in documents. The result is repeated outages, delayed prevention work, and unresolved operational debt.

IncidentBrain solves that by converting every incident into reusable cloud reliability intelligence.

## Core Value Proposition

IncidentBrain does not just answer:

- What failed?

It also answers:

- Why did it fail?
- Have we seen this before?
- How far could it spread across the cloud stack?
- How likely is it to recur?
- What should we ship now to prevent it?

## Key Innovations

### 1. Failure DNA Extraction

IncidentBrain converts an unstructured postmortem into a structured incident model called **Failure DNA**.

Failure DNA includes:

- incident title
- trigger
- detection gap
- blast radius
- fix category
- affected services
- recurrence prediction

This gives the system a machine-readable understanding of operational failures.

### 2. Historical Pattern Matching

The platform compares new incidents with previous failures to identify recurring operational patterns.

This allows teams to:

- reuse previous learnings
- detect repeated failure modes
- accelerate response and prevention work

### 3. Prevention Artifact Generation

For every incident, IncidentBrain can generate prevention-ready engineering artifacts such as:

- Alert YAML
- Runbook Patch
- Terraform Guard

This converts postmortem analysis directly into preventive technical work.

### 4. Blast Radius Simulator

This feature predicts how an incident could spread across a cloud architecture if left unresolved.

It simulates:

- directly impacted services
- downstream services
- affected regions
- likely user entry points
- severity if unfixed
- severity after fix
- containment actions

This makes the platform cloud-aware and highly demo-friendly.

### 5. Failure Forecast

IncidentBrain predicts the likelihood and scale of the next recurrence.

It forecasts:

- recurrence probability
- failure scope
- regional risk profile
- confidence level
- primary risk driver

This moves the platform from reactive analysis to proactive reliability planning.

### 6. AI Novel-Incident Handling

If an incident does not strongly match historical patterns, IncidentBrain can:

- use AI-generated prevention guidance
- or flag the case for manual review

This makes the system more realistic and safer in uncertain scenarios.

### 7. Incident Debt Tracking

The platform quantifies unresolved operational debt so teams can see how much risk remains and how much risk would be reduced after shipping prevention work.

## How It Works

### Step 1. Incident Input

The user pastes or uploads a postmortem into the Analyze page.

### Step 2. Failure DNA Extraction

The backend processes the postmortem and extracts structured Failure DNA.

### Step 3. Pattern Matching

The system compares the incident against previously stored incidents and finds similar failure modes when confidence is high.

### Step 4. Artifact Generation

IncidentBrain generates prevention artifacts such as alerting, runbook, and infrastructure guardrails.

### Step 5. Blast Radius Simulation

The platform predicts how the incident could propagate across services, entry points, and cloud regions.

### Step 6. Failure Forecast

The system estimates recurrence probability and future failure scope.

### Step 7. Action and Governance

The user can review fixes, open a GitHub PR, and mark the incident as resolved to reduce operational debt.

## Project Architecture

```text
User Postmortem Input
        |
        v
Frontend (React + Vite + TypeScript)
        |
        v
Backend API (Express + TypeScript)
        |
        +--> Failure DNA Extraction
        +--> Pattern Matching
        +--> Prevention Artifact Generation
        +--> Blast Radius Simulation
        +--> Failure Forecast
        +--> GitHub PR Integration
        +--> OpenAI Fallback for Novel Incidents
        |
        v
SQLite Incident Store
```

## Tech Stack

### Frontend

- React
- TypeScript
- Vite
- React Router
- Framer Motion
- Axios
- Recharts
- Tailwind CSS

### Backend

- Node.js
- Express
- TypeScript
- better-sqlite3
- OpenAI SDK
- Octokit (GitHub API)

### Data / Persistence

- SQLite for incident, artifact, and debt tracking

### Cloud Deployment Targets

- Frontend: Vercel
- Backend: Render
- Future-ready DB migration path: Supabase / Neon Postgres

## Major Product Screens

### Analyze Page

- paste or upload incident postmortem
- trigger analysis pipeline

### Incident Detail Page

- Failure DNA view
- Blast Radius Simulator
- Failure Forecast
- historical pattern matches
- generated prevention artifacts
- AI recommendation / manual review warning
- debt impact summary

### Dashboard

- total incidents
- open debt items
- recurrence trend
- incidents by service
- incident history

### Settings

- GitHub token and repo configuration
- OpenAI-related configuration support

## Demo Flow

For a strong demo, use this sequence:

1. Open the Analyze page
2. Paste a postmortem
3. Show Failure DNA extraction
4. Show generated prevention artifacts
5. Show Blast Radius Simulator
6. Show Failure Forecast
7. Open the Dashboard and explain operational debt
8. Show how a GitHub PR can be created from generated prevention work

## What Makes This Different

Most incident tools are dashboards or documentation systems.

IncidentBrain is different because it combines:

- incident intelligence
- prevention artifact generation
- cloud blast radius simulation
- recurrence forecasting
- operational debt tracking

That makes it a stronger cloud reliability platform rather than a simple incident viewer.

## Local Development

### Prerequisites

- Node.js 18+
- npm

### Setup

```bash
git clone <your-repo-url>
cd incidentbrain
npm install
```

### Backend

```bash
cd backend
npm run dev
```

Backend runs on:

```text
http://localhost:3001
```

### Frontend

```bash
cd frontend
npm run dev
```

Frontend runs on:

```text
http://localhost:5173
```

## Environment Variables

Use the values in [.env.example](C:/Users/Sharath/Desktop/IncidentBrain/incidentbrain/.env.example) as a template.

Typical variables:

- `OPENAI_API_KEY`
- `GITHUB_DEFAULT_REPO`
- `PORT`
- `NODE_ENV`
- `VITE_API_BASE_URL` for cloud frontend deployment

## Cloud Deployment Plan

### Frontend

- Deploy to Vercel
- Set `VITE_API_BASE_URL` to the backend API URL

### Backend

- Deploy to Render
- Set environment variables in the Render dashboard

### Recommended Upgrade

For production-like cloud usage, migrate from SQLite to managed Postgres.

## Future Improvements

- managed Postgres deployment
- deeper service dependency graph
- incident response execution plans
- policy-as-code compliance checks
- team ownership mapping
- Slack / PagerDuty integration

## One-Line Pitch

**IncidentBrain Advanced is an AI-powered cloud resilience platform that transforms postmortems into prevention artifacts, blast radius simulations, recurrence forecasts, and actionable reliability intelligence.**

## Team Presentation Summary



> IncidentBrain helps engineering teams move from reactive postmortem writing to proactive cloud resilience. It analyzes incidents, predicts recurrence, simulates blast radius, and generates the technical changes needed to prevent future outages.
