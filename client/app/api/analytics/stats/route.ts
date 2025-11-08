import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import AuditReportModel from '@/lib/models/AuditReport';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * GET /api/analytics/stats - Get aggregated audit statistics from MongoDB (public)
 * Query parameters:
 * - startDate: YYYY-MM-DD (optional)
 * - endDate: YYYY-MM-DD (optional)
 */
export async function GET(request: NextRequest) {
  try {
    // Public endpoint - no authentication required
    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // 4. Connect to database
    await connectDB();

    // 5. Build date query
    const dateQuery: any = {};
    if (startDate || endDate) {
      dateQuery.auditedAt = {};
      if (startDate) {
        dateQuery.auditedAt.$gte = new Date(startDate);
      }
      if (endDate) {
        // Include the entire end date
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        dateQuery.auditedAt.$lte = end;
      }
    }

    // 6. Fetch all audit reports in date range
    const reports = await AuditReportModel.find(dateQuery).lean();

    // 7. Calculate statistics
    const totalAudits = reports.length;
    const totalCreditsConsumed = totalAudits; // 1 credit per audit
    const uniqueUsers = new Set(reports.map(r => r.userEmail)).size;
    
    // Calculate pre and post audit scores from risk scores
    // Pre Audit Score = average risk score of first audit for each contract (initial audits only)
    const initialAudits = reports.filter(r => !r.isReAudit && r.riskScore !== undefined && r.riskScore !== null);
    const averagePreAuditScore = initialAudits.length > 0
      ? initialAudits.reduce((sum, r) => sum + (r.riskScore || 0), 0) / initialAudits.length
      : 0;
    
    // Post Audit Score = average risk score of LAST re-audit for each contract that has re-audits
    // Group re-audits by originalAuditId, then get the most recent one for each
    const reAuditsByOriginal = new Map<string, typeof reports[0]>();
    
    // Get all re-audits with risk scores
    const allReAudits = reports.filter(r => r.isReAudit && r.riskScore !== undefined && r.riskScore !== null && r.originalAuditId);
    
    // For each re-audit, keep only the most recent one per original audit
    allReAudits.forEach(reAudit => {
      const originalId = reAudit.originalAuditId?.toString();
      if (!originalId) return;
      
      const existing = reAuditsByOriginal.get(originalId);
      if (!existing || new Date(reAudit.auditedAt) > new Date(existing.auditedAt)) {
        reAuditsByOriginal.set(originalId, reAudit);
      }
    });
    
    // Calculate average of the last re-audit risk scores
    const lastReAuditScores = Array.from(reAuditsByOriginal.values()).map(r => r.riskScore || 0);
    const averagePostAuditScore = lastReAuditScores.length > 0
      ? lastReAuditScores.reduce((sum, score) => sum + score, 0) / lastReAuditScores.length
      : 0;

    // Calculate average audit duration
    const durations = reports.filter(r => r.auditDuration).map(r => r.auditDuration!);
    const averageAuditDuration = durations.length > 0
      ? durations.reduce((sum, d) => sum + d, 0) / durations.length
      : 0;

    // Vulnerability statistics
    const allVulnerabilities = reports.flatMap(r => r.vulnerabilities || []);
    const vulnerabilityStats = {
      totalVulnerabilities: allVulnerabilities.length,
      severityBreakdown: {
        critical: allVulnerabilities.filter(v => v.severity === 'CRITICAL').length,
        high: allVulnerabilities.filter(v => v.severity === 'HIGH').length,
        medium: allVulnerabilities.filter(v => v.severity === 'MEDIUM').length,
        low: allVulnerabilities.filter(v => v.severity === 'LOW').length,
      },
    };

    // User statistics
    const userStatsMap = new Map<string, { email: string; auditCount: number; creditsConsumed: number; lastAudit: Date }>();
    reports.forEach(report => {
      const existing = userStatsMap.get(report.userEmail);
      if (existing) {
        existing.auditCount++;
        existing.creditsConsumed++;
        if (new Date(report.auditedAt) > existing.lastAudit) {
          existing.lastAudit = new Date(report.auditedAt);
        }
      } else {
        userStatsMap.set(report.userEmail, {
          email: report.userEmail,
          auditCount: 1,
          creditsConsumed: 1,
          lastAudit: new Date(report.auditedAt),
        });
      }
    });

    const userStats = Array.from(userStatsMap.values())
      .sort((a, b) => b.auditCount - a.auditCount)
      .map(u => ({
        email: u.email,
        auditCount: u.auditCount,
        creditsConsumed: u.creditsConsumed,
        lastAudit: u.lastAudit.toISOString(),
      }));

    // Daily statistics
    const dailyStatsMap = new Map<string, { date: string; auditCount: number; creditsConsumed: number }>();
    reports.forEach(report => {
      const date = new Date(report.auditedAt).toISOString().split('T')[0];
      const existing = dailyStatsMap.get(date);
      if (existing) {
        existing.auditCount++;
        existing.creditsConsumed++;
      } else {
        dailyStatsMap.set(date, {
          date,
          auditCount: 1,
          creditsConsumed: 1,
        });
      }
    });

    const dailyStats = Array.from(dailyStatsMap.values())
      .sort((a, b) => a.date.localeCompare(b.date))
      .map(d => ({
        date: d.date,
        auditCount: d.auditCount,
        creditsConsumed: d.creditsConsumed,
      }));

    // 8. Build response
    const stats = {
      totalAudits,
      totalCreditsConsumed,
      totalUsers: uniqueUsers,
      averagePreAuditScore: Math.round(averagePreAuditScore * 10) / 10,
      averagePostAuditScore: Math.round(averagePostAuditScore * 10) / 10,
      averageAuditDuration: Math.round(averageAuditDuration),
      vulnerabilityStats,
      userStats,
      dailyStats,
    };

    return NextResponse.json({
      success: true,
      data: stats,
      metadata: {
        dateRange: {
          startDate: startDate || 'all-time',
          endDate: endDate || 'current',
        },
        generatedAt: new Date().toISOString(),
      },
    });

  } catch (error) {
    console.error('Error generating statistics:', error);
    return NextResponse.json(
      { error: 'Failed to generate statistics' },
      { status: 500 }
    );
  }
}

