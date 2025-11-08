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
    description?: string;
    recommendation?: string;
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    function?: string;
    lines?: number[];
    category?: string;
  }>;
  linesOfCode?: number;
  auditedAt: string;
  auditDuration?: number;
  createdAt: string;
  riskScore?: number;
  isReAudit?: boolean;
  originalAuditId?: string;
  auditEngineVersion?: string;
  rawResponse?: unknown;
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
  const [showReAuditForm, setShowReAuditForm] = useState(false)
  const [improvedContract, setImprovedContract] = useState("")
  const [isReAuditing, setIsReAuditing] = useState(false)
  const [reAuditError, setReAuditError] = useState<string | null>(null)
  const [hasReAudit, setHasReAudit] = useState(false)
  const [reAuditData, setReAuditData] = useState<AuditHistoryItem[]>([])
  const [originalAuditData, setOriginalAuditData] = useState<AuditHistoryItem | null>(null)
  const [viewingOriginal, setViewingOriginal] = useState(true) // Toggle between original and re-audits
  const [currentReAuditIndex, setCurrentReAuditIndex] = useState(0) // Which re-audit we're viewing

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
      const [reportResponse, reAuditResponse] = await Promise.all([
        fetch(`/api/audit/${reportId}`),
        fetch(`/api/audit/${reportId}/reaudit`)
      ])

      const reportResult = await reportResponse.json()
      const reAuditResult = await reAuditResponse.json()

      if (!reportResponse.ok) {
        throw new Error(reportResult.error || 'Failed to fetch report details')
      }

      if (reportResult.success && reportResult.data) {
        const reportData = reportResult.data
        
        // Determine if we're viewing an original audit or a re-audit
        const isViewingReAudit = reportData.isReAudit
        
        if (reAuditResult.success && reAuditResult.data) {
          const { originalAudit, reAudits } = reAuditResult.data
          
          // Set original audit data
          if (originalAudit) {
            setOriginalAuditData(originalAudit)
          }
          
          // Set re-audits array
          setReAuditData(reAudits || [])
          setHasReAudit((reAudits || []).length > 0)
          
          // If viewing a re-audit, find its index in the re-audits array
          if (isViewingReAudit && reAudits && reAudits.length > 0) {
            const index = reAudits.findIndex((r: any) => r._id === reportId)
            if (index >= 0) {
              setCurrentReAuditIndex(index)
              setViewingOriginal(false)
            } else {
              setViewingOriginal(true)
            }
          } else {
            // Viewing original audit
            setViewingOriginal(true)
            setCurrentReAuditIndex(0)
          }
        } else {
          // No re-audits
          setViewingOriginal(true)
          setHasReAudit(false)
          setReAuditData([])
          setOriginalAuditData(null)
        }
        
        // Convert the MongoDB document to AuditReport format for display
        const report: AuditReport = {
          contractName: reportData.contractName,
          language: reportData.language as any,
          summary: reportData.summary,
          vulnerabilities: reportData.vulnerabilities,
          linesOfCode: reportData.linesOfCode,
          auditedAt: new Date(reportData.auditedAt),
          auditEngineVersion: reportData.auditEngineVersion,
          rawResponse: reportData.rawResponse,
        }
        setReportDetails(report)
        setSelectedReport(reportData)
      }
    } catch (err: any) {
      console.error("Error fetching report details:", err)
      setError(err.message || "Failed to load report details")
    } finally {
      setLoadingDetails(false)
    }
  }

  // Function to switch between original and re-audit views
  const switchToView = (viewOriginal: boolean, reAuditIndex: number = 0) => {
    if (viewOriginal && originalAuditData) {
      // Switch to original audit
      const report: AuditReport = {
        contractName: originalAuditData.contractName,
        language: originalAuditData.language as any,
        summary: originalAuditData.summary,
        vulnerabilities: originalAuditData.vulnerabilities as any,
        linesOfCode: originalAuditData.linesOfCode,
        auditedAt: new Date(originalAuditData.auditedAt),
        auditEngineVersion: originalAuditData.auditEngineVersion,
        rawResponse: originalAuditData.rawResponse,
      }
      setReportDetails(report)
      setSelectedReport(originalAuditData)
      setViewingOriginal(true)
      setCurrentReAuditIndex(0)
    } else if (!viewOriginal && reAuditData.length > 0 && reAuditData[reAuditIndex]) {
      // Switch to a specific re-audit
      const reAudit = reAuditData[reAuditIndex]
      const report: AuditReport = {
        contractName: reAudit.contractName,
        language: reAudit.language as any,
        summary: reAudit.summary,
        vulnerabilities: reAudit.vulnerabilities as any,
        linesOfCode: reAudit.linesOfCode,
        auditedAt: new Date(reAudit.auditedAt),
        auditEngineVersion: reAudit.auditEngineVersion,
        rawResponse: reAudit.rawResponse,
      }
      setReportDetails(report)
      setSelectedReport(reAudit)
      setViewingOriginal(false)
      setCurrentReAuditIndex(reAuditIndex)
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

  const handleReAudit = async () => {
    if (!originalAuditData || !improvedContract.trim()) {
      setReAuditError('Please enter the improved contract code')
      return
    }

    setIsReAuditing(true)
    setReAuditError(null)

    try {
      // Always use the original audit ID for re-audits
      const originalId = originalAuditData._id
      const response = await fetch('/api/audit/reaudit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          originalAuditId: originalId,
          improvedContractCode: improvedContract.trim(),
          contractName: originalAuditData.contractName,
          timeout: 120000,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to re-audit contract')
      }

      if (result.success) {
        // Close the form but keep the modal open to show the new re-audit
        setShowReAuditForm(false)
        setImprovedContract("")
        setReAuditError(null)
        
        // Refresh the report details to include the new re-audit
        if (originalAuditData) {
          // Use original audit ID to fetch updated data
          await fetchReportDetails(originalAuditData._id)
          // Switch to view the new re-audit (most recent, index 0)
          setTimeout(() => {
            switchToView(false, 0)
          }, 100)
        }
        
        // Refresh the history list
        fetchHistory()
        
        // Show success message with improvement details
        const improvement = result.metadata.improvement
        const message = improvement && parseFloat(improvement) > 0
          ? `Re-audit completed! Risk score improved from ${result.metadata.originalRiskScore?.toFixed(1)} to ${result.metadata.newRiskScore?.toFixed(1)} (${improvement}% improvement)`
          : improvement && parseFloat(improvement) < 0
          ? `Re-audit completed! Risk score changed from ${result.metadata.originalRiskScore?.toFixed(1)} to ${result.metadata.newRiskScore?.toFixed(1)} (${Math.abs(parseFloat(improvement)).toFixed(1)}% increase)`
          : `Re-audit completed! Risk score: ${result.metadata.newRiskScore?.toFixed(1)}`
        alert(message)
      }
    } catch (err: any) {
      console.error("Re-audit error:", err)
      setReAuditError(err.message || "Failed to re-audit contract. Please try again.")
    } finally {
      setIsReAuditing(false)
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
                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                      <h3 className="text-lg font-semibold text-foreground">
                        {report.contractName}
                      </h3>
                      <span className="px-2 py-1 text-xs font-medium rounded bg-primary/10 text-primary">
                        {report.language}
                      </span>
                      {report.riskScore !== undefined && (
                        <span className={`px-2 py-1 text-xs font-medium rounded border ${
                          report.riskScore >= 75 ? 'bg-red-500/10 text-red-600 border-red-500/20' :
                          report.riskScore >= 50 ? 'bg-orange-500/10 text-orange-600 border-orange-500/20' :
                          report.riskScore >= 25 ? 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20' :
                          'bg-green-500/10 text-green-600 border-green-500/20'
                        }`}>
                          Risk: {report.riskScore.toFixed(1)}
                        </span>
                      )}
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
                  {/* Always show submit button for original audits, regardless of re-audits */}
                  {originalAuditData && viewingOriginal && (
                    <Button
                      onClick={() => setShowReAuditForm(!showReAuditForm)}
                      variant="outline"
                      size="sm"
                    >
                      {showReAuditForm ? 'Cancel' : 'Submit Improved Contract'}
                    </Button>
                  )}
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
                      setShowReAuditForm(false)
                      setImprovedContract("")
                      setReAuditError(null)
                      setHasReAudit(false)
                      setReAuditData([])
                      setOriginalAuditData(null)
                      setViewingOriginal(true)
                      setCurrentReAuditIndex(0)
                    }}
                    variant="ghost"
                    size="sm"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="p-6">
                {/* Toggle between Original and Re-Audits */}
                {originalAuditData && (hasReAudit || viewingOriginal) && (
                  <div className="mb-6 p-4 bg-muted/20 border border-border rounded-lg">
                    <div className="flex items-center justify-between flex-wrap gap-3">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-foreground">View:</span>
                        <div className="flex items-center gap-2">
                          <Button
                            onClick={() => switchToView(true)}
                            variant={viewingOriginal ? "default" : "outline"}
                            size="sm"
                          >
                            Original Audit
                          </Button>
                          {hasReAudit && reAuditData.length > 0 && (
                            <>
                              {reAuditData.map((reAudit, index) => (
                                <Button
                                  key={reAudit._id}
                                  onClick={() => switchToView(false, index)}
                                  variant={!viewingOriginal && currentReAuditIndex === index ? "default" : "outline"}
                                  size="sm"
                                >
                                  Re-Audit #{index + 1}
                                  {index === 0 && reAuditData.length > 1 && " (Latest)"}
                                </Button>
                              ))}
                            </>
                          )}
                        </div>
                      </div>
                      {originalAuditData && originalAuditData.riskScore !== undefined && (
                        <div className="flex items-center gap-4 text-sm">
                          {viewingOriginal ? (
                            <span className="text-muted-foreground">
                              Risk Score: <span className="font-bold text-foreground">{originalAuditData.riskScore.toFixed(1)}/100</span>
                            </span>
                          ) : reAuditData.length > 0 && reAuditData[currentReAuditIndex] && (
                            <div className="flex items-center gap-4">
                              <span className="text-muted-foreground">
                                Original: <span className="font-bold text-orange-600">{originalAuditData.riskScore.toFixed(1)}/100</span>
                              </span>
                              <span className="text-muted-foreground">
                                Current: <span className={`font-bold ${
                                  reAuditData[currentReAuditIndex].riskScore! < originalAuditData.riskScore 
                                    ? 'text-green-600' 
                                    : 'text-red-600'
                                }`}>
                                  {reAuditData[currentReAuditIndex].riskScore!.toFixed(1)}/100
                                </span>
                              </span>
                              {reAuditData[currentReAuditIndex].riskScore! < originalAuditData.riskScore && (
                                <span className="text-green-600 font-medium">
                                  Improved by {((originalAuditData.riskScore - reAuditData[currentReAuditIndex].riskScore!) / originalAuditData.riskScore * 100).toFixed(1)}%
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Re-Audit Form - Show when viewing original audit */}
                {showReAuditForm && viewingOriginal && originalAuditData && (
                  <div className="mb-6 p-4 bg-muted/20 border border-border rounded-lg">
                    <h3 className="text-lg font-semibold text-foreground mb-3">
                      Submit Improved Contract
                    </h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Paste your improved contract code below. After auditing, the risk score will be used as the post-audit score.
                    </p>
                    
                    <textarea
                      value={improvedContract}
                      onChange={(e) => setImprovedContract(e.target.value)}
                      placeholder="Paste your improved contract code here..."
                      className="w-full h-64 p-3 border border-border rounded-lg bg-card text-foreground font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                    />

                    {reAuditError && (
                      <div className="mt-3 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-600 text-sm">
                        {reAuditError}
                      </div>
                    )}

                    <div className="mt-4 flex items-center gap-3">
                      <Button
                        onClick={handleReAudit}
                        disabled={isReAuditing || !improvedContract.trim()}
                        size="sm"
                      >
                        {isReAuditing ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Auditing...
                          </>
                        ) : (
                          'Submit for Re-Audit'
                        )}
                      </Button>
                      <Button
                        onClick={() => {
                          setShowReAuditForm(false)
                          setImprovedContract("")
                          setReAuditError(null)
                        }}
                        variant="outline"
                        size="sm"
                        disabled={isReAuditing}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}

                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-foreground mb-2">Summary</h3>
                  <p className="text-muted-foreground">{reportDetails.summary}</p>
                  {selectedReport.riskScore !== undefined && (
                    <div className="mt-3">
                      <span className="text-sm font-medium text-foreground">Risk Score: </span>
                      <span className={`text-sm font-bold ${
                        selectedReport.riskScore >= 75 ? 'text-red-600' :
                        selectedReport.riskScore >= 50 ? 'text-orange-600' :
                        selectedReport.riskScore >= 25 ? 'text-yellow-600' : 'text-green-600'
                      }`}>
                        {selectedReport.riskScore.toFixed(1)}/100
                      </span>
                    </div>
                  )}
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

