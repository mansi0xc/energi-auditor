import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { logger, generateRequestId } from '@/lib/logging';
import { auditSmartContract, AuditError, type AuditReport, type Vulnerability, calculateRiskScore } from '@/functions/auditInit';
import connectDB from '@/lib/mongodb';
import AuditReportModel from '@/lib/models/AuditReport';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * Request body interface for re-audit
 */
interface ReAuditRequest {
  originalAuditId: string;
  improvedContractCode: string;
  contractName?: string;
  timeout?: number;
}

/**
 * POST /api/audit/reaudit - Re-audit an improved contract
 */
export async function POST(request: NextRequest) {
  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    // 1. Validate session
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const userEmail = session.user.email;

    // 2. Validate email domain
    const allowedDomain = process.env.ALLOWED_EMAIL_DOMAIN || '@energi.team';
    if (!userEmail.endsWith(allowedDomain)) {
      return NextResponse.json(
        { error: 'Access denied: Invalid email domain' },
        { status: 403 }
      );
    }

    // 3. Parse and validate request body
    let body: ReAuditRequest;
    try {
      body = await request.json();
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 }
      );
    }

    const { originalAuditId, improvedContractCode, contractName, timeout = 90000 } = body;

    if (!improvedContractCode.trim()) {
      return NextResponse.json(
        { error: 'Improved contract code is required' },
        { status: 400 }
      );
    }

    // 4. Connect to database and verify original audit exists and belongs to user
    await connectDB();
    const originalAudit = await AuditReportModel.findOne({
      _id: originalAuditId,
      userEmail, // Ensure user can only re-audit their own contracts
    });

    if (!originalAudit) {
      return NextResponse.json(
        { error: 'Original audit not found or access denied' },
        { status: 404 }
      );
    }

    // 5. Log re-audit start
    const logId = await logger.logAuditStart(
      userEmail,
      contractName || originalAudit.contractName,
      improvedContractCode.length,
      requestId
    );

    // 6. Call audit function on improved contract
    let auditReport: AuditReport;
    try {
      auditReport = await auditSmartContract(
        improvedContractCode,
        contractName || originalAudit.contractName,
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
        contractName || originalAudit.contractName,
        improvedContractCode.length,
        false,
        auditDuration,
        undefined,
        undefined,
        errorMessage,
        requestId
      );

      return NextResponse.json(
        { error: 'Failed to audit improved contract. Please try again later.' },
        { status: 500 }
      );
    }

    // 7. Calculate metrics and log completion
    const auditDuration = Date.now() - startTime;
    const riskScore = calculateRiskScore(auditReport);

    await logger.logAuditComplete(
      logId,
      userEmail,
      contractName || originalAudit.contractName,
      improvedContractCode.length,
      true,
      auditDuration,
      auditReport.vulnerabilities.length,
      {
        critical: auditReport.vulnerabilities.filter(v => v.severity === 'CRITICAL').length,
        high: auditReport.vulnerabilities.filter(v => v.severity === 'HIGH').length,
        medium: auditReport.vulnerabilities.filter(v => v.severity === 'MEDIUM').length,
        low: auditReport.vulnerabilities.filter(v => v.severity === 'LOW').length,
      },
      undefined,
      requestId
    );

    // 8. Save re-audit report to MongoDB
    try {
      const reAuditReport = await AuditReportModel.create({
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
        riskScore,
        originalAuditId: originalAuditId,
        isReAudit: true,
      });

      // 9. Re-audit is saved, analytics will calculate average from all re-audits

      return NextResponse.json({
        success: true,
        data: auditReport,
        reAuditId: reAuditReport._id.toString(),
        metadata: {
          requestId,
          auditDuration,
          creditsConsumed: 1,
          vulnerabilitiesFound: auditReport.vulnerabilities.length,
          riskScore,
          improvement: originalAudit.riskScore !== undefined && originalAudit.riskScore !== null
            ? ((originalAudit.riskScore - riskScore) / originalAudit.riskScore * 100).toFixed(1)
            : null,
          originalRiskScore: originalAudit.riskScore,
          newRiskScore: riskScore,
        }
      });
    } catch (dbError) {
      console.error('Failed to save re-audit report to database:', dbError);
      await logger.logError(
        'DATABASE_ERROR',
        'Failed to save re-audit report to MongoDB',
        userEmail,
        dbError instanceof Error ? dbError.stack : undefined,
        requestId
      );

      // Still return the audit report even if DB save fails
      return NextResponse.json({
        success: true,
        data: auditReport,
        metadata: {
          requestId,
          auditDuration,
          creditsConsumed: 1,
          vulnerabilitiesFound: auditReport.vulnerabilities.length,
          riskScore,
        }
      });
    }

  } catch (error) {
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

