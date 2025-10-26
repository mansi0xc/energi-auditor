"use client"

import { useState } from "react"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { AuthHeader } from "@/components/auth-header"
import { summarizeVulnerabilities, calculateRiskScore } from "@/functions/auditInit"
import type { AuditReport } from "@/functions/auditInit"
import { 
  CreditDisplay, 
  CreditCostIndicator, 
  CreditConsumedFeedback 
} from "@/components/credit-tracker"
import { generateAuditReportPDF } from "@/lib/pdf-generator"

export default function AuditPage() {
  const { data: session, status } = useSession()
  const [contract, setContract] = useState("")
  const [contractName, setContractName] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [auditReport, setAuditReport] = useState<AuditReport | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [sessionCredits, setSessionCredits] = useState(0)
  const [showCreditFeedback, setShowCreditFeedback] = useState(false)
  const [isDownloadingPDF, setIsDownloadingPDF] = useState(false)
  const [lastAuditMetadata, setLastAuditMetadata] = useState<{
    creditsConsumed: number;
    auditDuration: number;
    vulnerabilitiesFound: number;
  } | null>(null)

  // Show loading state while checking authentication
  if (status === "loading") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  // Redirect to sign-in if not authenticated (middleware should handle this, but just in case)
  if (!session) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Authentication Required</h1>
          <p className="text-muted-foreground mb-4">Please sign in to access the audit tool.</p>
          <Button asChild>
            <a href="/auth/signin">Sign In</a>
          </Button>
        </div>
      </div>
    )
  }

  const handleAudit = async () => {
    if (!contract.trim()) {
      setError("Please paste a smart contract")
      return
    }

    setIsLoading(true)
    setError(null)
    setAuditReport(null)

    try {
      // Call internal API
      const response = await fetch('/api/audit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contractCode: contract.trim(),
          contractName: contractName.trim() || undefined,
          timeout: 120000,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to audit smart contract')
      }

      if (result.success && result.data) {
        setAuditReport(result.data)
        
        // Update session credits and show feedback
        if (result.metadata) {
          const creditsConsumed = result.metadata.creditsConsumed || 1;
          setSessionCredits(prev => prev + creditsConsumed);
          setLastAuditMetadata({
            creditsConsumed,
            auditDuration: result.metadata.auditDuration || 0,
            vulnerabilitiesFound: result.data.vulnerabilities?.length || 0,
          });
          setShowCreditFeedback(true);
        }
      } else {
        throw new Error('Invalid response from audit service')
      }
    } catch (err: any) {
      console.error("Audit error:", err)
      setError(err.message || "Failed to audit smart contract. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleDownloadPDF = async () => {
    if (!auditReport) return
    
    setIsDownloadingPDF(true)
    try {
      // Small delay to show loading state
      await new Promise(resolve => setTimeout(resolve, 500))
      generateAuditReportPDF(auditReport, session?.user?.email || undefined)
    } catch (error) {
      console.error('Failed to generate PDF:', error)
      setError('Failed to generate PDF report. Please try again.')
    } finally {
      setIsDownloadingPDF(false)
    }
  }

  const renderAuditResults = () => {
    if (!auditReport) return null

    const summary = summarizeVulnerabilities(auditReport)
    const riskScore = calculateRiskScore(auditReport)

    return (
      <div className="mt-8 space-y-6">
        <div className="border border-border rounded-lg p-6 bg-card">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Audit Results</h2>
            <Button
              onClick={handleDownloadPDF}
              variant="outline"
              disabled={isDownloadingPDF}
              className="flex items-center gap-2"
            >
              {isDownloadingPDF ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                  Generating PDF...
                </>
              ) : (
                <>
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Download PDF Report
                </>
              )}
            </Button>
          </div>
          
          {/* Summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="text-center p-3 bg-red-50 rounded-lg border border-red-200">
              <div className="text-2xl font-bold text-red-600">{summary.CRITICAL}</div>
              <div className="text-sm text-red-700">Critical</div>
            </div>
            <div className="text-center p-3 bg-orange-50 rounded-lg border border-orange-200">
              <div className="text-2xl font-bold text-orange-600">{summary.HIGH}</div>
              <div className="text-sm text-orange-700">High</div>
            </div>
            <div className="text-center p-3 bg-yellow-50 rounded-lg border border-yellow-200">
              <div className="text-2xl font-bold text-yellow-600">{summary.MEDIUM}</div>
              <div className="text-sm text-yellow-700">Medium</div>
            </div>
            <div className="text-center p-3 bg-blue-50 rounded-lg border border-blue-200">
              <div className="text-2xl font-bold text-blue-600">{summary.LOW}</div>
              <div className="text-sm text-blue-700">Low</div>
            </div>
          </div>

          {/* Risk Score */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium">Risk Score</span>
              <span className="text-sm font-bold">{riskScore}/100</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className={`h-2 rounded-full ${
                  riskScore >= 75 ? 'bg-red-500' : 
                  riskScore >= 50 ? 'bg-orange-500' : 
                  riskScore >= 25 ? 'bg-yellow-500' : 'bg-green-500'
                }`}
                style={{ width: `${riskScore}%` }}
              ></div>
            </div>
          </div>

          {/* Contract Info */}
          <div className="mb-6 text-sm text-muted-foreground">
            <p><strong>Contract:</strong> {auditReport.contractName}</p>
            <p><strong>Language:</strong> {auditReport.language}</p>
            <p><strong>Lines of Code:</strong> {auditReport.linesOfCode}</p>
            <p><strong>Audited:</strong> {auditReport.auditedAt.toLocaleString()}</p>
          </div>

          {/* Summary */}
          <div className="mb-6">
            <h3 className="font-semibold mb-2">Summary</h3>
            <p className="text-sm text-muted-foreground">{auditReport.summary}</p>
          </div>

          {/* Vulnerabilities */}
          {auditReport.vulnerabilities.length > 0 && (
            <div>
              <h3 className="font-semibold mb-4">Vulnerabilities ({auditReport.vulnerabilities.length})</h3>
              <div className="space-y-4">
                {auditReport.vulnerabilities.map((vuln, index) => (
                  <div key={vuln.id} className="border border-border rounded-lg p-4">
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-medium">{vuln.title}</h4>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        vuln.severity === 'CRITICAL' ? 'bg-red-100 text-red-800' :
                        vuln.severity === 'HIGH' ? 'bg-orange-100 text-orange-800' :
                        vuln.severity === 'MEDIUM' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-blue-100 text-blue-800'
                      }`}>
                        {vuln.severity}
                      </span>
                    </div>
                    {vuln.function && (
                      <p className="text-sm text-muted-foreground mb-2">
                        <strong>Function:</strong> {vuln.function}
                      </p>
                    )}
                    {vuln.category && (
                      <p className="text-sm text-muted-foreground mb-2">
                        <strong>Category:</strong> {vuln.category}
                      </p>
                    )}
                    <p className="text-sm mb-3">{vuln.description}</p>
                    <div className="bg-muted p-3 rounded text-sm">
                      <strong>Recommendation:</strong> {vuln.recommendation}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <AuthHeader />
      
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-3 space-y-6">
            <div className="space-y-2">
              <h1 className="text-3xl font-bold text-foreground">Smart Contract Audit</h1>
              <p className="text-muted-foreground">
                Paste your smart contract code below to analyze for vulnerabilities using AI-powered auditing.
              </p>
            </div>

          {/* Input Form */}
          <div className="space-y-4">
            <div>
              <label htmlFor="contractName" className="block text-sm font-medium mb-2">
                Contract Name (Optional)
              </label>
              <input
                id="contractName"
                type="text"
                value={contractName}
                onChange={(e) => setContractName(e.target.value)}
                placeholder="e.g., MyToken, DEXContract"
                className="w-full p-3 bg-muted border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div>
              <label htmlFor="contractCode" className="block text-sm font-medium mb-2">
                Smart Contract Code
              </label>
              <textarea
                id="contractCode"
                value={contract}
                onChange={(e) => setContract(e.target.value)}
                placeholder="Paste your Solidity or Vyper smart contract code here..."
                className="w-full h-64 p-4 bg-muted border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none font-mono text-sm"
              />
            </div>

            {/* Credit Cost Indicator */}
            <CreditCostIndicator cost={1} />

            {/* Credit Consumed Feedback */}
            {showCreditFeedback && lastAuditMetadata && (
              <CreditConsumedFeedback
                creditsConsumed={lastAuditMetadata.creditsConsumed}
                auditDuration={lastAuditMetadata.auditDuration}
                vulnerabilitiesFound={lastAuditMetadata.vulnerabilitiesFound}
                onClose={() => setShowCreditFeedback(false)}
              />
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-red-800">{error}</p>
                  </div>
                </div>
              </div>
            )}

            <Button
              onClick={handleAudit}
              disabled={isLoading || !contract.trim()}
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90 py-3 rounded-lg font-medium transition-colors disabled:opacity-50"
            >
              {isLoading ? (
                <div className="flex items-center justify-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Auditing Contract...</span>
                </div>
              ) : (
                "Audit Smart Contract"
              )}
            </Button>
          </div>

            {/* Results */}
            {renderAuditResults()}
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            {/* Credit Display */}
            <CreditDisplay 
              sessionCredits={sessionCredits}
              showDetails={true}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
