# Lyzr Sovereign Revenue Engine - UI Redesign & Integration Setup Guide

## Part 1: UI Redesign with Lovable

### Current State
- Basic functional UI with all 18 agents integrated
- Dark theme (#0A0F1C background)
- All priority features implemented (1,173 lines in Home.tsx)
- Agent IDs hardcoded and tested

### Redesign Approach Options

#### Option A: Component-by-Component Enhancement
Keep existing functionality, enhance visual design:
1. Modern glassmorphism cards with subtle gradients
2. Animated data visualizations (Chart.js or Recharts)
3. Enhanced micro-interactions and transitions
4. Better spacing, typography hierarchy
5. Professional dashboard layout with sidebar navigation

#### Option B: Complete Redesign
Fresh modern interface with same functionality:
1. Side navigation with collapsible sections
2. Command palette (Cmd+K) for quick actions
3. Split-view layouts for detailed work
4. Advanced filtering and search
5. Real-time data updates with loading skeletons

### Recommended Redesign Features

**Navigation Structure:**
```
├── Dashboard (default view)
├── Approval Queue (Priority 1)
├── Accounts
│   └── War Room (drill-down)
├── Analytics
│   ├── Performance Metrics
│   ├── Insight Feed
│   └── Voice Library
└── Settings
    ├── Agent Configuration
    └── Integration Status
```

**Enhanced Components:**
- Revenue Velocity: Animated SVG gauge with trend indicators
- Approval Queue: Kanban-style cards with drag-to-approve
- Account War Room: Timeline view of all interactions
- Pipeline Funnel: Interactive chart with click-to-filter
- Insight Feed: Real-time ticker with priority badges

**Design System:**
```css
/* Already defined in PRD */
Primary: #0066FF (blue)
Secondary: #00D4FF (cyan)
Background: #0A0F1C (dark)
Surface: #111827 (cards)
Success: #10B981
Warning: #F59E0B
Error: #EF4444
```

**Additional Enhancements:**
- Loading states: Skeleton screens (no spinners)
- Empty states: Helpful illustrations with CTAs
- Error states: Inline error messages with retry actions
- Keyboard shortcuts: Visual hints on hover
- Responsive: Mobile-first approach

---

## Part 2: Integration & Tool Setup for Trial

### Critical Integrations Required

#### 1. HubSpot CRM Integration
**Agent:** HubSpot Sync Agent (696eeaaa3bd35d7a6606a545)
**Status:** Agent created with HubSpot tool enabled
**OAuth:** Already handled by agent (Composio integration)

**What it does:**
- Bidirectional sync of account data
- Updates contact fields (tech stack, buying committee)
- Creates tasks for follow-ups
- Logs all outreach activities

**Trial Setup:**
```bash
# No OAuth needed - agent handles it automatically
# Just configure in UI:
1. Go to Settings > Integrations
2. Click "Connect HubSpot"
3. Agent will handle OAuth flow
4. Select properties to sync
5. Set sync frequency (real-time, hourly, daily)
```

**Required HubSpot Properties:**
- Custom field: Tech Stack (multi-line text)
- Custom field: Buying Committee (JSON)
- Custom field: ICP Score (number)
- Custom field: Last AI Interaction (date)

---

#### 2. LinkedIn Outreach (2 Methods)

##### Method A: LinkedIn Orchestrator (API)
**Agent:** LinkedIn Orchestrator (696eea5cb50537828e0aff79)
**Status:** Agent created with LinkedIn tool enabled
**OAuth:** Already handled by agent (Composio integration)

**What it does:**
- Send connection requests
- Send InMail messages
- Comment on posts
- Like/engage with content

**Trial Setup:**
```bash
# No OAuth needed - agent handles it
1. Go to Settings > Integrations
2. Click "Connect LinkedIn"
3. Agent handles OAuth
4. Set daily limits (15 connections/day for safety)
5. Configure messaging templates
```

**Safety Limits:**
- Max 15 connection requests/day
- Max 10 InMail messages/day
- 2-hour delay between actions
- Randomized timing to appear human

##### Method B: Computer Use Agent (Browser Automation)
**Agent:** Computer Use Agent (696eea8f3bd35d7a6606a544)
**Status:** Agent created
**Use Case:** When LinkedIn API limits are reached

**What it does:**
- Browser-based LinkedIn actions
- More human-like behavior
- Bypasses API rate limits (use sparingly)

**Trial Setup:**
```bash
# Requires headless browser
1. Install Playwright: npm install playwright
2. Configure browser settings in .env
3. Use only when API method fails
4. Monitor for CAPTCHA triggers
```

---

#### 3. Email Sending (Gmail/SMTP)

**Integration Required:** Gmail API or SMTP
**Used by:** Content Generator sends approved messages

**Trial Setup Options:**

##### Option A: Gmail API (Recommended)
```bash
# Agent handles OAuth
1. Go to Settings > Integrations
2. Click "Connect Gmail"
3. Select sending email account
4. Configure sending limits (50/day for new accounts)
5. Warm up sending gradually
```

**Warmup Schedule:**
- Day 1-7: 10 emails/day
- Day 8-14: 25 emails/day
- Day 15-21: 50 emails/day
- Day 22+: 100 emails/day

##### Option B: SMTP (Backup)
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

---

#### 4. Meeting Transcription Integration

**Required Tools:** Otter.ai OR Fireflies.ai
**Agent:** Transcript Analyst (696ee9e2b50537828e0aff6e)

**What it does:**
- Auto-join Zoom/Google Meet calls
- Transcribe meetings in real-time
- Send transcript to Transcript Analyst
- Extract objections, champions, winning phrases

**Trial Setup (Otter.ai):**
```bash
1. Sign up at otter.ai
2. Connect to Zoom/Google Meet
3. Set webhook URL: https://your-app.com/webhooks/otter
4. Configure auto-join for revenue meetings
5. Transcripts auto-send to system
```

**Webhook Configuration:**
```typescript
// POST /webhooks/otter
{
  "meeting_id": "abc123",
  "transcript": "Full transcript text...",
  "participants": [...],
  "timestamp": "2026-01-20T10:00:00Z"
}
```

---

#### 5. Calendar Integration (Calendly)

**Required:** Calendly account
**Agent:** Monitoring Manager tracks bookings

**What it does:**
- Embed booking links in outreach
- Track when meetings are booked
- Send reminders before meetings
- Trigger pre-meeting research

**Trial Setup:**
```bash
1. Sign up at calendly.com
2. Create event types (Discovery Call, Demo, etc.)
3. Set webhook: https://your-app.com/webhooks/calendly
4. Configure in Settings > Integrations
```

**Webhook Events:**
- `invitee.created` - Meeting booked
- `invitee.canceled` - Meeting canceled
- `invitee.rescheduled` - Meeting rescheduled

---

#### 6. Slack Notifications

**Required:** Slack workspace
**Use Case:** Send approval requests to Kagiso

**What it does:**
- Send approval queue notifications
- Allow approve/reject from Slack
- Daily digest reports
- Urgent alerts (positive responses)

**Trial Setup:**
```bash
1. Go to Settings > Integrations
2. Click "Connect Slack"
3. Select channel (#revenue-approvals)
4. Configure notification preferences
5. Test approval buttons
```

**Slack Message Format:**
```
New Outreach Awaiting Approval

Company: Acme Corp
Contact: John Doe (VP Sales)
Quality Score: 85/100

Subject: "Your sales team hiring surge caught my attention"
Preview: "Hi John, I noticed you're scaling your SDR team..."

[Approve] [Edit] [Reject]
```

---

### Integration Priority for Trial

**Week 1 (Essential):**
1. HubSpot CRM - Track all activity
2. Gmail/SMTP - Send approved messages
3. Slack - Get approval notifications

**Week 2 (Important):**
4. LinkedIn Orchestrator - LinkedIn outreach
5. Calendly - Track meeting bookings

**Week 3 (Nice-to-Have):**
6. Otter.ai/Fireflies - Meeting intelligence
7. Computer Use Agent - Backup LinkedIn method

---

## Part 3: Data Sources & Knowledge Base Setup

### Required Data Sources

#### 1. ICP (Ideal Customer Profile) Data
**Used by:** ICP Qualifier agent

**Data Format:**
```json
{
  "industry": ["B2B SaaS", "Enterprise Software"],
  "company_size": "50-500 employees",
  "revenue_range": "$5M-$50M",
  "technologies": ["Salesforce", "HubSpot", "Outreach"],
  "job_titles": ["VP Sales", "CRO", "Head of Revenue"],
  "pain_points": ["Low meeting rates", "Manual outreach", "Poor personalization"]
}
```

**Setup:**
```bash
1. Go to Settings > ICP Configuration
2. Upload ICP criteria CSV or JSON
3. Set scoring weights
4. Test with sample companies
```

---

#### 2. Voice Library (Winning Phrases)
**Used by:** Voice Librarian, Content Generator

**Data Format:**
```json
{
  "phrase": "We help sales teams book 3x more meetings without adding headcount",
  "success_rate": 0.45,
  "use_case": "opening_line",
  "persona": "VP Sales",
  "industry": "B2B SaaS"
}
```

**Setup:**
```bash
1. Go to Settings > Voice Library
2. Import existing winning phrases
3. System auto-adds new winners over time
4. Review and approve new entries
```

---

#### 3. Objection Responses Database
**Used by:** Objection Handler

**Data Format:**
```json
{
  "objection": "We already have a CRM",
  "category": "existing_solution",
  "response": "That's great - our solution actually enhances your existing CRM...",
  "success_rate": 0.68
}
```

**Setup:**
```bash
1. Go to Settings > Objection Library
2. Import common objections and responses
3. System learns from actual conversations
4. Update responses based on win/loss data
```

---

#### 4. Lead List (for Trial)
**Format:** CSV upload

**Required Fields:**
```csv
company_name,company_domain,contact_name,contact_email,contact_title,contact_linkedin
Acme Corp,acme.com,John Doe,john@acme.com,VP Sales,linkedin.com/in/johndoe
```

**Trial Setup:**
```bash
1. Prepare CSV with 50-100 leads
2. Go to Accounts > Import Leads
3. Map CSV columns to system fields
4. System auto-starts research pipeline
5. Outreach generated within 60 seconds
```

---

## Part 4: Environment Configuration

### Required Environment Variables

```env
# Lyzr Agent API
VITE_LYZR_API_KEY=your_lyzr_api_key_here
VITE_LYZR_ENVIRONMENT_ID=your_env_id_here

# Agent IDs (already in code, but good for reference)
VITE_SOVEREIGN_STRATEGIST_ID=696eeb2b3bd35d7a6606a553
VITE_RESEARCH_MANAGER_ID=696eeaf33bd35d7a6606a54c
VITE_OUTREACH_MANAGER_ID=696eeb11b50537828e0aff93

# Webhook URLs (for integrations)
VITE_WEBHOOK_BASE_URL=https://your-app.com/webhooks
VITE_OTTER_WEBHOOK_SECRET=your_otter_secret
VITE_CALENDLY_WEBHOOK_SECRET=your_calendly_secret

# Optional: Database for storing metrics
DATABASE_URL=postgresql://user:pass@host:5432/revenue_engine
REDIS_URL=redis://host:6379
```

---

## Part 5: Trial Checklist

### Pre-Trial Setup (1-2 hours)

- [ ] Redesign UI with enhanced components
- [ ] Connect HubSpot (via agent OAuth)
- [ ] Connect Gmail/SMTP for sending
- [ ] Connect Slack for approvals
- [ ] Upload ICP criteria
- [ ] Import 10 sample winning phrases
- [ ] Import 20 common objections
- [ ] Prepare lead list (50 accounts)

### Trial Day 1

- [ ] Import lead list
- [ ] System researches all 50 accounts (~30 min)
- [ ] Review first 10 outreach messages in approval queue
- [ ] Approve 5 messages for sending
- [ ] Monitor email delivery and open rates
- [ ] Check HubSpot sync working

### Trial Day 2-7

- [ ] Daily: Review and approve outreach (5 min/day)
- [ ] Monitor response rates
- [ ] Upload any meeting transcripts
- [ ] Review weekly strategic pivot report
- [ ] Check autonomous actions log

### Trial Day 8-14

- [ ] Connect LinkedIn Orchestrator
- [ ] Start LinkedIn outreach (15 connections/day)
- [ ] Monitor LinkedIn engagement
- [ ] Compare email vs LinkedIn conversion
- [ ] Review insight feed for patterns

### Success Metrics

**Key Metrics to Track:**
- Response Rate (target: 20%+)
- Meeting Booking Rate (target: 10%+)
- Kagiso Trust Score (target: 80+)
- Time Saved (target: 10+ hours/week)
- Pipeline Value Generated

---

## Part 6: UI Redesign Prompt for Lovable

**Use this exact prompt in Lovable:**

```
Redesign the Lyzr Sovereign Revenue Engine dashboard with a modern, professional interface.

REQUIREMENTS:
- Modern glassmorphism cards with subtle gradients
- Side navigation with sections: Dashboard, Approval Queue, Accounts, Analytics, Settings
- Dark theme: background #0A0F1C, surface #111827, primary #0066FF, secondary #00D4FF
- React-icons only (NO emojis)
- NO toast/sonner notifications
- NO sign-in/OAuth screens (agents handle authentication)

KEEP ALL EXISTING FUNCTIONALITY:
- All 18 agent integrations (IDs already hardcoded)
- Approval Queue with keyboard shortcuts (A/E/R)
- Account War Room view
- Revenue Velocity gauge
- Pipeline Funnel
- Analytics dashboard
- Insight feed

ENHANCE WITH:
- Smooth animations and transitions
- Loading skeleton screens
- Better spacing and typography
- Interactive data visualizations
- Real-time update indicators
- Professional color-coded status badges
- Hover effects and micro-interactions

COMPONENTS TO REDESIGN:
1. Revenue Velocity Gauge - Animated circular progress
2. Approval Queue - Card grid with expand-on-hover
3. Account War Room - Timeline + Committee org chart
4. Pipeline Funnel - Interactive SVG chart
5. Insight Feed - Scrolling ticker with categorized badges
6. Analytics - Line charts for trends

Use Tailwind CSS and existing UI components from /components/ui/*.
Keep all agent calls using callAIAgent from /utils/aiAgent.ts.
```

---

## Next Steps

Would you like me to:
1. Redesign specific UI components now?
2. Create integration setup scripts?
3. Build the Settings page for integration management?
4. Create the lead import functionality?
5. Build the webhook handlers for Otter/Calendly/Slack?
