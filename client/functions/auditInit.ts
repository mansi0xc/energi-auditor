// /functions/auditInit.ts
import axios, { AxiosError } from "axios";

/**
 * Severity levels for vulnerabilities found in smart contracts
 */
export type VulnerabilitySeverity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

/**
 * Supported smart contract languages
 */
export type ContractLanguage = "Solidity" | "Vyper" | "Unknown";

/**
 * Represents a single vulnerability found in a smart contract
 */
export interface Vulnerability {
  /** Unique identifier for the vulnerability */
  id: string;
  /** Short title describing the vulnerability */
  title: string;
  /** Detailed description of the vulnerability */
  description: string;
  /** Severity level of the vulnerability */
  severity: VulnerabilitySeverity;
  /** Recommended fix or mitigation for the vulnerability */
  recommendation: string;
  /** Function name where the vulnerability is located (if applicable) */
  function?: string;
  /** Line numbers where the vulnerability exists (if available) */
  lines?: number[];
  /** Category or type of vulnerability (e.g., "Reentrancy", "Integer Overflow") */
  category?: string;
}

/**
 * Complete audit report for a smart contract
 */
export interface AuditReport {
  /** Name of the audited contract */
  contractName: string;
  /** Programming language of the contract */
  language: ContractLanguage;
  /** Executive summary of the audit findings */
  summary: string;
  /** List of vulnerabilities found */
  vulnerabilities: Vulnerability[];
  /** Total lines of code analyzed */
  linesOfCode?: number;
  /** Timestamp when the audit was performed */
  auditedAt: Date;
  /** Version of the audit engine used (if available) */
  auditEngineVersion?: string;
  /** Raw API response for debugging purposes */
  rawResponse: unknown;
}

/**
 * Configuration options for the audit
 */
export interface AuditOptions {
  /** Timeout in milliseconds (default: 90000) */
  timeout?: number;
  /** Whether to include informational findings */
  includeInfo?: boolean;
  /** Custom API endpoint (for testing) */
  apiUrl?: string;
}

/**
 * API response structure from ChainGPT
 */
interface ChainGPTResponse {
  contractName?: string;
  language?: string;
  summary?: string;
  vulnerabilities?: Array<{
    id?: string;
    title?: string;
    description?: string;
    severity?: string;
    recommendation?: string;
    function?: string;
    lines?: number[];
    category?: string;
  }>;
  linesOfCode?: number;
  auditEngineVersion?: string;
}

/**
 * Default configuration values
 * Updated to use ChainGPT Smart Contract Auditor API
 */
const DEFAULT_CONFIG = {
  AUDIT_API_URL: "https://api.chaingpt.org/chat/stream",
  TIMEOUT: 90_000, // 90 seconds
  MAX_CONTRACT_SIZE: 100_000, // 100KB
} as const;

/**
 * Custom error class for audit-related errors
 */
export class AuditError extends Error {
  public readonly code?: string;
  public readonly details?: unknown;

  constructor(
    message: string,
    code?: string,
    details?: unknown
  ) {
    super(message);
    this.name = "AuditError";
    this.code = code;
    this.details = details;
  }
}

/**
 * Validates the input contract code
 * @throws {AuditError} If validation fails
 */
export function validateContractCode(contractCode: string): void {
  if (!contractCode || typeof contractCode !== "string") {
    throw new AuditError("Contract code must be a non-empty string", "INVALID_INPUT");
  }

  if (contractCode.trim().length === 0) {
    throw new AuditError("Contract code cannot be empty", "EMPTY_CONTRACT");
  }

  if (contractCode.length > DEFAULT_CONFIG.MAX_CONTRACT_SIZE) {
    throw new AuditError(
      `Contract code exceeds maximum size of ${DEFAULT_CONFIG.MAX_CONTRACT_SIZE} characters`,
      "CONTRACT_TOO_LARGE"
    );
  }
}

/**
 * Normalizes severity levels from the API response
 */
function normalizeSeverity(severity: string | undefined): VulnerabilitySeverity {
  const normalizedSeverity = severity?.toUpperCase();
  if (normalizedSeverity && ["LOW", "MEDIUM", "HIGH", "CRITICAL"].includes(normalizedSeverity)) {
    return normalizedSeverity as VulnerabilitySeverity;
  }
  return "LOW"; // Default to LOW if unknown
}

/**
 * Detects the contract language from the code
 */
function detectLanguage(code: string): ContractLanguage {
  // Simple heuristic detection
  if (code.includes("pragma solidity") || code.includes("contract ") || code.includes("function ")) {
    return "Solidity";
  }
  if (code.includes("@external") || code.includes("@internal") || code.includes("def ")) {
    return "Vyper";
  }
  return "Unknown";
}

/**
 * Audits a smart contract using ChainGPT's Smart Contract Auditor API.
 * 
 * @param contractCode - Solidity or Vyper smart contract source code
 * @param contractName - Optional name for the contract (defaults to "UnnamedContract")
 * @param options - Optional configuration options
 * @returns Structured audit report with vulnerabilities
 * @throws {AuditError} If the audit fails or input is invalid
 * 
 * @example
 * ```typescript
 * const report = await auditSmartContract(
 *   contractCode,
 *   "MyToken",
 *   { timeout: 120000 }
 * );
 * console.log(`Found ${report.vulnerabilities.length} vulnerabilities`);
 * ```
 */
export async function auditSmartContract(
  contractCode: string,
  contractName?: string,
  options?: AuditOptions
): Promise<AuditReport> {
  // Validate input
  validateContractCode(contractCode);

  // Get configuration
  const apiUrl = options?.apiUrl || DEFAULT_CONFIG.AUDIT_API_URL;
  const timeout = options?.timeout || DEFAULT_CONFIG.TIMEOUT;
  const apiKey = process.env.CHAINGPT_API_KEY;

  if (!apiKey) {
    throw new AuditError(
      "Missing CHAINGPT_API_KEY in environment variables",
      "MISSING_API_KEY"
    );
  }

  try {
    // Create audit prompt for ChainGPT
    const prompt = `You are a professional smart contract security auditor. Please analyze the following smart contract for security vulnerabilities and provide a detailed audit report.

Contract Name: ${contractName || 'Unknown'}
Contract Code:
\`\`\`solidity
${contractCode}
\`\`\`

Please provide your analysis in the following JSON format (return ONLY valid JSON, no additional text):

{
  "contractName": "${contractName || 'Unknown'}",
  "language": "Solidity",
  "summary": "Brief summary of the audit findings",
  "vulnerabilities": [
    {
      "id": "vuln-1",
      "title": "Vulnerability Title",
      "description": "Detailed description of the vulnerability",
      "severity": "CRITICAL|HIGH|MEDIUM|LOW",
      "recommendation": "How to fix this vulnerability",
      "function": "functionName (if applicable)",
      "lines": [10, 15],
      "category": "Reentrancy|Access Control|Integer Overflow|etc"
    }
  ],
  "linesOfCode": ${contractCode.split('\n').length},
  "auditEngineVersion": "ChainGPT-Smart-Contract-Auditor"
}

Focus on these common vulnerability types:
- Reentrancy attacks
- Access control issues
- Integer overflow/underflow
- Unchecked external calls
- Gas limit issues
- Logic errors
- State variable manipulation
- Front-running vulnerabilities
- Denial of Service attacks

Be thorough and provide actionable recommendations for each vulnerability found.`;

    // Create axios client similar to the example
    const apiClient = axios.create({
      baseURL: apiUrl,
      timeout,
      headers: { 
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      responseType: 'stream'
    });

    const response = await apiClient.post('/', {
      model: "smart_contract_auditor",
      question: prompt
    });

    // Handle streaming response from ChainGPT using event listeners like the example
    let responseText = '';
    const stream = response.data;

    // Use Promise to handle the streaming response
    await new Promise<void>((resolve, reject) => {
      stream.on('data', (chunk: Buffer) => {
        responseText += chunk.toString();
      });
      
      stream.on('end', () => {
        resolve();
      });
      
      stream.on('error', (error: Error) => {
        reject(error);
      });
    });

    // Parse JSON from the response
    let data: ChainGPTResponse;
    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }
      data = JSON.parse(jsonMatch[0]);
    } catch (parseError) {
      // If JSON parsing fails, create a basic response
      console.warn('Failed to parse ChainGPT JSON response, creating fallback:', parseError);
      data = {
        contractName: contractName || 'Unknown',
        language: 'Solidity',
        summary: 'Audit completed. Please review the response manually.',
        vulnerabilities: [{
          id: 'manual-review-1',
          title: 'Manual Review Required',
          description: `The AI response could not be automatically parsed. Raw response: ${responseText.substring(0, 500)}...`,
          severity: 'MEDIUM',
          recommendation: 'Please review the raw AI response and manually identify vulnerabilities.',
          category: 'Manual Review'
        }],
        linesOfCode: contractCode.split('\n').length,
        auditEngineVersion: 'ChainGPT-Smart-Contract-Auditor'
      };
    }

    // Parse vulnerabilities with the new function field
    const vulnerabilities: Vulnerability[] = (data.vulnerabilities || []).map((v: any, index: number) => ({
      id: v.id || `vuln-${index + 1}`,
      title: v.title || "Untitled Vulnerability",
      description: v.description || "No description provided",
      severity: normalizeSeverity(v.severity),
      recommendation: v.recommendation || "Please review this issue carefully",
      function: v.function,
      lines: v.lines,
      category: v.category,
    }));

    // Create the audit report
    const report: AuditReport = {
      contractName: data.contractName || contractName || "UnnamedContract",
      language: (data.language as ContractLanguage) || detectLanguage(contractCode),
      summary: data.summary || `Audit complete. Found ${vulnerabilities.length} vulnerabilities.`,
      vulnerabilities,
      linesOfCode: data.linesOfCode || contractCode.split("\n").length,
      auditedAt: new Date(),
      auditEngineVersion: data.auditEngineVersion || "ChainGPT-Smart-Contract-Auditor",
      rawResponse: responseText,
    };

    return report;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;
      const errorMessage = axiosError.response?.data
        ? JSON.stringify(axiosError.response.data)
        : axiosError.message;

      if (axiosError.response?.status === 401) {
        throw new AuditError("Invalid API key provided to ChainGPT", "UNAUTHORIZED", errorMessage);
      }
      if (axiosError.response?.status === 429) {
        throw new AuditError("Rate limit exceeded. Please try again later.", "RATE_LIMITED", errorMessage);
      }
      if (axiosError.response?.status === 402) {
        throw new AuditError("Insufficient credits or quota exceeded for ChainGPT API", "INSUFFICIENT_CREDITS", errorMessage);
      }
      if (axiosError.code === "ECONNABORTED") {
        throw new AuditError("Audit request timed out. The contract may be too complex.", "TIMEOUT", errorMessage);
      }

      throw new AuditError(
        `Audit request failed: ${errorMessage}`,
        "API_ERROR",
        axiosError.response?.data
      );
    }

    // Non-Axios errors
    throw new AuditError(
      "An unexpected error occurred during the audit",
      "UNKNOWN_ERROR",
      error
    );
  }
}

/**
 * Summary of vulnerabilities by severity
 */
export interface VulnerabilitySummary {
  CRITICAL: number;
  HIGH: number;
  MEDIUM: number;
  LOW: number;
  total: number;
}

/**
 * Summarizes vulnerabilities by severity level
 * @param report - The audit report to summarize
 * @returns Summary object with counts for each severity level
 */
export function summarizeVulnerabilities(report: AuditReport): VulnerabilitySummary {
  const summary: VulnerabilitySummary = {
    CRITICAL: 0,
    HIGH: 0,
    MEDIUM: 0,
    LOW: 0,
    total: 0,
  };

  report.vulnerabilities.forEach((vulnerability) => {
    summary[vulnerability.severity]++;
    summary.total++;
  });

  return summary;
}

/**
 * Filters vulnerabilities by severity level
 * @param report - The audit report to filter
 * @param severities - Array of severity levels to include
 * @returns Filtered vulnerabilities
 */
export function filterVulnerabilitiesBySeverity(
  report: AuditReport,
  severities: VulnerabilitySeverity[]
): Vulnerability[] {
  return report.vulnerabilities.filter((v) => severities.includes(v.severity));
}

/**
 * Groups vulnerabilities by function name
 * @param report - The audit report to analyze
 * @returns Map of function names to their vulnerabilities
 */
export function groupVulnerabilitiesByFunction(
  report: AuditReport
): Map<string, Vulnerability[]> {
  const grouped = new Map<string, Vulnerability[]>();

  report.vulnerabilities.forEach((vulnerability) => {
    const functionName = vulnerability.function || "Unknown Function";
    if (!grouped.has(functionName)) {
      grouped.set(functionName, []);
    }
    grouped.get(functionName)!.push(vulnerability);
  });

  return grouped;
}

/**
 * Calculates a simple risk score for the contract
 * @param report - The audit report to analyze
 * @returns Risk score from 0 (low risk) to 100 (high risk)
 */
export function calculateRiskScore(report: AuditReport): number {
  const summary = summarizeVulnerabilities(report);
  
  // Weighted scoring: CRITICAL = 25, HIGH = 15, MEDIUM = 5, LOW = 1
  const score = Math.min(
    100,
    summary.CRITICAL * 25 + 
    summary.HIGH * 15 + 
    summary.MEDIUM * 5 + 
    summary.LOW * 1
  );

  return score;
}

/**
 * Calculates a pre-audit score based on contract complexity
 * @param contractCode - The contract code to analyze
 * @param contractName - Name of the contract
 * @returns Pre-audit score from 0-100 (higher = more complex/needs more attention)
 */
export function calculatePreAuditScore(contractCode: string, contractName?: string): number {
  const linesOfCode = contractCode.split('\n').length;
  const linesWithoutComments = contractCode.split('\n').filter(line => {
    const trimmed = line.trim();
    return trimmed.length > 0 && !trimmed.startsWith('//') && !trimmed.startsWith('/*');
  }).length;
  
  // Calculate complexity factors
  const hasMultipleContracts = (contractCode.match(/contract\s+\w+/g) || []).length > 1;
  const hasInheritance = contractCode.includes('is ');
  const hasModifiers = (contractCode.match(/modifier\s+\w+/g) || []).length;
  const hasEvents = (contractCode.match(/event\s+\w+/g) || []).length;
  const hasFunctions = (contractCode.match(/function\s+\w+/g) || []).length;
  const hasLibraries = contractCode.includes('library ');
  const hasInterfaces = contractCode.includes('interface ');
  
  // Base score from code size (0-40 points)
  let score = Math.min(40, (linesWithoutComments / 10));
  
  // Complexity factors (0-60 points)
  if (hasMultipleContracts) score += 10;
  if (hasInheritance) score += 8;
  if (hasLibraries) score += 7;
  if (hasInterfaces) score += 5;
  score += Math.min(15, hasModifiers * 2);
  score += Math.min(10, hasEvents);
  score += Math.min(15, Math.floor(hasFunctions / 5) * 2);
  
  // Normalize to 0-100
  return Math.min(100, Math.max(0, Math.round(score)));
}

/**
 * Calculates a post-audit security score based on vulnerabilities found
 * @param report - The audit report to analyze
 * @returns Security score from 0-100 (higher = more secure, inverse of risk score)
 */
export function calculatePostAuditScore(report: AuditReport): number {
  const riskScore = calculateRiskScore(report);
  // Convert risk score to security score (inverse)
  // Risk 0 = Security 100, Risk 100 = Security 0
  return Math.max(0, Math.min(100, 100 - riskScore));
}

/**
 * Formats an audit report for display or logging
 * @param report - The audit report to format
 * @returns Formatted string representation of the report
 */
export function formatAuditReport(report: AuditReport): string {
  const summary = summarizeVulnerabilities(report);
  const riskScore = calculateRiskScore(report);

  let output = `
=== Smart Contract Audit Report ===
Contract: ${report.contractName}
Language: ${report.language}
Lines of Code: ${report.linesOfCode || "N/A"}
Audited At: ${report.auditedAt.toISOString()}
Risk Score: ${riskScore}/100

Summary: ${report.summary}

Vulnerabilities Found: ${summary.total}
- CRITICAL: ${summary.CRITICAL}
- HIGH: ${summary.HIGH}
- MEDIUM: ${summary.MEDIUM}
- LOW: ${summary.LOW}
`;

  if (report.vulnerabilities.length > 0) {
    output += "\n\nDetailed Findings:\n";
    
    report.vulnerabilities.forEach((v, index) => {
      output += `
${index + 1}. ${v.title} [${v.severity}]
   Function: ${v.function || "N/A"}
   Category: ${v.category || "N/A"}
   Description: ${v.description}
   Recommendation: ${v.recommendation}
   ${v.lines ? `Lines: ${v.lines.join(", ")}` : ""}
`;
    });
  }

  return output;
}

/**
 * Checks if a contract passes basic security requirements
 * @param report - The audit report to check
 * @param maxCritical - Maximum allowed critical vulnerabilities (default: 0)
 * @param maxHigh - Maximum allowed high vulnerabilities (default: 0)
 * @returns Whether the contract passes the security check
 */
export function passesSecurityCheck(
  report: AuditReport,
  maxCritical: number = 0,
  maxHigh: number = 0
): boolean {
  const summary = summarizeVulnerabilities(report);
  return summary.CRITICAL <= maxCritical && summary.HIGH <= maxHigh;
}
