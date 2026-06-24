# Scrum Master -- Delivery Evaluation of 7 Web App Ideas

**Evaluator:** Senior Scrum Master (15+ years, 15+ teams managed)
**Date:** 2026-06-23
**Scoring Note:** All criteria scored 1-10 where **1 = easiest/best** and **10 = hardest/worst**. Lower overall scores indicate cleaner delivery paths.

---

## IDEA 1: SeasonStaff -- Seasonal Workforce Platform for Entertainment Venues

### Criteria Scores

| # | Criterion | Score | Rationale |
|---|-----------|-------|-----------|
| 1 | MVP Scope Clarity | 4 | MVP is fairly well-defined: venues post shifts, workers apply, basic scheduling. Ambiguity in age-verification workflows and multi-state compliance. |
| 2 | Feature Dependencies | 5 | Shift posting, worker profiles, and application flow can be built in parallel. Payroll processing via Stripe depends on payment integration finishing first. |
| 3 | Testing Complexity | 3 | Core CRUD with scheduling logic. Scheduling conflicts need manual edge-case testing, but most flows are straightforward. |
| 4 | Change Management Overhead | 3 | Requirements are relatively stable. The core workflow (post shift --> worker applies --> manage schedule) is well understood in the industry. Seasonal timing adjustments emerge post-launch. |
| 5 | Stakeholder Coordination | 7 | Two distinct user types: venue managers and seasonal workers. Each has different device usage patterns (desktop vs mobile) and different expectations. No formal approval chains, but both sides must be satisfied equally. |
| 6 | Team Sustainability Risk | 4 | Seasonal product -- high intensity for ~3 months (Aug-Oct) per year, quiet the rest. Team can ramp down or redeploy during off-season. No 24/7 operational load. |
| 7 | Risk Mitigation Clarity | 4 | Risks are well-identified: dual-sided marketplace chicken-and-egg, seasonal churn, age-verification compliance. Each has a known mitigation path. |

**Overall Delivery Score: 4.6/10** (lower = easier)

### Sprint Plan

| Sprint | Focus | Deliverable |
|--------|-------|-------------|
| Sprint 1 | Foundation | User auth (venue admin / worker roles), profile setup, venue onboarding flow |
| Sprint 2 | Shift Management | Shift posting, edit, status lifecycle (open --> filled --> closed) |
| Sprint 3 | Worker Matching | Availability profiles, application workflow, venue-to-worker matching UI |
| Sprint 4 | Communication | SMS notifications (Twilio) for shift confirmations, reminders, and alerts |
| Sprint 5 | Payroll Basics | Stripe Connect integration, hourly wage tracking, payment history dashboard |
| Sprint 6 | Polish & Launch | Admin dashboard, basic reporting, QA pass, seed with 2-3 pilot venues |

### Biggest Delivery Risk

**The chicken-and-egg problem:** A two-sided marketplace requires both sides present from day one, but you cannot attract workers without venues and cannot attract venues without workers. A launch with 3 venues and 0 workers -- or 0 venues and 100 workers -- is worthless.

### Mitigation Strategy

- **Pre-seed supply:** Work with Garret's Netherworld connection to get 1-2 anchor venues onboarded before development completes. Provide free access in exchange for committing to a first season.
- **Manual matchmaking MVP:** Before building the automated matching engine, offer concierge matching. Garret or a team member manually connects venue needs with available workers using a simple spreadsheet interface. This proves value before the tech is built.
- **Geographic wedge:** Launch in Conyers/Atlanta metro only. Constrain geographic scope until the loop proves itself, then expand.

### Team Structure Suggestion

- 1 Full-Stack Developer (core platform)
- 1 Frontend Developer (worker mobile experience, responsive design)
- 1 Part-time QA / Tester (scheduling edge cases, SMS delivery verification)
- Garret serves as domain expert / product owner / first venue anchor

### Verdict

**Shippable in 10-12 weeks with a focused 2-developer team.** The scope is manageable and the domain is well-understood by the founding team.

---

## IDEA 2: ShelfSight AI -- Computer Vision Out-of-Stock Detection for Small Retailers

### Criteria Scores

| # | Criterion | Score | Rationale |
|---|-----------|-------|-----------|
| 1 | MVP Scope Clarity | 8 | CV accuracy varies enormously based on lighting, shelf type, camera angle, product packaging. "Good enough" is hard to define up front. Scope will expand as you iterate on what the model actually achieves. |
| 2 | Feature Dependencies | 6 | The CV model is the critical path -- everything blocks on it. UI can be built in parallel but the product is meaningless without model results. Model training needs labeled data, a separate workstream. |
| 3 | Testing Complexity | 7 | CV testing requires ground truth datasets (manually labeled shelf photos), statistical evaluation (precision, recall, F1), and extensive field testing across different store environments. |
| 4 | Change Management Overhead | 7 | The CV model's capabilities will dictate the product roadmap. If the model is great on some categories but poor on others, the product scope changes based on technical results. |
| 5 | Stakeholder Coordination | 6 | Two main groups: store owners (who need actionable alerts) and the CV team (who need labeling and feedback loops). Need multiple store environments for testing. |
| 6 | Team Sustainability Risk | 6 | CV projects require ongoing model training, retraining on new data, and accuracy monitoring post-launch. The model drifts and needs constant attention. |
| 7 | Risk Mitigation Clarity | 8 | Biggest risk is CV accuracy may never reach a level small retailers accept. This risk is unknowable until significant R&D is done. |

**Overall Delivery Score: 6.9/10** (moderate-high difficulty)

### Sprint Plan

| Sprint | Focus | Deliverable |
|--------|-------|-------------|
| Sprint 1 | Foundation + Data | Next.js skeleton, FastAPI backend, DB schema, camera feed ingestion, photo upload API, start building labeled dataset |
| Sprint 2 | CV Model -- Base | Integrate / fine-tune YOLO, achieve 70%+ precision on controlled test set, build labeling pipeline |
| Sprint 3 | CV Model -- Production | Improve to 85%+, add mispriced item detection, confidence scoring, alert generation engine |
| Sprint 4 | Dashboard & Alerts | Retailer dashboard, low-stock alerts via email/SMS, historical trend view |
| Sprint 5 | Mobile + Multi-Store | React Native app for end-of-day photo capture, multi-location support, per-store analytics |
| Sprint 6 | Polish & Pilot | QA on real store data, onboarding flow, prepare for pilot with 2-3 stores |
| Sprint 7 | Pilot & Iterate | Deploy to pilot stores, collect field data, iterate on model, fix critical bugs |

### Biggest Delivery Risk

**CV model accuracy may never reach production-quality levels** across the diverse range of shelf environments, lighting conditions, and product types that small retailers represent. An 85% precision model means 1 in 7 alerts is false -- store owners will ignore it within a week. The model might achieve 95% in controlled conditions but fall apart in a cluttered hardware store at 7am. This is a fundamental technical risk that could invalidate the entire product.

### Mitigation Strategy

- **Start narrow:** Begin with one product category (e.g., canned goods) and one store format. Achieve 95%+ on that narrow scope before expanding.
- **Hybrid approach:** Combine CV with simple QR/barcode scanning. Use CV as a supplement, not the primary detection mechanism.
- **Human-in-the-loop MVP:** Before building autonomous CV detection, build a tool where the worker takes a photo and gets AI-assisted suggestions that they confirm. Generates labeled data simultaneously.
- **Define an accuracy kill-switch:** Set a hard target of 90% precision before MVP. If the model doesn't hit it by Sprint 3, pivot to a different approach.

### Team Structure Suggestion

- 1 Computer Vision Engineer / ML Specialist (**critical hire**, or Garret needs to upskill significantly)
- 1 Full-Stack Developer (app, API, integrations)
- 1 Part-time Data Annotation Coordinator (building labeled datasets)
- Garret as domain expert and pilot store liaison

**This is not a two-person MVP team.** You need ML expertise, or the project stalls in Sprint 2.

### Verdict

**12-16 weeks to a usable MVP, but with a high risk of needing 4-6 additional sprints for the CV model to reach acceptable quality.** The technical complexity of computer vision is the dominant delivery constraint.

---

## IDEA 3: BidSnap -- Photo-to-Proposal for Contractors

### Criteria Scores

| # | Criterion | Score | Rationale |
|---|-----------|-------|-----------|
| 1 | MVP Scope Clarity | 5 | Core flow is clear: upload photo --> AI generates proposal --> client signs. Ambiguity in: what job types are in scope, how pricing is determined, and where the line is between AI assistance and full auto-generation. |
| 2 | Feature Dependencies | 5 | Photo upload and AI analysis block PDF generation and e-sign, but frontend can be styled in parallel. The AI pipeline is the critical path. |
| 3 | Testing Complexity | 6 | AI output evaluation is subjective. No unit test for "is this a good proposal?" Requires expert human evaluation. PDF and e-sign testing is straightforward once AI output is correct. |
| 4 | Change Management Overhead | 5 | Contractors will want custom pricing rules, branding, and template adjustments based on their specialization. Some scope creep expected as you learn what each trade needs. |
| 5 | Stakeholder Coordination | 3 | Primary user is the contractor. The client is a passive recipient (review and sign). Only one active stakeholder group. |
| 6 | Team Sustainability Risk | 3 | Simple operational model -- API calls per proposal. No real-time system, no 24/7 monitoring. Cost of goods scales predictably. |
| 7 | Risk Mitigation Clarity | 4 | Risks are known: AI hallucination on pricing, liability on underestimates, "garbage in, garbage out" on low-quality photos. All have mitigation paths. |

**Overall Delivery Score: 4.4/10** (clean delivery path)

### Sprint Plan

| Sprint | Focus | Deliverable |
|--------|-------|-------------|
| Sprint 1 | Foundation | User accounts, photo upload (camera + file), basic dashboard, project management interface |
| Sprint 2 | AI Analysis Pipeline | OpenAI Vision / Claude integration, structured output parsing, item extraction from photos |
| Sprint 3 | Pricing Engine | Contractor-defined pricing rules, category-based pricing tables, AI-suggested ranges with manual override |
| Sprint 4 | Proposal Generation | PDF generation, professional template, branding/customization, proposal versioning |
| Sprint 5 | E-Sign & Client Flow | DocuSign integration, client share link, client review/accept flow, notification system |
| Sprint 6 | Polish & Launch | Testing across job types, onboarding, launch with 3-5 pilot contractors, iterate on AI output |

### Biggest Delivery Risk

**AI hallucination on pricing** -- the model might generate plausible-looking but incorrect line items or pricing. A contractor who submits based on AI output that is 20% under cost loses money; one that is 20% over loses the bid. This directly threatens contractor trust and the business model.

### Mitigation Strategy

- **AI as assistant, not autopilot:** Design UX so AI suggests line items and prices, but the contractor reviews and edits everything before sending. Never auto-submit without confirmation.
- **Pricing anchors:** Let contractors define pricing structure (cost per sq ft, per fixture) and have AI apply these rules rather than generating prices from scratch.
- **Dry-run mode:** Always show a "preview" with a clear "AI-estimated -- review before sending" banner.
- **Specialize initially:** Start with one contractor type (e.g., kitchen/bath remodelers). Their work is well-standardized.

### Team Structure Suggestion

- 1 Full-Stack Developer (Next.js, PDF generation, e-sign integration)
- 1 Backend Developer (FastAPI, AI pipeline, pricing engine)
- Part-time QA (test AI output quality across job scenarios)
- Garret as domain expert -- 2-3 pilot contractors to get the workflow right

### Verdict

**Shippable in 8-10 weeks** -- narrow scope, well-understood tech stack, and Garret's domain expertise are huge advantages. The AI layer is the only wildcard, and a human-in-the-loop design keeps risk contained.

---

## IDEA 4: EscapeFlow -- Operations Platform for Escape Rooms & Interactive Entertainment

### Criteria Scores

| # | Criterion | Score | Rationale |
|---|-----------|-------|-----------|
| 1 | MVP Scope Clarity | 8 | Scope is too broad for an MVP: booking engine, game management, clue delivery, staff scheduling, puzzle versioning, customer analytics. Every operator has different game mechanics. |
| 2 | Feature Dependencies | 7 | Game schema design blocks everything. Booking, clue delivery, and staff scheduling cannot start until the game data model is defined. Flexible schema makes this heavy upfront investment. |
| 3 | Testing Complexity | 6 | Booking logic needs edge-case testing (double-bookings, overlapping start times). WebSocket clue delivery needs real-time testing. Game versioning needs testing old puzzles still work after updates. |
| 4 | Change Management Overhead | 8 | Hyper-vertical SaaS trap: every operator has different games, different mechanics, and will ask for custom features. Requirements will be highly volatile. |
| 5 | Stakeholder Coordination | 6 | Three user types: operators (owners), staff (game masters), customers (players). Each wants different things. Balancing all three is complex. |
| 6 | Team Sustainability Risk | 5 | Runs every day of the week. Peak times (weekends, holidays) mean a booking bug during Saturday night is an urgent crisis. |
| 7 | Risk Mitigation Clarity | 7 | Risks partially known: scope creep, customization trap. Harder mitigation because the market is small and there's no standard to benchmark against. |

**Overall Delivery Score: 6.7/10** (moderate-high difficulty)

### Sprint Plan

| Sprint | Focus | Deliverable |
|--------|-------|-------------|
| Sprint 1 | Foundation | User roles (admin, staff, customer), database schema for ONE game (simplified), basic booking for one game type |
| Sprint 2 | Booking Engine | Time-slot management, simultaneous game starts, walk-in vs. reservation handling, confirmation flow |
| Sprint 3 | Game Management | Game config UI, puzzle list, clue structure, staff assignment, game status dashboard |
| Sprint 4 | Clue System | WebSocket-based clue delivery (text-to-game-master), basic clue request interface |
| Sprint 5 | Staff Scheduling | Shift management, game-to-staff assignment, time-off requests |
| Sprint 6 | Polish & Pilot | Customer-facing booking page, analytics basics, deploy to 1-2 pilot escape rooms, fix critical bugs |

### Biggest Delivery Risk

**The hyper-vertical customization trap:** Escape rooms are diverse. Linear storylines, open exploration, physical props. Each operator immediately asks for features specific to their game. The temptation to customize per operator is the project-killer -- you build features for one room that don't apply to the next, and you never have a clean, standard product.

### Mitigation Strategy

- **Strict MVP discipline:** Build for ONE game type first (e.g., a standard "escape the room" linear game with 5-7 puzzles). Document what you explicitly don't build and commit to it.
- **Configurable, not customizable:** Build a config system for game mechanics (puzzle count, clue types, time limits) rather than letting operators define arbitrary structures. If a feature falls outside the config model, it is a no.
- **Start with 1-2 anchor operators:** Use Garret's D&D/TTRPG connections to find operators who play by your rules, not ones who want you to bend to theirs.
- **Pivot path:** If hyper-vertical is too constraining, the product can evolve into a general "interactive entertainment booking platform" -- but only after escape rooms prove the model.

### Team Structure Suggestion

- 1 Full-Stack Developer (Next.js, booking engine, game management)
- 1 Backend Developer (MongoDB, WebSocket clue delivery, staff scheduling)
- 1 Part-time UI/UX Designer (customer-facing booking experience is critical for conversion)
- Garret as domain expert, but actively guard against scope creep from his creative instincts

### Verdict

**12-16 weeks to a usable MVP with a disciplined team, but there is a moderate-high risk of scope creep extending this to 6-8 months if the customization trap is not actively managed.**

---

## IDEA 5: LocalLoop -- Community-Powered Local Discovery & Services Platform

### Criteria Scores

| # | Criterion | Score | Rationale |
|---|-----------|-------|-----------|
| 1 | MVP Scope Clarity | 7 | Four major feature areas (business discovery, services, events, community resources) are too much for an MVP. The positioning is aspirational but operationally vague. What exactly is the MVP? |
| 2 | Feature Dependencies | 6 | Business directory and map layer are the foundation -- everything builds on top. Events can parallelize, but without businesses listed, the events section is meaningless. |
| 3 | Testing Complexity | 5 | Functional testing is straightforward (CRUD, search, maps). The real testing is content quality -- are listings accurate and fresh? Requires ongoing curation, not automated tests. |
| 4 | Change Management Overhead | 6 | Product direction shifts based on what the Chamber of Commerce and local businesses ask for. They may want unplanned features. Community feedback is unpredictable. |
| 5 | Stakeholder Coordination | 8 | Four groups: residents who browse, businesses who pay for listings, service providers, and the Chamber of Commerce as administrator/gatekeeper. Each has different needs and expectations. |
| 6 | Team Sustainability Risk | 7 | Network-effect products require constant operational effort: adding businesses, verifying listings, managing content, responding to complaints. Not a "set and forget" product. |
| 7 | Risk Mitigation Clarity | 8 | Fundamental risk (critical mass of listings AND users) is well-known and well-documented. Mitigation path is clear but operationally hard. |

**Overall Delivery Score: 6.7/10** (moderate-high difficulty)

### Sprint Plan

| Sprint | Focus | Deliverable |
|--------|-------|-------------|
| Sprint 1 | Foundation | Next.js app, Supabase backend, user auth, business listing creation flow |
| Sprint 2 | Business Directory | Search, filter by category, business profiles with photos and descriptions, Google Maps API integration |
| Sprint 3 | Events | Event listing creation, calendar view, RSVP, push notifications |
| Sprint 4 | Service Providers | Service provider profiles, booking request flow, rating/review system |
| Sprint 5 | Community Resources | Local resources (school info, public services), community announcements |
| Sprint 6 | Admin & Launch | Chamber admin dashboard, content moderation, launch to Olde Town Conyers businesses first |

### Biggest Delivery Risk

**The network-effect chicken-and-egg problem:** Residents won't use the platform without businesses listed. Businesses won't pay without residents browsing. The Chamber of Commerce might agree to back it, but if they can't pre-seed 50+ real businesses with good data before launch, the platform feels empty and nobody returns.

This is an **operational** problem, not a technical one. You could build the entire platform in 4 weeks, but without 100 verified businesses listed on day one, you've wasted your time.

### Mitigation Strategy

- **Manual concierge onboarding first:** Before building self-service sign-up, personally call and visit 50+ local businesses to collect listing data. Build the database manually using scraped public data + phone calls.
- **Launch in a micro-geography:** Don't launch for all of Conyers. Launch for Olde Town Conyers only -- a single downtown block with 20-30 businesses. Tight, manageable wedge.
- **Chamber as distribution channel:** The Chamber's monthly newsletter, website, and member meetings are a built-in distribution channel. Negotiate a launch campaign before development completes.
- **Start as a directory, not a platform:** MVP is a beautiful local business directory with an events calendar. Drop the TaskRabbit-like service booking for V2. Solve discovery first; transactions come later.

### Team Structure Suggestion

- 1 Full-Stack Developer (Next.js, Supabase, maps integration)
- 1 Part-time Content/Operations Person (business onboarding, listing verification, Chamber coordination) -- **this role is critical**
- Part-time UI/UX Designer (the directory needs to look better than every other local listing)
- Garret as domain expert and Chamber relationship manager

### Verdict

**Technically shippable in 8-10 weeks, but operationally dependent on securing 50+ business listings and Chamber endorsement before launch -- and that operational dependency could delay launch by 4-8 weeks.**

---

## IDEA 6: GrantPilot -- AI Grant Application Assistant for Small Businesses

### Criteria Scores

| # | Criterion | Score | Rationale |
|---|-----------|-------|-----------|
| 1 | MVP Scope Clarity | 4 | Core flow is defined (search grants --> match --> auto-fill --> submit), but "match" is a complex concept. Qualification criteria are undefined and will change as grant requirements evolve. |
| 2 | Feature Dependencies | 5 | Grant database search and matching engine are on the critical path. Application pre-filling depends on matching accuracy. AI generation depends on relevant grants being found. |
| 3 | Testing Complexity | 7 | Grant applications are complex documents -- verifying that AI-generated content is accurate, complete, and meets specific requirements is high-stakes. No automated test can determine if an application is "good." Requires expert human review. |
| 4 | Change Management Overhead | 6 | Grant requirements change frequently -- new grants open, existing ones close, criteria shift. Users will constantly say "find me [X specific grant]" or "it didn't find [Y type]." |
| 5 | Stakeholder Coordination | 6 | Multiple user types: individual entrepreneurs, small business owners, nonprofits, government entities. Each has different grant profiles and different needs. |
| 6 | Team Sustainability Risk | 4 | Moderate ongoing load: grant database updates, AI API costs scale with usage. No real-time system. Hallucination fix is a prompt update or training data adjustment. |
| 7 | Risk Mitigation Clarity | 6 | Key risks: AI hallucination on grant requirements, liability on incorrect applications, data privacy of business financial information. Mitigation paths exist but are not trivial. |

**Overall Delivery Score: 5.3/10** (moderate difficulty)

### Sprint Plan

| Sprint | Focus | Deliverable |
|--------|-------|-------------|
| Sprint 1 | Foundation | User accounts, business profile creation, grant database schema, basic search interface |
| Sprint 2 | Grant Discovery Engine | Web scraping / API integrations for grant databases, grant categorization, keyword search |
| Sprint 3 | Matching Engine | Business profile-to-grant matching logic, qualification scoring, ranked grant recommendations |
| Sprint 4 | AI Auto-Fill | Application form parsing, business data extraction, AI text generation for application responses |
| Sprint 5 | Submission & Tracking | Application submission (manual or API), status tracking dashboard, email notifications |
| Sprint 6 | Premium Tier & Launch | Human reviewer add-on, premium tier, pilot with 5-10 small businesses, iterate on AI output |

### Biggest Delivery Risk

**AI hallucination in grant applications** -- the model might generate plausible-sounding but incorrect or incomplete application content. A business could submit a grant application with wrong information (revenue, business type, grant eligibility), potentially facing fraud liability or rejection. The AI might also hallucinate grants that don't exist or that the business doesn't qualify for. This is a high-stakes error domain where wrong answers have real consequences.

### Mitigation Strategy

- **Strict disclaimers:** Every AI-generated output must be clearly marked "DRAFT -- review before submitting." Never auto-submit an application.
- **Human-in-the-loop:** Require the business owner to review and confirm every generated application response before submission. The AI assists; the human commits.
- **Structured input, not open-ended output:** Rather than asking the AI to generate application text from scratch, have it fill in structured fields from the business profile data and only generate narrative sections. This reduces hallucination surface area.
- **Source every claim:** The AI should cite which grant's requirements led to each suggestion. If a claim about eligibility doesn't match a cited requirement, the user knows to double-check.

### Team Structure Suggestion

- 1 Full-Stack Developer (Next.js, business profiles, grant database UI)
- 1 Backend Developer (FastAPI, AI integration, matching engine, web scraping)
- Part-time Legal/Compliance Review (review disclaimers, liability language, data privacy)
- Garret as domain expert -- partner with small businesses to pilot and validate

### Verdict

**10-14 weeks to a usable MVP with strong disclaimers and human-in-the-loop design.** The AI layer is the biggest wildcard, but structured-input design and review workflows contain the risk.

---

## IDEA 7: PulseCheck -- Compliance & Safety Checklist Platform for Seasonal Attractions

### Criteria Scores

| # | Criterion | Score | Rationale |
|---|-----------|-------|-----------|
| 1 | MVP Scope Clarity | 3 | MVP is very well-defined: create checklists, assign to workers, track completion, generate reports. Role-based access (admin, manager, worker). Straightforward CRUD with a compliance twist. |
| 2 | Feature Dependencies | 3 | Checklist creation, worker assignment, and reporting can all be built in parallel. The core data model is simple: checklists --> items --> completions. Little to no blocking. |
| 3 | Testing Complexity | 4 | Boolean pass/fail checks are trivial to test. Role-based access control needs thorough testing. The compliance angle means accuracy matters, but the logic is simple rules-based, not probabilistic. |
| 4 | Change Management Overhead | 3 | Requirements are very stable. Safety regulations don't change frequently. Venues know what checklists they need. Seasonal variations in checklist content are the main source of change, but these are planned, not reactive. |
| 5 | Stakeholder Coordination | 4 | Three user types (admin, manager, seasonal worker) but all at the same venue. Minimal cross-organizational coordination. No formal approval chains. |
| 6 | Team Sustainability Risk | 2 | Simple operational model. Year-round product but only intensive use during season prep. Automated reminders and notifications reduce ongoing labor. No complex integrations or real-time systems. |
| 7 | Risk Mitigation Clarity | 2 | Risks are obvious: outdated regulations, missed checklists, worker compliance. All have straightforward mitigation: versioned checklists, automated reminders, audit trails. |

**Overall Delivery Score: 2.9/10** (easiest delivery path)

### Sprint Plan

| Sprint | Focus | Deliverable |
|--------|-------|-------------|
| Sprint 1 | Foundation | User auth with role-based access (admin, manager, worker), venue setup, basic profile management |
| Sprint 2 | Checklist Creation | Admin creates checklists with categorized items, checkboxes, notes, photo attachments, templates |
| Sprint 3 | Checklist Execution | Worker interface for completing checklists, offline support, photo capture, completion status tracking |
| Sprint 4 | Reporting & Export | Manager dashboard, completion reports, PDF export, audit trail, overdue item alerts |
| Sprint 5 | Reminders & Notifications | SMS/email reminders for incomplete checklists, seasonal onboarding automation, certification expiry alerts |
| Sprint 6 | Polish & Launch | QA, mobile optimization, deploy to Netherworld + 1-2 pilot venues, iterate on checklist templates |

### Biggest Delivery Risk

**Liability if a critical safety checklist item is missed or the system fails.** If a worker does not complete a mandatory safety checklist and something goes wrong at the venue, the software could be implicated in liability proceedings. This is not a product failure risk (the product will likely work) but a **perception and trust risk** -- venues must trust that the system catches everything it needs to catch.

### Mitigation Strategy

- **Redundant reminder system:** Multiple notification channels (SMS, email, in-app, push) for every incomplete checklist. No single point of failure.
- **Escalation workflow:** If a worker doesn't complete a checklist within X hours, automatically escalate to the manager, then to the venue admin. Document every escalation.
- **Offline-first design:** Workers might not have reliable WiFi inside venues. The app must work fully offline and sync when connectivity is restored. Data loss here is the single biggest technical risk.
- **Versioned checklists with audit trail:** Every checklist change is tracked and versioned. If Georgia regulations change next year, you update the template and keep old versions for historical compliance records.
- **Legal review of disclaimers:** Make clear this is a compliance *management* tool, not a compliance *guarantee*. Venues remain responsible for actual safety.

### Team Structure Suggestion

- 1 Full-Stack Developer (Next.js, role-based app, PDF generation)
- 1 Backend Developer (Node.js, SMS/email notifications, offline sync)
- Part-time QA (role access testing, offline scenario testing, edge case coverage)
- Garret as domain expert and first customer (Netherworld)

### Verdict

**Shippable in 6-8 weeks.** The simplest of all 7 ideas by a wide margin. Well-defined scope, low technical risk, stable requirements, and a clear first customer (Netherworld) who already understands the pain. This is the easiest product to plan, build, test, and launch.

---

## DELIVERY RANKINGS

### Summary Scores

| Rank | Idea | MVP Scope | Dependencies | Testing | Change Mgmt | Stakeholders | Sustainability | Risk Clarity | **Overall Score** |
|------|------|-----------|--------------|---------|-------------|--------------|----------------|--------------|-------------------|
| 1 | **PulseCheck** (#7) | 3 | 3 | 4 | 3 | 4 | 2 | 2 | **2.9/10** |
| 2 | **BidSnap** (#3) | 5 | 5 | 6 | 5 | 3 | 3 | 4 | **4.4/10** |
| 3 | **SeasonStaff** (#1) | 4 | 5 | 3 | 3 | 7 | 4 | 4 | **4.6/10** |
| 4 | **GrantPilot** (#6) | 4 | 5 | 7 | 6 | 6 | 4 | 6 | **5.3/10** |
| 5 | **EscapeFlow** (#4) | 8 | 7 | 6 | 8 | 6 | 5 | 7 | **6.7/10** |
| 6 | **LocalLoop** (#5) | 7 | 6 | 5 | 6 | 8 | 7 | 8 | **6.7/10** |
| 7 | **ShelfSight AI** (#2) | 8 | 6 | 7 | 7 | 6 | 6 | 8 | **6.9/10** |

### Ranking Narrative

**1. PulseCheck (#7) -- Cleanest delivery path by a wide margin.**
Simplest scope, most stable requirements, lowest team sustainability risk, and a guaranteed first customer. This is the product that will ship fastest, on budget, with the least risk. The only question is whether the market is big enough -- not whether it can be built.

**2. BidSnap (#3) -- Clean and focused.**
Narrow scope, one active stakeholder type, predictable operational cost. The AI layer is the only variable, and a "human-in-the-loop" design keeps it manageable. This is a product a 2-person team could build in 8-10 weeks and start generating revenue.

**3. SeasonStaff (#1) -- Solid, with one operational challenge.**
Technically straightforward, but the two-sided marketplace dynamic is a known headache. The chicken-and-egg problem is manageable with pre-seeding and geographic containment. Garret's industry access reduces this significantly.

**4. GrantPilot (#6) -- Moderate risk, high reward if it works.**
The AI layer introduces uncertainty but not the same existential risk as CV. Structured-input design and human review workflows contain most risk. The market is large but competition may be increasing in this space.

**5. EscapeFlow (#4) and LocalLoop (#5) -- Tie, tied at 6.7/10 but for different reasons.**
EscapeFlow suffers from scope creep and customization trap -- technical complexity that grows with every customer. LocalLoop suffers from operational complexity -- building the platform is easy but filling it with content and users is hard. One is a technical execution risk; the other is a go-to-market risk. Both are harder than the top 4.

**6. ShelfSight AI (#2) -- Messiest delivery path, but potentially highest reward.**
Computer vision projects are notorious for underestimating the R&D required. The CV model accuracy risk is existential -- if the model never reaches acceptable quality, the product does not exist. However, if it does work, the competitive moat is real (CV models trained on real store data are hard to replicate) and the pricing potential is high ($79-199/month per location). This is a high-risk, high-reward play that requires a different kind of team (ML specialist, not just full-stack devs) and more runway (16-20 weeks minimum).

---

## STRATEGIC RECOMMENDATION

If the goal is to **build something shippable in the shortest time with the least risk**, start with **PulseCheck**. It proves the team can deliver, generates early revenue from a known customer, and the domain expertise is concentrated in one person (Garret).

If the goal is to **build something with the highest revenue ceiling**, start with **ShelfSight AI**. But plan for 4-6 months of R&D before you know if the product works, and prepare for the possibility that it doesn't.

**Suggested sequence:** Build PulseCheck in weeks 1-8 (revenue engine), then build BidSnap in weeks 9-16 (revenue engine 2). Use the cash flow and team experience from these two to fund the R&D needed for ShelfSight AI as the moonshot product. This de-risks the overall portfolio while keeping all options open.

---

*Evaluation complete. This document can be used as a decision matrix for the product startup team.*
