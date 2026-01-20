/**
 * Webhook Handlers for External Integrations
 * Handles incoming webhooks from Calendly, Otter.ai, Fireflies, Slack
 */

import { callAIAgent } from './aiAgent'

const AGENTS = {
  TRANSCRIPT_ANALYST: '696ee9e2b50537828e0aff6e',
  RESPONSE_CLASSIFIER: '696ee9fa3bd35d7a6606a53b',
  MONITORING_MANAGER: '696eeacdb50537828e0aff83',
  INSIGHT_GENERATOR: '696eea103bd35d7a6606a53c'
}

// =============================================================================
// CALENDLY WEBHOOK HANDLER
// =============================================================================

export interface CalendlyWebhookPayload {
  event: 'invitee.created' | 'invitee.canceled' | 'invitee.rescheduled'
  payload: {
    event: string
    invitee: {
      name: string
      email: string
      text_reminder_number: string | null
      timezone: string
      created_at: string
      canceled: boolean
    }
    event_type: {
      name: string
      duration: number
    }
    scheduled_event: {
      start_time: string
      end_time: string
      location: {
        type: string
        location?: string
      }
    }
  }
}

export async function handleCalendlyWebhook(payload: CalendlyWebhookPayload) {
  console.log('[Calendly Webhook] Event received:', payload.event)

  try {
    // Extract meeting details
    const meetingData = {
      event_type: payload.event,
      invitee_name: payload.payload.invitee.name,
      invitee_email: payload.payload.invitee.email,
      meeting_type: payload.payload.event_type.name,
      meeting_duration: payload.payload.event_type.duration,
      start_time: payload.payload.scheduled_event.start_time,
      end_time: payload.payload.scheduled_event.end_time,
      timezone: payload.payload.invitee.timezone,
      status: payload.payload.invitee.canceled ? 'canceled' : 'scheduled'
    }

    // Send to Monitoring Manager for tracking
    const response = await callAIAgent({
      agentId: AGENTS.MONITORING_MANAGER,
      message: `Meeting ${payload.event}: ${JSON.stringify(meetingData, null, 2)}`
    })

    // Store in local database or state management
    await storeMeetingEvent(meetingData)

    return {
      success: true,
      message: 'Calendly webhook processed',
      data: response
    }
  } catch (error) {
    console.error('[Calendly Webhook] Error:', error)
    return {
      success: false,
      message: 'Failed to process Calendly webhook',
      error: error instanceof Error ? error.message : String(error)
    }
  }
}

// =============================================================================
// OTTER.AI WEBHOOK HANDLER
// =============================================================================

export interface OtterWebhookPayload {
  meeting_id: string
  title: string
  transcript: string
  summary?: string
  participants: Array<{
    name: string
    email?: string
    speaker_id: string
  }>
  start_time: string
  end_time: string
  duration_seconds: number
}

export async function handleOtterWebhook(payload: OtterWebhookPayload) {
  console.log('[Otter Webhook] Transcript received for:', payload.title)

  try {
    // Send transcript to Transcript Analyst
    const analysisResponse = await callAIAgent({
      agentId: AGENTS.TRANSCRIPT_ANALYST,
      message: `Analyze this meeting transcript:

Meeting: ${payload.title}
Duration: ${Math.floor(payload.duration_seconds / 60)} minutes
Participants: ${payload.participants.map(p => p.name).join(', ')}

Transcript:
${payload.transcript}

Extract:
1. Key objections mentioned
2. Champions identified (who showed strong interest)
3. Blockers (who raised concerns)
4. Winning phrases used
5. Action items and next steps
6. Pain points discussed
7. Budget/timeline signals`
    })

    // Store transcript and analysis
    await storeTranscriptAnalysis({
      meeting_id: payload.meeting_id,
      title: payload.title,
      transcript: payload.transcript,
      analysis: analysisResponse.result,
      timestamp: new Date().toISOString()
    })

    // Update voice library with winning phrases if any found
    if (analysisResponse.result?.winning_phrases) {
      await updateVoiceLibrary(analysisResponse.result.winning_phrases)
    }

    return {
      success: true,
      message: 'Transcript analyzed successfully',
      analysis: analysisResponse.result
    }
  } catch (error) {
    console.error('[Otter Webhook] Error:', error)
    return {
      success: false,
      message: 'Failed to analyze transcript',
      error: error instanceof Error ? error.message : String(error)
    }
  }
}

// =============================================================================
// FIREFLIES.AI WEBHOOK HANDLER
// =============================================================================

export interface FirefliesWebhookPayload {
  id: string
  title: string
  transcript: {
    sentences: Array<{
      speaker_name: string
      text: string
      start_time: number
      end_time: number
    }>
  }
  summary?: {
    overview: string
    action_items: string[]
    keywords: string[]
  }
  participants: string[]
  date: string
  duration: number
}

export async function handleFirefliesWebhook(payload: FirefliesWebhookPayload) {
  console.log('[Fireflies Webhook] Transcript received for:', payload.title)

  try {
    // Convert Fireflies format to text transcript
    const fullTranscript = payload.transcript.sentences
      .map(s => `${s.speaker_name}: ${s.text}`)
      .join('\n')

    // Send to Transcript Analyst (same as Otter)
    const analysisResponse = await callAIAgent({
      agentId: AGENTS.TRANSCRIPT_ANALYST,
      message: `Analyze this meeting transcript:

Meeting: ${payload.title}
Duration: ${Math.floor(payload.duration / 60)} minutes
Participants: ${payload.participants.join(', ')}

Transcript:
${fullTranscript}

${payload.summary ? `Summary: ${payload.summary.overview}` : ''}
${payload.summary?.action_items ? `Action Items: ${payload.summary.action_items.join(', ')}` : ''}

Extract:
1. Key objections mentioned
2. Champions identified
3. Blockers
4. Winning phrases
5. Next steps
6. Pain points
7. Budget/timeline signals`
    })

    await storeTranscriptAnalysis({
      meeting_id: payload.id,
      title: payload.title,
      transcript: fullTranscript,
      analysis: analysisResponse.result,
      timestamp: new Date().toISOString()
    })

    return {
      success: true,
      message: 'Fireflies transcript analyzed',
      analysis: analysisResponse.result
    }
  } catch (error) {
    console.error('[Fireflies Webhook] Error:', error)
    return {
      success: false,
      message: 'Failed to analyze Fireflies transcript',
      error: error instanceof Error ? error.message : String(error)
    }
  }
}

// =============================================================================
// SLACK INTERACTION HANDLER
// =============================================================================

export interface SlackInteractionPayload {
  type: 'block_actions' | 'view_submission'
  user: {
    id: string
    username: string
    name: string
  }
  actions?: Array<{
    action_id: string
    value: string
    type: string
  }>
  message?: {
    ts: string
    text: string
  }
}

export async function handleSlackInteraction(payload: SlackInteractionPayload) {
  console.log('[Slack Interaction] Action received:', payload.actions?.[0]?.action_id)

  try {
    if (payload.type === 'block_actions' && payload.actions) {
      const action = payload.actions[0]

      // Handle approval actions
      if (action.action_id.startsWith('approve_')) {
        const outreachId = action.value
        await handleApproval(outreachId, 'approved', payload.user.name)
        return { success: true, message: 'Message approved and queued for sending' }
      }

      if (action.action_id.startsWith('reject_')) {
        const outreachId = action.value
        await handleApproval(outreachId, 'rejected', payload.user.name)
        return { success: true, message: 'Message rejected' }
      }

      if (action.action_id.startsWith('edit_')) {
        const outreachId = action.value
        // Return modal for editing
        return {
          success: true,
          message: 'Edit in dashboard',
          redirect_url: `/approval-queue?edit=${outreachId}`
        }
      }
    }

    return { success: true, message: 'Interaction processed' }
  } catch (error) {
    console.error('[Slack Interaction] Error:', error)
    return {
      success: false,
      message: 'Failed to process Slack interaction',
      error: error instanceof Error ? error.message : String(error)
    }
  }
}

// =============================================================================
// GMAIL RESPONSE HANDLER (via Gmail API push notifications)
// =============================================================================

export interface GmailResponsePayload {
  emailData: {
    historyId: string
    message: {
      id: string
      threadId: string
      from: string
      to: string
      subject: string
      body: string
      timestamp: string
      inReplyTo?: string
    }
  }
}

export async function handleGmailResponse(payload: GmailResponsePayload) {
  console.log('[Gmail Response] New response received from:', payload.emailData.message.from)

  try {
    // Classify the response
    const classificationResponse = await callAIAgent({
      agentId: AGENTS.RESPONSE_CLASSIFIER,
      message: `Classify this email response:

From: ${payload.emailData.message.from}
Subject: ${payload.emailData.message.subject}
Body: ${payload.emailData.message.body}

Classify as:
- positive (interested, wants meeting)
- neutral (acknowledged, needs more info)
- objection (concerns raised)
- not_interested (clear no)
- out_of_office (auto-reply)

Also extract:
- Key signals (budget mentioned, timeline, decision maker involvement)
- Objections if any
- Recommended next action`
    })

    // Store classification
    await storeEmailResponse({
      message_id: payload.emailData.message.id,
      thread_id: payload.emailData.message.threadId,
      from: payload.emailData.message.from,
      classification: classificationResponse.result,
      timestamp: payload.emailData.message.timestamp
    })

    // If positive response, notify via Slack
    if (classificationResponse.result?.classification === 'positive') {
      await sendSlackNotification({
        channel: '#revenue-approvals',
        message: `Positive response received from ${payload.emailData.message.from}!`,
        data: classificationResponse.result
      })
    }

    return {
      success: true,
      classification: classificationResponse.result
    }
  } catch (error) {
    console.error('[Gmail Response] Error:', error)
    return {
      success: false,
      message: 'Failed to classify email response',
      error: error instanceof Error ? error.message : String(error)
    }
  }
}

// =============================================================================
// STORAGE HELPERS (Local Storage / IndexedDB / Database)
// =============================================================================

async function storeMeetingEvent(data: any) {
  // Store in localStorage for now, replace with actual database
  const meetings = JSON.parse(localStorage.getItem('meetings') || '[]')
  meetings.push({ ...data, id: Date.now() })
  localStorage.setItem('meetings', JSON.stringify(meetings))
}

async function storeTranscriptAnalysis(data: any) {
  const transcripts = JSON.parse(localStorage.getItem('transcripts') || '[]')
  transcripts.push(data)
  localStorage.setItem('transcripts', JSON.stringify(transcripts))
}

async function storeEmailResponse(data: any) {
  const responses = JSON.parse(localStorage.getItem('email_responses') || '[]')
  responses.push(data)
  localStorage.setItem('email_responses', JSON.stringify(responses))
}

async function updateVoiceLibrary(phrases: string[]) {
  const library = JSON.parse(localStorage.getItem('voice_library') || '[]')
  phrases.forEach(phrase => {
    if (!library.find((p: any) => p.phrase === phrase)) {
      library.push({
        phrase,
        success_rate: 0,
        use_count: 1,
        added_at: new Date().toISOString()
      })
    }
  })
  localStorage.setItem('voice_library', JSON.stringify(library))
}

async function handleApproval(outreachId: string, status: string, approvedBy: string) {
  const approvals = JSON.parse(localStorage.getItem('approvals') || '{}')
  approvals[outreachId] = {
    status,
    approved_by: approvedBy,
    approved_at: new Date().toISOString()
  }
  localStorage.setItem('approvals', JSON.stringify(approvals))

  // If approved, trigger send via Gmail
  if (status === 'approved') {
    // This would call the Gmail sending agent
    console.log(`[Approval] Message ${outreachId} approved, queuing for send`)
  }
}

async function sendSlackNotification(params: {
  channel: string
  message: string
  data?: any
}) {
  // This would use Slack webhook or API
  console.log(`[Slack] Sending notification to ${params.channel}:`, params.message)
  // Actual implementation would POST to Slack webhook URL
}

// =============================================================================
// WEBHOOK VERIFICATION (Security)
// =============================================================================

export function verifyCalendlyWebhook(
  payload: string,
  signature: string,
  secret: string
): boolean {
  // Implement HMAC verification for Calendly webhooks
  // This prevents unauthorized webhook calls
  return true // Placeholder
}

export function verifyOtterWebhook(
  payload: string,
  signature: string,
  secret: string
): boolean {
  return true // Placeholder
}

export function verifySlackRequest(
  timestamp: string,
  signature: string,
  body: string,
  signingSecret: string
): boolean {
  // Slack verification: https://api.slack.com/authentication/verifying-requests-from-slack
  return true // Placeholder
}
