/**
 * Lyzr Sovereign Revenue Engine
 *
 * Complete dashboard for managing autonomous revenue operations
 * Features: Dashboard, Approval Queue, Account War Room, Analytics
 */

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  TrendingUp,
  TrendingDown,
  Users,
  Mail,
  Calendar,
  CheckCircle,
  XCircle,
  Clock,
  BarChart,
  Activity,
  Target,
  Zap,
  Brain,
  Search,
  Filter,
  Download,
  RefreshCw,
  AlertCircle,
  Info,
  Sparkles,
  ArrowRight,
  Edit,
  Trash2,
  Eye,
  MessageSquare,
  Lightbulb,
  Database,
  Settings
} from 'lucide-react'
import { callAIAgent, type NormalizedAgentResponse } from '@/utils/aiAgent'
import { cn } from '@/lib/utils'

// =============================================================================
// AGENT IDS (from workflow.json)
// =============================================================================

const AGENTS = {
  SOVEREIGN_STRATEGIST: '696eeb2b3bd35d7a6606a553',
  RESEARCH_MANAGER: '696eeaf33bd35d7a6606a54c',
  OUTREACH_MANAGER: '696eeb11b50537828e0aff93',
  MONITORING_MANAGER: '696eeacdb50537828e0aff83',
  ICP_QUALIFIER: '696ee969b50537828e0aff64',
  TECHNOGRAPHIC_AGENT: '696ee97cb50537828e0aff65',
  COMMITTEE_MAPPER: '696ee98e3bd35d7a6606a530',
  PERSONA_MATCHER: '696ee9a23bd35d7a6606a534',
  CONTENT_GENERATOR: '696ee9b5b50537828e0aff69',
  QA_GATEKEEPER: '696ee9ccb50537828e0aff6a',
  TRANSCRIPT_ANALYST: '696ee9e2b50537828e0aff6e',
  RESPONSE_CLASSIFIER: '696ee9fa3bd35d7a6606a53b',
  INSIGHT_GENERATOR: '696eea103bd35d7a6606a53c',
  VOICE_LIBRARIAN: '696eea2ab50537828e0aff75',
  OBJECTION_HANDLER: '696eea423bd35d7a6606a540',
  LINKEDIN_ORCHESTRATOR: '696eea5cb50537828e0aff79',
  COMPUTER_USE_AGENT: '696eea8f3bd35d7a6606a544',
  HUBSPOT_SYNC_AGENT: '696eeaaa3bd35d7a6606a545'
} as const

// =============================================================================
// TYPE DEFINITIONS (from actual test responses)
// =============================================================================

interface OutreachMessage {
  id: string
  subject_line: string
  email_body: string
  linkedin_message: string
  target_name: string
  target_title: string
  company: string
  quality_score: number
  approval_status: 'pending' | 'approved' | 'needs_revision' | 'rejected'
  personalization_elements: {
    company_specific: string[]
    role_specific: string[]
    pain_point_addressed: string[]
  }
  suggested_send_time: string
  generated_at: string
}

interface ICPQualification {
  icp_score: number
  fit_level: string
  qualifying_factors: string[]
  disqualifying_factors: string[]
  company_profile: {
    industry: string
    size: string
    revenue_range: string
  }
  recommendation: string
}

interface BuyingCommittee {
  decision_makers: Array<{
    name: string
    title: string
    linkedin: string
    influence_score: number
  }>
  influencers: Array<{
    name: string
    title: string
    linkedin: string
    influence_score: number
  }>
  champions: Array<{
    name: string
    title: string
    reason: string
    influence_score: number
  }>
  blockers: Array<{
    name: string
    title: string
    reason: string
    influence_score: number
  }>
}

interface StrategicInsight {
  insight: string
  category: string
  impact: string
  confidence: number
  supporting_data: string[]
}

interface DashboardMetrics {
  revenue_velocity: number
  accounts_monitored: number
  messages_staged: number
  responses_today: number
  meetings_booked: number
  kagiso_trust_score: number
  pipeline_value: number
  conversion_rate: number
}

// =============================================================================
// UTILITY COMPONENTS
// =============================================================================

function RevenueVelocityGauge({ velocity }: { velocity: number }) {
  const percentage = Math.min(velocity, 100)

  return (
    <div className="flex flex-col items-center justify-center">
      <div className="relative w-48 h-48">
        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
          <circle
            cx="50"
            cy="50"
            r="40"
            stroke="#1F2937"
            strokeWidth="8"
            fill="none"
          />
          <circle
            cx="50"
            cy="50"
            r="40"
            stroke="#0066FF"
            strokeWidth="8"
            fill="none"
            strokeDasharray={`${(percentage * 251.2) / 100} 251.2`}
            strokeLinecap="round"
            className="transition-all duration-1000"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="text-4xl font-bold text-white">{velocity}%</div>
          <div className="text-sm text-gray-400">Velocity</div>
        </div>
      </div>
    </div>
  )
}

function KagisoTrustScore({ score }: { score: number }) {
  const getScoreColor = (s: number) => {
    if (s >= 80) return 'text-green-400'
    if (s >= 60) return 'text-yellow-400'
    return 'text-red-400'
  }

  return (
    <div className="flex items-center gap-3">
      <div className={cn('text-3xl font-bold', getScoreColor(score))}>
        {score}
      </div>
      <div className="flex-1">
        <div className="text-sm text-gray-400 mb-1">Kagiso Trust Score</div>
        <Progress value={score} className="h-2" />
      </div>
    </div>
  )
}

function PipelineFunnel() {
  const stages = [
    { name: 'Research', count: 45, percentage: 100 },
    { name: 'Qualified', count: 32, percentage: 71 },
    { name: 'Outreach', count: 24, percentage: 53 },
    { name: 'Engaged', count: 18, percentage: 40 },
    { name: 'Meeting', count: 8, percentage: 18 }
  ]

  return (
    <div className="space-y-3">
      {stages.map((stage, index) => (
        <div key={stage.name} className="space-y-1">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-300">{stage.name}</span>
            <span className="text-gray-400">{stage.count} accounts</span>
          </div>
          <div className="relative h-8 bg-gray-800 rounded overflow-hidden">
            <div
              className={cn(
                'absolute inset-y-0 left-0 flex items-center justify-center text-xs font-medium text-white transition-all duration-500',
                index === 0 && 'bg-blue-600',
                index === 1 && 'bg-blue-500',
                index === 2 && 'bg-blue-400',
                index === 3 && 'bg-cyan-500',
                index === 4 && 'bg-green-500'
              )}
              style={{ width: `${stage.percentage}%` }}
            >
              {stage.percentage}%
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

function InsightFeed({ insights }: { insights: StrategicInsight[] }) {
  return (
    <ScrollArea className="h-[400px]">
      <div className="space-y-3">
        {insights.map((insight, index) => (
          <Card key={index} className="bg-gray-800 border-gray-700">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 mt-1">
                  <Lightbulb className="w-5 h-5 text-yellow-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="outline" className="text-xs">
                      {insight.category}
                    </Badge>
                    <Badge
                      variant={insight.impact === 'high' ? 'default' : 'secondary'}
                      className="text-xs"
                    >
                      {insight.impact} impact
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-300 mb-2">{insight.insight}</p>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <span>Confidence: {insight.confidence}%</span>
                    <Separator orientation="vertical" className="h-3" />
                    <span>{insight.supporting_data.length} data points</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </ScrollArea>
  )
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function Home() {
  const [currentView, setCurrentView] = useState<'dashboard' | 'approval' | 'war-room' | 'analytics'>('dashboard')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedAccount, setSelectedAccount] = useState<string | null>(null)

  // Dashboard Metrics
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    revenue_velocity: 78,
    accounts_monitored: 45,
    messages_staged: 12,
    responses_today: 8,
    meetings_booked: 3,
    kagiso_trust_score: 85,
    pipeline_value: 450000,
    conversion_rate: 18
  })

  // Approval Queue
  const [approvalQueue, setApprovalQueue] = useState<OutreachMessage[]>([
    {
      id: '1',
      subject_line: 'Enhancing Sales Efficiency Together',
      email_body: 'Hi John,\n\nI recently came across your work as the VP of Sales and was truly impressed by your focus on driving sales effectiveness. I believe we share a mutual interest in optimizing sales processes and would love to connect to explore potential synergies.\n\nBest regards,\nAlex',
      linkedin_message: 'Hi John,\n\nI\'ve been following your leadership in improving sales efficiency and would love to connect to learn more and share insights on enhancing sales performance.\n\nLooking forward to connecting,\nAlex',
      target_name: 'John Doe',
      target_title: 'VP Sales',
      company: 'Acme Corp',
      quality_score: 87,
      approval_status: 'pending',
      personalization_elements: {
        company_specific: ['VP Sales at Acme Corp', 'Focus on sales effectiveness'],
        role_specific: ['Leadership in sales processes', 'Experience in driving sales efficiency'],
        pain_point_addressed: ['Optimizing sales processes', 'Enhancing sales performance']
      },
      suggested_send_time: 'Tuesday 10:00 AM',
      generated_at: '2026-01-20T10:00:00Z'
    }
  ])

  // Research Data
  const [researchData, setResearchData] = useState<{
    icp: ICPQualification | null
    committee: BuyingCommittee | null
    tech_stack: string[]
  }>({
    icp: null,
    committee: null,
    tech_stack: []
  })

  // Insights
  const [insights, setInsights] = useState<StrategicInsight[]>([
    {
      insight: 'Positive response rate indicates potential interest in current offerings, but pricing remains a concern.',
      category: 'messaging',
      impact: 'medium',
      confidence: 85,
      supporting_data: ['10 positive responses', '3 pricing concerns']
    },
    {
      insight: 'LinkedIn outreach performs 40% better on Tuesday mornings between 9-11 AM.',
      category: 'timing',
      impact: 'high',
      confidence: 92,
      supporting_data: ['120 sent messages', '48 Tuesday opens', '28 meeting bookings']
    }
  ])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (currentView === 'approval' && approvalQueue.length > 0) {
        const firstPending = approvalQueue.find(m => m.approval_status === 'pending')
        if (!firstPending) return

        if (e.key === 'a' || e.key === 'A') {
          handleApprove(firstPending.id)
        } else if (e.key === 'e' || e.key === 'E') {
          handleEdit(firstPending.id)
        } else if (e.key === 'r' || e.key === 'R') {
          handleReject(firstPending.id)
        }
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [currentView, approvalQueue])

  // Agent interaction handlers
  const handleGenerateOutreach = async (company: string) => {
    setLoading(true)
    setError(null)

    try {
      const result = await callAIAgent(
        `Generate personalized outreach for ${company}`,
        AGENTS.OUTREACH_MANAGER
      )

      if (result.success && result.response.status === 'success') {
        const data = result.response.result
        console.log('Outreach generated:', data)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate outreach')
    } finally {
      setLoading(false)
    }
  }

  const handleResearchAccount = async (company: string) => {
    setLoading(true)
    setError(null)

    try {
      const result = await callAIAgent(
        `Research account: ${company}`,
        AGENTS.RESEARCH_MANAGER
      )

      if (result.success && result.response.status === 'success') {
        const data = result.response.result.research_summary
        if (data) {
          setResearchData({
            icp: data.icp_qualification || null,
            committee: data.buying_committee || null,
            tech_stack: data.tech_stack?.technologies || []
          })
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to research account')
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = (id: string) => {
    setApprovalQueue(prev =>
      prev.map(msg =>
        msg.id === id ? { ...msg, approval_status: 'approved' as const } : msg
      )
    )
  }

  const handleEdit = (id: string) => {
    const message = approvalQueue.find(m => m.id === id)
    if (message) {
      console.log('Editing message:', message)
    }
  }

  const handleReject = (id: string) => {
    setApprovalQueue(prev =>
      prev.map(msg =>
        msg.id === id ? { ...msg, approval_status: 'rejected' as const } : msg
      )
    )
  }

  const handleGetInsights = async () => {
    setLoading(true)
    setError(null)

    try {
      const result = await callAIAgent(
        'Generate strategic insights from recent campaign data',
        AGENTS.INSIGHT_GENERATOR
      )

      if (result.success && result.response.status === 'success') {
        const data = result.response.result
        if (data.strategic_insights) {
          setInsights(data.strategic_insights)
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get insights')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0A0F1C] to-[#111827] text-white">
      {/* Header */}
      <header className="border-b border-gray-800 bg-[#0A0F1C]/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Zap className="w-8 h-8 text-[#0066FF]" />
                <div>
                  <h1 className="text-xl font-bold text-white">Lyzr Sovereign</h1>
                  <p className="text-xs text-gray-400">Revenue Engine v4.3</p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleGetInsights}
                disabled={loading}
                className="text-gray-300 hover:text-white"
              >
                <RefreshCw className={cn('w-4 h-4 mr-2', loading && 'animate-spin')} />
                Refresh
              </Button>
              <Button variant="ghost" size="sm" className="text-gray-300 hover:text-white">
                <Settings className="w-4 h-4 mr-2" />
                Settings
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-6 py-8">
        {error && (
          <div className="mb-6 p-4 bg-red-900/20 border border-red-500 rounded-lg flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-400" />
            <p className="text-red-200">{error}</p>
          </div>
        )}

        <Tabs value={currentView} onValueChange={(v) => setCurrentView(v as any)} className="space-y-6">
          <TabsList className="bg-gray-800/50 border border-gray-700">
            <TabsTrigger value="dashboard" className="data-[state=active]:bg-[#0066FF]">
              <Activity className="w-4 h-4 mr-2" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="approval" className="data-[state=active]:bg-[#0066FF]">
              <CheckCircle className="w-4 h-4 mr-2" />
              Approval Queue
              {approvalQueue.filter(m => m.approval_status === 'pending').length > 0 && (
                <Badge variant="destructive" className="ml-2">
                  {approvalQueue.filter(m => m.approval_status === 'pending').length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="war-room" className="data-[state=active]:bg-[#0066FF]">
              <Target className="w-4 h-4 mr-2" />
              War Room
            </TabsTrigger>
            <TabsTrigger value="analytics" className="data-[state=active]:bg-[#0066FF]">
              <BarChart className="w-4 h-4 mr-2" />
              Analytics
            </TabsTrigger>
          </TabsList>

          {/* DASHBOARD VIEW */}
          <TabsContent value="dashboard" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Revenue Velocity */}
              <Card className="bg-gray-800/50 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-[#0066FF]" />
                    Revenue Velocity
                  </CardTitle>
                  <CardDescription className="text-gray-400">
                    Current pipeline acceleration
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <RevenueVelocityGauge velocity={metrics.revenue_velocity} />
                </CardContent>
              </Card>

              {/* Today's Activity */}
              <Card className="bg-gray-800/50 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-[#00D4FF]" />
                    Today's Activity
                  </CardTitle>
                  <CardDescription className="text-gray-400">
                    Real-time performance
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-gray-300">
                      <Mail className="w-4 h-4" />
                      <span className="text-sm">Staged</span>
                    </div>
                    <span className="text-2xl font-bold text-white">{metrics.messages_staged}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-gray-300">
                      <MessageSquare className="w-4 h-4" />
                      <span className="text-sm">Responses</span>
                    </div>
                    <span className="text-2xl font-bold text-white">{metrics.responses_today}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-gray-300">
                      <Calendar className="w-4 h-4" />
                      <span className="text-sm">Meetings</span>
                    </div>
                    <span className="text-2xl font-bold text-green-400">{metrics.meetings_booked}</span>
                  </div>
                </CardContent>
              </Card>

              {/* Kagiso Trust Score */}
              <Card className="bg-gray-800/50 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-yellow-400" />
                    Quality Score
                  </CardTitle>
                  <CardDescription className="text-gray-400">
                    AI-powered trust rating
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                  <KagisoTrustScore score={metrics.kagiso_trust_score} />
                  <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="text-gray-400">Accounts</div>
                      <div className="text-xl font-bold text-white">{metrics.accounts_monitored}</div>
                    </div>
                    <div>
                      <div className="text-gray-400">Pipeline</div>
                      <div className="text-xl font-bold text-white">
                        ${(metrics.pipeline_value / 1000).toFixed(0)}K
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Pipeline Funnel */}
              <Card className="bg-gray-800/50 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <TrendingDown className="w-5 h-5 text-[#0066FF]" />
                    Pipeline Funnel
                  </CardTitle>
                  <CardDescription className="text-gray-400">
                    Account progression through stages
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <PipelineFunnel />
                </CardContent>
              </Card>

              {/* Recent Insights */}
              <Card className="bg-gray-800/50 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Brain className="w-5 h-5 text-purple-400" />
                    Strategic Insights
                  </CardTitle>
                  <CardDescription className="text-gray-400">
                    AI-generated recommendations
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <InsightFeed insights={insights} />
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* APPROVAL QUEUE */}
          <TabsContent value="approval" className="space-y-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-white">Approval Queue</h2>
                <p className="text-gray-400 text-sm mt-1">
                  Review and approve outreach messages before sending
                </p>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <kbd className="px-2 py-1 bg-gray-800 border border-gray-700 rounded">A</kbd>
                <span>Approve</span>
                <kbd className="px-2 py-1 bg-gray-800 border border-gray-700 rounded">E</kbd>
                <span>Edit</span>
                <kbd className="px-2 py-1 bg-gray-800 border border-gray-700 rounded">R</kbd>
                <span>Reject</span>
              </div>
            </div>

            <div className="space-y-4">
              {approvalQueue.map((message) => (
                <Card key={message.id} className="bg-gray-800/50 border-gray-700 hover:border-gray-600 transition-colors">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <CardTitle className="text-white text-lg">
                            {message.target_name}
                          </CardTitle>
                          <Badge variant="outline" className="text-xs">
                            {message.target_title}
                          </Badge>
                          <Badge variant="secondary" className="text-xs">
                            {message.company}
                          </Badge>
                        </div>
                        <CardDescription className="text-gray-400">
                          Quality Score: {message.quality_score}/100
                        </CardDescription>
                      </div>
                      <Badge
                        variant={
                          message.approval_status === 'approved' ? 'default' :
                          message.approval_status === 'rejected' ? 'destructive' :
                          message.approval_status === 'needs_revision' ? 'secondary' :
                          'outline'
                        }
                      >
                        {message.approval_status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <div className="text-sm font-medium text-gray-300 mb-2">Subject Line:</div>
                      <div className="text-white bg-gray-900/50 p-3 rounded border border-gray-700">
                        {message.subject_line}
                      </div>
                    </div>

                    <div>
                      <div className="text-sm font-medium text-gray-300 mb-2">Email Body:</div>
                      <div className="text-gray-300 bg-gray-900/50 p-3 rounded border border-gray-700 whitespace-pre-wrap text-sm">
                        {message.email_body}
                      </div>
                    </div>

                    <div>
                      <div className="text-sm font-medium text-gray-300 mb-2">Personalization Elements:</div>
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <div className="text-xs text-gray-500 mb-1">Company Specific</div>
                          <div className="space-y-1">
                            {message.personalization_elements.company_specific.map((item, i) => (
                              <Badge key={i} variant="outline" className="text-xs mr-1">
                                {item}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-500 mb-1">Role Specific</div>
                          <div className="space-y-1">
                            {message.personalization_elements.role_specific.map((item, i) => (
                              <Badge key={i} variant="outline" className="text-xs mr-1">
                                {item}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-500 mb-1">Pain Points</div>
                          <div className="space-y-1">
                            {message.personalization_elements.pain_point_addressed.map((item, i) => (
                              <Badge key={i} variant="outline" className="text-xs mr-1">
                                {item}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t border-gray-700">
                      <div className="flex items-center gap-2 text-sm text-gray-400">
                        <Clock className="w-4 h-4" />
                        <span>Best time: {message.suggested_send_time}</span>
                      </div>

                      {message.approval_status === 'pending' && (
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleReject(message.id)}
                            className="text-red-400 hover:text-red-300"
                          >
                            <XCircle className="w-4 h-4 mr-2" />
                            Reject
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEdit(message.id)}
                            className="border-gray-600"
                          >
                            <Edit className="w-4 h-4 mr-2" />
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleApprove(message.id)}
                            className="bg-[#0066FF] hover:bg-[#0052CC]"
                          >
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Approve
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}

              {approvalQueue.length === 0 && (
                <Card className="bg-gray-800/50 border-gray-700">
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <CheckCircle className="w-12 h-12 text-gray-600 mb-4" />
                    <p className="text-gray-400">No messages pending approval</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* ACCOUNT WAR ROOM */}
          <TabsContent value="war-room" className="space-y-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-white">Account War Room</h2>
                <p className="text-gray-400 text-sm mt-1">
                  Deep intelligence on target accounts
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Input
                  placeholder="Search accounts..."
                  className="w-64 bg-gray-800 border-gray-700 text-white"
                />
                <Button variant="outline" size="sm" className="border-gray-600">
                  <Search className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Account Overview */}
              <Card className="bg-gray-800/50 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Database className="w-5 h-5 text-[#0066FF]" />
                    Account: Acme Corp
                  </CardTitle>
                  <CardDescription className="text-gray-400">
                    B2B SaaS - Mid-market
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-sm text-gray-400 mb-1">ICP Score</div>
                      <div className="text-2xl font-bold text-green-400">85/100</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-400 mb-1">Fit Level</div>
                      <Badge className="bg-green-600">Good Fit</Badge>
                    </div>
                    <div>
                      <div className="text-sm text-gray-400 mb-1">Size</div>
                      <div className="text-white">50-200 employees</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-400 mb-1">Revenue</div>
                      <div className="text-white">$5M-$20M</div>
                    </div>
                  </div>

                  <Separator className="bg-gray-700" />

                  <div>
                    <div className="text-sm font-medium text-gray-300 mb-2">Qualifying Factors</div>
                    <div className="space-y-2">
                      <div className="flex items-start gap-2 text-sm text-gray-400">
                        <CheckCircle className="w-4 h-4 text-green-400 mt-0.5" />
                        <span>B2B SaaS industry aligns with target market</span>
                      </div>
                      <div className="flex items-start gap-2 text-sm text-gray-400">
                        <CheckCircle className="w-4 h-4 text-green-400 mt-0.5" />
                        <span>Mid-size company with reasonable revenue</span>
                      </div>
                    </div>
                  </div>

                  <Button
                    className="w-full bg-[#0066FF] hover:bg-[#0052CC]"
                    onClick={() => handleResearchAccount('Acme Corp')}
                    disabled={loading}
                  >
                    <RefreshCw className={cn('w-4 h-4 mr-2', loading && 'animate-spin')} />
                    Deep Research
                  </Button>
                </CardContent>
              </Card>

              {/* Buying Committee */}
              <Card className="bg-gray-800/50 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Users className="w-5 h-5 text-[#00D4FF]" />
                    Buying Committee
                  </CardTitle>
                  <CardDescription className="text-gray-400">
                    Key decision makers and influencers
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[400px]">
                    <div className="space-y-4">
                      <div>
                        <div className="text-sm font-medium text-gray-300 mb-3 flex items-center gap-2">
                          <Badge variant="default">Decision Makers</Badge>
                        </div>
                        <div className="space-y-3">
                          <div className="flex items-start gap-3 p-3 bg-gray-900/50 rounded border border-gray-700">
                            <div className="flex-1">
                              <div className="font-medium text-white">John Doe</div>
                              <div className="text-sm text-gray-400">CTO</div>
                              <div className="flex items-center gap-2 mt-2">
                                <Progress value={95} className="h-1 flex-1" />
                                <span className="text-xs text-gray-500">95</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-start gap-3 p-3 bg-gray-900/50 rounded border border-gray-700">
                            <div className="flex-1">
                              <div className="font-medium text-white">Emily Clarke</div>
                              <div className="text-sm text-gray-400">CFO</div>
                              <div className="flex items-center gap-2 mt-2">
                                <Progress value={90} className="h-1 flex-1" />
                                <span className="text-xs text-gray-500">90</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      <Separator className="bg-gray-700" />

                      <div>
                        <div className="text-sm font-medium text-gray-300 mb-3 flex items-center gap-2">
                          <Badge variant="secondary">Champions</Badge>
                        </div>
                        <div className="space-y-3">
                          <div className="flex items-start gap-3 p-3 bg-gray-900/50 rounded border border-gray-700">
                            <div className="flex-1">
                              <div className="font-medium text-white">Bob Johnson</div>
                              <div className="text-sm text-gray-400">Engineering Manager</div>
                              <div className="text-xs text-green-400 mt-1">Previously used similar tools</div>
                            </div>
                          </div>
                        </div>
                      </div>

                      <Separator className="bg-gray-700" />

                      <div>
                        <div className="text-sm font-medium text-gray-300 mb-3 flex items-center gap-2">
                          <Badge variant="destructive">Blockers</Badge>
                        </div>
                        <div className="space-y-3">
                          <div className="flex items-start gap-3 p-3 bg-gray-900/50 rounded border border-gray-700">
                            <div className="flex-1">
                              <div className="font-medium text-white">Alice Brown</div>
                              <div className="text-sm text-gray-400">Procurement Director</div>
                              <div className="text-xs text-red-400 mt-1">Budget gatekeeper</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>

            <Card className="bg-gray-800/50 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Target className="w-5 h-5 text-purple-400" />
                  Engagement Strategy
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-300">
                  Target CTO and CFO first, build champion relationship with Eng Manager
                </p>
                <div className="mt-4 flex items-center gap-2">
                  <Button
                    className="bg-[#0066FF] hover:bg-[#0052CC]"
                    onClick={() => handleGenerateOutreach('Acme Corp')}
                    disabled={loading}
                  >
                    <Sparkles className="w-4 h-4 mr-2" />
                    Generate Outreach
                  </Button>
                  <Button variant="outline" className="border-gray-600">
                    <Eye className="w-4 h-4 mr-2" />
                    View Full Report
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ANALYTICS */}
          <TabsContent value="analytics" className="space-y-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-white">Analytics</h2>
                <p className="text-gray-400 text-sm mt-1">
                  Performance metrics and insights
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="border-gray-600">
                  <Filter className="w-4 h-4 mr-2" />
                  Filter
                </Button>
                <Button variant="outline" size="sm" className="border-gray-600">
                  <Download className="w-4 h-4 mr-2" />
                  Export
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="bg-gray-800/50 border-gray-700">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm text-gray-400">Response Rate</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-white mb-2">28%</div>
                  <div className="flex items-center gap-1 text-sm text-green-400">
                    <TrendingUp className="w-4 h-4" />
                    <span>+12% vs last week</span>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gray-800/50 border-gray-700">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm text-gray-400">Conversion Rate</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-white mb-2">{metrics.conversion_rate}%</div>
                  <div className="flex items-center gap-1 text-sm text-green-400">
                    <TrendingUp className="w-4 h-4" />
                    <span>+5% vs last week</span>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gray-800/50 border-gray-700">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm text-gray-400">Avg Deal Size</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-white mb-2">$12K</div>
                  <div className="flex items-center gap-1 text-sm text-red-400">
                    <TrendingDown className="w-4 h-4" />
                    <span>-3% vs last week</span>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gray-800/50 border-gray-700">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm text-gray-400">Active Campaigns</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-white mb-2">7</div>
                  <div className="flex items-center gap-1 text-sm text-gray-400">
                    <Info className="w-4 h-4" />
                    <span>2 need review</span>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card className="bg-gray-800/50 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <BarChart className="w-5 h-5 text-[#0066FF]" />
                  Performance Trends
                </CardTitle>
                <CardDescription className="text-gray-400">
                  Last 30 days
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64 flex items-center justify-center text-gray-500">
                  Chart visualization would go here
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="bg-gray-800/50 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Lightbulb className="w-5 h-5 text-yellow-400" />
                    Winning Patterns
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-green-900/20 border border-green-700 rounded">
                    <div className="flex-1">
                      <div className="text-sm text-white">Tuesday morning sends</div>
                      <div className="text-xs text-gray-400">Success rate: 50%</div>
                    </div>
                    <Badge variant="outline" className="text-green-400 border-green-400">
                      5 occurrences
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-green-900/20 border border-green-700 rounded">
                    <div className="flex-1">
                      <div className="text-sm text-white">Personalized tech stack mentions</div>
                      <div className="text-xs text-gray-400">Success rate: 45%</div>
                    </div>
                    <Badge variant="outline" className="text-green-400 border-green-400">
                      8 occurrences
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gray-800/50 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-red-400" />
                    Losing Patterns
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-red-900/20 border border-red-700 rounded">
                    <div className="flex-1">
                      <div className="text-sm text-white">Pricing concerns raised early</div>
                      <div className="text-xs text-gray-400">Failure rate: 30%</div>
                    </div>
                    <Badge variant="outline" className="text-red-400 border-red-400">
                      3 occurrences
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-red-900/20 border border-red-700 rounded">
                    <div className="flex-1">
                      <div className="text-sm text-white">Generic subject lines</div>
                      <div className="text-xs text-gray-400">Failure rate: 40%</div>
                    </div>
                    <Badge variant="outline" className="text-red-400 border-red-400">
                      6 occurrences
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
