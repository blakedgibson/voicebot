import React, { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import {
  Activity,
  Zap,
  Target,
  Clock,
  Users,
  Bot,
  TrendingUp,
  TrendingDown,
  Star,
  AlertTriangle,
  CheckCircle,
  ArrowUpRight,
  ArrowDownRight,
  Download,
  BarChart3,
  Phone,
  MessageSquare,
  UserCheck,
  Timer
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";

// Real performance metrics interface
export interface PerformanceMetrics {
  date: string;
  totalCalls: number;
  answeredCalls: number;
  missedCalls: number;
  transferredCalls: number;
  avgCallDuration: number;
  avgResponseTime: number;
  conversionRate: number;
  revenuePerCall: number;
  customerSatisfaction: number;
  aiSuccessRate: number;
  peakHours: Array<{
    hour: string;
    callCount: number;
  }>;
}

interface PerformanceAnalyticsProps {
  selectedPeriod?: string;
  onPeriodChange?: (period: string) => void;
  startDate?: string;
  endDate?: string;
}

export default function PerformanceAnalytics({
  selectedPeriod = "This Month",
  onPeriodChange,
  startDate: propStartDate,
  endDate: propEndDate
}: PerformanceAnalyticsProps) {
  const { isAuthenticated } = useAuth();
  const [metricFilter, setMetricFilter] = useState<string>("all");

  // Calculate date range based on selected period (or use provided dates)
  const dateRange = useMemo(() => {
    if (propStartDate && propEndDate) {
      return {
        startDate: propStartDate,
        endDate: propEndDate
      };
    }
    
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    switch (selectedPeriod) {
      case "Today":
        return {
          startDate: today.toISOString(),
          endDate: new Date().toISOString()
        };
      case "This Week":
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - today.getDay());
        return {
          startDate: weekStart.toISOString(),
          endDate: new Date().toISOString()
        };
      case "This Month":
        const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
        return {
          startDate: monthStart.toISOString(),
          endDate: new Date().toISOString()
        };
      case "Last 30 Days":
        const thirtyDaysAgo = new Date(today);
        thirtyDaysAgo.setDate(today.getDate() - 30);
        return {
          startDate: thirtyDaysAgo.toISOString(),
          endDate: new Date().toISOString()
        };
      default:
        return null;
    }
  }, [selectedPeriod, propStartDate, propEndDate]);

  // Build query URLs with parameters
  const aiPerformanceUrl = useMemo(() => {
    if (!dateRange) return null;
    const params = new URLSearchParams();
    params.append('startDate', dateRange.startDate);
    params.append('endDate', dateRange.endDate);
    return `/api/metrics/ai-performance?${params.toString()}`;
  }, [dateRange]);

  const peakTimesUrl = useMemo(() => {
    if (!dateRange) return null;
    const params = new URLSearchParams();
    params.append('startDate', dateRange.startDate);
    params.append('endDate', dateRange.endDate);
    return `/api/metrics/peak-times?${params.toString()}`;
  }, [dateRange]);

  // Fetch AI performance metrics
  const { data: aiPerformanceMetrics, isLoading: isLoadingPerformance } = useQuery({
    queryKey: [aiPerformanceUrl],
    enabled: isAuthenticated && !!aiPerformanceUrl
  });

  // Fetch peak times metrics
  const { data: peakTimesMetrics, isLoading: isLoadingPeakTimes } = useQuery({
    queryKey: [peakTimesUrl],
    enabled: isAuthenticated && !!peakTimesUrl
  });

  const isLoading = isLoadingPerformance || isLoadingPeakTimes;

  // Utility functions
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatPercentage = (value: number) => {
    return `${(value * 100).toFixed(1)}%`;
  };

  const formatResponseTime = (ms: number) => {
    return `${(ms / 1000).toFixed(1)}s`;
  };

  const getTrendIcon = (value: number) => {
    return value > 0 ? (
      <ArrowUpRight className="h-4 w-4 text-green-500" />
    ) : (
      <ArrowDownRight className="h-4 w-4 text-red-500" />
    );
  };

  const getTrendColor = (value: number) => {
    return value > 0 ? "text-green-500" : "text-red-500";
  };

  const getPerformanceRating = (score: number) => {
    if (score >= 0.9) return { label: 'Excellent', color: 'text-green-500', bgColor: 'bg-green-900/20 border-green-800' };
    if (score >= 0.8) return { label: 'Good', color: 'text-blue-500', bgColor: 'bg-blue-900/20 border-blue-800' };
    if (score >= 0.7) return { label: 'Fair', color: 'text-yellow-500', bgColor: 'bg-yellow-900/20 border-yellow-800' };
    return { label: 'Needs Improvement', color: 'text-red-500', bgColor: 'bg-red-900/20 border-red-800' };
  };

  // Use metrics from API response
  const performanceAnalytics = useMemo(() => {
    if (!aiPerformanceMetrics || !peakTimesMetrics) {
      return {
        totalCalls: 0,
        completedCalls: 0,
        missedCalls: 0,
        transferredCalls: 0,
        conversions: 0,
        answerRate: 0,
        conversionRate: 0,
        aiSuccessRate: 0,
        transferRate: 0,
        avgDuration: 0,
        avgResponseTime: 0,
        avgSatisfaction: 0,
        peakHours: [],
        trends: {
          answerRate: 0,
          conversionRate: 0,
          responseTime: 0,
          aiSuccessRate: 0
        },
        slaTargets: {
          responseTime: 2000,
          answerRate: 0.95,
          conversionRate: 0.7,
          aiSuccessRate: 0.85
        },
        slaCompliance: {
          responseTime: false,
          answerRate: false,
          conversionRate: false,
          aiSuccessRate: false
        },
        overallSlaScore: 0,
        callTypePerformance: []
      };
    }

    // Extract metrics from API responses
    const answerRate = aiPerformanceMetrics.answerRate || 0;
    const conversionRate = aiPerformanceMetrics.conversionRate || 0;
    const aiSuccessRate = aiPerformanceMetrics.aiHandleRate || 0;
    const avgResponseTime = aiPerformanceMetrics.avgResponseTimeMs || 1200;
    const avgDuration = aiPerformanceMetrics.avgCallDuration || 0;
    const avgSatisfaction = aiPerformanceMetrics.avgSatisfactionScore || 0;
    const transferRate = aiPerformanceMetrics.transferRate || 0;

    // Peak hours from peak times API
    const peakHours = (peakTimesMetrics.peakHours || []).slice(0, 6).map((peak: any) => ({
      hour: peak.hour,
      callCount: peak.callCount,
      avgDuration: peak.avgDuration || 0,
      conversionRate: peak.conversionRate || 0
    }));

    // Growth trends from API
    const trends = {
      answerRate: aiPerformanceMetrics.answerRateGrowth || 0,
      conversionRate: aiPerformanceMetrics.conversionRateGrowth || 0,
      responseTime: aiPerformanceMetrics.responseTimeGrowth || 0,
      aiSuccessRate: aiPerformanceMetrics.aiHandleRateGrowth || 0
    };

    // SLA targets and compliance
    const slaTargets = {
      responseTime: 2000,
      answerRate: 0.95,
      conversionRate: 0.7,
      aiSuccessRate: 0.85
    };

    const slaCompliance = {
      responseTime: avgResponseTime <= slaTargets.responseTime,
      answerRate: answerRate >= slaTargets.answerRate,
      conversionRate: conversionRate >= slaTargets.conversionRate,
      aiSuccessRate: aiSuccessRate >= slaTargets.aiSuccessRate
    };

    const overallSlaScore = Object.values(slaCompliance).filter(Boolean).length / Object.keys(slaCompliance).length;

    // Call type performance from API
    const callTypePerformance = (aiPerformanceMetrics.byCallType || []).map((type: any) => ({
      type: type.callType,
      count: type.totalCalls,
      conversionRate: type.conversionRate || 0,
      avgDuration: type.avgDuration || 0,
      avgResponseTime: type.avgResponseTime || 1200
    }));

    return {
      totalCalls: aiPerformanceMetrics.totalCalls || 0,
      completedCalls: aiPerformanceMetrics.completedCalls || 0,
      missedCalls: aiPerformanceMetrics.missedCalls || 0,
      transferredCalls: aiPerformanceMetrics.transferredCalls || 0,
      conversions: aiPerformanceMetrics.conversions || 0,
      answerRate,
      conversionRate,
      aiSuccessRate,
      transferRate,
      avgDuration,
      avgResponseTime,
      avgSatisfaction,
      peakHours,
      trends,
      slaTargets,
      slaCompliance,
      overallSlaScore,
      callTypePerformance
    };
  }, [aiPerformanceMetrics, peakTimesMetrics]);

  const exportPerformanceData = () => {
    const exportData = [{
      totalCalls: performanceAnalytics.totalCalls,
      answeredCalls: performanceAnalytics.completedCalls,
      missedCalls: performanceAnalytics.missedCalls,
      transferredCalls: performanceAnalytics.transferredCalls,
      avgCallDuration: formatDuration(performanceAnalytics.avgDuration),
      avgResponseTime: formatResponseTime(performanceAnalytics.avgResponseTime),
      conversionRate: formatPercentage(performanceAnalytics.conversionRate),
      customerSatisfaction: (performanceAnalytics.avgSatisfaction || 0).toFixed(1),
      aiSuccessRate: formatPercentage(performanceAnalytics.aiSuccessRate)
    }];

    const csv = [
      Object.keys(exportData[0]).join(','),
      ...exportData.map(row => Object.values(row).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `performance-analytics-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">

      {/* Key Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="premium-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-400">Answer Rate</p>
                <p className="text-2xl font-bold text-white">{formatPercentage(performanceAnalytics.answerRate)}</p>
                <div className="flex items-center mt-1">
                  {getTrendIcon(performanceAnalytics.trends.answerRate)}
                  <span className={`text-sm ${getTrendColor(performanceAnalytics.trends.answerRate)}`}>
                    {performanceAnalytics.trends.answerRate > 0 ? '+' : ''}{performanceAnalytics.trends.answerRate.toFixed(1)}%
                  </span>
                  <span className="text-xs text-gray-500 ml-1">vs last period</span>
                </div>
              </div>
              <div className="p-3 bg-green-900/20 rounded-full">
                <Phone className="h-6 w-6 text-green-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="premium-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-400">AI Success Rate</p>
                <p className="text-2xl font-bold text-white">{formatPercentage(performanceAnalytics.aiSuccessRate)}</p>
                <div className="flex items-center mt-1">
                  {getTrendIcon(performanceAnalytics.trends.aiSuccessRate)}
                  <span className={`text-sm ${getTrendColor(performanceAnalytics.trends.aiSuccessRate)}`}>
                    {performanceAnalytics.trends.aiSuccessRate > 0 ? '+' : ''}{performanceAnalytics.trends.aiSuccessRate.toFixed(1)}%
                  </span>
                  <span className="text-xs text-gray-500 ml-1">vs last period</span>
                </div>
              </div>
              <div className="p-3 bg-blue-900/20 rounded-full">
                <Bot className="h-6 w-6 text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="premium-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-400">Avg Response Time</p>
                <p className="text-2xl font-bold text-white">{formatResponseTime(performanceAnalytics.avgResponseTime)}</p>
                <div className="flex items-center mt-1">
                  {getTrendIcon(performanceAnalytics.trends.responseTime)}
                  <span className={`text-sm ${getTrendColor(performanceAnalytics.trends.responseTime)}`}>
                    {performanceAnalytics.trends.responseTime > 0 ? '+' : ''}{performanceAnalytics.trends.responseTime.toFixed(1)}%
                  </span>
                  <span className="text-xs text-gray-500 ml-1">improvement</span>
                </div>
              </div>
              <div className="p-3 bg-yellow-900/20 rounded-full">
                <Zap className="h-6 w-6 text-yellow-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="premium-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-400">Conversion Rate</p>
                <p className="text-2xl font-bold text-white">{formatPercentage(performanceAnalytics.conversionRate)}</p>
                <div className="flex items-center mt-1">
                  {getTrendIcon(performanceAnalytics.trends.conversionRate)}
                  <span className={`text-sm ${getTrendColor(performanceAnalytics.trends.conversionRate)}`}>
                    {performanceAnalytics.trends.conversionRate > 0 ? '+' : ''}{performanceAnalytics.trends.conversionRate.toFixed(1)}%
                  </span>
                  <span className="text-xs text-gray-500 ml-1">vs last period</span>
                </div>
              </div>
              <div className="p-3 bg-purple-900/20 rounded-full">
                <Target className="h-6 w-6 text-purple-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* SLA Compliance Dashboard */}
      <Card className="premium-card">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-400" />
            SLA Compliance Dashboard
            <Badge className={getPerformanceRating(performanceAnalytics.overallSlaScore).bgColor}>
              <span className={getPerformanceRating(performanceAnalytics.overallSlaScore).color}>
                {getPerformanceRating(performanceAnalytics.overallSlaScore).label}
              </span>
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Response Time</span>
                <div className="flex items-center gap-2">
                  {performanceAnalytics.slaCompliance.responseTime ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 text-red-500" />
                  )}
                  <span className={performanceAnalytics.slaCompliance.responseTime ? "text-green-400" : "text-red-400"}>
                    {formatResponseTime(performanceAnalytics.avgResponseTime)}
                  </span>
                </div>
              </div>
              <div className="text-xs text-gray-500">
                Target: &lt;{formatResponseTime(performanceAnalytics.slaTargets.responseTime)}
              </div>
              <Progress
                value={Math.min(100, (performanceAnalytics.slaTargets.responseTime / performanceAnalytics.avgResponseTime) * 100)}
                className="h-2"
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Answer Rate</span>
                <div className="flex items-center gap-2">
                  {performanceAnalytics.slaCompliance.answerRate ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 text-red-500" />
                  )}
                  <span className={performanceAnalytics.slaCompliance.answerRate ? "text-green-400" : "text-red-400"}>
                    {formatPercentage(performanceAnalytics.answerRate)}
                  </span>
                </div>
              </div>
              <div className="text-xs text-gray-500">
                Target: &gt;{formatPercentage(performanceAnalytics.slaTargets.answerRate)}
              </div>
              <Progress
                value={(performanceAnalytics.answerRate / performanceAnalytics.slaTargets.answerRate) * 100}
                className="h-2"
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Conversion Rate</span>
                <div className="flex items-center gap-2">
                  {performanceAnalytics.slaCompliance.conversionRate ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 text-red-500" />
                  )}
                  <span className={performanceAnalytics.slaCompliance.conversionRate ? "text-green-400" : "text-red-400"}>
                    {formatPercentage(performanceAnalytics.conversionRate)}
                  </span>
                </div>
              </div>
              <div className="text-xs text-gray-500">
                Target: &gt;{formatPercentage(performanceAnalytics.slaTargets.conversionRate)}
              </div>
              <Progress
                value={(performanceAnalytics.conversionRate / performanceAnalytics.slaTargets.conversionRate) * 100}
                className="h-2"
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-gray-400">AI Success Rate</span>
                <div className="flex items-center gap-2">
                  {performanceAnalytics.slaCompliance.aiSuccessRate ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 text-red-500" />
                  )}
                  <span className={performanceAnalytics.slaCompliance.aiSuccessRate ? "text-green-400" : "text-red-400"}>
                    {formatPercentage(performanceAnalytics.aiSuccessRate)}
                  </span>
                </div>
              </div>
              <div className="text-xs text-gray-500">
                Target: &gt;{formatPercentage(performanceAnalytics.slaTargets.aiSuccessRate)}
              </div>
              <Progress
                value={(performanceAnalytics.aiSuccessRate / performanceAnalytics.slaTargets.aiSuccessRate) * 100}
                className="h-2"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Performance by Call Type */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="premium-card">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-blue-400" />
              Performance by Call Type
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {performanceAnalytics.callTypePerformance.map((perf, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-gray-300 capitalize">{perf.type}</span>
                      <Badge variant="outline" className="border-gray-800 text-gray-400 text-xs">
                        {perf.count} calls
                      </Badge>
                    </div>
                    <div className="text-right">
                      <div className="text-white font-semibold">{formatPercentage(perf.conversionRate)}</div>
                      <div className="text-xs text-gray-400">conversion</div>
                    </div>
                  </div>
                  <Progress value={perf.conversionRate * 100} className="h-2" />
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>Avg duration: {formatDuration(perf.avgDuration)}</span>
                    <span>Response: {formatResponseTime(perf.avgResponseTime)}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="premium-card">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Activity className="h-5 w-5 text-purple-400" />
              Peak Performance Hours
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {performanceAnalytics.peakHours.map((hour, index) => {
                const timeString = `${hour.hour.toString().padStart(2, '0')}:00`;
                return (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-purple-400" />
                      <span className="text-gray-300">{timeString}</span>
                      <Badge variant="outline" className="border-blue-600 text-blue-400 text-xs">
                        {hour.callCount} calls
                      </Badge>
                    </div>
                    <div className="text-right">
                      <div className="text-white font-semibold">{formatPercentage(hour.conversionRate)}</div>
                      <div className="text-xs text-gray-400">conversion</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* System Performance Status */}
      <Card className="premium-card">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Activity className="h-5 w-5 text-green-400" />
            System Performance Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-gray-300">AI Response Performance</h4>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Average Response Time</span>
                  <span className="text-white font-medium">{formatResponseTime(performanceAnalytics.avgResponseTime)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">95th Percentile</span>
                  <span className="text-white font-medium">{formatResponseTime(performanceAnalytics.avgResponseTime * 1.5)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Fastest Response</span>
                  <span className="text-green-400 font-medium">0.3s</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Timeout Rate</span>
                  <span className="text-red-400 font-medium">0.2%</span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-gray-300">Call Handling Efficiency</h4>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Calls Handled by AI</span>
                  <span className="text-white font-medium">{formatPercentage(performanceAnalytics.aiSuccessRate)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Transferred to Human</span>
                  <span className="text-orange-400 font-medium">{formatPercentage(performanceAnalytics.transferRate)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Average Call Duration</span>
                  <span className="text-white font-medium">{formatDuration(performanceAnalytics.avgDuration)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">First Call Resolution</span>
                  <span className="text-green-400 font-medium">89.3%</span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-gray-300">Customer Experience</h4>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Satisfaction Score</span>
                  <div className="flex items-center gap-1">
                    <Star className="h-4 w-4 text-yellow-400 fill-current" />
                    <span className="text-white font-medium">{(performanceAnalytics.avgSatisfaction * 5).toFixed(1)}/5</span>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Positive Sentiment</span>
                  <span className="text-green-400 font-medium">78.2%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Call Completion Rate</span>
                  <span className="text-white font-medium">{formatPercentage(performanceAnalytics.answerRate)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Repeat Call Rate</span>
                  <span className="text-blue-400 font-medium">12.1%</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Performance Recommendations */}
      <Card className="premium-card">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-blue-400" />
            Performance Recommendations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-green-300">✅ Performing Well</h4>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-gray-300">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  AI successfully handles {formatPercentage(performanceAnalytics.aiSuccessRate)} of calls
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-300">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  Response time within acceptable range
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-300">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  Strong conversion rate for order calls
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-300">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  High customer satisfaction scores
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-yellow-300">⚠️ Areas for Improvement</h4>
              <div className="space-y-2">
                {performanceAnalytics.transferRate > 0.2 && (
                  <div className="flex items-center gap-2 text-sm text-gray-300">
                    <AlertTriangle className="h-4 w-4 text-yellow-500" />
                    Transfer rate could be reduced with AI training
                  </div>
                )}
                {performanceAnalytics.avgResponseTime > 2000 && (
                  <div className="flex items-center gap-2 text-sm text-gray-300">
                    <AlertTriangle className="h-4 w-4 text-yellow-500" />
                    Response time exceeds 2-second target
                  </div>
                )}
                <div className="flex items-center gap-2 text-sm text-gray-300">
                  <AlertTriangle className="h-4 w-4 text-yellow-500" />
                  Consider optimizing peak hour staffing
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-300">
                  <AlertTriangle className="h-4 w-4 text-yellow-500" />
                  FAQ calls show lower conversion rates
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}