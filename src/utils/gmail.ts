/**
 * Gmail Integration Utility
 * Handles sending approved outreach, tracking, and response monitoring
 */

import { callAIAgent } from './aiAgent'

const AGENTS = {
  RESPONSE_CLASSIFIER: '696ee9fa3bd35d7a6606a53b',
  MONITORING_MANAGER: '696eeacdb50537828e0aff83'
}

export interface EmailConfig {
  dailyLimit: number
  sendingSchedule: {
    startTime: string // "09:00"
    endTime: string // "17:00"
  }
  trackOpens: boolean
  trackClicks: boolean
  warmupEnabled: boolean
}

export interface OutreachEmail {
  to: string
  subject: string
  body: string
  accountId?: string
  outreachId?: string
  personalization?: Record<string, any>
}

export interface EmailSendResult {
  success: boolean
  messageId?: string
  error?: string
  scheduledFor?: string
}

// Default configuration
const DEFAULT_CONFIG: EmailConfig = {
  dailyLimit: 50,
  sendingSchedule: {
    startTime: '09:00',
    endTime: '17:00'
  },
  trackOpens: true,
  trackClicks: true,
  warmupEnabled: true
}

/**
 * Get current email configuration
 */
export function getEmailConfig(): EmailConfig {
  const stored = localStorage.getItem('gmail_config')
  return stored ? JSON.parse(stored) : DEFAULT_CONFIG
}

/**
 * Update email configuration
 */
export function updateEmailConfig(config: Partial<EmailConfig>): void {
  const current = getEmailConfig()
  const updated = { ...current, ...config }
  localStorage.setItem('gmail_config', JSON.stringify(updated))
}

/**
 * Get warmup schedule based on account age
 */
export function getWarmupLimit(): number {
  const accountAge = getAccountAgeInDays()

  if (accountAge < 7) return 10
  if (accountAge < 14) return 25
  if (accountAge < 21) return 50
  return 100
}

function getAccountAgeInDays(): number {
  const firstSend = localStorage.getItem('gmail_first_send_date')
  if (!firstSend) {
    localStorage.setItem('gmail_first_send_date', new Date().toISOString())
    return 0
  }

  const firstSendDate = new Date(firstSend)
  const now = new Date()
  const diffTime = Math.abs(now.getTime() - firstSendDate.getTime())
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  return diffDays
}

/**
 * Check if currently within sending window
 */
export function isWithinSendingWindow(): boolean {
  const config = getEmailConfig()
  const now = new Date()
  const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`

  return currentTime >= config.sendingSchedule.startTime &&
         currentTime <= config.sendingSchedule.endTime
}

/**
 * Get today's sent count
 */
export function getTodaySentCount(): number {
  const today = new Date().toDateString()
  const sentToday = localStorage.getItem(`gmail_sent_${today}`)
  return sentToday ? parseInt(sentToday) : 0
}

/**
 * Increment today's sent count
 */
function incrementSentCount(): void {
  const today = new Date().toDateString()
  const current = getTodaySentCount()
  localStorage.setItem(`gmail_sent_${today}`, (current + 1).toString())
}

/**
 * Check if can send more emails today
 */
export function canSendToday(): boolean {
  const config = getEmailConfig()
  const warmupLimit = config.warmupEnabled ? getWarmupLimit() : config.dailyLimit
  const sentToday = getTodaySentCount()

  return sentToday < Math.min(warmupLimit, config.dailyLimit)
}

/**
 * Send an approved outreach email
 */
export async function sendOutreachEmail(email: OutreachEmail): Promise<EmailSendResult> {
  try {
    // Validate sending constraints
    if (!canSendToday()) {
      return {
        success: false,
        error: 'Daily sending limit reached'
      }
    }

    if (!isWithinSendingWindow()) {
      const nextWindow = getNextSendingWindow()
      return {
        success: false,
        error: 'Outside sending window',
        scheduledFor: nextWindow
      }
    }

    // Add tracking pixels if enabled
    const config = getEmailConfig()
    let processedBody = email.body

    if (config.trackOpens) {
      const trackingPixel = `<img src="https://track.yourapp.com/open/${email.outreachId}" width="1" height="1" />`
      processedBody = `${processedBody}\n\n${trackingPixel}`
    }

    if (config.trackClicks) {
      processedBody = addClickTracking(processedBody, email.outreachId || '')
    }

    // In production, this would use Gmail API
    // For now, we'll simulate the send
    const messageId = await simulateGmailSend({
      to: email.to,
      subject: email.subject,
      body: processedBody
    })

    // Increment sent count
    incrementSentCount()

    // Store sent email
    storeSentEmail({
      messageId,
      ...email,
      sentAt: new Date().toISOString()
    })

    // Notify Monitoring Manager
    await callAIAgent({
      agentId: AGENTS.MONITORING_MANAGER,
      message: `Email sent to ${email.to}. Subject: ${email.subject}. Track message ID: ${messageId}`
    })

    return {
      success: true,
      messageId
    }
  } catch (error) {
    console.error('[Gmail] Send error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * Batch send multiple emails with rate limiting
 */
export async function batchSendEmails(emails: OutreachEmail[]): Promise<EmailSendResult[]> {
  const results: EmailSendResult[] = []

  for (const email of emails) {
    if (!canSendToday()) {
      results.push({
        success: false,
        error: 'Daily limit reached',
        scheduledFor: getNextSendingWindow()
      })
      continue
    }

    const result = await sendOutreachEmail(email)
    results.push(result)

    // Rate limiting: 1 email per 2 seconds
    await new Promise(resolve => setTimeout(resolve, 2000))
  }

  return results
}

/**
 * Process incoming Gmail response
 */
export async function processEmailResponse(emailData: {
  messageId: string
  threadId: string
  from: string
  subject: string
  body: string
  timestamp: string
  inReplyTo?: string
}) {
  try {
    // Find original outreach
    const originalEmail = findOriginalEmail(emailData.threadId)

    // Classify response using Response Classifier agent
    const classification = await callAIAgent({
      agentId: AGENTS.RESPONSE_CLASSIFIER,
      message: `Classify this email response:

From: ${emailData.from}
Subject: ${emailData.subject}
Body: ${emailData.body}

Original outreach context:
${originalEmail ? `Subject: ${originalEmail.subject}\nSent: ${originalEmail.sentAt}` : 'Unknown'}

Classify as:
- positive (interested, wants meeting)
- neutral (acknowledged, needs more info)
- objection (concerns raised)
- not_interested (clear no)
- out_of_office (auto-reply)

Also extract:
- Key signals (budget, timeline, decision maker involvement)
- Objections if any
- Recommended next action`
    })

    // Store classification
    storeEmailResponse({
      messageId: emailData.messageId,
      threadId: emailData.threadId,
      from: emailData.from,
      classification: classification.result,
      timestamp: emailData.timestamp,
      originalOutreachId: originalEmail?.outreachId
    })

    return classification.result
  } catch (error) {
    console.error('[Gmail] Response processing error:', error)
    throw error
  }
}

/**
 * Get email statistics
 */
export function getEmailStats() {
  const sentEmails = JSON.parse(localStorage.getItem('sent_emails') || '[]')
  const responses = JSON.parse(localStorage.getItem('email_responses') || '[]')

  const totalSent = sentEmails.length
  const totalResponses = responses.length
  const responseRate = totalSent > 0 ? (totalResponses / totalSent) * 100 : 0

  const positiveResponses = responses.filter(
    (r: any) => r.classification?.classification === 'positive'
  ).length

  const neutralResponses = responses.filter(
    (r: any) => r.classification?.classification === 'neutral'
  ).length

  const objections = responses.filter(
    (r: any) => r.classification?.classification === 'objection'
  ).length

  return {
    totalSent,
    totalResponses,
    responseRate,
    positiveResponses,
    neutralResponses,
    objections,
    sentToday: getTodaySentCount(),
    dailyLimit: Math.min(getWarmupLimit(), getEmailConfig().dailyLimit),
    canSendMore: canSendToday()
  }
}

// =============================================================================
// Helper Functions
// =============================================================================

function getNextSendingWindow(): string {
  const config = getEmailConfig()
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  tomorrow.setHours(parseInt(config.sendingSchedule.startTime.split(':')[0]))
  tomorrow.setMinutes(parseInt(config.sendingSchedule.startTime.split(':')[1]))
  return tomorrow.toISOString()
}

function addClickTracking(body: string, outreachId: string): string {
  // Replace all URLs with tracking URLs
  const urlRegex = /(https?:\/\/[^\s]+)/g
  return body.replace(urlRegex, (url) => {
    const trackingUrl = `https://track.yourapp.com/click/${outreachId}?url=${encodeURIComponent(url)}`
    return trackingUrl
  })
}

async function simulateGmailSend(email: {
  to: string
  subject: string
  body: string
}): Promise<string> {
  // In production, this would use Gmail API:
  // const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
  //   method: 'POST',
  //   headers: {
  //     'Authorization': `Bearer ${accessToken}`,
  //     'Content-Type': 'application/json'
  //   },
  //   body: JSON.stringify({
  //     raw: btoa(`To: ${email.to}\nSubject: ${email.subject}\n\n${email.body}`)
  //   })
  // })

  console.log('[Gmail] Simulating send to:', email.to)
  return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

function storeSentEmail(data: any): void {
  const sentEmails = JSON.parse(localStorage.getItem('sent_emails') || '[]')
  sentEmails.push(data)
  localStorage.setItem('sent_emails', JSON.stringify(sentEmails))
}

function storeEmailResponse(data: any): void {
  const responses = JSON.parse(localStorage.getItem('email_responses') || '[]')
  responses.push(data)
  localStorage.setItem('email_responses', JSON.stringify(responses))
}

function findOriginalEmail(threadId: string): any {
  const sentEmails = JSON.parse(localStorage.getItem('sent_emails') || '[]')
  return sentEmails.find((email: any) => email.messageId === threadId || email.threadId === threadId)
}

/**
 * Setup Gmail API push notifications for responses
 * This enables real-time response detection
 */
export async function setupGmailPushNotifications(): Promise<void> {
  // In production, this would call Gmail API:
  // POST https://gmail.googleapis.com/gmail/v1/users/me/watch
  // {
  //   "topicName": "projects/your-project/topics/gmail-responses",
  //   "labelIds": ["INBOX"]
  // }

  console.log('[Gmail] Push notifications would be set up here')
}

/**
 * Revoke Gmail access (disconnect)
 */
export async function disconnectGmail(): Promise<void> {
  localStorage.removeItem('gmail_config')
  localStorage.removeItem('gmail_first_send_date')
  localStorage.removeItem('sent_emails')
  localStorage.removeItem('email_responses')
  console.log('[Gmail] Disconnected and cleared data')
}
