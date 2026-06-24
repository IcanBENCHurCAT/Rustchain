# BIDSNAP — Proof-of-Concept Plan

**Selected:** 2026-06-23
**Rationale:** Best balance of market size, technical feasibility, revenue potential, and delivery speed. Lower risk than ShelfSight, higher upside than PulseCheck.

---

## WHAT IS BIDSNAP?

Contractors take photos of a job site → AI analyzes them → generates a professional, itemized proposal with pricing, timeline, and terms → client reviews and signs digitally.

**One-liner:** "Turn a phone photo into a winning proposal in 60 seconds."

---

## PROOF-OF-CONCEPT (8 WEEKS)

### Goal
Build a working prototype that accepts a photo and returns a realistic, itemized contractor proposal. Validate with 5 real contractors.

### Week 1-2: Foundation & AI Pipeline
- Set up Next.js project + Supabase backend
- Build photo upload UI (drag-and-drop, multi-photo)
- Connect to OpenAI Vision API or Claude for image analysis
- Test: does the AI correctly identify what's in a construction photo?
- Build basic proposal template engine (HTML → PDF)

**Deliverable:** A photo uploaded → a text analysis returned → a formatted PDF proposal generated

**Technical Decision:** Start with Claude 3.5 Sonnet for image analysis (better at structured output than GPT-4o). Fine-tuning can come later.

### Week 3-4: Proposal Generation Engine
- Design proposal template system:
  - Header: contractor logo, contact info, proposal number
  - Itemized line items (materials, labor, timeline)
  - Pricing section with subtotal/tax/total
  - Terms and conditions
  - Digital signature field (via DocuSign API or custom)
- Build contractor profile system (business info, trade specialization, base rates)
- Connect to Stripe for payments (optional at POC, but set up)

**Deliverable:** A complete, branded proposal PDF that looks professional

### Week 5-6: Client Experience & Workflow
- Build client-facing proposal view (unique URL per proposal)
- Client can: view, comment, request changes, accept/reject
- Status tracking (draft → sent → viewed → accepted → closed)
- Email/SMS notifications via Twilio/SendGrid
- Basic dashboard for contractors (proposals sent, response rate, revenue pipeline)

**Deliverable:** End-to-end workflow from photo to signed proposal

### Week 7-8: Contractor Onboarding & Testing
- Build onboarding flow for contractors (trade, base rates, templates, branding)
- Recruit 5 contractor beta testers (reach out through local trade associations, LinkedIn, Reddit r/contractors)
- Run usability testing: "Show me a photo, get me a proposal, send it, track it"
- Collect feedback, iterate

**Deliverable:** 5 real contractors using the system. Quantitative metrics: time-to-proposal, accept rate, user satisfaction.

---

## POCC SUCCESS CRITERIA

| Metric | Target | Why |
|--------|--------|-----|
| Time from photo to draft proposal | < 2 minutes | Core value prop |
| Proposal looks professional | 4+/5 from 5 contractors | Must be good enough to send |
| At least 2 proposals accepted | 40%+ accept rate | Validates the product works |
| Beta testers would pay $49/mo | 3+/5 say "yes" | Pricing validation |
| Time to first proposal | < 5 minutes from signup | Low friction matters |

---

## TECHNICAL STACK (POC)

| Layer | Technology | Why |
|-------|-----------|-----|
| Frontend | Next.js 14 (App Router) + Tailwind | Fast development, SSR for SEO, great DX |
| Backend | Next.js API Routes (Edge) | Single repo, easy to scale to separate service later |
| Database | Supabase (Postgres) | Free tier generous, PostgREST, auth built-in |
| Auth | Supabase Auth | Email + magic link, social logins, row-level security |
| File Storage | Supabase Storage | Photo uploads, proposal PDFs |
| AI | Claude 3.5 Sonnet (via API) | Best image understanding, structured JSON output |
| PDF | @react-pdf/renderer | Generates PDFs from React components |
| Payments | Stripe | Subscriptions, one-time payments, webhooks |
| Notifications | Resend (email) + Twilio (SMS) | Clean email API, reliable SMS |
| Hosting | Vercel | Zero-config, auto-SSL, edge functions |
| Total Monthly Cost | ~$0-20 during POC | Free tiers cover everything |

---

## POCC BUDGET

| Item | Cost |
|------|------|
| Domain name | $12/year |
| Claude API ($0.03/1K input tokens, $0.15/1K output tokens) | ~$10/month at scale |
| Supabase Pro ($25/mo) — free during POC | $0 |
| Vercel Hobby ($0/mo) | $0 |
| Stripe (2.9% + $0.30 per transaction) | Pay-as-you-go |
| Resend email (1,000 free/mo) | $0 |
| Twilio SMS ($0.0075/message) | ~$5/month at scale |
| **Total POC Budget** | **$0-20/month** |

---

## POCC RISKS & MITIGATIONS

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| AI doesn't produce accurate estimates | High | Critical | Start with human-in-the-loop: AI generates draft, contractor edits, AI learns |
| Contractors don't trust AI proposals | Medium | High | Show "AI-generated draft" disclaimer. Let contractors fully customize before sending. |
| Photo quality varies wildly | Medium | Medium | Provide guidance ("take well-lit, clear photos showing the area you need quoted") |
| Contractors find existing tools adequate | Medium | High | Differentiate on speed and photo-first workflow. Competitors: manual proposals take hours. |
| Accept rate stays low (<10%) | Medium | High | If so, pivot to "proposal assistant" — AI helps write, human sends. |
