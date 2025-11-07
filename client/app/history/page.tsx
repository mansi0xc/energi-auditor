"use client"

import { useState, useEffect } from "react"
import { useSession, signOut } from "next-auth/react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { CollaborativeLogo } from "@/components/collaborative-logo"
import { generateAuditReportPDF } from "@/lib/pdf-generator"
import type { AuditReport } from "@/functions/auditInit"
import { 
  FileText, 
  Download, 
  Search, 
  Calendar,
  Code,
  AlertTriangle,
  ChevronRight,
  Loader2,
  X
} from "lucide-react"

interface AuditHistoryItem {
  _id: string;
  contractName: string;
  language: string;
  summary: string;
  vulnerabilities: Array<{
    id: string;
    title: string;
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  }>;
  linesOfCode?: number;
  auditedAt: string;
  auditDuration?: number;
  createdAt: string;
}

export default function HistoryPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [reports, setReports] = useState<AuditHistoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedReport, setSelectedReport] = useState<AuditHistoryItem | null>(null)
  const [reportDetails, setReportDetails] = useState<AuditReport | null>(null)
  const [loadingDetails, setLoadingDetails] = useState(false)
  const [downloadingPDF, setDownloadingPDF] = useState(false)

  // Redirect if not authenticated
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/")
    }
  }, [status, router])

  // Fetch audit history
  useEffect(() => {
    if (status === "authenticated") {
      fetchHistory()
    }
  }, [status])

  const fetchHistory = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const params = new URLSearchParams()
      if (searchQuery) {
        params.append('contractName', searchQuery)
      }
      
      const response = await fetch(`/api/audit/history?${params.toString()}`)
      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch audit history')
      }

      if (result.success) {
        setReports(result.data || [])
      }
    } catch (err: any) {
      console.error("Error fetching history:", err)
      setError(err.message || "Failed to load audit history")
    } finally {
      setLoading(false)
    }
  }

  const fetchReportDetails = async (reportId: string) => {
    try {
      setLoadingDetails(true)
      const response = await fetch(`/api/audit/${reportId}`)
      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch report details')
      }

      if (result.success && result.data) {
        // Convert the MongoDB document to AuditReport format
        const report: AuditReport = {
          contractName: result.data.contractName,
          language: result.data.language as any,
          summary: result.data.summary,
          vulnerabilities: result.data.vulnerabilities,
          linesOfCode: result.data.linesOfCode,
          auditedAt: new Date(result.data.auditedAt),
          auditEngineVersion: result.data.auditEngineVersion,
          rawResponse: result.data.rawResponse,
        }
        setReportDetails(report)
        setSelectedReport(result.data)
      }
    } catch (err: any) {
      console.error("Error fetching report details:", err)
      setError(err.message || "Failed to load report details")
    } finally {
      setLoadingDetails(false)
    }
  }

  const handleDownloadPDF = async () => {
    if (!reportDetails) return
    
    setDownloadingPDF(true)
    try {
      await new Promise(resolve => setTimeout(resolve, 500))
      generateAuditReportPDF(reportDetails, session?.user?.email || undefined)
    } catch (error) {
      console.error('Failed to generate PDF:', error)
      setError('Failed to generate PDF report. Please try again.')
    } finally {
      setDownloadingPDF(false)
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'CRITICAL':
        return 'bg-red-500/10 text-red-600 border-red-500/20'
      case 'HIGH':
        return 'bg-orange-500/10 text-orange-600 border-orange-500/20'
      case 'MEDIUM':
        return 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20'
      case 'LOW':
        return 'bg-blue-500/10 text-blue-600 border-blue-500/20'
      default:
        return 'bg-gray-500/10 text-gray-600 border-gray-500/20'
    }
  }

  const getSeverityCount = (vulnerabilities: AuditHistoryItem['vulnerabilities'], severity: string) => {
    return vulnerabilities.filter(v => v.severity === severity).length
  }

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  if (status === "unauthenticated") {
    return null
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-8">
              <Link href="/" className="flex items-center">
                <CollaborativeLogo size="md" />
              </Link>
              
              <nav className="hidden md:flex space-x-1">
                <Link href="/">
                  <Button variant="ghost" size="sm">
                    Audit
                  </Button>
                </Link>
                <Button variant="default" size="sm">
                  History
                </Button>
              </nav>
            </div>

            <div className="flex items-center space-x-4">
              {session?.user?.image && (
                <img
                  src={session.user.image}
                  alt={session.user.name || "User"}
                  className="w-8 h-8 rounded-full"
                />
              )}
              <div className="hidden sm:block text-right">
                <p className="text-sm font-medium text-foreground">
                  {session?.user?.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {session?.user?.email}
                </p>
              </div>
              <Button
                onClick={() => signOut({ callbackUrl: "/" })}
                variant="outline"
                size="sm"
              >
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Audit History</h1>
          <p className="text-muted-foreground">
            View and manage all your previous audit reports
          </p>
        </div>

        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-5 w-5" />
            <input
              type="text"
              placeholder="Search by contract name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  fetchHistory()
                }
              }}
              className="w-full pl-10 pr-4 py-2 border border-border rounded-lg bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <Button
              onClick={fetchHistory}
              className="absolute right-2 top-1/2 transform -translate-y-1/2"
              size="sm"
            >
              Search
            </Button>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-600">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-3 text-muted-foreground">Loading audit history...</span>
          </div>
        ) : reports.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-foreground mb-2">No audit reports found</h3>
            <p className="text-muted-foreground mb-4">
              {searchQuery ? "Try a different search query" : "Start by auditing a smart contract"}
            </p>
            {!searchQuery && (
              <Link href="/">
                <Button>Go to Audit</Button>
              </Link>
            )}
          </div>
        ) : (
          <div className="grid gap-4">
            {reports.map((report) => (
              <div
                key={report._id}
                className="bg-card border border-border rounded-lg p-6 hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => fetchReportDetails(report._id)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-foreground">
                        {report.contractName}
                      </h3>
                      <span className="px-2 py-1 text-xs font-medium rounded bg-primary/10 text-primary">
                        {report.language}
                      </span>
                    </div>
                    
                    <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                      {report.summary}
                    </p>

                    <div className="flex items-center gap-6 text-sm">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        {new Date(report.auditedAt).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </div>
                      
                      {report.linesOfCode && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Code className="h-4 w-4" />
                          {report.linesOfCode.toLocaleString()} lines
                        </div>
                      )}

                      <div className="flex items-center gap-2 text-muted-foreground">
                        <AlertTriangle className="h-4 w-4" />
                        {report.vulnerabilities.length} vulnerabilities
                      </div>
                    </div>

                    {/* Severity Badges */}
                    {report.vulnerabilities.length > 0 && (
                      <div className="flex items-center gap-2 mt-4">
                        {getSeverityCount(report.vulnerabilities, 'CRITICAL') > 0 && (
                          <span className={`px-2 py-1 text-xs font-medium rounded border ${getSeverityColor('CRITICAL')}`}>
                            {getSeverityCount(report.vulnerabilities, 'CRITICAL')} Critical
                          </span>
                        )}
                        {getSeverityCount(report.vulnerabilities, 'HIGH') > 0 && (
                          <span className={`px-2 py-1 text-xs font-medium rounded border ${getSeverityColor('HIGH')}`}>
                            {getSeverityCount(report.vulnerabilities, 'HIGH')} High
                          </span>
                        )}
                        {getSeverityCount(report.vulnerabilities, 'MEDIUM') > 0 && (
                          <span className={`px-2 py-1 text-xs font-medium rounded border ${getSeverityColor('MEDIUM')}`}>
                            {getSeverityCount(report.vulnerabilities, 'MEDIUM')} Medium
                          </span>
                        )}
                        {getSeverityCount(report.vulnerabilities, 'LOW') > 0 && (
                          <span className={`px-2 py-1 text-xs font-medium rounded border ${getSeverityColor('LOW')}`}>
                            {getSeverityCount(report.vulnerabilities, 'LOW')} Low
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  
                  <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Report Details Modal/Sheet */}
        {selectedReport && reportDetails && (
          <div 
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setSelectedReport(null)
                setReportDetails(null)
              }
            }}
          >
            <div className="bg-card border border-border rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-card border-b border-border p-6 flex items-center justify-between z-10">
                <div>
                  <h2 className="text-2xl font-bold text-foreground">{reportDetails.contractName}</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Audited on {new Date(selectedReport.auditedAt).toLocaleString()}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    onClick={handleDownloadPDF}
                    disabled={downloadingPDF}
                    variant="outline"
                    size="sm"
                  >
                    {downloadingPDF ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Download className="h-4 w-4 mr-2" />
                        Download PDF
                      </>
                    )}
                  </Button>
                  <Button
                    onClick={() => {
                      setSelectedReport(null)
                      setReportDetails(null)
                    }}
                    variant="ghost"
                    size="sm"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="p-6">
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-foreground mb-2">Summary</h3>
                  <p className="text-muted-foreground">{reportDetails.summary}</p>
                </div>

                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-foreground mb-4">Vulnerabilities</h3>
                  <div className="space-y-4">
                    {reportDetails.vulnerabilities.map((vuln, index) => (
                      <div
                        key={vuln.id}
                        className="border border-border rounded-lg p-4"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <h4 className="font-semibold text-foreground">
                            {index + 1}. {vuln.title}
                          </h4>
                          <span className={`px-2 py-1 text-xs font-medium rounded border ${getSeverityColor(vuln.severity)}`}>
                            {vuln.severity}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">{vuln.description}</p>
                        <div className="mt-2 p-2 bg-primary/5 rounded border-l-2 border-primary">
                          <p className="text-xs font-medium text-foreground mb-1">Recommendation:</p>
                          <p className="text-sm text-muted-foreground">{vuln.recommendation}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

