/**
 * LinkedIn Integration Utility
 * Handles connection requests, InMail, engagement with safety limits
 */

import { callAIAgent } from './aiAgent'

const AGENTS = {
  LINKEDIN_ORCHESTRATOR: '696eea5cb50537828e0aff79',
  COMPUTER_USE_AGENT: '696eea8f3bd35d7a6606a544'
}

export interface LinkedInConfig {
  dailyConnectionLimit: number
  dailyInMailLimit: number
  actionDelayMinutes: number
  sendingSchedule: {
    startTime: string
    endTime: string
  }
  enableEngagement: boolean
  safetyLimitsEnabled: boolean
}

export interface ConnectionRequest {
  profileUrl: string
  firstName: string
  lastName: string
  headline?: string
  message: string
  accountId?: string
}

export interface InMailMessage {
  profileUrl: string
  subject: string
  body: string
  accountId?: string
}

export interface LinkedInActionResult {
  success: boolean
  actionId?: string
  error?: string
  scheduledFor?: string
}

// Default safety configuration
const DEFAULT_CONFIG: LinkedInConfig = {
  dailyConnectionLimit: 15,
  dailyInMailLimit: 10,
  actionDelayMinutes: 120, // 2 hours between actions
  sendingSchedule: {
    startTime: '09:00',
    endTime: '17:00'
  },
  enableEngagement: true,
  safetyLimitsEnabled: true
}

/**
 * Get LinkedIn configuration
 */
export function getLinkedInConfig(): LinkedInConfig {
  const stored = localStorage.getItem('linkedin_config')
  return stored ? JSON.parse(stored) : DEFAULT_CONFIG
}

/**
 * Update LinkedIn configuration
 */
export function updateLinkedInConfig(config: Partial<LinkedInConfig>): void {
  const current = getLinkedInConfig()
  const updated = { ...current, ...config }
  localStorage.setItem('linkedin_config', JSON.stringify(updated))
}

/**
 * Get today's action counts
 */
export function getTodayLinkedInStats() {
  const today = new Date().toDateString()
  const connections = parseInt(localStorage.getItem(`linkedin_connections_${today}`) || '0')
  const inmails = parseInt(localStorage.getItem(`linkedin_inmails_${today}`) || '0')

  return {
    connections,
    inmails
  }
}

/**
 * Check if can perform LinkedIn action today
 */
export function canPerformAction(actionType: 'connection' | 'inmail'): boolean {
  const config = getLinkedInConfig()

  if (!config.safetyLimitsEnabled) return true

  const stats = getTodayLinkedInStats()

  if (actionType === 'connection') {
    return stats.connections < config.dailyConnectionLimit
  } else {
    return stats.inmails < config.dailyInMailLimit
  }
}

/**
 * Check if within sending window
 */
export function isWithinLinkedInWindow(): boolean {
  const config = getLinkedInConfig()
  const now = new Date()
  const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`

  return currentTime >= config.sendingSchedule.startTime &&
         currentTime <= config.sendingSchedule.endTime
}

/**
 * Get last action timestamp
 */
function getLastActionTime(): Date | null {
  const lastAction = localStorage.getItem('linkedin_last_action')
  return lastAction ? new Date(lastAction) : null
}

/**
 * Check if enough time has passed since last action
 */
function canPerformActionNow(): boolean {
  const config = getLinkedInConfig()
  const lastAction = getLastActionTime()

  if (!lastAction) return true

  const now = new Date()
  const minutesSinceLastAction = (now.getTime() - lastAction.getTime()) / (1000 * 60)

  return minutesSinceLastAction >= config.actionDelayMinutes
}

/**
 * Update last action timestamp
 */
function updateLastActionTime(): void {
  localStorage.setItem('linkedin_last_action', new Date().toISOString())
}

/**
 * Increment action count
 */
function incrementActionCount(actionType: 'connection' | 'inmail'): void {
  const today = new Date().toDateString()
  const key = `linkedin_${actionType}s_${today}`
  const current = parseInt(localStorage.getItem(key) || '0')
  localStorage.setItem(key, (current + 1).toString())
}

/**
 * Send LinkedIn connection request
 */
export async function sendConnectionRequest(request: ConnectionRequest): Promise<LinkedInActionResult> {
  try {
    // Check safety limits
    if (!canPerformAction('connection')) {
      return {
        success: false,
        error: 'Daily connection limit reached',
        scheduledFor: getNextWindow()
      }
    }

    if (!isWithinLinkedInWindow()) {
      return {
        success: false,
        error: 'Outside sending window',
        scheduledFor: getNextWindow()
      }
    }

    if (!canPerformActionNow()) {
      const nextAvailable = getNextAvailableTime()
      return {
        success: false,
        error: 'Action delay not met',
        scheduledFor: nextAvailable
      }
    }

    // Call LinkedIn Orchestrator agent
    const response = await callAIAgent({
      agentId: AGENTS.LINKEDIN_ORCHESTRATOR,
      message: `Send connection request:

Profile: ${request.profileUrl}
Name: ${request.firstName} ${request.lastName}
Headline: ${request.headline || 'N/A'}
Message: ${request.message}

Use Composio LinkedIn tool to send connection request with the personalized message.`
    })

    if (response.status === 'success') {
      // Update counters
      incrementActionCount('connection')
      updateLastActionTime()

      // Store action
      storeLinkedInAction({
        type: 'connection',
        profileUrl: request.profileUrl,
        message: request.message,
        timestamp: new Date().toISOString(),
        result: response.result
      })

      return {
        success: true,
        actionId: `conn_${Date.now()}`
      }
    } else {
      return {
        success: false,
        error: response.message || 'Failed to send connection request'
      }
    }
  } catch (error) {
    console.error('[LinkedIn] Connection request error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * Send LinkedIn InMail
 */
export async function sendInMail(inmail: InMailMessage): Promise<LinkedInActionResult> {
  try {
    // Check safety limits
    if (!canPerformAction('inmail')) {
      return {
        success: false,
        error: 'Daily InMail limit reached',
        scheduledFor: getNextWindow()
      }
    }

    if (!isWithinLinkedInWindow()) {
      return {
        success: false,
        error: 'Outside sending window',
        scheduledFor: getNextWindow()
      }
    }

    if (!canPerformActionNow()) {
      return {
        success: false,
        error: 'Action delay not met',
        scheduledFor: getNextAvailableTime()
      }
    }

    // Call LinkedIn Orchestrator agent
    const response = await callAIAgent({
      agentId: AGENTS.LINKEDIN_ORCHESTRATOR,
      message: `Send InMail message:

Profile: ${inmail.profileUrl}
Subject: ${inmail.subject}
Body: ${inmail.body}

Use Composio LinkedIn tool to send InMail.`
    })

    if (response.status === 'success') {
      // Update counters
      incrementActionCount('inmail')
      updateLastActionTime()

      // Store action
      storeLinkedInAction({
        type: 'inmail',
        profileUrl: inmail.profileUrl,
        subject: inmail.subject,
        body: inmail.body,
        timestamp: new Date().toISOString(),
        result: response.result
      })

      return {
        success: true,
        actionId: `inmail_${Date.now()}`
      }
    } else {
      return {
        success: false,
        error: response.message || 'Failed to send InMail'
      }
    }
  } catch (error) {
    console.error('[LinkedIn] InMail error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * Batch send connection requests with safety limits
 */
export async function batchSendConnections(requests: ConnectionRequest[]): Promise<LinkedInActionResult[]> {
  const results: LinkedInActionResult[] = []
  const config = getLinkedInConfig()

  for (const request of requests) {
    if (!canPerformAction('connection')) {
      results.push({
        success: false,
        error: 'Daily limit reached',
        scheduledFor: getNextWindow()
      })
      continue
    }

    const result = await sendConnectionRequest(request)
    results.push(result)

    if (result.success) {
      // Add randomized delay between actions (safety)
      const delayMs = config.actionDelayMinutes * 60 * 1000
      const randomDelay = delayMs + (Math.random() * 30 * 60 * 1000) // +0-30 min
      await new Promise(resolve => setTimeout(resolve, randomDelay))
    }
  }

  return results
}

/**
 * Engage with LinkedIn post (like, comment)
 */
export async function engageWithPost(params: {
  postUrl: string
  action: 'like' | 'comment'
  comment?: string
}): Promise<LinkedInActionResult> {
  try {
    const config = getLinkedInConfig()

    if (!config.enableEngagement) {
      return {
        success: false,
        error: 'Engagement disabled in settings'
      }
    }

    if (!canPerformActionNow()) {
      return {
        success: false,
        error: 'Action delay not met',
        scheduledFor: getNextAvailableTime()
      }
    }

    // Call LinkedIn Orchestrator agent
    const response = await callAIAgent({
      agentId: AGENTS.LINKEDIN_ORCHESTRATOR,
      message: `Engage with LinkedIn post:

Post URL: ${params.postUrl}
Action: ${params.action}
${params.comment ? `Comment: ${params.comment}` : ''}

Use Composio LinkedIn tool to ${params.action === 'like' ? 'like the post' : 'comment on the post'}.`
    })

    if (response.status === 'success') {
      updateLastActionTime()

      storeLinkedInAction({
        type: 'engagement',
        postUrl: params.postUrl,
        action: params.action,
        comment: params.comment,
        timestamp: new Date().toISOString(),
        result: response.result
      })

      return {
        success: true,
        actionId: `engage_${Date.now()}`
      }
    } else {
      return {
        success: false,
        error: response.message || 'Failed to engage with post'
      }
    }
  } catch (error) {
    console.error('[LinkedIn] Engagement error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * Use Computer Use Agent for advanced LinkedIn automation
 * (Fallback when API limits are reached)
 */
export async function performAdvancedAction(params: {
  action: string
  details: string
}): Promise<LinkedInActionResult> {
  try {
    const response = await callAIAgent({
      agentId: AGENTS.COMPUTER_USE_AGENT,
      message: `Perform LinkedIn action using browser automation:

Action: ${params.action}
Details: ${params.details}

Use computer use capabilities to navigate LinkedIn and complete the action safely.`
    })

    if (response.status === 'success') {
      updateLastActionTime()

      return {
        success: true,
        actionId: `advanced_${Date.now()}`
      }
    } else {
      return {
        success: false,
        error: response.message || 'Failed to perform advanced action'
      }
    }
  } catch (error) {
    console.error('[LinkedIn] Advanced action error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * Get LinkedIn statistics
 */
export function getLinkedInStats() {
  const stats = getTodayLinkedInStats()
  const config = getLinkedInConfig()
  const actions = JSON.parse(localStorage.getItem('linkedin_actions') || '[]')

  const totalConnections = actions.filter((a: any) => a.type === 'connection').length
  const totalInMails = actions.filter((a: any) => a.type === 'inmail').length
  const totalEngagements = actions.filter((a: any) => a.type === 'engagement').length

  return {
    today: stats,
    total: {
      connections: totalConnections,
      inmails: totalInMails,
      engagements: totalEngagements
    },
    limits: {
      connections: config.dailyConnectionLimit,
      inmails: config.dailyInMailLimit
    },
    canSendConnection: canPerformAction('connection'),
    canSendInMail: canPerformAction('inmail'),
    nextAvailableAction: getNextAvailableTime()
  }
}

// =============================================================================
// Helper Functions
// =============================================================================

function getNextWindow(): string {
  const config = getLinkedInConfig()
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  tomorrow.setHours(parseInt(config.sendingSchedule.startTime.split(':')[0]))
  tomorrow.setMinutes(parseInt(config.sendingSchedule.startTime.split(':')[1]))
  return tomorrow.toISOString()
}

function getNextAvailableTime(): string {
  const config = getLinkedInConfig()
  const lastAction = getLastActionTime()

  if (!lastAction) return new Date().toISOString()

  const nextAvailable = new Date(lastAction.getTime() + config.actionDelayMinutes * 60 * 1000)
  return nextAvailable.toISOString()
}

function storeLinkedInAction(data: any): void {
  const actions = JSON.parse(localStorage.getItem('linkedin_actions') || '[]')
  actions.push(data)
  localStorage.setItem('linkedin_actions', JSON.stringify(actions))
}

/**
 * Disconnect LinkedIn integration
 */
export async function disconnectLinkedIn(): Promise<void> {
  localStorage.removeItem('linkedin_config')
  localStorage.removeItem('linkedin_last_action')
  localStorage.removeItem('linkedin_actions')
  console.log('[LinkedIn] Disconnected and cleared data')
}

/**
 * Test LinkedIn connection
 */
export async function testLinkedInConnection(): Promise<{ success: boolean; message: string }> {
  try {
    const response = await callAIAgent({
      agentId: AGENTS.LINKEDIN_ORCHESTRATOR,
      message: 'Test LinkedIn connection. Verify that Composio LinkedIn tool is accessible and authenticated.'
    })

    if (response.status === 'success') {
      return {
        success: true,
        message: 'LinkedIn connection active'
      }
    } else {
      return {
        success: false,
        message: response.message || 'Connection test failed'
      }
    }
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}
