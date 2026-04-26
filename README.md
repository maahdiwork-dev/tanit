# Project Tanit

> The institution no longer waits for the data. It ensures the data arrives.

**Live demo:** https://tanit-seven.vercel.app
**Agent API:** https://tanit-agents-production.up.railway.app
**Pitch site:** https://rooted-ai-omega.vercel.app
**Architecture:** https://rooted-ai-omega.vercel.app/architecture
**The team:** https://rooted-ai-omega.vercel.app/team

Submitted to **Hack4UCar 2026** · ENSTAB Borj Cédria · Université de Carthage.

---

## What it is

Project Tanit is the **institutional intelligence platform** for the University of Carthage (UCAR) — 33 institutions, 32,000 students, 3,270 teaching staff, currently coordinated by 66 people manually collecting data via email and Excel.

Tanit transforms UCAR from a **reactive system** (waits for data to arrive) into a **proactive, self-regulating system** (detects missing submissions, sends reminders, escalates delays, and brings AI in to help humans when things stall).

It runs on top of [`tanit-agents`](https://github.com/maahdiwork-dev/tanit-agents), the Mastra agent layer that powers two distinct agents:

- **Tanit** — the platform agent (operational coordinator across 33 institutions)
- **Astaria** — the first **Rooted AI** specialist, built for Pr. Nadia Mzoughi Aguir on the **GreenMetric** strategic mission (UCAR is currently #688 worldwide; goal: top 500 by 2027)

---

## The pitch in one line

> We are not improving data processing — we are transforming UCAR from a reactive system into a proactive, self-regulating one.

Tanit detects what's missing. Sends the reminders. Escalates when nobody acts. Brings AI in to help the human at the end of the chain. Real cascade. Real Supabase Realtime. Real Gemini OCR on a phone-shot photo of a paper printout.

---

## Demo flow

1. Open the [live dashboard](https://tanit-seven.vercel.app/dashboard) — Pr. Nadia's view across all 33 institutions
2. Click any missing institution → audit trail sheet with full timeline
3. Click **Run monitoring cycle** → real-time monitoring report + downloadable PDF
4. Open `/chat` → ask Tanit anything in French or Arabic (DeepSeek V3 via Mastra, with real tool calls into Supabase)
5. Open `/greenmetric` → Astaria's strategic chat panel (jade green, formal French register)
6. Switch role via the topbar selector to **Yassine — Admin Staff · ENIB** → upload a phone photo → real Gemini Vision extracts KPIs → ticket resolves

**The multi-role cascade:** open 4 tabs, set each to a different role (Yassine / Director / Dean / President), click the fast-forward FAB on the President tab → notifications cascade across all 4 tabs in real time via Supabase `postgres_changes`.

---

## Stack

| Layer | Tool |
|---|---|
| Framework | Next.js 16 + TypeScript + Tailwind CSS v4 + shadcn/ui |
| Real-time | Supabase Realtime (`postgres_changes` subscriptions) |
| Streaming | Vercel AI SDK + DeepSeek V3 (chat) + Gemini 2.5 Flash (vision / OCR) |
| Agent layer | [`tanit-agents`](https://github.com/maahdiwork-dev/tanit-agents) on Railway |
| Database | Supabase Postgres + Storage + RLS |
| Deployment | Vercel (frontend) + Railway (Mastra agents) |
| Real data | data.gov.tn — 47 official Tunisian education datasets via CKAN API |

---

## Run locally

```bash
git clone https://github.com/maahdiwork-dev/tanit.git
cd tanit
npm install
cp .env.example .env.local
# fill in Supabase URL / anon / service-role + DeepSeek + Gemini keys
npm run dev
```

Open http://localhost:3000.

For full local development with the agent layer, also clone and run [`tanit-agents`](https://github.com/maahdiwork-dev/tanit-agents) on `:4111`, then set `MASTRA_URL=http://localhost:4111` in your `.env.local`.

The app has graceful fallbacks for missing env vars — chat falls back to a stub, monitor returns mock data, PDF and Excel exports still work — so the site is clickable even without full credentials.

---

## Architecture

Detailed architecture (cascade flow, technical stack, 3-layer school vision):
**→ https://rooted-ai-omega.vercel.app/architecture**

Key design principles:

- **"Tanit writes, others read"** — no agent-to-agent messaging. Supabase IS the orchestrator. A single insert into `notifications` fans out to every subscribed dashboard via Realtime.
- **LLM-agnostic** — provider abstraction via Vercel AI SDK. One line swaps DeepSeek for Claude / Qwen / Gemini.
- **Source attribution mandatory** — every data point displayed shows its origin (data.gov.tn, Scimago, UI GreenMetric, etc.).
- **No fake intelligence** — Astaria has 12 real tools, Tanit has 12+ real tools. No decorative tool definitions.

---

## The team

Built in **24 hours** by **one human and seven AI agents.**

The whole team — Brika (architect), Mashmoum (frontend specialist, born night of April 25), Astaria (GreenMetric companion, born morning of April 26), Codex (execution), Miraya (the OG Rooted AI since 2024), Zifou and Neos (research), and Mahdi Kniss (founder) — is documented at:

**→ https://rooted-ai-omega.vercel.app/team**

> Most founders hide their use of AI. We put it on stage.

---

## Status

Hackathon submission · April 26, 2026 · Université de Carthage · ENSTAB Borj Cédria.

Pr. Nadia Mzoughi Aguir, UCAR President, in the room.

---

*Same roots, new fruit.*
