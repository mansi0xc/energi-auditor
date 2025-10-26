"use client"

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';

/**
 * User credit statistics interface
 */
interface UserCreditStats {
  userEmail: string;
  totalAudits: number;
  totalCreditsConsumed: number;
  auditsToday: number;
  creditsToday: number;
  auditsThisWeek: number;
  creditsThisWeek: number;
  auditsThisMonth: number;
  creditsThisMonth: number;
  lastAuditDate?: string;
  averageAuditDuration: number;
  successRate: number;
  recentActivity: Array<{
    date: string;
    contractName?: string;
    creditsConsumed: number;
    success: boolean;
    vulnerabilitiesFound?: number;
  }>;
  dailyUsage: Array<{
    date: string;
    audits: number;
    credits: number;
  }>;
}

/**
 * Credit Display Component - Shows current session and user stats
 */
interface CreditDisplayProps {
  sessionCredits?: number;
  showDetails?: boolean;
  className?: string;
}

export function CreditDisplay({ sessionCredits = 0, showDetails = false, className = '' }: CreditDisplayProps) {
  const { data: session } = useSession();
  const [stats, setStats] = useState<UserCreditStats | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (session?.user?.email && showDetails) {
      fetchUserStats();
    }
  }, [session, showDetails]);

  const fetchUserStats = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/user/credits');
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setStats(result.data);
        }
      }
    } catch (error) {
      console.error('Failed to fetch user stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!session) return null;

  return (
    <div className={`bg-card border border-border rounded-lg p-4 ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-foreground">Credit Usage</h3>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-primary rounded-full"></div>
          <span className="text-sm text-muted-foreground">Active Session</span>
        </div>
      </div>

      {/* Session Credits */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm text-muted-foreground">Session Credits:</span>
        <span className="text-lg font-bold text-primary">{sessionCredits}</span>
      </div>

      {/* Detailed Stats */}
      {showDetails && (
        <div className="space-y-3 border-t border-border pt-3">
          {loading ? (
            <div className="flex items-center justify-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
            </div>
          ) : stats ? (
            <>
              {/* Today's Usage */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Today:</span>
                  <div className="font-medium text-foreground">
                    {stats.auditsToday} audits • {stats.creditsToday} credits
                  </div>
                </div>
                <div>
                  <span className="text-muted-foreground">This Week:</span>
                  <div className="font-medium text-foreground">
                    {stats.auditsThisWeek} audits • {stats.creditsThisWeek} credits
                  </div>
                </div>
              </div>

              {/* Total Usage */}
              <div className="bg-muted/20 rounded p-3">
                <div className="text-xs text-muted-foreground mb-1">Total Usage</div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-foreground">
                    {stats.totalAudits} audits
                  </span>
                  <span className="text-sm font-bold text-primary">
                    {stats.totalCreditsConsumed} credits
                  </span>
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  Success rate: {stats.successRate.toFixed(1)}%
                </div>
              </div>
            </>
          ) : (
            <div className="text-sm text-muted-foreground text-center py-2">
              No usage data available
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Credit Cost Indicator - Shows cost before audit
 */
interface CreditCostIndicatorProps {
  cost?: number;
  className?: string;
}

export function CreditCostIndicator({ cost = 1, className = '' }: CreditCostIndicatorProps) {
  return (
    <div className={`flex items-center gap-2 text-sm text-muted-foreground ${className}`}>
      <div className="flex items-center gap-1">
        <div className="w-3 h-3 bg-primary rounded-full flex items-center justify-center">
          <span className="text-xs text-primary-foreground font-bold">₵</span>
        </div>
        <span>This audit will consume {cost} credit{cost !== 1 ? 's' : ''}</span>
      </div>
    </div>
  );
}

/**
 * Credit Consumed Feedback - Shows after successful audit
 */
interface CreditConsumedFeedbackProps {
  creditsConsumed: number;
  auditDuration?: number;
  vulnerabilitiesFound?: number;
  onClose?: () => void;
  className?: string;
}

export function CreditConsumedFeedback({ 
  creditsConsumed, 
  auditDuration, 
  vulnerabilitiesFound,
  onClose,
  className = '' 
}: CreditConsumedFeedbackProps) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      onClose?.();
    }, 5000); // Auto-hide after 5 seconds

    return () => clearTimeout(timer);
  }, [onClose]);

  if (!visible) return null;

  return (
    <div className={`bg-green-500/10 border border-green-500/20 rounded-lg p-4 ${className}`}>
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div>
            <h4 className="text-sm font-medium text-green-400">Audit Complete!</h4>
            <div className="text-sm text-green-300 space-y-1">
              <p>✓ {creditsConsumed} credit{creditsConsumed !== 1 ? 's' : ''} consumed</p>
              {auditDuration && (
                <p>✓ Completed in {(auditDuration / 1000).toFixed(1)}s</p>
              )}
              {vulnerabilitiesFound !== undefined && (
                <p>✓ {vulnerabilitiesFound} vulnerabilit{vulnerabilitiesFound !== 1 ? 'ies' : 'y'} found</p>
              )}
            </div>
          </div>
        </div>
        <button
          onClick={() => {
            setVisible(false);
            onClose?.();
          }}
          className="text-green-400 hover:text-green-300 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}

/**
 * Usage Progress Component - Shows usage patterns
 */
interface UsageProgressProps {
  dailyUsage: Array<{ date: string; audits: number; credits: number }>;
  className?: string;
}

export function UsageProgress({ dailyUsage, className = '' }: UsageProgressProps) {
  const last7Days = dailyUsage.slice(-7);
  const maxAudits = Math.max(...last7Days.map(d => d.audits), 1);

  return (
    <div className={`bg-card border border-border rounded-lg p-4 ${className}`}>
      <h3 className="text-sm font-medium text-foreground mb-3">Last 7 Days Activity</h3>
      
      <div className="space-y-2">
        {last7Days.map((day, index) => {
          const percentage = (day.audits / maxAudits) * 100;
          const date = new Date(day.date);
          const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
          
          return (
            <div key={day.date} className="flex items-center gap-3">
              <div className="w-8 text-xs text-muted-foreground">{dayName}</div>
              <div className="flex-1 bg-muted rounded-full h-2 overflow-hidden">
                <div
                  className="h-full bg-primary transition-all duration-300"
                  style={{ width: `${percentage}%` }}
                />
              </div>
              <div className="text-xs text-muted-foreground w-12 text-right">
                {day.audits}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-3 pt-3 border-t border-border">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Total this week:</span>
          <span>
            {last7Days.reduce((sum, day) => sum + day.audits, 0)} audits • {' '}
            {last7Days.reduce((sum, day) => sum + day.credits, 0)} credits
          </span>
        </div>
      </div>
    </div>
  );
}

/**
 * Notification Banner Component
 */
interface NotificationBannerProps {
  type: 'info' | 'warning' | 'success' | 'error';
  title: string;
  message: string;
  onClose?: () => void;
  className?: string;
}

export function NotificationBanner({ 
  type, 
  title, 
  message, 
  onClose, 
  className = '' 
}: NotificationBannerProps) {
  const getTypeStyles = () => {
    switch (type) {
      case 'success':
        return 'bg-green-500/10 border-green-500/20 text-green-400';
      case 'warning':
        return 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400';
      case 'error':
        return 'bg-red-500/10 border-red-500/20 text-red-400';
      default:
        return 'bg-blue-500/10 border-blue-500/20 text-blue-400';
    }
  };

  const getIcon = () => {
    switch (type) {
      case 'success':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        );
      case 'warning':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        );
      case 'error':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        );
      default:
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
    }
  };

  return (
    <div className={`border rounded-lg p-4 ${getTypeStyles()} ${className}`}>
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5">
          {getIcon()}
        </div>
        <div className="flex-1">
          <h4 className="text-sm font-medium">{title}</h4>
          <p className="text-sm opacity-90 mt-1">{message}</p>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="flex-shrink-0 opacity-70 hover:opacity-100 transition-opacity"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}
