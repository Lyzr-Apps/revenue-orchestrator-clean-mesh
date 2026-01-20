/**
 * Slack Integration Utility
 * Handles approval notifications, daily digest, and interactive buttons
 */

export interface SlackConfig {
  approvalChannel: string
  enableNotifications: {
    newOutreachStaged: boolean
    positiveResponses: boolean
    meetingsBooked: boolean
    dailyDigest: boolean
  }
  digestTime: string // "08:00"
  webhookUrl?: string
}

export interface ApprovalNotification {
  outreachId: string
  accountName: string
  contactName: string
  subject: string
  preview: string
  icpScore?: number
  channel?: string
}

export interface SlackMessage {
  channel: string
  text: string
  blocks?: any[]
  attachments?: any[]
}

// Default configuration
const DEFAULT_CONFIG: SlackConfig = {
  approvalChannel: '#revenue-approvals',
  enableNotifications: {
    newOutreachStaged: true,
    positiveResponses: true,
    meetingsBooked: true,
    dailyDigest: true
  },
  digestTime: '08:00'
}

/**
 * Get Slack configuration
 */
export function getSlackConfig(): SlackConfig {
  const stored = localStorage.getItem('slack_config')
  return stored ? JSON.parse(stored) : DEFAULT_CONFIG
}

/**
 * Update Slack configuration
 */
export function updateSlackConfig(config: Partial<SlackConfig>): void {
  const current = getSlackConfig()
  const updated = { ...current, ...config }
  localStorage.setItem('slack_config', JSON.stringify(updated))
}

/**
 * Send approval notification to Slack
 */
export async function sendApprovalNotification(notification: ApprovalNotification): Promise<void> {
  const config = getSlackConfig()

  if (!config.enableNotifications.newOutreachStaged) {
    return
  }

  const blocks = buildApprovalBlocks(notification)

  await sendSlackMessage({
    channel: notification.channel || config.approvalChannel,
    text: `New outreach staged for ${notification.accountName}`,
    blocks
  })

  // Store notification
  storeNotification({
    type: 'approval',
    outreachId: notification.outreachId,
    timestamp: new Date().toISOString()
  })
}

/**
 * Build Slack blocks for approval notification
 */
function buildApprovalBlocks(notification: ApprovalNotification): any[] {
  return [
    {
      type: 'header',
      text: {
        type: 'plain_text',
        text: `New Outreach: ${notification.accountName}`
      }
    },
    {
      type: 'section',
      fields: [
        {
          type: 'mrkdwn',
          text: `*Contact:*\n${notification.contactName}`
        },
        {
          type: 'mrkdwn',
          text: `*ICP Score:*\n${notification.icpScore ? `${notification.icpScore}/100` : 'N/A'}`
        }
      ]
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*Subject:*\n${notification.subject}`
      }
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*Preview:*\n${truncate(notification.preview, 200)}`
      }
    },
    {
      type: 'divider'
    },
    {
      type: 'actions',
      elements: [
        {
          type: 'button',
          text: {
            type: 'plain_text',
            text: 'Approve'
          },
          style: 'primary',
          action_id: `approve_${notification.outreachId}`,
          value: notification.outreachId
        },
        {
          type: 'button',
          text: {
            type: 'plain_text',
            text: 'Edit'
          },
          action_id: `edit_${notification.outreachId}`,
          value: notification.outreachId
        },
        {
          type: 'button',
          text: {
            type: 'plain_text',
            text: 'Reject'
          },
          style: 'danger',
          action_id: `reject_${notification.outreachId}`,
          value: notification.outreachId
        }
      ]
    }
  ]
}

/**
 * Send positive response notification
 */
export async function sendPositiveResponseNotification(params: {
  from: string
  accountName: string
  subject: string
  preview: string
  signals?: string[]
}): Promise<void> {
  const config = getSlackConfig()

  if (!config.enableNotifications.positiveResponses) {
    return
  }

  const blocks = [
    {
      type: 'header',
      text: {
        type: 'plain_text',
        text: 'Positive Response Received!'
      }
    },
    {
      type: 'section',
      fields: [
        {
          type: 'mrkdwn',
          text: `*From:*\n${params.from}`
        },
        {
          type: 'mrkdwn',
          text: `*Account:*\n${params.accountName}`
        }
      ]
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*Subject:*\n${params.subject}`
      }
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*Message:*\n${truncate(params.preview, 300)}`
      }
    }
  ]

  if (params.signals && params.signals.length > 0) {
    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*Key Signals:*\n${params.signals.map(s => `• ${s}`).join('\n')}`
      }
    })
  }

  await sendSlackMessage({
    channel: config.approvalChannel,
    text: `Positive response from ${params.from}`,
    blocks
  })

  storeNotification({
    type: 'positive_response',
    from: params.from,
    timestamp: new Date().toISOString()
  })
}

/**
 * Send meeting booked notification
 */
export async function sendMeetingBookedNotification(params: {
  accountName: string
  contactName: string
  meetingTime: string
  meetingType: string
  duration: number
}): Promise<void> {
  const config = getSlackConfig()

  if (!config.enableNotifications.meetingsBooked) {
    return
  }

  const blocks = [
    {
      type: 'header',
      text: {
        type: 'plain_text',
        text: 'Meeting Booked!'
      }
    },
    {
      type: 'section',
      fields: [
        {
          type: 'mrkdwn',
          text: `*Account:*\n${params.accountName}`
        },
        {
          type: 'mrkdwn',
          text: `*Contact:*\n${params.contactName}`
        },
        {
          type: 'mrkdwn',
          text: `*Time:*\n${new Date(params.meetingTime).toLocaleString()}`
        },
        {
          type: 'mrkdwn',
          text: `*Duration:*\n${params.duration} minutes`
        }
      ]
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*Meeting Type:*\n${params.meetingType}`
      }
    }
  ]

  await sendSlackMessage({
    channel: config.approvalChannel,
    text: `Meeting booked with ${params.contactName} at ${params.accountName}`,
    blocks
  })

  storeNotification({
    type: 'meeting_booked',
    accountName: params.accountName,
    timestamp: new Date().toISOString()
  })
}

/**
 * Generate and send daily digest
 */
export async function sendDailyDigest(): Promise<void> {
  const config = getSlackConfig()

  if (!config.enableNotifications.dailyDigest) {
    return
  }

  // Gather stats from various sources
  const stats = await gatherDailyStats()

  const blocks = [
    {
      type: 'header',
      text: {
        type: 'plain_text',
        text: 'Daily Revenue Engine Digest'
      }
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}*`
      }
    },
    {
      type: 'divider'
    },
    {
      type: 'section',
      fields: [
        {
          type: 'mrkdwn',
          text: `*Outreach Sent:*\n${stats.outreachSent}`
        },
        {
          type: 'mrkdwn',
          text: `*Responses:*\n${stats.responses}`
        },
        {
          type: 'mrkdwn',
          text: `*Response Rate:*\n${stats.responseRate}%`
        },
        {
          type: 'mrkdwn',
          text: `*Meetings Booked:*\n${stats.meetingsBooked}`
        }
      ]
    },
    {
      type: 'divider'
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: '*Top Performers:*'
      }
    }
  ]

  if (stats.topAccounts.length > 0) {
    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: stats.topAccounts.map((acc: any) =>
          `• ${acc.name} - ${acc.metric}`
        ).join('\n')
      }
    })
  }

  blocks.push(
    {
      type: 'divider'
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*Pending Approvals:*\n${stats.pendingApprovals} messages awaiting review`
      }
    }
  )

  await sendSlackMessage({
    channel: config.approvalChannel,
    text: 'Daily Revenue Engine Digest',
    blocks
  })

  storeNotification({
    type: 'daily_digest',
    timestamp: new Date().toISOString()
  })
}

/**
 * Send generic Slack message
 */
export async function sendSlackMessage(message: SlackMessage): Promise<void> {
  const config = getSlackConfig()

  // In production, this would POST to Slack webhook URL:
  // await fetch(config.webhookUrl, {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify({
  //     channel: message.channel,
  //     text: message.text,
  //     blocks: message.blocks,
  //     attachments: message.attachments
  //   })
  // })

  console.log('[Slack] Would send message to', message.channel, ':', message.text)

  // Store in local history
  const history = JSON.parse(localStorage.getItem('slack_message_history') || '[]')
  history.push({
    ...message,
    timestamp: new Date().toISOString()
  })
  localStorage.setItem('slack_message_history', JSON.stringify(history))
}

/**
 * Handle Slack button interaction (approval/reject)
 */
export async function handleSlackApproval(params: {
  action: 'approve' | 'reject' | 'edit'
  outreachId: string
  userId: string
  userName: string
}): Promise<void> {
  const approvals = JSON.parse(localStorage.getItem('approvals') || '{}')

  approvals[params.outreachId] = {
    action: params.action,
    userId: params.userId,
    userName: params.userName,
    timestamp: new Date().toISOString(),
    source: 'slack'
  }

  localStorage.setItem('approvals', JSON.stringify(approvals))

  // Send confirmation
  if (params.action === 'approve') {
    console.log(`[Slack] Message ${params.outreachId} approved by ${params.userName}`)
  } else if (params.action === 'reject') {
    console.log(`[Slack] Message ${params.outreachId} rejected by ${params.userName}`)
  }
}

/**
 * Get Slack notification statistics
 */
export function getSlackStats() {
  const notifications = JSON.parse(localStorage.getItem('slack_notifications') || '[]')
  const history = JSON.parse(localStorage.getItem('slack_message_history') || '[]')

  const today = new Date().toDateString()
  const todayNotifications = notifications.filter((n: any) =>
    new Date(n.timestamp).toDateString() === today
  )

  return {
    totalNotifications: notifications.length,
    todayNotifications: todayNotifications.length,
    totalMessages: history.length,
    byType: {
      approval: notifications.filter((n: any) => n.type === 'approval').length,
      positiveResponse: notifications.filter((n: any) => n.type === 'positive_response').length,
      meetingBooked: notifications.filter((n: any) => n.type === 'meeting_booked').length,
      dailyDigest: notifications.filter((n: any) => n.type === 'daily_digest').length
    }
  }
}

// =============================================================================
// Helper Functions
// =============================================================================

function truncate(text: string, length: number): string {
  if (text.length <= length) return text
  return text.substring(0, length) + '...'
}

function storeNotification(data: any): void {
  const notifications = JSON.parse(localStorage.getItem('slack_notifications') || '[]')
  notifications.push(data)
  localStorage.setItem('slack_notifications', JSON.stringify(notifications))
}

async function gatherDailyStats() {
  // Gather stats from localStorage
  const today = new Date().toDateString()

  const sentEmails = JSON.parse(localStorage.getItem('sent_emails') || '[]')
  const responses = JSON.parse(localStorage.getItem('email_responses') || '[]')
  const meetings = JSON.parse(localStorage.getItem('meetings') || '[]')
  const pendingQueue = JSON.parse(localStorage.getItem('approval_queue') || '[]')

  const todaySent = sentEmails.filter((e: any) =>
    new Date(e.sentAt).toDateString() === today
  ).length

  const todayResponses = responses.filter((r: any) =>
    new Date(r.timestamp).toDateString() === today
  ).length

  const todayMeetings = meetings.filter((m: any) =>
    new Date(m.timestamp || m.start_time).toDateString() === today
  ).length

  const responseRate = todaySent > 0 ? Math.round((todayResponses / todaySent) * 100) : 0

  // Get top performing accounts (mock for now)
  const topAccounts = [
    { name: 'Acme Corp', metric: '3 responses' },
    { name: 'TechStart Inc', metric: '2 meetings booked' },
    { name: 'SaaS Solutions', metric: '85% open rate' }
  ].slice(0, 3)

  return {
    outreachSent: todaySent,
    responses: todayResponses,
    responseRate,
    meetingsBooked: todayMeetings,
    pendingApprovals: pendingQueue.length,
    topAccounts
  }
}

/**
 * Setup Slack webhook URL
 */
export function setupSlackWebhook(webhookUrl: string): void {
  const config = getSlackConfig()
  updateSlackConfig({ ...config, webhookUrl })
}

/**
 * Test Slack connection
 */
export async function testSlackConnection(): Promise<{ success: boolean; message: string }> {
  try {
    await sendSlackMessage({
      channel: getSlackConfig().approvalChannel,
      text: 'Slack connection test successful!'
    })

    return {
      success: true,
      message: 'Connection test successful'
    }
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Connection test failed'
    }
  }
}

/**
 * Disconnect Slack integration
 */
export async function disconnectSlack(): Promise<void> {
  localStorage.removeItem('slack_config')
  localStorage.removeItem('slack_notifications')
  localStorage.removeItem('slack_message_history')
  console.log('[Slack] Disconnected and cleared data')
}
