/**
 * Lead Import Component
 * Upload CSV of leads and trigger research pipeline
 */

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Upload, CheckCircle, XCircle, AlertCircle, FileText, Zap } from 'lucide-react'
import { callAIAgent } from '@/utils/aiAgent'

const AGENTS = {
  SOVEREIGN_STRATEGIST: '696eeb2b3bd35d7a6606a553',
  RESEARCH_MANAGER: '696eeaf33bd35d7a6606a54c'
}

interface Lead {
  company_name: string
  company_domain: string
  contact_name: string
  contact_email: string
  contact_title: string
  contact_linkedin?: string
}

interface ProcessingStatus {
  total: number
  processed: number
  succeeded: number
  failed: number
  status: 'idle' | 'processing' | 'complete'
}

export default function LeadImport() {
  const [file, setFile] = useState<File | null>(null)
  const [leads, setLeads] = useState<Lead[]>([])
  const [processing, setProcessing] = useState<ProcessingStatus>({
    total: 0,
    processed: 0,
    succeeded: 0,
    failed: 0,
    status: 'idle'
  })

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = event.target.files?.[0]
    if (!uploadedFile) return

    setFile(uploadedFile)

    // Parse CSV
    const reader = new FileReader()
    reader.onload = e => {
      const text = e.target?.result as string
      const parsedLeads = parseCSV(text)
      setLeads(parsedLeads)
    }
    reader.readAsText(uploadedFile)
  }

  const parseCSV = (text: string): Lead[] => {
    const lines = text.split('\n').filter(line => line.trim())
    if (lines.length < 2) return []

    const headers = lines[0].split(',').map(h => h.trim().toLowerCase())
    const leads: Lead[] = []

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim())
      const lead: any = {}

      headers.forEach((header, index) => {
        lead[header] = values[index] || ''
      })

      if (lead.company_name && lead.contact_email) {
        leads.push({
          company_name: lead.company_name,
          company_domain: lead.company_domain || '',
          contact_name: lead.contact_name || '',
          contact_email: lead.contact_email,
          contact_title: lead.contact_title || '',
          contact_linkedin: lead.contact_linkedin || ''
        })
      }
    }

    return leads
  }

  const processLeads = async () => {
    setProcessing({
      total: leads.length,
      processed: 0,
      succeeded: 0,
      failed: 0,
      status: 'processing'
    })

    let succeeded = 0
    let failed = 0

    for (let i = 0; i < leads.length; i++) {
      const lead = leads[i]

      try {
        // Trigger Research Manager for each lead
        const response = await callAIAgent({
          agentId: AGENTS.RESEARCH_MANAGER,
          message: `Research company: ${lead.company_name} (${lead.company_domain}).
                    Contact: ${lead.contact_name}, ${lead.contact_title}.
                    Perform ICP qualification, tech stack analysis, and buying committee mapping.`
        })

        if (response.status === 'success') {
          succeeded++
        } else {
          failed++
        }
      } catch (error) {
        console.error(`Failed to process lead: ${lead.company_name}`, error)
        failed++
      }

      setProcessing(prev => ({
        ...prev,
        processed: i + 1,
        succeeded,
        failed
      }))

      // Rate limiting: 1 request per second
      await new Promise(resolve => setTimeout(resolve, 1000))
    }

    setProcessing(prev => ({
      ...prev,
      status: 'complete'
    }))
  }

  return (
    <Card className="bg-[#111827] border-gray-800">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <Upload className="w-5 h-5 text-[#0066FF]" />
          Import Leads
        </CardTitle>
        <CardDescription>
          Upload a CSV file to start the automated research and outreach pipeline
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* CSV Template */}
        <div className="bg-[#0A0F1C] border border-gray-700 rounded-lg p-4">
          <div className="flex items-start gap-3 mb-3">
            <FileText className="w-5 h-5 text-[#00D4FF] mt-0.5" />
            <div>
              <h4 className="text-white font-medium mb-1">CSV Format Required</h4>
              <p className="text-sm text-gray-400">
                Your CSV must include these columns:
              </p>
            </div>
          </div>
          <div className="bg-[#111827] rounded p-3 font-mono text-xs text-gray-300">
            company_name,company_domain,contact_name,contact_email,contact_title,contact_linkedin
          </div>
          <Button
            variant="outline"
            size="sm"
            className="mt-3 border-gray-600 text-gray-300"
            onClick={() => {
              const template = 'company_name,company_domain,contact_name,contact_email,contact_title,contact_linkedin\nAcme Corp,acme.com,John Doe,john@acme.com,VP Sales,linkedin.com/in/johndoe'
              const blob = new Blob([template], { type: 'text/csv' })
              const url = window.URL.createObjectURL(blob)
              const a = document.createElement('a')
              a.href = url
              a.download = 'lead_template.csv'
              a.click()
            }}
          >
            Download Template
          </Button>
        </div>

        {/* File Upload */}
        <div>
          <label
            htmlFor="csv-upload"
            className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-600 rounded-lg cursor-pointer hover:border-[#0066FF] transition-colors"
          >
            <div className="flex flex-col items-center justify-center pt-5 pb-6">
              <Upload className="w-8 h-8 text-gray-400 mb-2" />
              <p className="text-sm text-gray-400">
                {file ? file.name : 'Click to upload CSV file'}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {file
                  ? `${leads.length} leads detected`
                  : 'Maximum 500 leads per upload'}
              </p>
            </div>
            <input
              id="csv-upload"
              type="file"
              accept=".csv"
              className="hidden"
              onChange={handleFileUpload}
            />
          </label>
        </div>

        {/* Lead Preview */}
        {leads.length > 0 && processing.status === 'idle' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-white font-medium">Lead Preview</h4>
              <Badge className="bg-[#0066FF] text-white">
                {leads.length} leads ready
              </Badge>
            </div>

            <div className="bg-[#0A0F1C] rounded-lg border border-gray-700 max-h-48 overflow-y-auto">
              {leads.slice(0, 5).map((lead, idx) => (
                <div
                  key={idx}
                  className="p-3 border-b border-gray-700 last:border-0"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-white font-medium">{lead.company_name}</p>
                      <p className="text-sm text-gray-400">
                        {lead.contact_name} - {lead.contact_title}
                      </p>
                    </div>
                    <Badge
                      variant="outline"
                      className="border-green-500 text-green-400"
                    >
                      Valid
                    </Badge>
                  </div>
                </div>
              ))}
              {leads.length > 5 && (
                <div className="p-3 text-center text-sm text-gray-400">
                  + {leads.length - 5} more leads
                </div>
              )}
            </div>

            <Button
              className="w-full bg-[#0066FF] hover:bg-[#0052CC] text-white"
              onClick={processLeads}
            >
              <Zap className="w-4 h-4 mr-2" />
              Start Research Pipeline
            </Button>
          </div>
        )}

        {/* Processing Status */}
        {processing.status === 'processing' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-white font-medium">Processing Leads</h4>
              <span className="text-sm text-gray-400">
                {processing.processed} / {processing.total}
              </span>
            </div>

            <Progress
              value={(processing.processed / processing.total) * 100}
              className="h-2"
            />

            <div className="grid grid-cols-3 gap-4">
              <div className="bg-[#0A0F1C] rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-white">
                  {processing.processed}
                </div>
                <div className="text-xs text-gray-400">Processed</div>
              </div>
              <div className="bg-[#0A0F1C] rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-green-400">
                  {processing.succeeded}
                </div>
                <div className="text-xs text-gray-400">Succeeded</div>
              </div>
              <div className="bg-[#0A0F1C] rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-red-400">
                  {processing.failed}
                </div>
                <div className="text-xs text-gray-400">Failed</div>
              </div>
            </div>

            <p className="text-sm text-gray-400 text-center">
              Research data is being gathered for each account. This may take several
              minutes...
            </p>
          </div>
        )}

        {/* Complete Status */}
        {processing.status === 'complete' && (
          <div className="space-y-4">
            <div className="bg-green-900/20 border border-green-700 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-green-400 mt-0.5" />
                <div>
                  <h4 className="text-green-400 font-medium mb-1">
                    Import Complete
                  </h4>
                  <p className="text-sm text-green-200">
                    {processing.succeeded} leads successfully researched.{' '}
                    {processing.failed > 0 && `${processing.failed} failed.`}
                  </p>
                  <p className="text-sm text-green-200 mt-2">
                    Outreach generation has been triggered. Check the Approval Queue in
                    3-5 minutes.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1 border-gray-600 text-gray-300"
                onClick={() => {
                  setFile(null)
                  setLeads([])
                  setProcessing({
                    total: 0,
                    processed: 0,
                    succeeded: 0,
                    failed: 0,
                    status: 'idle'
                  })
                }}
              >
                Import More Leads
              </Button>
              <Button
                className="flex-1 bg-[#0066FF] hover:bg-[#0052CC] text-white"
                onClick={() => (window.location.href = '/')}
              >
                Go to Approval Queue
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
