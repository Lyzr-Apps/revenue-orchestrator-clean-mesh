/**
 * Webhook API Routes
 * Handles incoming webhooks from Calendly, Otter.ai, Fireflies, Slack, Gmail
 */

import {
  handleCalendlyWebhook,
  handleOtterWebhook,
  handleFirefliesWebhook,
  handleSlackInteraction,
  handleGmailResponse,
  verifyCalendlyWebhook,
  verifyOtterWebhook,
  verifySlackRequest,
  type CalendlyWebhookPayload,
  type OtterWebhookPayload,
  type FirefliesWebhookPayload,
  type SlackInteractionPayload,
  type GmailResponsePayload
} from '../utils/webhooks'

import {
  processMeetingBooked,
  processMeetingCanceled,
  processMeetingRescheduled,
  type CalendlyMeeting
} from '../utils/calendly'

import { sendPositiveResponseNotification, sendMeetingBookedNotification } from '../utils/slack'

/**
 * Calendly Webhook Endpoint
 * POST /api/webhooks/calendly
 */
export async function handleCalendlyWebhookEndpoint(
  body: CalendlyWebhookPayload,
  headers: Record<string, string>
): Promise<{ status: number; body: any }> {
  try {
    // Verify webhook signature
    const signature = headers['calendly-webhook-signature'] || ''
    const secret = import.meta.env.VITE_CALENDLY_WEBHOOK_SECRET || ''

    if (secret && !verifyCalendlyWebhook(JSON.stringify(body), signature, secret)) {
      return {
        status: 401,
        body: { error: 'Invalid webhook signature' }
      }
    }

    // Process webhook
    const result = await handleCalendlyWebhook(body)

    // Convert to CalendlyMeeting format for additional processing
    const meeting: CalendlyMeeting = {
      eventId: body.payload.event,
      eventType: body.event,
      inviteeName: body.payload.invitee.name,
      inviteeEmail: body.payload.invitee.email,
      startTime: body.payload.scheduled_event.start_time,
      endTime: body.payload.scheduled_event.end_time,
      timezone: body.payload.invitee.timezone,
      status: body.payload.invitee.canceled ? 'canceled' : 'scheduled',
      meetingType: body.payload.event_type.name,
      duration: body.payload.event_type.duration,
      location: body.payload.scheduled_event.location
    }

    // Route to appropriate processor
    if (body.event === 'invitee.created') {
      await processMeetingBooked(meeting)

      // Send Slack notification
      await sendMeetingBookedNotification({
        accountName: meeting.inviteeEmail.split('@')[1],
        contactName: meeting.inviteeName,
        meetingTime: meeting.startTime,
        meetingType: meeting.meetingType,
        duration: meeting.duration
      })
    } else if (body.event === 'invitee.canceled') {
      await processMeetingCanceled(meeting)
    } else if (body.event === 'invitee.rescheduled') {
      await processMeetingRescheduled(meeting)
    }

    return {
      status: 200,
      body: result
    }
  } catch (error) {
    console.error('[Webhook API] Calendly error:', error)
    return {
      status: 500,
      body: {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }
}

/**
 * Otter.ai Webhook Endpoint
 * POST /api/webhooks/otter
 */
export async function handleOtterWebhookEndpoint(
  body: OtterWebhookPayload,
  headers: Record<string, string>
): Promise<{ status: number; body: any }> {
  try {
    // Verify webhook signature
    const signature = headers['x-otter-signature'] || ''
    const secret = import.meta.env.VITE_OTTER_WEBHOOK_SECRET || ''

    if (secret && !verifyOtterWebhook(JSON.stringify(body), signature, secret)) {
      return {
        status: 401,
        body: { error: 'Invalid webhook signature' }
      }
    }

    // Process webhook
    const result = await handleOtterWebhook(body)

    return {
      status: 200,
      body: result
    }
  } catch (error) {
    console.error('[Webhook API] Otter error:', error)
    return {
      status: 500,
      body: {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }
}

/**
 * Fireflies.ai Webhook Endpoint
 * POST /api/webhooks/fireflies
 */
export async function handleFirefliesWebhookEndpoint(
  body: FirefliesWebhookPayload,
  headers: Record<string, string>
): Promise<{ status: number; body: any }> {
  try {
    // Fireflies uses API key authentication
    const apiKey = headers['authorization']?.replace('Bearer ', '') || ''
    const expectedKey = import.meta.env.VITE_FIREFLIES_API_KEY || ''

    if (expectedKey && apiKey !== expectedKey) {
      return {
        status: 401,
        body: { error: 'Invalid API key' }
      }
    }

    // Process webhook
    const result = await handleFirefliesWebhook(body)

    return {
      status: 200,
      body: result
    }
  } catch (error) {
    console.error('[Webhook API] Fireflies error:', error)
    return {
      status: 500,
      body: {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }
}

/**
 * Slack Interaction Endpoint
 * POST /api/webhooks/slack/interactions
 */
export async function handleSlackInteractionEndpoint(
  body: string | SlackInteractionPayload,
  headers: Record<string, string>
): Promise<{ status: number; body: any }> {
  try {
    // Parse Slack payload (comes as form-encoded)
    let payload: SlackInteractionPayload

    if (typeof body === 'string') {
      const params = new URLSearchParams(body)
      const payloadStr = params.get('payload')
      if (!payloadStr) {
        return {
          status: 400,
          body: { error: 'Missing payload' }
        }
      }
      payload = JSON.parse(payloadStr)
    } else {
      payload = body
    }

    // Verify Slack request signature
    const timestamp = headers['x-slack-request-timestamp'] || ''
    const signature = headers['x-slack-signature'] || ''
    const signingSecret = import.meta.env.VITE_SLACK_SIGNING_SECRET || ''

    if (
      signingSecret &&
      !verifySlackRequest(
        timestamp,
        signature,
        typeof body === 'string' ? body : JSON.stringify(body),
        signingSecret
      )
    ) {
      return {
        status: 401,
        body: { error: 'Invalid request signature' }
      }
    }

    // Process interaction
    const result = await handleSlackInteraction(payload)

    return {
      status: 200,
      body: result
    }
  } catch (error) {
    console.error('[Webhook API] Slack error:', error)
    return {
      status: 500,
      body: {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }
}

/**
 * Gmail Response Webhook Endpoint (via Gmail Push Notifications)
 * POST /api/webhooks/gmail
 */
export async function handleGmailWebhookEndpoint(
  body: any,
  headers: Record<string, string>
): Promise<{ status: number; body: any }> {
  try {
    // Gmail sends Pub/Sub messages in this format:
    // { message: { data: base64_encoded_data, messageId: "...", publishTime: "..." } }

    const messageData = body.message?.data
    if (!messageData) {
      return {
        status: 400,
        body: { error: 'Invalid Gmail push notification' }
      }
    }

    // Decode message data
    const decodedData = JSON.parse(atob(messageData))

    // This is a notification that something changed in the mailbox
    // We need to fetch the actual email using Gmail API
    // For now, we'll simulate the email data

    const emailPayload: GmailResponsePayload = {
      emailData: {
        historyId: decodedData.historyId || '',
        message: {
          id: decodedData.emailAddress || '',
          threadId: '',
          from: 'prospect@example.com',
          to: 'you@yourcompany.com',
          subject: 'Re: Your outreach',
          body: 'Thanks for reaching out! I\'d love to learn more.',
          timestamp: new Date().toISOString(),
          inReplyTo: ''
        }
      }
    }

    // Process Gmail response
    const result = await handleGmailResponse(emailPayload)

    // If positive response, send Slack notification
    if (result.classification?.classification === 'positive') {
      await sendPositiveResponseNotification({
        from: emailPayload.emailData.message.from,
        accountName: emailPayload.emailData.message.from.split('@')[1],
        subject: emailPayload.emailData.message.subject,
        preview: emailPayload.emailData.message.body,
        signals: result.classification.key_signals || []
      })
    }

    return {
      status: 200,
      body: result
    }
  } catch (error) {
    console.error('[Webhook API] Gmail error:', error)
    return {
      status: 500,
      body: {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }
}

/**
 * Health check endpoint
 * GET /api/webhooks/health
 */
export async function handleHealthCheck(): Promise<{ status: number; body: any }> {
  return {
    status: 200,
    body: {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      webhooks: {
        calendly: 'active',
        otter: 'active',
        fireflies: 'active',
        slack: 'active',
        gmail: 'active'
      }
    }
  }
}

/**
 * Webhook router (for Express/Fastify integration)
 */
export function setupWebhookRoutes(app: any) {
  // Calendly
  app.post('/api/webhooks/calendly', async (req: any, res: any) => {
    const result = await handleCalendlyWebhookEndpoint(req.body, req.headers)
    res.status(result.status).json(result.body)
  })

  // Otter.ai
  app.post('/api/webhooks/otter', async (req: any, res: any) => {
    const result = await handleOtterWebhookEndpoint(req.body, req.headers)
    res.status(result.status).json(result.body)
  })

  // Fireflies.ai
  app.post('/api/webhooks/fireflies', async (req: any, res: any) => {
    const result = await handleFirefliesWebhookEndpoint(req.body, req.headers)
    res.status(result.status).json(result.body)
  })

  // Slack
  app.post('/api/webhooks/slack/interactions', async (req: any, res: any) => {
    const result = await handleSlackInteractionEndpoint(req.body, req.headers)
    res.status(result.status).json(result.body)
  })

  // Gmail
  app.post('/api/webhooks/gmail', async (req: any, res: any) => {
    const result = await handleGmailWebhookEndpoint(req.body, req.headers)
    res.status(result.status).json(result.body)
  })

  // Health check
  app.get('/api/webhooks/health', async (_req: any, res: any) => {
    const result = await handleHealthCheck()
    res.status(result.status).json(result.body)
  })

  console.log('[Webhook API] Routes configured')
}
