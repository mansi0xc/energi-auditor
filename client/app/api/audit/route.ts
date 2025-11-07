import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { logger, generateRequestId } from '@/lib/logging';
import { auditSmartContract, AuditError, type AuditReport, type Vulnerability, calculatePreAuditScore, calculatePostAuditScore } from '@/functions/auditInit';
import connectDB from '@/lib/mongodb';
import AuditReportModel from '@/lib/models/AuditReport';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * Request body interface
 */
interface AuditRequest {
  contractCode: string;
  contractName?: string;
  timeout?: number;
}


/**
 * Calculate severity breakdown for logging
 */
function calculateSeverityBreakdown(vulnerabilities: Vulnerability[]) {
  return vulnerabilities.reduce(
    (breakdown, vuln) => {
      breakdown[vuln.severity.toLowerCase() as keyof typeof breakdown]++;
      return breakdown;
    },
    { critical: 0, high: 0, medium: 0, low: 0 }
  );
}

/**
 * POST /api/audit - Audit smart contract
 */
export async function POST(request: NextRequest) {
  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    // 1. Validate session
    const session = await getServerSession();
    if (!session?.user?.email) {
      await logger.logError(
        'UNAUTHORIZED_ACCESS',
        'Audit attempt without valid session',
        undefined,
        undefined,
        requestId
      );
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const userEmail = session.user.email;

    // 2. Validate email domain
    const allowedDomain = process.env.ALLOWED_EMAIL_DOMAIN || '@energi.team';
    if (!userEmail.endsWith(allowedDomain)) {
      await logger.logError(
        'DOMAIN_RESTRICTION',
        `Audit attempt from unauthorized domain: ${userEmail}`,
        userEmail,
        undefined,
        requestId
      );
      return NextResponse.json(
        { error: 'Access denied: Invalid email domain' },
        { status: 403 }
      );
    }

    // 3. Parse and validate request body
    let body: AuditRequest;
    try {
      body = await request.json();
    } catch (error) {
      await logger.logError(
        'INVALID_REQUEST_BODY',
        'Failed to parse request body',
        userEmail,
        error instanceof Error ? error.stack : undefined,
        requestId
      );
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 }
      );
    }

    const { contractCode, contractName, timeout = 90000 } = body;

    // Contract code validation is handled by auditSmartContract function

    // 5. Log audit start
    const logId = await logger.logAuditStart(
      userEmail,
      contractName,
      contractCode.length,
      requestId
    );

    // 6. Call audit function
    let auditReport: AuditReport;
    try {
      auditReport = await auditSmartContract(
        contractCode,
        contractName,
        { timeout }
      );
    } catch (error) {
      const auditDuration = Date.now() - startTime;
      let errorMessage = 'Unknown error occurred';
      let errorType = 'AUDIT_ERROR';

      if (error instanceof AuditError) {
        errorType = error.code || 'AUDIT_ERROR';
        errorMessage = error.message;
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }

      await logger.logError(
        errorType,
        errorMessage,
        userEmail,
        error instanceof Error ? error.stack : undefined,
        requestId
      );

      await logger.logAuditComplete(
        logId,
        userEmail,
        contractName,
        contractCode.length,
        false, // success = false
        auditDuration,
        undefined, // vulnerabilitiesFound
        undefined, // severityBreakdown
        errorMessage,
        requestId
      );

      return NextResponse.json(
        { error: 'Failed to audit smart contract. Please try again later.' },
        { status: 500 }
      );
    }

    // 7. Calculate metrics and log completion
    const auditDuration = Date.now() - startTime;
    const severityBreakdown = calculateSeverityBreakdown(auditReport.vulnerabilities);

    await logger.logAuditComplete(
      logId,
      userEmail,
      contractName,
      contractCode.length,
      true, // success = true
      auditDuration,
      auditReport.vulnerabilities.length,
      severityBreakdown,
      undefined, // errorMessage
      requestId
    );

    // 8. Calculate audit scores
    const preAuditScore = calculatePreAuditScore(contractCode, contractName);
    const postAuditScore = calculatePostAuditScore(auditReport);

    // 9. Save audit report to MongoDB
    try {
      await connectDB();
      await AuditReportModel.create({
        userEmail,
        contractName: auditReport.contractName,
        language: auditReport.language,
        summary: auditReport.summary,
        vulnerabilities: auditReport.vulnerabilities,
        linesOfCode: auditReport.linesOfCode,
        auditedAt: auditReport.auditedAt,
        auditEngineVersion: auditReport.auditEngineVersion,
        rawResponse: auditReport.rawResponse,
        requestId,
        auditDuration,
        preAuditScore,
        postAuditScore,
      });
    } catch (dbError) {
      // Log database error but don't fail the request
      console.error('Failed to save audit report to database:', dbError);
      await logger.logError(
        'DATABASE_ERROR',
        'Failed to save audit report to MongoDB',
        userEmail,
        dbError instanceof Error ? dbError.stack : undefined,
        requestId
      );
    }

    // 10. Return audit report
    return NextResponse.json({
      success: true,
      data: auditReport,
      metadata: {
        requestId,
        auditDuration,
        creditsConsumed: 1,
        vulnerabilitiesFound: auditReport.vulnerabilities.length,
        preAuditScore,
        postAuditScore,
      }
    });

  } catch (error) {
    // Handle any unexpected errors
    const auditDuration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    await logger.logError(
      'UNEXPECTED_ERROR',
      errorMessage,
      undefined,
      error instanceof Error ? error.stack : undefined,
      requestId
    );

    return NextResponse.json(
      { error: 'An unexpected error occurred. Please try again later.' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/audit - Get audit status/info (optional)
 */
export async function GET() {
  return NextResponse.json({
    service: 'Energi Smart Contract Audit API',
    version: '1.0.0',
    status: 'operational',
    endpoints: {
      audit: 'POST /api/audit',
      logs: 'GET /api/logs',
      stats: 'GET /api/logs/stats',
    }
  });
}
