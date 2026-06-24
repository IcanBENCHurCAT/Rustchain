# BIDSNAP — Long-Term Business Plan

**Selected:** 2026-06-23
**From:** Weighted evaluation (Engineer + Scrum Master + Manager panel)
**Positioning:** AI-powered proposal generation for contractors

---

## 1. MARKET OPPORTUNITY

### Total Addressable Market (TAM)

| Segment | # of Businesses in US | Penetration Target | ARPU | ARR |
|---------|----------------------|-------------------|------|-----|
| Contractors (broad) | ~3.8M | 5% = 190K | $59/mo | $134M |
| Specialized trades (kitchen/bath, HVAC, electrical) | ~800K | 15% = 120K | $79/mo | $113M |
| Mid-size contractors (5-50 employees) | ~250K | 30% = 75K | $149/mo | $134M |
| **Conservative total** | | **385K customers** | | **$381M ARR** |

### Why Now?
- AI image analysis is finally good enough (Claude 3.5, GPT-4o)
- Contractors are aging out — younger tradespeople expect digital tools
- Competitors (ServiceTitan, Housecall Pro) are bloated management suites at $300+/mo
- No one is doing "AI-first proposal generation" — this is a whitespace
- Contractors spend 5-10 hours/week writing proposals by hand — huge time savings

### Customer Profile
**Primary:** Independent contractors and small contractor teams (1-10 employees)
- Trades: kitchen/bath remodelers, general contractors, roofers, electricians, plumbers
- Pain: losing bids because proposals take too long, proposals look amateur, manual estimates are inconsistent
- Budget: $50-150/month for tools that help them win jobs
- Tech comfort: moderate. They use smartphones and apps but want simple UX

**Secondary:** Mid-size contracting companies (10-50 employees)
- Pain: inconsistent proposal quality across team members, no standardization
- Budget: $100-300/month for team management features

---

## 2. PRODUCT EVOLUTION ROADMAP

### Phase 1: POC (Weeks 1-8)
- Photo upload → AI proposal draft → PDF download
- 5 contractor beta testers
- Success: 2+ proposals accepted, 3+/5 would pay $49/mo

### Phase 2: MVP Launch (Weeks 9-16)
- Contractor onboarding (trade, rates, templates, branding)
- Client-facing proposal links with e-sign (DocuSign or custom)
- Email/SMS notifications
- Stripe subscription ($49/mo)
- **Goal: 25 paying customers**

### Phase 3: Growth (Months 5-12)
- **Feature additions:**
  - AI photo analysis → material list from photos
  - Customer portal (view proposals, sign, make payments)
  - Proposal versioning and templates
  - Job estimation database (pre-built line items by trade)
  - Multi-user (contractor + estimator + admin)
  - Analytics (proposal acceptance rate, revenue pipeline)
- **Pricing:**
  - Starter: $29/mo — 30 proposals, basic templates
  - Pro: $59/mo — unlimited proposals, e-sign, branding, analytics
  - Team: $99/mo — multi-user, shared templates, admin
- **Goal: 200 paying customers, $12K MRR**

### Phase 4: Scale (Months 12-24)
- **Feature additions:**
  - Integrations: QuickBooks, Xero, Square, Buildertrend
  - Mobile app (React Native) for field use
  - "Smart Bidding" — AI analyzes competitor pricing data, suggests pricing to win bids
  - Material supplier integration — auto-order materials from proposals
  - Subcontractor management — assign work to subs, track costs
  - Multi-location support
  - API for third-party integrations
- **Goal: 1,000+ paying customers, $60K MRR**

### Phase 5: Platform (Months 24-36)
- **Feature additions:**
  - Marketplace: customers discover contractors through BidSnap
  - Reviews and ratings system
  - "BidSnap Certified" — verified contractors badge
  - AI-powered job site analytics (aggregate data across contractors)
  - Financing integration for customers (Financing a $50K remodel)
  - Insurance integration (contractor insurance tied to proposals)
- **Goal: 5,000+ paying customers, $300K MRR**

---

## 3. COMPETITIVE LANDSCAPE

### Direct Competitors: NONE
No one is doing AI photo-to-proposal. This is a completely new category.

### Indirect Competitors:

| Tool | What They Do | Pricing | Why They're Not a Threat |
|------|-------------|---------|--------------------------|
| ServiceTitan | Full job management platform | $300-500/mo | Overbuilt for small contractors. Proposal is one of 100 features. |
| Housecall Pro | Scheduling + invoicing | $29-199/mo | No AI proposal generation. Manual proposals only. |
| Jobber | Field service management | $39-149/mo | Same. No AI, no photo-to-proposal. |
| Canva | Proposal templates (design) | $15/mo | Design only. No AI, no pricing, no integration. |
| Word/Excel | Manual proposals | Free | Everyone uses this. Slow, inconsistent, amateur-looking. |
| ProfitScreener | Estimating software | $99/mo | Desktop software, manual input required. No AI. |

### Your Competitive Moat:
1. **AI-first approach** — no competitor uses image analysis for proposals
2. **Specialized training data** — contractor photo database compounds over time
3. **Workflow lock-in** — once contractors build templates and job history in BidSnap, switching is painful
4. **Network effects** — eventually, customers discover contractors through BidSnap (marketplace value)

---

## 4. GO-TO-MARKET STRATEGY

### Months 1-3: Founder-Led Sales
- Reach out to 50 contractors through LinkedIn, Reddit r/contractors, local trade associations
- Offer free 3-month trial for beta testers
- Build case studies: "Contractor X won Y% more jobs using BidSnap"
- Target: 25 paying customers at $49/mo = $1,225 MRR

### Months 4-6: Content Marketing
- Start r/contractors presence — helpful content, not spam
- YouTube: "How to write a proposal that wins jobs"
- SEO: "contractor proposal template," "how to estimate a kitchen remodel"
- LinkedIn ads targeting contractors by trade
- Target: 200 customers at $59/mo avg = $11,800 MRR

### Months 7-12: Channel Partnerships
- Partner with tool suppliers (material suppliers offer BidSnap to their customers)
- Trade association partnerships (NAHB, local builder associations)
- Referral program: $50 credit for every contractor referred
- Target: 500 customers at $69/mo avg = $34,500 MRR

### Year 2: Paid Acquisition + ABM
- Paid ads on Google, YouTube, LinkedIn
- Account-based marketing targeting mid-size contractors
- Podcast sponsorships (contractor/trade podcasts)
- Target: 2,000+ customers at $79/mo avg = $158,000 MRR

---

## 5. FINANCIAL PROJECTIONS

### Unit Economics

| Metric | Value |
|--------|-------|
| Average Revenue Per User (ARPU) | $59/month |
| Customer Acquisition Cost (CAC) | $150 (months 1-12), decreases over time |
| Lifetime (months to churn) | 18 months (5.6% monthly churn) |
| LTV (customer value) | $1,062 |
| LTV:CAC ratio | 7.1:1 (healthy — target is 3:1+) |
| Payback period | 2.5 months |

### Revenue Projections

| Timeframe | Customers | MRR | ARR | Burn | Net |
|-----------|-----------|-----|-----|------|-----|
| Month 3 (POC) | 25 beta | $1,225 | $14,700 | $5K/mo | -$3,775 |
| Month 6 (Launch) | 100 | $5,900 | $70,800 | $8K/mo | -$2,100 |
| Month 12 | 500 | $34,500 | $414,000 | $12K/mo | +$22,500 |
| Month 18 | 1,500 | $105,000 | $1,260,000 | $25K/mo | +$80,000 |
| Month 24 | 3,000 | $237,000 | $2,844,000 | $40K/mo | +$197,000 |

### Funding Strategy
- **Bootstrapped Phase (Months 1-12):** ~$100K total burn. Fund from early revenue + personal capital.
- **Seed Round (Month 12-18):** If hitting $30K+ MRR, raise $500K-$1M seed for growth.
- **Series A (Month 24+):** If hitting $200K+ MRR, raise $5-10M for platform expansion.

---

## 6. RISKS & MITIGATIONS

| Risk | Impact | Likelihood | Mitigation |
|------|--------|-----------|------------|
| AI proposal quality not good enough | Critical | Medium | Human-in-the-loop review, iterate on AI model, focus on one trade first |
| Contractors resist changing workflow | High | Medium | Focus on time savings (hours → minutes), not "AI." Show before/after. |
| ServiceTitan adds AI proposals | High | Low-Medium | They're too big to move fast. We'll have 2-year head start. Specialize deeply. |
| Churn too high (>8% monthly) | High | Medium | Embed deeply — job history, templates, customer database become sticky. |
| AI costs grow faster than revenue | Medium | Low | Optimize prompts, cache results, use cheaper model for simple jobs. |
| Legal liability if AI underestimates | High | Low-Medium | Disclaimers, human review required, insurance, never auto-submit. |

---

## 7. WHY THIS WORKS FOR GARRET

1. **Domain expertise** — you understand contractor workflows and proposal pain points
2. **Technical skills** — full-stack development, CV/AI interest, database design
3. **Network** — can reach contractors through local trade groups, Home Depot connections
4. **Time** — can build POC in 8 weeks while working (MVP can start with weekends)
5. **Low capital requirement** — $0-20/month during POC, $5K-10K total to MVP

---

## 8. SUCCESS METRICS BY PHASE

### POC (Month 2):
- [ ] AI analyzes photo correctly (5/5 test contractors agree)
- [ ] 5 contractors test, 2+ use to send real proposals
- [ ] 3+/5 would pay $49/mo

### MVP Launch (Month 4):
- [ ] 25 paying customers
- [ ] Average 8+ proposals/month per customer
- [ ] 70%+ monthly retention
- [ ] NPS score > 30

### Growth (Month 12):
- [ ] 500+ paying customers
- [ ] $30K+ MRR
- [ ] Monthly churn < 6%
- [ ] LTV:CAC > 5:1

### Scale (Month 24):
- [ ] 3,000+ paying customers
- [ ] $200K+ MRR
- [ ] 2+ revenue streams (subscription + add-ons)
- [ ] Recognized as #1 proposal tool for contractors

---

*Business plan drafted from weighted evaluation. Ready to begin POC sprint planning when Garret gives the green light.*
