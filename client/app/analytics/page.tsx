"use client"

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  MetricCard,
  UsageTrendChart,
  VulnerabilityChart,
  UserActivityChart,
} from '@/components/analytics-charts';
import type { AuditStatistics } from '@/lib/logging';
import { CollaborativeLogo } from '@/components/collaborative-logo';

const DATE_RANGES = [
  { label: 'Today', value: 'today' },
  { label: 'Last 7 days', value: '7d' },
  { label: 'Last 30 days', value: '30d' },
  { label: 'Last 90 days', value: '90d' },
  { label: 'All time', value: 'all' },
];

function getDateRange(range: string) {
  const now = new Date();
  const today = now.toISOString().split('T')[0];
  
  switch (range) {
    case 'today':
      return { startDate: today, endDate: today };
    case '7d':
      const week = new Date(now);
      week.setDate(week.getDate() - 7);
      return { startDate: week.toISOString().split('T')[0], endDate: today };
    case '30d':
      const month = new Date(now);
      month.setDate(month.getDate() - 30);
      return { startDate: month.toISOString().split('T')[0], endDate: today };
    case '90d':
      const quarter = new Date(now);
      quarter.setDate(quarter.getDate() - 90);
      return { startDate: quarter.toISOString().split('T')[0], endDate: today };
    default:
      return { startDate: undefined, endDate: undefined };
  }
}

function exportToCSV(data: any[], filename: string) {
  if (data.length === 0) return;
  
  const headers = Object.keys(data[0]);
  const csvContent = [
    headers.join(','),
    ...data.map(row => 
      headers.map(header => {
        const value = row[header];
        return typeof value === 'string' && value.includes(',') 
          ? `"${value}"` 
          : value;
      }).join(',')
    )
  ].join('\n');
  
  const blob = new Blob([csvContent], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export default function AnalyticsPage() {
  const [stats, setStats] = useState<AuditStatistics | null>(null);
  const [recentLogs, setRecentLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRange, setSelectedRange] = useState('30d');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchData();
  }, [selectedRange]);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const { startDate, endDate } = getDateRange(selectedRange);
      const params = new URLSearchParams();
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);

      const [statsResponse, logsResponse] = await Promise.all([
        fetch(`/api/analytics/stats?${params.toString()}`),
        fetch(`/api/analytics/recent?limit=50&${params.toString()}`)
      ]);

      if (!statsResponse.ok || !logsResponse.ok) {
        throw new Error('Failed to fetch data');
      }

      const [statsResult, logsResult] = await Promise.all([
        statsResponse.json(),
        logsResponse.json()
      ]);

      if (statsResult.success) {
        setStats(statsResult.data);
      }
      if (logsResult.success) {
        setRecentLogs(logsResult.data || []);
      }
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const handleExportLogs = () => {
    if (recentLogs.length > 0) {
      const exportData = recentLogs.map(log => ({
        timestamp: new Date(log.auditedAt || log.createdAt).toLocaleString(),
        userEmail: log.userEmail,
        contractName: log.contractName || 'N/A',
        creditsConsumed: 1,
        vulnerabilitiesFound: log.vulnerabilities?.length || 0,
        auditDuration: log.auditDuration ? `${(log.auditDuration / 1000).toFixed(1)}s` : 'N/A',
      }));
      
      const filename = `audit-logs-${selectedRange}-${new Date().toISOString().split('T')[0]}.csv`;
      exportToCSV(exportData, filename);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background">
        <header className="bg-card border-b border-border shadow-sm sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <Link href="/" className="flex items-center">
                <CollaborativeLogo size="md" />
              </Link>
            </div>
          </div>
        </header>
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="bg-red-950/30 border border-red-900/30 rounded-lg p-6 text-center">
            <h2 className="text-xl font-semibold text-red-400 mb-2">Error Loading Dashboard</h2>
            <p className="text-red-300 mb-4">{error}</p>
            <Button onClick={handleRefresh} variant="outline">
              Try Again
            </Button>
          </div>
        </div>
      </div>
    );
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
                    Home
                  </Button>
                </Link>
                <Button variant="default" size="sm">
                  Analytics
                </Button>
              </nav>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Analytics Dashboard</h1>
            <p className="text-muted-foreground">
              Smart contract audit usage statistics and insights
            </p>
          </div>
          <div className="flex items-center gap-4">
            <select
              value={selectedRange}
              onChange={(e) => setSelectedRange(e.target.value)}
              className="bg-muted border border-border rounded-lg px-3 py-2 text-foreground"
            >
              {DATE_RANGES.map(range => (
                <option key={range.value} value={range.value}>
                  {range.label}
                </option>
              ))}
            </select>
            
            <Button
              onClick={handleRefresh}
              disabled={refreshing}
              variant="outline"
              size="sm"
            >
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </Button>
            <Button
              onClick={handleExportLogs}
              disabled={recentLogs.length === 0}
              size="sm"
            >
              Export CSV
            </Button>
          </div>
        </div>

        {stats && (
          <>
            {/* Overview Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
              <MetricCard
                title="Total Audits"
                value={stats.totalAudits.toLocaleString()}
                icon={
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                }
              />
              <MetricCard
                title="Credits Consumed"
                value={stats.totalCreditsConsumed.toLocaleString()}
                icon={
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                  </svg>
                }
              />
              <MetricCard
                title="Active Users"
                value={stats.totalUsers.toLocaleString()}
                icon={
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                  </svg>
                }
              />
              <MetricCard
                title="Pre Audit Score"
                value={stats.averagePreAuditScore.toFixed(1)}
                trend={stats.averagePreAuditScore <= 30 ? 'up' : stats.averagePreAuditScore <= 50 ? 'stable' : 'down'}
                icon={
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                  </svg>
                }
              />
              <MetricCard
                title="Post Audit Score"
                value={stats.averagePostAuditScore.toFixed(1)}
                trend={stats.averagePostAuditScore <= 20 ? 'up' : stats.averagePostAuditScore <= 40 ? 'stable' : 'down'}
                icon={
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                }
              />
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              <div className="bg-card border border-border rounded-lg p-6">
                <UsageTrendChart data={stats.dailyStats.map(d => ({
                  date: d.date,
                  audits: d.auditCount,
                  credits: d.creditsConsumed
                }))} />
              </div>
              <div className="bg-card border border-border rounded-lg p-6">
                <VulnerabilityChart data={stats.vulnerabilityStats.severityBreakdown} />
              </div>
            </div>

            {/* User Activity */}
            <div className="bg-card border border-border rounded-lg p-6 mb-8">
              <UserActivityChart data={stats.userStats} />
            </div>

            {/* Recent Activity Table */}
            <div className="bg-card border border-border rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-foreground">Recent Activity</h3>
                <span className="text-sm text-muted-foreground">
                  {recentLogs.length} recent audits
                </span>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-3 px-4 text-muted-foreground">Time</th>
                      <th className="text-left py-3 px-4 text-muted-foreground">User</th>
                      <th className="text-left py-3 px-4 text-muted-foreground">Contract</th>
                      <th className="text-left py-3 px-4 text-muted-foreground">Vulnerabilities</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentLogs.map((log, index) => (
                      <tr key={log._id || index} className="border-b border-border/50">
                        <td className="py-3 px-4 text-foreground">
                          {new Date(log.auditedAt || log.createdAt).toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-foreground">
                          {log.userEmail.split('@')[0]}
                        </td>
                        <td className="py-3 px-4 text-foreground">
                          {log.contractName || 'Unnamed'}
                        </td>
                        <td className="py-3 px-4 text-foreground">
                          {log.vulnerabilities?.length || 0}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                
                {recentLogs.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    No audit logs found for the selected time period.
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

