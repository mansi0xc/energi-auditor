"use client"

import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

/**
 * Chart color palette matching the app theme
 */
const COLORS = {
  primary: 'hsl(165, 96%, 71%)', // #78fcd6
  primaryDark: 'hsl(160, 100%, 50%)', // #00ffb6
  critical: '#ef4444',
  high: '#f97316',
  medium: '#eab308',
  low: '#3b82f6',
  success: '#22c55e',
  muted: 'hsl(240, 2%, 25%)', // #3f3f42
  foreground: 'hsl(160, 14%, 93%)', // #e7eceb
};

const SEVERITY_COLORS = {
  CRITICAL: COLORS.critical,
  HIGH: COLORS.high,
  MEDIUM: COLORS.medium,
  LOW: COLORS.low,
};

/**
 * Custom tooltip component with dark theme
 */
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
        <p className="text-foreground font-medium">{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} className="text-sm" style={{ color: entry.color }}>
            {entry.name}: {entry.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

/**
 * Usage Trend Line Chart
 */
interface UsageTrendChartProps {
  data: Array<{
    date: string;
    audits: number;
    credits: number;
  }>;
  height?: number;
}

export function UsageTrendChart({ data, height = 300 }: UsageTrendChartProps) {
  return (
    <div className="w-full">
      <h3 className="text-lg font-semibold text-foreground mb-4">Usage Trends</h3>
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(240, 2%, 25%)" />
          <XAxis 
            dataKey="date" 
            stroke={COLORS.foreground}
            fontSize={12}
            tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          />
          <YAxis stroke={COLORS.foreground} fontSize={12} />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          <Line
            type="monotone"
            dataKey="audits"
            stroke={COLORS.primary}
            strokeWidth={2}
            dot={{ fill: COLORS.primary, strokeWidth: 2, r: 4 }}
            name="Audits"
          />
          <Line
            type="monotone"
            dataKey="credits"
            stroke={COLORS.primaryDark}
            strokeWidth={2}
            dot={{ fill: COLORS.primaryDark, strokeWidth: 2, r: 4 }}
            name="Credits"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

/**
 * Vulnerability Severity Pie Chart
 */
interface VulnerabilityChartProps {
  data: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  height?: number;
}

export function VulnerabilityChart({ data, height = 300 }: VulnerabilityChartProps) {
  const chartData = [
    { name: 'Critical', value: data.critical, color: SEVERITY_COLORS.CRITICAL },
    { name: 'High', value: data.high, color: SEVERITY_COLORS.HIGH },
    { name: 'Medium', value: data.medium, color: SEVERITY_COLORS.MEDIUM },
    { name: 'Low', value: data.low, color: SEVERITY_COLORS.LOW },
  ].filter(item => item.value > 0); // Only show non-zero values

  const total = data.critical + data.high + data.medium + data.low;

  if (total === 0) {
    return (
      <div className="w-full">
        <h3 className="text-lg font-semibold text-foreground mb-4">Vulnerability Distribution</h3>
        <div className="flex items-center justify-center h-64 text-muted-foreground">
          No vulnerabilities found
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <h3 className="text-lg font-semibold text-foreground mb-4">Vulnerability Distribution</h3>
      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={100}
            paddingAngle={2}
            dataKey="value"
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip 
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const data = payload[0].payload;
                const percentage = ((data.value / total) * 100).toFixed(1);
                return (
                  <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
                    <p className="text-foreground font-medium">{data.name}</p>
                    <p className="text-sm" style={{ color: data.color }}>
                      Count: {data.value} ({percentage}%)
                    </p>
                  </div>
                );
              }
              return null;
            }}
          />
          <Legend 
            verticalAlign="bottom" 
            height={36}
            formatter={(value, entry: any) => (
              <span style={{ color: entry.color }}>{value}</span>
            )}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

/**
 * User Activity Bar Chart
 */
interface UserActivityChartProps {
  data: Array<{
    email: string;
    auditCount: number;
    creditsConsumed: number;
  }>;
  height?: number;
  maxUsers?: number;
}

export function UserActivityChart({ data, height = 300, maxUsers = 10 }: UserActivityChartProps) {
  // Sort by audit count and take top users
  const sortedData = data
    .sort((a, b) => b.auditCount - a.auditCount)
    .slice(0, maxUsers)
    .map(user => ({
      ...user,
      email: user.email.split('@')[0], // Show only username part
    }));

  return (
    <div className="w-full">
      <h3 className="text-lg font-semibold text-foreground mb-4">Top Active Users</h3>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={sortedData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(240, 2%, 25%)" />
          <XAxis 
            dataKey="email" 
            stroke={COLORS.foreground}
            fontSize={12}
            angle={-45}
            textAnchor="end"
            height={80}
          />
          <YAxis stroke={COLORS.foreground} fontSize={12} />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          <Bar 
            dataKey="auditCount" 
            fill={COLORS.primary} 
            name="Audits"
            radius={[2, 2, 0, 0]}
          />
          <Bar 
            dataKey="creditsConsumed" 
            fill={COLORS.primaryDark} 
            name="Credits"
            radius={[2, 2, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/**
 * Peak Usage Hours Chart
 */
interface PeakUsageHoursChartProps {
  data: Array<{
    hour: number;
    audits: number;
  }>;
  height?: number;
}

export function PeakUsageHoursChart({ data, height = 250 }: PeakUsageHoursChartProps) {
  // Create 24-hour data array
  const hourlyData = Array.from({ length: 24 }, (_, hour) => {
    const existing = data.find(d => d.hour === hour);
    return {
      hour: hour.toString().padStart(2, '0') + ':00',
      audits: existing?.audits || 0,
    };
  });

  return (
    <div className="w-full">
      <h3 className="text-lg font-semibold text-foreground mb-4">Usage by Hour</h3>
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={hourlyData}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(240, 2%, 25%)" />
          <XAxis 
            dataKey="hour" 
            stroke={COLORS.foreground}
            fontSize={10}
            interval={2} // Show every 3rd hour
          />
          <YAxis stroke={COLORS.foreground} fontSize={12} />
          <Tooltip content={<CustomTooltip />} />
          <Area
            type="monotone"
            dataKey="audits"
            stroke={COLORS.primary}
            fill={COLORS.primary}
            fillOpacity={0.3}
            strokeWidth={2}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

/**
 * Success Rate Trend Chart
 */
interface SuccessRateChartProps {
  data: Array<{
    date: string;
    successRate: number;
    totalAudits: number;
  }>;
  height?: number;
}

export function SuccessRateChart({ data, height = 250 }: SuccessRateChartProps) {
  return (
    <div className="w-full">
      <h3 className="text-lg font-semibold text-foreground mb-4">Success Rate Trend</h3>
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(240, 2%, 25%)" />
          <XAxis 
            dataKey="date" 
            stroke={COLORS.foreground}
            fontSize={12}
            tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          />
          <YAxis 
            stroke={COLORS.foreground} 
            fontSize={12}
            domain={[0, 100]}
            tickFormatter={(value) => `${value}%`}
          />
          <Tooltip 
            content={({ active, payload, label }) => {
              if (active && payload && payload.length) {
                const data = payload[0].payload;
                return (
                  <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
                    <p className="text-foreground font-medium">{new Date(label).toLocaleDateString()}</p>
                    <p className="text-sm" style={{ color: COLORS.success }}>
                      Success Rate: {data.successRate.toFixed(1)}%
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Total Audits: {data.totalAudits}
                    </p>
                  </div>
                );
              }
              return null;
            }}
          />
          <Line
            type="monotone"
            dataKey="successRate"
            stroke={COLORS.success}
            strokeWidth={2}
            dot={{ fill: COLORS.success, strokeWidth: 2, r: 4 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

/**
 * Metric Card Component
 */
interface MetricCardProps {
  title: string;
  value: string | number;
  change?: number;
  icon?: React.ReactNode;
  trend?: 'up' | 'down' | 'stable';
  className?: string;
}

export function MetricCard({ title, value, change, icon, trend, className = '' }: MetricCardProps) {
  const getTrendColor = () => {
    if (trend === 'up') return 'text-green-500';
    if (trend === 'down') return 'text-red-500';
    return 'text-muted-foreground';
  };

  const getTrendIcon = () => {
    if (trend === 'up') return '↗';
    if (trend === 'down') return '↘';
    return '→';
  };

  return (
    <div className={`bg-card border border-border rounded-lg p-6 ${className}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold text-foreground">{value}</p>
          {change !== undefined && (
            <p className={`text-sm ${getTrendColor()} flex items-center gap-1`}>
              <span>{getTrendIcon()}</span>
              {Math.abs(change).toFixed(1)}%
            </p>
          )}
        </div>
        {icon && (
          <div className="text-primary opacity-80">
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}
