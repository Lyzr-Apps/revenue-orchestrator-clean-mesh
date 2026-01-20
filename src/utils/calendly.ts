/**
 * Calendly Integration Utility
 * Handles meeting booking webhooks and pre-meeting research
 */

import { callAIAgent } from './aiAgent'

const AGENTS = {
  MONITORING_MANAGER: '696eeacdb50537828e0aff83',
  RESEARCH_MANAGER: '696eeaf33bd35d7a6606a54c'
}

export interface CalendlyConfig {
  webhookUrl?: string
  enablePreMeetingResearch: boolean
  preMeetingEmailEnabled: boolean
  autoUpdateCRM: boolean
}

export interface CalendlyMeeting {
  eventId: string
  eventType: string
  inviteeName: string
  inviteeEmail: string
  startTime: string
  endTime: string
  timezone: string
  status: 'scheduled' | 'canceled' | 'rescheduled'
  meetingType: string
  duration: number
  location?: {
    type: string
    location?: string
  }
}

// Default configuration
const DEFAULT_CONFIG: CalendlyConfig = {
  enablePreMeetingResearch: true,
  preMeetingEmailEnabled: true,
  autoUpdateCRM: true
}

/**
 * Get Calendly configuration
 */
export function getCalendlyConfig(): CalendlyConfig {
  const stored = localStorage.getItem('calendly_config')
  return stored ? JSON.parse(stored) : DEFAULT_CONFIG
}

/**
 * Update Calendly configuration
 */
export function updateCalendlyConfig(config: Partial<CalendlyConfig>): void {
  const current = getCalendlyConfig()
  const updated = { ...current, ...config }
  localStorage.setItem('calendly_config', JSON.stringify(updated))
}

/**
 * Process Calendly meeting booking
 */
export async function processMeetingBooked(meeting: CalendlyMeeting): Promise<void> {
  const config = getCalendlyConfig()

  // Store meeting
  storeMeeting(meeting)

  // Notify Monitoring Manager
  await callAIAgent({
    agentId: AGENTS.MONITORING_MANAGER,
    message: `Meeting booked via Calendly:

Invitee: ${meeting.inviteeName} (${meeting.inviteeEmail})
Meeting Type: ${meeting.meetingType}
Time: ${new Date(meeting.startTime).toLocaleString()}
Duration: ${meeting.duration} minutes
Status: ${meeting.status}

Track this meeting and coordinate pre-meeting preparation.`
  })

  // Trigger pre-meeting research if enabled
  if (config.enablePreMeetingResearch) {
    await triggerPreMeetingResearch(meeting)
  }

  // Send pre-meeting email if enabled
  if (config.preMeetingEmailEnabled) {
    await sendPreMeetingEmail(meeting)
  }

  console.log(`[Calendly] Meeting booked: ${meeting.inviteeName} at ${meeting.startTime}`)
}

/**
 * Process meeting cancellation
 */
export async function processMeetingCanceled(meeting: CalendlyMeeting): Promise<void> {
  // Update meeting status
  updateMeetingStatus(meeting.eventId, 'canceled')

  // Notify Monitoring Manager
  await callAIAgent({
    agentId: AGENTS.MONITORING_MANAGER,
    message: `Meeting canceled:

Invitee: ${meeting.inviteeName}
Original Time: ${new Date(meeting.startTime).toLocaleString()}
Meeting Type: ${meeting.meetingType}

Update tracking and flag for follow-up.`
  })

  console.log(`[Calendly] Meeting canceled: ${meeting.inviteeName}`)
}

/**
 * Process meeting rescheduled
 */
export async function processMeetingRescheduled(meeting: CalendlyMeeting): Promise<void> {
  const config = getCalendlyConfig()

  // Update meeting
  updateMeeting(meeting)

  // Notify Monitoring Manager
  await callAIAgent({
    agentId: AGENTS.MONITORING_MANAGER,
    message: `Meeting rescheduled:

Invitee: ${meeting.inviteeName}
New Time: ${new Date(meeting.startTime).toLocaleString()}
Meeting Type: ${meeting.meetingType}

Update tracking and refresh pre-meeting research if needed.`
  })

  // Re-trigger pre-meeting research if enabled
  if (config.enablePreMeetingResearch) {
    await triggerPreMeetingResearch(meeting)
  }

  console.log(`[Calendly] Meeting rescheduled: ${meeting.inviteeName} to ${meeting.startTime}`)
}

/**
 * Trigger pre-meeting research
 */
async function triggerPreMeetingResearch(meeting: CalendlyMeeting): Promise<void> {
  try {
    // Extract domain from email
    const domain = meeting.inviteeEmail.split('@')[1]

    // Call Research Manager to gather intelligence
    const research = await callAIAgent({
      agentId: AGENTS.RESEARCH_MANAGER,
      message: `Pre-meeting research needed:

Contact: ${meeting.inviteeName}
Email: ${meeting.inviteeEmail}
Company Domain: ${domain}
Meeting Time: ${new Date(meeting.startTime).toLocaleString()}
Meeting Type: ${meeting.meetingType}

Research:
1. Company background and recent news
2. Contact's LinkedIn profile and recent activity
3. Potential pain points based on industry
4. Relevant talking points
5. Questions to ask during the meeting

Provide concise, actionable intelligence for meeting preparation.`
    })

    // Store research results
    storePreMeetingResearch({
      eventId: meeting.eventId,
      inviteeName: meeting.inviteeName,
      research: research.result,
      timestamp: new Date().toISOString()
    })

    console.log(`[Calendly] Pre-meeting research completed for ${meeting.inviteeName}`)
  } catch (error) {
    console.error('[Calendly] Pre-meeting research error:', error)
  }
}

/**
 * Send pre-meeting preparation email
 */
async function sendPreMeetingEmail(meeting: CalendlyMeeting): Promise<void> {
  // In production, this would send an email via Gmail API
  // For now, we'll log the intent

  const research = getPreMeetingResearch(meeting.eventId)

  const emailContent = {
    to: meeting.inviteeEmail,
    subject: `Looking forward to our meeting on ${new Date(meeting.startTime).toLocaleDateString()}`,
    body: `Hi ${meeting.inviteeName},

I'm looking forward to our ${meeting.meetingType} on ${new Date(meeting.startTime).toLocaleString()}.

To make the most of our time together, I've done some research on ${meeting.inviteeEmail.split('@')[1]} and have a few thoughts I'd like to discuss.

${research ? `Based on my research:\n${formatResearchForEmail(research)}` : ''}

See you soon!

Best regards`
  }

  console.log('[Calendly] Would send pre-meeting email:', emailContent)

  // Store email record
  storePreMeetingEmail({
    eventId: meeting.eventId,
    emailContent,
    timestamp: new Date().toISOString()
  })
}

/**
 * Get upcoming meetings
 */
export function getUpcomingMeetings(): CalendlyMeeting[] {
  const meetings = JSON.parse(localStorage.getItem('calendly_meetings') || '[]')
  const now = new Date()

  return meetings
    .filter((m: CalendlyMeeting) =>
      m.status === 'scheduled' && new Date(m.startTime) > now
    )
    .sort((a: CalendlyMeeting, b: CalendlyMeeting) =>
      new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
    )
}

/**
 * Get meeting by event ID
 */
export function getMeeting(eventId: string): CalendlyMeeting | null {
  const meetings = JSON.parse(localStorage.getItem('calendly_meetings') || '[]')
  return meetings.find((m: CalendlyMeeting) => m.eventId === eventId) || null
}

/**
 * Get pre-meeting research for a meeting
 */
export function getPreMeetingResearch(eventId: string): any {
  const research = JSON.parse(localStorage.getItem('pre_meeting_research') || '[]')
  const meetingResearch = research.find((r: any) => r.eventId === eventId)
  return meetingResearch?.research || null
}

/**
 * Get Calendly statistics
 */
export function getCalendlyStats() {
  const meetings = JSON.parse(localStorage.getItem('calendly_meetings') || '[]')
  const now = new Date()

  const scheduled = meetings.filter((m: CalendlyMeeting) =>
    m.status === 'scheduled' && new Date(m.startTime) > now
  ).length

  const completed = meetings.filter((m: CalendlyMeeting) =>
    m.status === 'scheduled' && new Date(m.startTime) < now
  ).length

  const canceled = meetings.filter((m: CalendlyMeeting) =>
    m.status === 'canceled'
  ).length

  const today = new Date().toDateString()
  const todayMeetings = meetings.filter((m: CalendlyMeeting) =>
    new Date(m.startTime).toDateString() === today && m.status === 'scheduled'
  ).length

  return {
    scheduled,
    completed,
    canceled,
    todayMeetings,
    total: meetings.length,
    upcomingNext24h: meetings.filter((m: CalendlyMeeting) => {
      const meetingTime = new Date(m.startTime)
      const next24h = new Date(now.getTime() + 24 * 60 * 60 * 1000)
      return m.status === 'scheduled' && meetingTime > now && meetingTime < next24h
    }).length
  }
}

// =============================================================================
// Helper Functions
// =============================================================================

function storeMeeting(meeting: CalendlyMeeting): void {
  const meetings = JSON.parse(localStorage.getItem('calendly_meetings') || '[]')
  meetings.push({
    ...meeting,
    createdAt: new Date().toISOString()
  })
  localStorage.setItem('calendly_meetings', JSON.stringify(meetings))
}

function updateMeetingStatus(eventId: string, status: CalendlyMeeting['status']): void {
  const meetings = JSON.parse(localStorage.getItem('calendly_meetings') || '[]')
  const updated = meetings.map((m: any) =>
    m.eventId === eventId ? { ...m, status, updatedAt: new Date().toISOString() } : m
  )
  localStorage.setItem('calendly_meetings', JSON.stringify(updated))
}

function updateMeeting(meeting: CalendlyMeeting): void {
  const meetings = JSON.parse(localStorage.getItem('calendly_meetings') || '[]')
  const updated = meetings.map((m: any) =>
    m.eventId === meeting.eventId
      ? { ...meeting, updatedAt: new Date().toISOString() }
      : m
  )
  localStorage.setItem('calendly_meetings', JSON.stringify(updated))
}

function storePreMeetingResearch(data: any): void {
  const research = JSON.parse(localStorage.getItem('pre_meeting_research') || '[]')
  research.push(data)
  localStorage.setItem('pre_meeting_research', JSON.stringify(research))
}

function storePreMeetingEmail(data: any): void {
  const emails = JSON.parse(localStorage.getItem('pre_meeting_emails') || '[]')
  emails.push(data)
  localStorage.setItem('pre_meeting_emails', JSON.stringify(emails))
}

function formatResearchForEmail(research: any): string {
  if (typeof research === 'string') return research

  // Format research object into readable text
  const points = []

  if (research.company_background) {
    points.push(`Company Background: ${research.company_background}`)
  }

  if (research.recent_news) {
    points.push(`Recent News: ${research.recent_news}`)
  }

  if (research.pain_points) {
    points.push(`Potential Pain Points: ${research.pain_points}`)
  }

  if (research.talking_points) {
    points.push(`Talking Points: ${research.talking_points}`)
  }

  return points.join('\n\n')
}

/**
 * Setup Calendly webhook
 */
export function setupCalendlyWebhook(webhookUrl: string): void {
  updateCalendlyConfig({ webhookUrl })
  console.log('[Calendly] Webhook URL configured:', webhookUrl)
}

/**
 * Test Calendly connection
 */
export async function testCalendlyConnection(): Promise<{ success: boolean; message: string }> {
  // In production, this would verify webhook configuration
  const config = getCalendlyConfig()

  if (!config.webhookUrl) {
    return {
      success: false,
      message: 'Webhook URL not configured'
    }
  }

  return {
    success: true,
    message: 'Calendly webhook configured'
  }
}

/**
 * Disconnect Calendly integration
 */
export async function disconnectCalendly(): Promise<void> {
  localStorage.removeItem('calendly_config')
  localStorage.removeItem('calendly_meetings')
  localStorage.removeItem('pre_meeting_research')
  localStorage.removeItem('pre_meeting_emails')
  console.log('[Calendly] Disconnected and cleared data')
}
