# Integration Implementation Complete

All integrations have been implemented **except HubSpot** (per user request).

## Files Created

### Core Integration Utilities

1. **`/src/utils/webhooks.ts`** - Webhook handlers for all external services
   - Calendly webhook processing
   - Otter.ai transcript analysis
   - Fireflies.ai transcript analysis
   - Slack interaction handling
   - Gmail response classification

2. **`/src/utils/gmail.ts`** - Gmail integration utility
   - Email sending with tracking
   - Warmup schedule automation
   - Daily sending limits
   - Response processing
   - Open/click tracking

3. **`/src/utils/linkedin.ts`** - LinkedIn integration utility
   - Connection requests with safety limits
   - InMail sending
   - Post engagement
   - Rate limiting (15 connections/day, 10 InMail/day)
   - 2-hour action delays

4. **`/src/utils/slack.ts`** - Slack integration utility
   - Approval notifications
   - Positive response alerts
   - Meeting booked notifications
   - Daily digest generation
   - Interactive button handling

5. **`/src/utils/calendly.ts`** - Calendly integration utility
   - Meeting booking processing
   - Pre-meeting research automation
   - Meeting cancellation/rescheduling
   - Statistics tracking

6. **`/src/api/webhooks.ts`** - API endpoint handlers
   - Webhook routes for all services
   - Signature verification
   - Request validation
   - Error handling

---

## Integration Architecture

```
External Service → Webhook → API Handler → Integration Utility → Agent Processing
                      ↓
                 Verification
                      ↓
                   Storage
                      ↓
              Slack Notification
```

### Example Flow: Calendly Meeting Booked

1. **Calendly sends webhook** → `/api/webhooks/calendly`
2. **API handler verifies signature** → `verifyCalendlyWebhook()`
3. **Webhook processor extracts data** → `handleCalendlyWebhook()`
4. **Calendly utility processes meeting** → `processMeetingBooked()`
5. **Research Manager triggered** → Pre-meeting research via agent
6. **Slack notification sent** → Approval channel notified
7. **Data stored** → localStorage (replace with DB in production)

---

## How to Use Each Integration

### Gmail Integration

```typescript
import { sendOutreachEmail, getEmailStats } from '@/utils/gmail'

// Send approved outreach
const result = await sendOutreachEmail({
  to: 'prospect@company.com',
  subject: 'Quick question about your tech stack',
  body: 'Hi John, I noticed...',
  outreachId: 'out_123'
})

// Check sending status
const stats = getEmailStats()
console.log(`Sent today: ${stats.sentToday}/${stats.dailyLimit}`)
console.log(`Response rate: ${stats.responseRate}%`)
```

**Features:**
- Automatic warmup (10 → 25 → 50 → 100 emails/day)
- Sending window enforcement (9am-5pm default)
- Open/click tracking
- Response classification via agent

---

### LinkedIn Integration

```typescript
import { sendConnectionRequest, sendInMail, getLinkedInStats } from '@/utils/linkedin'

// Send connection request
const result = await sendConnectionRequest({
  profileUrl: 'https://linkedin.com/in/johndoe',
  firstName: 'John',
  lastName: 'Doe',
  message: 'Hi John, I noticed we both...',
  accountId: 'acc_123'
})

// Send InMail
await sendInMail({
  profileUrl: 'https://linkedin.com/in/janedoe',
  subject: 'Quick question',
  body: 'Hi Jane...'
})

// Check limits
const stats = getLinkedInStats()
console.log(`Connections today: ${stats.today.connections}/15`)
```

**Safety Features:**
- Max 15 connection requests/day
- Max 10 InMail/day
- 2-hour minimum delay between actions
- Randomized timing
- Sending window enforcement

---

### Slack Integration

```typescript
import { sendApprovalNotification, sendDailyDigest } from '@/utils/slack'

// Send approval notification
await sendApprovalNotification({
  outreachId: 'out_123',
  accountName: 'Acme Corp',
  contactName: 'John Doe',
  subject: 'Quick question about your tech stack',
  preview: 'Hi John, I noticed...',
  icpScore: 85
})

// Send daily digest (schedule this at 8am)
await sendDailyDigest()
```

**Notification Types:**
- New outreach staged (with approve/reject buttons)
- Positive responses received
- Meetings booked
- Daily digest at 8:00 AM

---

### Calendly Integration

```typescript
import { getUpcomingMeetings, getCalendlyStats } from '@/utils/calendly'

// Get upcoming meetings
const meetings = getUpcomingMeetings()

// Get statistics
const stats = getCalendlyStats()
console.log(`Meetings today: ${stats.todayMeetings}`)
console.log(`Upcoming in 24h: ${stats.upcomingNext24h}`)
```

**Automatic Actions:**
- Pre-meeting research triggered
- Pre-meeting email sent
- Slack notification sent
- CRM update (when HubSpot is connected)

---

## Webhook Configuration

### 1. Calendly Webhook Setup

**Webhook URL:** `https://your-app.com/api/webhooks/calendly`

**Events to subscribe:**
- `invitee.created`
- `invitee.canceled`
- `invitee.rescheduled`

**Environment Variable:**
```bash
VITE_CALENDLY_WEBHOOK_SECRET=your_secret_here
```

---

### 2. Otter.ai Webhook Setup

**Webhook URL:** `https://your-app.com/api/webhooks/otter`

**Events to subscribe:**
- Transcript completed

**Environment Variable:**
```bash
VITE_OTTER_WEBHOOK_SECRET=your_secret_here
```

---

### 3. Fireflies.ai Webhook Setup

**Webhook URL:** `https://your-app.com/api/webhooks/fireflies`

**Authentication:** API Key in Authorization header

**Environment Variable:**
```bash
VITE_FIREFLIES_API_KEY=your_api_key_here
```

---

### 4. Slack Webhook Setup

**Webhook URL:** `https://your-app.com/api/webhooks/slack/interactions`

**Slack App Configuration:**
1. Enable Interactive Components
2. Set Request URL to webhook endpoint
3. Add OAuth scopes: `chat:write`, `chat:write.public`

**Environment Variable:**
```bash
VITE_SLACK_SIGNING_SECRET=your_signing_secret_here
```

---

### 5. Gmail Push Notifications Setup

**Webhook URL:** `https://your-app.com/api/webhooks/gmail`

**Setup Steps:**
1. Enable Gmail API in Google Cloud Console
2. Create Pub/Sub topic
3. Configure Gmail watch with topic
4. Subscribe webhook endpoint to topic

**Code to setup:**
```typescript
import { setupGmailPushNotifications } from '@/utils/gmail'

await setupGmailPushNotifications()
```

---

## Agent Integration

All integrations call agents for processing:

| Integration | Agent Called | Purpose |
|------------|--------------|---------|
| Calendly | Monitoring Manager | Track meetings |
| Calendly | Research Manager | Pre-meeting research |
| Otter.ai | Transcript Analyst | Analyze transcripts |
| Fireflies | Transcript Analyst | Analyze transcripts |
| Gmail | Response Classifier | Classify responses |
| Gmail | Monitoring Manager | Track sends |
| Slack | (No direct agent) | Notification delivery |
| LinkedIn | LinkedIn Orchestrator | Perform actions |
| LinkedIn | Computer Use Agent | Fallback automation |

---

## Security Features

### Webhook Verification

All webhooks verify signatures before processing:

```typescript
// Calendly
verifyCalendlyWebhook(payload, signature, secret)

// Otter
verifyOtterWebhook(payload, signature, secret)

// Slack
verifySlackRequest(timestamp, signature, body, signingSecret)
```

### Rate Limiting

- **Gmail:** Daily limits + warmup schedule
- **LinkedIn:** Action delays + daily caps
- **Slack:** No rate limits needed
- **Calendly:** No rate limits needed

---

## Data Storage

Currently using **localStorage** for demo purposes. Replace with actual database:

**Storage Keys:**
- `gmail_config` - Gmail configuration
- `gmail_sent_{date}` - Daily sent count
- `sent_emails` - Sent email history
- `email_responses` - Response classifications
- `linkedin_config` - LinkedIn configuration
- `linkedin_connections_{date}` - Daily connection count
- `linkedin_actions` - Action history
- `slack_config` - Slack configuration
- `slack_notifications` - Notification history
- `calendly_meetings` - Meeting records
- `pre_meeting_research` - Research results

**Migration to Database:**

```sql
-- Example schema
CREATE TABLE sent_emails (
  id UUID PRIMARY KEY,
  message_id VARCHAR,
  to_email VARCHAR,
  subject VARCHAR,
  body TEXT,
  outreach_id UUID,
  sent_at TIMESTAMP
);

CREATE TABLE email_responses (
  id UUID PRIMARY KEY,
  message_id VARCHAR,
  thread_id VARCHAR,
  from_email VARCHAR,
  classification JSONB,
  timestamp TIMESTAMP
);

CREATE TABLE linkedin_actions (
  id UUID PRIMARY KEY,
  type VARCHAR, -- 'connection', 'inmail', 'engagement'
  profile_url VARCHAR,
  message TEXT,
  timestamp TIMESTAMP,
  result JSONB
);

CREATE TABLE calendly_meetings (
  id UUID PRIMARY KEY,
  event_id VARCHAR,
  invitee_name VARCHAR,
  invitee_email VARCHAR,
  start_time TIMESTAMP,
  status VARCHAR,
  meeting_type VARCHAR,
  research JSONB
);
```

---

## Testing

### Test Gmail Integration

```typescript
import { sendOutreachEmail, canSendToday } from '@/utils/gmail'

console.log('Can send?', canSendToday())

const result = await sendOutreachEmail({
  to: 'test@example.com',
  subject: 'Test',
  body: 'This is a test'
})

console.log('Send result:', result)
```

### Test LinkedIn Integration

```typescript
import { testLinkedInConnection, getLinkedInStats } from '@/utils/linkedin'

const test = await testLinkedInConnection()
console.log('Connection test:', test)

const stats = getLinkedInStats()
console.log('Stats:', stats)
```

### Test Slack Integration

```typescript
import { testSlackConnection } from '@/utils/slack'

const test = await testSlackConnection()
console.log('Slack test:', test)
```

### Test Webhooks Locally

Use tools like **ngrok** to expose local server:

```bash
# Terminal 1: Start your app
npm run dev

# Terminal 2: Expose via ngrok
ngrok http 5173

# Use ngrok URL for webhook configuration
https://abc123.ngrok.io/api/webhooks/calendly
```

---

## Production Deployment Checklist

### Environment Variables

```bash
# Webhook Secrets
VITE_CALENDLY_WEBHOOK_SECRET=xxx
VITE_OTTER_WEBHOOK_SECRET=xxx
VITE_FIREFLIES_API_KEY=xxx
VITE_SLACK_SIGNING_SECRET=xxx

# Webhook Base URL
VITE_WEBHOOK_BASE_URL=https://your-production-domain.com

# Agent API
VITE_LYZR_API_KEY=xxx
VITE_LYZR_ENVIRONMENT_ID=xxx
```

### Webhook Registration

1. **Calendly:**
   - Go to Calendly Developer Console
   - Create webhook subscription
   - URL: `{WEBHOOK_BASE_URL}/api/webhooks/calendly`

2. **Otter.ai:**
   - Contact Otter.ai support for webhook access
   - Register URL: `{WEBHOOK_BASE_URL}/api/webhooks/otter`

3. **Fireflies.ai:**
   - Go to Fireflies Settings → Integrations
   - Add webhook URL: `{WEBHOOK_BASE_URL}/api/webhooks/fireflies`

4. **Slack:**
   - Slack App Dashboard → Interactive Components
   - Request URL: `{WEBHOOK_BASE_URL}/api/webhooks/slack/interactions`

5. **Gmail:**
   - Run `setupGmailPushNotifications()` after deployment
   - Verify Pub/Sub subscription is active

---

## Integration Status

| Integration | Status | OAuth | Webhooks | Agents | UI |
|------------|--------|-------|----------|--------|-----|
| Gmail | ✅ Complete | Agent-managed | Push notifications | Response Classifier | Settings page |
| LinkedIn | ✅ Complete | Agent-managed | N/A | LinkedIn Orchestrator | Settings page |
| Slack | ✅ Complete | Agent-managed | Interactive buttons | N/A | Settings page |
| Calendly | ✅ Complete | Agent-managed | 3 events | Monitoring Manager | Settings page |
| Otter.ai | ✅ Complete | Agent-managed | Transcript webhook | Transcript Analyst | Settings page |
| Fireflies | ✅ Complete | Agent-managed | Transcript webhook | Transcript Analyst | Settings page |
| HubSpot | ❌ Not Implemented | - | - | - | - |

---

## Next Steps

1. **Test all integrations** with real webhook payloads
2. **Replace localStorage** with actual database (PostgreSQL/MongoDB)
3. **Deploy to production** and register webhooks
4. **Monitor webhook health** via `/api/webhooks/health` endpoint
5. **Set up Slack bot** for approval workflow
6. **Configure Gmail sending domain** and verify SPF/DKIM
7. **Import first 10 leads** and test full pipeline

---

## Support

All integration code follows these principles:

1. **Agent-first:** OAuth handled by Composio via agents
2. **No manual auth flows:** All integrations use agent-managed authentication
3. **Webhook-driven:** Real-time processing via webhooks
4. **Safe rate limiting:** LinkedIn and Gmail have built-in safety limits
5. **Error handling:** All functions return success/error objects
6. **Logging:** Console logs for debugging (replace with proper logging service)

**All integrations are ready for trial!**
