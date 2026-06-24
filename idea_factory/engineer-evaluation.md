# Engineer — Technical Evaluation (Full)

**Evaluator:** Senior Staff Engineer
**Date:** 2026-06-23
**Scoring Note:** All criteria scored 1-10 where **1 = best** and **10 = worst**. Lower overall scores indicate easier technical builds.

---

## IDEA 1: SeasonStaff (#1)

### Criteria Scores

| # | Criterion | Score | Rationale |
|---|-----------|-------|-----------|
| 1 | Build Time to MVP | 5/10 | 6–8 weeks to ship. Core CRUD + scheduling engine + Stripe payout + Twilio SMS. Scheduling conflict resolution adds meaningful complexity. |
| 2 | Technical Complexity | 5/10 | Moderate. Scheduling algorithms are the hardest part. Payment splitting with Stripe Connect is well-documented. Nothing novel. |
| 3 | Infrastructure Cost | 3/10 | Cheap. One Postgres DB, Node.js app on a $10-20/mo VPS. Twilio SMS ~$0.0075/msg. At 500 venues, infra stays under $200/mo. |
| 4 | 3rd-Party Risk | 4/10 | Medium. Stripe and Twilio are reliable but essential. If Twilio blocks the account (unusual SMS patterns), it breaks the core flow. |
| 5 | Data Security | 5/10 | Moderate. Worker PII (SSNs, bank accounts), venue business data. PCI scope minimized by Stripe Connect. No HIPAA/GDPR unless international. |
| 6 | Team Size | 3/10 | 1 full-stack dev can build MVP in 6-8 weeks. Maintenance needs 1 part-time backend dev. No ML engineer needed. |
| 7 | Code Quality Risk | 4/10 | Medium. Scheduling concurrency bugs (two workers claiming same shift) are the main defect risk. Stripe webhook idempotency is a known gotcha. |

**Overall Technical Score: 4.3/10** (Low-Medium difficulty)

**Build Timeline (MVP):**
- **Week 1-2:** Auth, venue onboarding, worker profiles, basic scheduling (create shifts, view assignments)
- **Week 3-4:** Worker matching (availability profiles, apply for shifts), SMS notifications (Twilio)
- **Week 5-6:** Shift-swap functionality, pay tracking (hourly logs), Stripe Connect integration
- **Week 7-8:** Admin dashboard, reporting, QA, seed with 2-3 pilot venues

**Key Technical Risks:**
- Scheduling concurrency (double-booking fixes needed)
- Stripe Connect webhook handling for wage payouts
- Twilio SMS delivery failures for shift alerts
- Timezone handling across venues (some are multi-state)

**Technical Moats:**
- Industry-specific scheduling logic (age-restricted workers, shift patterns specific to haunted house seasons)
- Historical data on which workers are best for which venue types
- Domain knowledge embedded in the matching algorithm

**Recommended Stack:**
- **Frontend:** Next.js (App Router) + Tailwind + shadcn/ui
- **Backend:** Node.js + Express (or Next.js API routes)
- **Database:** PostgreSQL (via Supabase or Neon)
- **Auth:** Supabase Auth or Clerk
- **Payments:** Stripe Connect (for marketplace payouts)
- **SMS:** Twilio
- **Hosting:** Vercel + Supabase
- **Mobile:** React Native wrapper (for worker app)

**Verdict:** Straightforward to build. The scheduling logic and marketplace dynamics are the real challenges, but both are well-documented patterns. A competent solo dev can ship this in 8 weeks. **Build it, but design the tech to handle seasonal load spikes (Aug-Oct usage 5-10x normal).**

---

## IDEA 2: ShelfSight AI (#2)

### Criteria Scores

| # | Criterion | Score | Rationale |
|---|-----------|-------|-----------|
| 1 | Build Time to MVP | 8/10 | 16-20+ weeks minimum. CV model training is the critical path and is inherently unpredictable. UI/API can be built in 6-8 weeks, but the product is meaningless without the model. |
| 2 | Technical Complexity | 8/10 | High. Object detection fine-tuning, shelf-specific models, lighting variability, occlusion handling. This is a real CV research problem, not a standard API call. |
| 3 | Infrastructure Cost | 7/10 | Expensive at scale. GPU instances for model inference ($50-500/mo per model), data storage for shelf images, API costs for labeling. At 500 locations, cloud costs hit $1K-3K/mo easily. |
| 4 | 3rd-Party Risk | 5/10 | Medium-High. Depends on cloud GPU providers (AWS/GCP), potentially on camera hardware compatibility, and on the retailer's willingness to install cameras. |
| 5 | Data Security | 4/10 | Low-Moderate. Shelf images are not PII, but retailer inventory data is business-sensitive. Basic encryption needed. No regulated data. |
| 6 | Team Size | 8/10 | Needs an ML/CV engineer as a minimum. 1 full-stack + 1 CV engineer for MVP. After MVP, ongoing model training means keeping the ML person. |
| 7 | Code Quality Risk | 7/10 | High. CV models have probabilistic behavior. A model that works on test images but fails in production is the nightmare scenario. Hard to unit-test. |

**Overall Technical Score: 7.0/10** (High difficulty)

**Build Timeline (MVP):**
- **Week 1-4:** Data collection. Photograph shelves at 10-20 pilot stores. Label ground truth (out-of-stock items, misplaced items, mispriced items).
- **Week 5-8:** Model training. Fine-tune YOLOv8 or similar on labeled data. Target: 70%+ precision on test set.
- **Week 9-12:** Integration. Build API that accepts a shelf image → returns detection results. Build retailer dashboard.
- **Week 13-16:** Refinement. Improve model to 85%+ precision. Add alert system. Test at pilot stores.
- **Week 17-20:** Production hardening. Error handling, confidence thresholds, false-positive reduction.

**Key Technical Risks:**
- **CV model never reaches acceptable precision** — the single existential risk. An 85% model means 1 in 7 alerts is false; store owners ignore it in a week.
- **Lighting variability** — a hardware store at 7am vs 3pm looks completely different
- **Occlusion** — products behind other products, damaged packaging, non-standard shelf layouts
- **Model drift** — product packaging changes, seasonal items appear, the model degrades over time

**Technical Moats:**
- **Data network effects** — each retailer's shelf data makes the model better for all retailers
- **Specialized training data** — a database of shelf images by product category, lighting, shelf type
- **Confidence calibration** — knowing when the model is uncertain is as important as knowing what it detects

**Recommended Stack:**
- **Frontend:** Next.js (retailer dashboard, mobile app via React Native for photo capture)
- **Backend:** FastAPI (Python) — best ecosystem for CV/model serving
- **Database:** PostgreSQL + pgvector (for similarity search)
- **Model:** YOLOv8 or similar fine-tuned object detection model
- **GPU:** AWS SageMaker / RunPod / Lambda Labs for training and inference
- **Storage:** S3 for shelf images, Postgres for metadata
- **Mobile:** React Native (end-of-day photo capture from phone camera)
- **Hosting:** Vercel (frontend) + AWS (backend + model)

**Verdict:** This is the highest-risk, highest-reward idea. If the CV model reaches 90%+ precision, you have a defensible, venture-scale business. If it doesn't, the entire product fails. **Only build this if you have access to a CV engineer or Garret can upskill significantly in this area.** Not recommended as the first product — build something else first, use that revenue to fund ShelfSight R&D.

---

## IDEA 3: BidSnap (#3)

### Criteria Scores

| # | Criterion | Score | Rationale |
|---|-----------|-------|-----------|
| 1 | Build Time to MVP | 5/10 | 6-8 weeks to ship. Photo upload → AI analysis → PDF generation. The AI pipeline is the critical path. |
| 2 | Technical Complexity | 5/10 | Moderate. OpenAI Vision / Claude for image analysis returns structured JSON. PDF generation is well-solved. E-sign is a standard integration. The hard part is getting the AI to output accurate estimates. |
| 3 | Infrastructure Cost | 3/10 | Cheap. Next.js on Vercel + Supabase. Claude API ~$0.03/1K input tokens. At 1,000 contractors submitting 20 proposals/month, API costs are ~$200/mo. Total infra under $100/mo at 500 customers. |
| 4 | 3rd-Party Risk | 4/10 | Medium. Depends on Claude/OpenAI for AI analysis. If pricing doubles, costs grow but can be passed to customers. If API rate-limits, queue requests. |
| 5 | Data Security | 5/10 | Moderate. Contractor business data, client contact info, proposal documents. Standard business data protections needed. No regulated data. GDPR if serving EU. |
| 6 | Team Size | 3/10 | 1 full-stack dev can build MVP. 1 backend dev for the AI pipeline. No ML specialist needed — using off-the-shelf vision models. |
| 7 | Code Quality Risk | 4/10 | Medium. PDF generation edge cases, AI hallucination (plausible but wrong estimates), e-sign integration bugs. All solvable with testing. |

**Overall Technical Score: 4.5/10** (Low-Medium difficulty)

**Build Timeline (MVP):**
- **Week 1-2:** Auth (contractor accounts), photo upload (camera + file), basic dashboard
- **Week 3-4:** AI pipeline. Claude/Vision integration, structured JSON parsing, item extraction from photos
- **Week 5-6:** Proposal generation. Template engine, PDF output, contractor customization (pricing rules, branding)
- **Week 7-8:** Client flow (share link, view, accept/reject), notifications, Stripe integration. Launch with 3-5 pilot contractors.

**Key Technical Risks:**
- **AI hallucination on pricing** — generates plausible but incorrect line items. Mitigated by human-in-the-loop design.
- **PDF generation edge cases** — long proposals, images, formatting across different templates
- **AI model updates breaking output** — OpenAI/Claude can change JSON structure in API updates
- **E-sign compliance** — if using a third-party, ensuring legal validity across states

**Technical Moats:**
- **Training data** — contractor photos with accepted proposals create a feedback loop for improving AI
- **Template ecosystem** — contractors build their own templates, making the platform sticky
- **Job history database** — past proposals + outcomes become a powerful training signal

**Recommended Stack:**
- **Frontend:** Next.js (App Router) + Tailwind + shadcn/ui
- **Backend:** Next.js API Routes (or FastAPI if going Python-heavy later)
- **Database:** PostgreSQL (Supabase or Neon)
- **Auth:** Supabase Auth or Clerk
- **AI:** Claude 3.5 Sonnet (better structured JSON output than GPT-4o for this use case)
- **PDF:** @react-pdf/renderer (React-based PDF generation) or Puppeteer
- **E-Sign:** DocuSign API (enterprise) or custom e-sign flow (simpler, legal enough)
- **Payments:** Stripe (subscriptions, invoicing)
- **Notifications:** Resend (email) + Twilio (SMS)
- **Hosting:** Vercel (frontend/API) + Supabase (DB/auth/storage)
- **Total Monthly Cost:** ~$50/mo at 100 customers (free tier covers most)

**Verdict:** Well within reach for a solo dev. The AI layer is the only wildcard, but human-in-the-loop design (AI suggests, contractor reviews, contractor sends) contains all risk. **Strong "build it" recommendation. Can ship a working MVP in 6-8 weeks.**

---

## IDEA 4: EscapeFlow (#4)

### Criteria Scores

| # | Criterion | Score | Rationale |
|---|-----------|-------|-----------|
| 1 | Build Time to MVP | 6/10 | 8-10 weeks. Core booking + game management + clue delivery. The flexible game schema is the hard part — every escape room has different mechanics. |
| 2 | Technical Complexity | 6/10 | Moderate-High. Real-time WebSocket for clue delivery, flexible game data model, booking conflict resolution. Nothing unprecedented but the flexibility adds complexity. |
| 3 | Infrastructure Cost | 4/10 | Moderate. Postgres + Node.js + WebSocket connections. At 50 venues with concurrent guests, need good WebSocket scaling. Cloud costs ~$200-500/mo at scale. |
| 4 | 3rd-Party Risk | 4/10 | Medium. Twilio for SMS, Stripe for payments. WebSocket hosting needs care (Vercel doesn't support persistent WebSocket connections natively). |
| 5 | Data Security | 3/10 | Low. Customer names and contact info. Minimal PII. No regulated data. |
| 6 | Team Size | 4/10 | 1 full-stack dev can build MVP, but the game schema design and WebSocket system need careful planning. A second dev helps with the game management UI. |
| 7 | Code Quality Risk | 5/10 | Medium-High. WebSocket reliability during active games (crash = frustrated customers), booking conflicts, game versioning (old puzzles still work after updates). |

**Overall Technical Score: 4.8/10** (Moderate difficulty)

**Build Timeline (MVP):**
- **Week 1-2:** Foundation. User roles (admin, staff, customer), game data model for ONE game type (linear, 5-7 puzzles)
- **Week 3-4:** Booking engine. Time slots, simultaneous starts, walk-in vs reservation, confirmations
- **Week 5-6:** Game management. Puzzle list, clue structure, staff assignment per game
- **Week 7-8:** Clue delivery via WebSocket + customer-facing booking page. Pilot with 1-2 escape rooms.

**Key Technical Risks:**
- **Flexible game schema** — the need to support diverse game mechanics is the hardest design problem
- **WebSocket reliability** — if a game-master clue delivery system crashes mid-game, customers are frustrated
- **Booking conflicts** — overlapping start times, double-bookings, duration calculations
- **Game versioning** — old puzzles must still work after updates

**Technical Moats:**
- **Game schema library** — building configs for different game mechanics becomes valuable
- **Customer booking data** — peak times, popular games, conversion rates
- **Staff scheduling patterns** — which game-masters work which games

**Recommended Stack:**
- **Frontend:** React (or Next.js) for admin UI; customer-facing site can be separate Next.js app
- **Backend:** Node.js + Express (WebSocket support is better than Next.js API routes)
- **Database:** MongoDB (flexible schema for game configs) or Postgres + JSONB
- **WebSocket:** Socket.io or ws library
- **Auth:** Supabase Auth
- **Payments:** Stripe
- **SMS:** Twilio
- **Hosting:** Railway or Fly.io (for persistent WebSocket connections)

**Verdict:** Doable but the game schema flexibility trap is real. Every escape room operator will want different mechanics. **Build it only if you commit to supporting ONE game type initially and resist customization requests. Scope creep is the project-killer here.**

---

## IDEA 5: LocalLoop (#5)

### Criteria Scores

| # | Criterion | Score | Rationale |
|---|-----------|-------|-----------|
| 1 | Build Time to MVP | 4/10 | 6-8 weeks. Core CRUD, search, maps integration, content management. Standard web app work. |
| 2 | Technical Complexity | 4/10 | Low-Moderate. Directory/search, maps, events, reviews — all well-solved problems. No novel tech required. |
| 3 | Infrastructure Cost | 2/10 | Very cheap. Standard web app on a VPS. Google Maps API has free tier ($200/mo credits). Supabase free tier handles early traffic. |
| 4 | 3rd-Party Risk | 4/10 | Medium. Google Maps API pricing changes. Social auth providers. But all are well-documented and reliable. |
| 5 | Data Security | 3/10 | Low. Basic user data (names, emails). Business listing data. No payment processing at MVP. |
| 6 | Team Size | 3/10 | 1 full-stack dev can build MVP. Content onboarding is the bottleneck, not code. |
| 7 | Code Quality Risk | 2/10 | Low. CRUD app with search and maps. Minimal defect surface area. Easy to test. |

**Overall Technical Score: 5.0/10** (Moderate difficulty)

**Build Timeline (MVP):**
- **Week 1-2:** Foundation. Next.js, Supabase, auth, business listing creation flow
- **Week 3-4:** Business directory. Search, filter by category, business profiles, Google Maps integration
- **Week 5-6:** Events calendar, reviews, resident accounts. Admin dashboard for content moderation.
- **Week 7-8:** Polish, responsive design, seed with manual business data. Launch in Olde Town Conyers only.

**Key Technical Risks:**
- **Google Maps API pricing** — can get expensive with high traffic. Implement caching.
- **Content freshness** — listings go stale. Need automated or manual refresh mechanisms.
- **Search quality** — relevance ranking matters. Simple keyword search won't cut it long-term.
- **Mobile experience** — residents browse on phones; mobile UX is critical.

**Technical Moats:**
- **Curated local data** — manual curation of businesses is hard to replicate (unlike Yelp, which is automated)
- **Chamber of Commerce partnership** — exclusive access to local business data
- **Hyperlocal content** — events, community resources, seasonal information specific to Conyers

**Recommended Stack:**
- **Frontend:** Next.js (App Router) + Tailwind + shadcn/ui
- **Backend:** Next.js API Routes + Supabase (Postgres)
- **Maps:** Google Maps JavaScript API + Places API
- **Auth:** Supabase Auth (email + Google login)
- **Search:** Postgres full-text search (supabase.ai)
- **Hosting:** Vercel (free tier) + Supabase (free tier)
- **Total Monthly Cost:** ~$0-30/mo (Google Maps free tier covers early traffic)

**Verdict:** Technically trivial — a senior dev could build this in 4 weeks. **The hard part is operational (getting 50+ businesses listed before launch). Build it if the Chamber will commit to the launch campaign.**

---

## IDEA 6: GrantPilot (#6)

### Criteria Scores

| # | Criterion | Score | Rationale |
|---|-----------|-------|-----------|
| 1 | Build Time to MVP | 7/10 | 8-12 weeks. Grant database + matching engine + AI auto-fill. The matching logic is complex and the AI integration adds risk. |
| 2 | Technical Complexity | 7/10 | High-Moderate. Web scraping for grants, vector-based matching, AI text generation, structured document parsing. Multiple AI integration points. |
| 3 | Infrastructure Cost | 4/10 | Moderate. Supabase + Claude API. At scale, AI costs per application could be significant. $0.15/1K output tokens × 5K tokens per application × 1,000 apps = $750/mo. |
| 4 | 3rd-Party Risk | 6/10 | High. Heavy dependence on AI APIs. If OpenAI/Claude pricing doubles or API changes, costs and behavior shift. Grant databases may have anti-scraping measures. |
| 5 | Data Security | 6/10 | Moderate-High. Financial data, tax info, business registration data. GDPR implications if serving EU. Basic business data protection needed. |
| 6 | Team Size | 5/10 | 1 full-stack dev + 1 backend dev for AI pipeline. Need someone who understands grant applications to validate AI output. |
| 7 | Code Quality Risk | 6/10 | Medium-High. AI hallucination (wrong grant eligibility), parsing errors (grant form structures change), web scraping fragility (grant sites change layout). |

**Overall Technical Score: 5.5/10** (Moderate-High difficulty)

**Build Timeline (MVP):**
- **Week 1-2:** Foundation. User accounts, business profile creation, grant database schema
- **Week 3-5:** Grant discovery. Web scraping / API integrations, categorization, keyword search
- **Week 6-8:** Matching engine. Business profile → grant matching, qualification scoring, ranked recommendations
- **Week 9-12:** AI auto-fill. Application form parsing, AI text generation, structured output review. Launch with 5-10 small businesses.

**Key Technical Risks:**
- **AI hallucination** — the model might generate plausible but incorrect application content or claim eligibility the business doesn't have
- **Grant database freshness** — grants open and close constantly. Scraping needs to be automated and monitored.
- **Form structure variability** — every grant has different form fields. Parsing and auto-filling is non-trivial.
- **Legal liability** — if AI gives wrong information and the business faces fraud liability

**Technical Moats:**
- **Grant database** — a continuously updated database of grants with categories, eligibility, deadlines
- **Matching algorithm** — business profile → grant match quality improves with more data
- **AI fine-tuning** — grant-specific training data makes the AI better over time

**Recommended Stack:**
- **Frontend:** Next.js + Tailwind (business profile management, grant search, application builder)
- **Backend:** FastAPI (Python) for AI integration and matching logic
- **Database:** PostgreSQL (business profiles, grants) + pgvector (semantic matching)
- **AI:** Claude 3.5 Sonnet (better at structured document generation)
- **Web Scraping:** Playwright or BeautifulSoup for grant databases
- **Search:** Postgres full-text + pgvector for hybrid search
- **Hosting:** Vercel (frontend) + Railway/AWS (backend)

**Verdict:** Doable but the AI layer introduces real uncertainty. Grant applications are high-stakes — wrong answers have real consequences. **Build it with strict disclaimers and human-in-the-loop design. The matching algorithm is the real moat, not the AI generation.**

---

## IDEA 7: PulseCheck (#7)

### Criteria Scores

| # | Criterion | Score | Rationale |
|---|-----------|-------|-----------|
| 1 | Build Time to MVP | 2/10 | 4-6 weeks. Straightforward CRUD: checklists, assignments, completion tracking, reports. Role-based access is the only complexity. |
| 2 | Technical Complexity | 2/10 | Low. Standard web app patterns. Checklist → items → completions. No ML, no real-time systems, no complex integrations. |
| 3 | Infrastructure Cost | 2/10 | Cheap. Postgres + Node.js on a VPS. At 100 venues, total infra ~$50/mo. |
| 4 | 3rd-Party Risk | 2/10 | Low. Optional SMS/email notifications. Core product works without any external services. |
| 5 | Data Security | 3/10 | Low. Business compliance data, worker names. No regulated data. Basic encryption needed. |
| 6 | Team Size | 2/10 | 1 full-stack dev can build MVP in 4-6 weeks. Maintenance needs minimal effort. |
| 7 | Code Quality Risk | 2/10 | Low. CRUD app with role-based access. Easy to test, easy to debug. Minimal defect surface area. |

**Overall Technical Score: 3.0/10** (Low difficulty)

**Build Timeline (MVP):**
- **Week 1-2:** Auth with role-based access (admin, manager, worker), venue setup, profile management
- **Week 3-4:** Checklist creation and management (templates, categories, items, photo attachments)
- **Week 5-6:** Checklist execution (worker interface, offline support, photo capture), completion tracking, reports. Deploy with Netherworld as pilot.

**Key Technical Risks:**
- **Offline mode** — workers may need to complete checklists without WiFi. Need offline-first design.
- **Photo uploads** — require efficient compression before upload to avoid slow connections.
- **Versioning** — checklists change seasonally. Need proper versioning to maintain historical audit trail.

**Technical Moats:**
- **Industry-specific checklist templates** — once you have a library of verified safety checklists for haunted houses, this becomes valuable
- **Seasonal pattern recognition** — historical compliance data shows which venues have issues year over year
- **Regulatory alignment** — tracking changes in Georgia safety regulations and mapping to checklists

**Recommended Stack:**
- **Frontend:** Next.js (App Router) + Tailwind + shadcn/ui
- **Backend:** Next.js API Routes or Express
- **Database:** PostgreSQL (Supabase or Neon)
- **Auth:** Supabase Auth (roles: admin, manager, worker)
- **Storage:** Supabase Storage (checklist photos, reports)
- **Notifications:** Resend (email), Twilio (SMS) for reminders
- **Mobile:** PWA (Progressive Web App) for offline support
- **Hosting:** Vercel + Supabase (both have generous free tiers)
- **Total Monthly Cost:** ~$0-20/mo at scale (free tiers cover most)

**Verdict:** The easiest product to build technically. A solo dev can ship this in 4-6 weeks. **Strong recommendation as a beachhead product — proves the team can deliver, generates early revenue, and builds domain knowledge for larger products like BidSnap or PulseCheck.**

---

## TECHNICAL RANKINGS TABLE

| Rank | Idea | Overall Score | Build Time | Team Size | Infra Cost | Verdict |
|------|------|--------------|------------|-----------|------------|---------|
| 1 | **PulseCheck (#7)** | **3.0/10** | 4-6 weeks | 1 dev | Low | Build immediately |
| 2 | **SeasonStaff (#1)** | **4.3/10** | 6-8 weeks | 1 dev | Low | Solid, but seasonal churn |
| 3 | **BidSnap (#3)** | **4.5/10** | 6-8 weeks | 1-2 devs | Low | **Best balance of ease + upside** |
| 4 | **EscapeFlow (#4)** | **4.8/10** | 8-10 weeks | 2 devs | Moderate | Doable, scope creep risk |
| 5 | **LocalLoop (#5)** | **5.0/10** | 6-8 weeks | 1 dev | Low | Technically easy, operationally hard |
| 6 | **GrantPilot (#6)** | **5.5/10** | 8-12 weeks | 2 devs | Moderate | AI risk, but manageable |
| 7 | **ShelfSight AI (#2)** | **7.0/10** | 16-20+ weeks | 2+ devs | High | Highest risk, highest reward |

---

*Technical evaluation complete. All 7 ideas scored and ranked by buildability. Recommendations reflect technical risk assessment only — business viability is evaluated separately.*
