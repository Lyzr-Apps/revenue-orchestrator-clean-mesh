/**
 * Settings Page - Integration Management
 * Manage HubSpot, LinkedIn, Gmail, Slack, Calendly, and other integrations
 */

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Switch } from '@/components/ui/switch'
import {
  CheckCircle,
  XCircle,
  RefreshCw,
  Settings as SettingsIcon,
  Database,
  Mail,
  Linkedin,
  MessageSquare,
  Calendar,
  Mic,
  Globe,
  Zap,
  Shield,
  AlertCircle
} from 'lucide-react'

interface Integration {
  id: string
  name: string
  description: string
  status: 'connected' | 'disconnected' | 'error'
  icon: any
  agentId?: string
  configurable: boolean
  oauthHandled: boolean
}

const INTEGRATIONS: Integration[] = [
  {
    id: 'hubspot',
    name: 'HubSpot CRM',
    description: 'Bidirectional sync of account data, contacts, and activities',
    status: 'connected',
    icon: Database,
    agentId: '696eeaaa3bd35d7a6606a545',
    configurable: true,
    oauthHandled: true
  },
  {
    id: 'gmail',
    name: 'Gmail',
    description: 'Send approved outreach messages via Gmail API',
    status: 'connected',
    icon: Mail,
    configurable: true,
    oauthHandled: true
  },
  {
    id: 'linkedin',
    name: 'LinkedIn',
    description: 'Send connection requests, InMail, and engage with content',
    status: 'connected',
    icon: Linkedin,
    agentId: '696eea5cb50537828e0aff79',
    configurable: true,
    oauthHandled: true
  },
  {
    id: 'slack',
    name: 'Slack',
    description: 'Approval notifications and daily digest reports',
    status: 'connected',
    icon: MessageSquare,
    configurable: true,
    oauthHandled: true
  },
  {
    id: 'calendly',
    name: 'Calendly',
    description: 'Track meeting bookings and trigger pre-meeting research',
    status: 'disconnected',
    icon: Calendar,
    configurable: true,
    oauthHandled: true
  },
  {
    id: 'otter',
    name: 'Otter.ai',
    description: 'Meeting transcription and intelligence extraction',
    status: 'disconnected',
    icon: Mic,
    agentId: '696ee9e2b50537828e0aff6e',
    configurable: true,
    oauthHandled: true
  }
]

export default function Settings() {
  const [integrations, setIntegrations] = useState<Integration[]>(INTEGRATIONS)
  const [selectedIntegration, setSelectedIntegration] = useState<Integration | null>(null)

  const handleConnect = (integrationId: string) => {
    // Agent handles OAuth automatically
    console.log(`Connecting ${integrationId}...`)
    setIntegrations(prev =>
      prev.map(int =>
        int.id === integrationId ? { ...int, status: 'connected' as const } : int
      )
    )
  }

  const handleDisconnect = (integrationId: string) => {
    setIntegrations(prev =>
      prev.map(int =>
        int.id === integrationId ? { ...int, status: 'disconnected' as const } : int
      )
    )
  }

  const getStatusColor = (status: Integration['status']) => {
    switch (status) {
      case 'connected':
        return 'text-green-400'
      case 'disconnected':
        return 'text-gray-400'
      case 'error':
        return 'text-red-400'
    }
  }

  const getStatusIcon = (status: Integration['status']) => {
    switch (status) {
      case 'connected':
        return <CheckCircle className="w-5 h-5 text-green-400" />
      case 'disconnected':
        return <XCircle className="w-5 h-5 text-gray-400" />
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-400" />
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0A0F1C] to-[#111827] text-white p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <SettingsIcon className="w-8 h-8 text-[#0066FF]" />
              Settings
            </h1>
            <p className="text-gray-400 mt-2">
              Manage integrations, configure agents, and customize your revenue engine
            </p>
          </div>
        </div>

        <Tabs defaultValue="integrations" className="space-y-6">
          <TabsList className="bg-[#111827] border border-gray-800">
            <TabsTrigger value="integrations">Integrations</TabsTrigger>
            <TabsTrigger value="agents">Agent Configuration</TabsTrigger>
            <TabsTrigger value="icp">ICP Criteria</TabsTrigger>
            <TabsTrigger value="voice">Voice Library</TabsTrigger>
          </TabsList>

          {/* Integrations Tab */}
          <TabsContent value="integrations" className="space-y-6">
            <Card className="bg-[#111827] border-gray-800">
              <CardHeader>
                <CardTitle className="text-white">Connected Integrations</CardTitle>
                <CardDescription>
                  All integrations use agent-managed OAuth. No manual authentication required.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {integrations.map(integration => {
                    const Icon = integration.icon
                    return (
                      <Card
                        key={integration.id}
                        className="bg-[#0A0F1C] border-gray-700 hover:border-[#0066FF] transition-all cursor-pointer"
                        onClick={() => setSelectedIntegration(integration)}
                      >
                        <CardContent className="p-6">
                          <div className="flex items-start justify-between">
                            <div className="flex items-start gap-4 flex-1">
                              <div className="p-3 bg-[#111827] rounded-lg">
                                <Icon className="w-6 h-6 text-[#0066FF]" />
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <h3 className="font-semibold text-white">
                                    {integration.name}
                                  </h3>
                                  {integration.oauthHandled && (
                                    <Badge
                                      variant="outline"
                                      className="text-xs border-[#00D4FF] text-[#00D4FF]"
                                    >
                                      Auto OAuth
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-sm text-gray-400">
                                  {integration.description}
                                </p>
                                {integration.agentId && (
                                  <p className="text-xs text-gray-500 mt-2">
                                    Agent: {integration.agentId.slice(0, 8)}...
                                  </p>
                                )}
                              </div>
                            </div>
                            <div className="flex flex-col items-end gap-2">
                              {getStatusIcon(integration.status)}
                              <span
                                className={`text-xs font-medium ${getStatusColor(
                                  integration.status
                                )}`}
                              >
                                {integration.status}
                              </span>
                            </div>
                          </div>

                          <Separator className="my-4 bg-gray-700" />

                          <div className="flex items-center gap-2">
                            {integration.status === 'connected' ? (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="border-red-500 text-red-500 hover:bg-red-500 hover:text-white"
                                  onClick={e => {
                                    e.stopPropagation()
                                    handleDisconnect(integration.id)
                                  }}
                                >
                                  Disconnect
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="border-gray-600 text-gray-300"
                                  onClick={e => {
                                    e.stopPropagation()
                                  }}
                                >
                                  <RefreshCw className="w-4 h-4 mr-2" />
                                  Test Connection
                                </Button>
                              </>
                            ) : (
                              <Button
                                size="sm"
                                className="bg-[#0066FF] hover:bg-[#0052CC] text-white"
                                onClick={e => {
                                  e.stopPropagation()
                                  handleConnect(integration.id)
                                }}
                              >
                                <Zap className="w-4 h-4 mr-2" />
                                Connect Now
                              </Button>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Integration Configuration Panel */}
            {selectedIntegration && (
              <Card className="bg-[#111827] border-gray-800">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    {selectedIntegration.name} Configuration
                  </CardTitle>
                  <CardDescription>
                    OAuth is handled automatically by the agent. Configure integration
                    settings below.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {selectedIntegration.id === 'hubspot' && (
                    <HubSpotConfig />
                  )}
                  {selectedIntegration.id === 'linkedin' && (
                    <LinkedInConfig />
                  )}
                  {selectedIntegration.id === 'gmail' && <GmailConfig />}
                  {selectedIntegration.id === 'slack' && <SlackConfig />}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Agent Configuration Tab */}
          <TabsContent value="agents" className="space-y-6">
            <AgentConfiguration />
          </TabsContent>

          {/* ICP Criteria Tab */}
          <TabsContent value="icp" className="space-y-6">
            <ICPConfiguration />
          </TabsContent>

          {/* Voice Library Tab */}
          <TabsContent value="voice" className="space-y-6">
            <VoiceLibraryManagement />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

// Integration-specific configuration components

function HubSpotConfig() {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label className="text-white">Sync Frequency</Label>
        <select className="w-full bg-[#0A0F1C] border border-gray-700 rounded-md p-2 text-white">
          <option value="realtime">Real-time</option>
          <option value="hourly">Hourly</option>
          <option value="daily">Daily</option>
        </select>
      </div>

      <div className="space-y-2">
        <Label className="text-white">Properties to Sync</Label>
        <div className="space-y-2">
          {['Tech Stack', 'Buying Committee', 'ICP Score', 'Last AI Interaction'].map(
            prop => (
              <div key={prop} className="flex items-center gap-2">
                <Switch id={prop} defaultChecked />
                <Label htmlFor={prop} className="text-gray-300">
                  {prop}
                </Label>
              </div>
            )
          )}
        </div>
      </div>

      <Button className="bg-[#0066FF] hover:bg-[#0052CC] text-white">
        Save Configuration
      </Button>
    </div>
  )
}

function LinkedInConfig() {
  return (
    <div className="space-y-4">
      <div className="bg-yellow-900/20 border border-yellow-700 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Shield className="w-5 h-5 text-yellow-400 mt-0.5" />
          <div>
            <h4 className="text-yellow-400 font-medium mb-1">Safety Limits Active</h4>
            <p className="text-sm text-yellow-200">
              Daily limits prevent LinkedIn account flagging
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-white">Daily Connection Requests</Label>
        <Input
          type="number"
          defaultValue="15"
          className="bg-[#0A0F1C] border-gray-700 text-white"
          max="25"
        />
        <p className="text-xs text-gray-400">Recommended: 10-15 per day</p>
      </div>

      <div className="space-y-2">
        <Label className="text-white">Daily InMail Messages</Label>
        <Input
          type="number"
          defaultValue="10"
          className="bg-[#0A0F1C] border-gray-700 text-white"
          max="15"
        />
        <p className="text-xs text-gray-400">Recommended: 5-10 per day</p>
      </div>

      <div className="space-y-2">
        <Label className="text-white">Action Delay (minutes)</Label>
        <Input
          type="number"
          defaultValue="120"
          className="bg-[#0A0F1C] border-gray-700 text-white"
        />
        <p className="text-xs text-gray-400">Time between LinkedIn actions</p>
      </div>

      <Button className="bg-[#0066FF] hover:bg-[#0052CC] text-white">
        Save Configuration
      </Button>
    </div>
  )
}

function GmailConfig() {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label className="text-white">Daily Sending Limit</Label>
        <Input
          type="number"
          defaultValue="50"
          className="bg-[#0A0F1C] border-gray-700 text-white"
        />
        <p className="text-xs text-gray-400">
          Start low (10-25) and increase gradually to warm up sending reputation
        </p>
      </div>

      <div className="space-y-2">
        <Label className="text-white">Sending Schedule</Label>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-sm text-gray-400">Start Time</Label>
            <Input
              type="time"
              defaultValue="09:00"
              className="bg-[#0A0F1C] border-gray-700 text-white"
            />
          </div>
          <div>
            <Label className="text-sm text-gray-400">End Time</Label>
            <Input
              type="time"
              defaultValue="17:00"
              className="bg-[#0A0F1C] border-gray-700 text-white"
            />
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Switch id="track-opens" defaultChecked />
        <Label htmlFor="track-opens" className="text-gray-300">
          Track email opens and clicks
        </Label>
      </div>

      <Button className="bg-[#0066FF] hover:bg-[#0052CC] text-white">
        Save Configuration
      </Button>
    </div>
  )
}

function SlackConfig() {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label className="text-white">Approval Channel</Label>
        <Input
          placeholder="#revenue-approvals"
          defaultValue="#revenue-approvals"
          className="bg-[#0A0F1C] border-gray-700 text-white"
        />
      </div>

      <div className="space-y-2">
        <Label className="text-white">Notification Preferences</Label>
        <div className="space-y-2">
          {[
            'New outreach staged',
            'Positive responses received',
            'Meetings booked',
            'Daily digest (8:00 AM)'
          ].map(pref => (
            <div key={pref} className="flex items-center gap-2">
              <Switch id={pref} defaultChecked />
              <Label htmlFor={pref} className="text-gray-300">
                {pref}
              </Label>
            </div>
          ))}
        </div>
      </div>

      <Button className="bg-[#0066FF] hover:bg-[#0052CC] text-white">
        Save Configuration
      </Button>
    </div>
  )
}

function AgentConfiguration() {
  const agents = [
    { name: 'Sovereign Strategist', id: '696eeb2b3bd35d7a6606a553', status: 'active' },
    { name: 'Research Manager', id: '696eeaf33bd35d7a6606a54c', status: 'active' },
    { name: 'Outreach Manager', id: '696eeb11b50537828e0aff93', status: 'active' },
    { name: 'Monitoring Manager', id: '696eeacdb50537828e0aff83', status: 'active' }
  ]

  return (
    <Card className="bg-[#111827] border-gray-800">
      <CardHeader>
        <CardTitle className="text-white">Active Agents</CardTitle>
        <CardDescription>
          All 18 agents are deployed and operational
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {agents.map(agent => (
            <div
              key={agent.id}
              className="flex items-center justify-between p-4 bg-[#0A0F1C] rounded-lg border border-gray-700"
            >
              <div>
                <h4 className="text-white font-medium">{agent.name}</h4>
                <p className="text-sm text-gray-400">ID: {agent.id}</p>
              </div>
              <Badge className="bg-green-500/20 text-green-400 border-green-500">
                {agent.status}
              </Badge>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

function ICPConfiguration() {
  return (
    <Card className="bg-[#111827] border-gray-800">
      <CardHeader>
        <CardTitle className="text-white">ICP Criteria</CardTitle>
        <CardDescription>
          Define your ideal customer profile for lead qualification
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label className="text-white">Industries</Label>
          <Input
            placeholder="B2B SaaS, Enterprise Software, FinTech"
            className="bg-[#0A0F1C] border-gray-700 text-white"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-white">Company Size</Label>
            <Input
              placeholder="50-500 employees"
              className="bg-[#0A0F1C] border-gray-700 text-white"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-white">Revenue Range</Label>
            <Input
              placeholder="$5M-$50M"
              className="bg-[#0A0F1C] border-gray-700 text-white"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-white">Target Job Titles</Label>
          <Input
            placeholder="VP Sales, CRO, Head of Revenue"
            className="bg-[#0A0F1C] border-gray-700 text-white"
          />
        </div>

        <Button className="bg-[#0066FF] hover:bg-[#0052CC] text-white">
          Save ICP Criteria
        </Button>
      </CardContent>
    </Card>
  )
}

function VoiceLibraryManagement() {
  const winningPhrases = [
    {
      phrase: 'We help sales teams book 3x more meetings without adding headcount',
      successRate: 45,
      useCase: 'Opening Line'
    },
    {
      phrase: 'Your recent hiring surge suggests timing might be right',
      successRate: 38,
      useCase: 'Personalization'
    }
  ]

  return (
    <Card className="bg-[#111827] border-gray-800">
      <CardHeader>
        <CardTitle className="text-white">Voice Library</CardTitle>
        <CardDescription>
          Winning phrases automatically captured from successful outreach
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {winningPhrases.map((item, idx) => (
          <div
            key={idx}
            className="p-4 bg-[#0A0F1C] rounded-lg border border-gray-700"
          >
            <p className="text-white mb-2">{item.phrase}</p>
            <div className="flex items-center gap-4 text-sm">
              <Badge className="bg-green-500/20 text-green-400 border-green-500">
                {item.successRate}% success rate
              </Badge>
              <span className="text-gray-400">{item.useCase}</span>
            </div>
          </div>
        ))}

        <Button variant="outline" className="w-full border-gray-600 text-gray-300">
          Import Phrases from CSV
        </Button>
      </CardContent>
    </Card>
  )
}
