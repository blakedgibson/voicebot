import React, { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import {
  DollarSign,
  ShoppingBag,
  Calendar,
  AlertCircle,
  TrendingUp,
  Store,
  Truck,
  Users,
  UtensilsCrossed
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";

interface RevenueAnalyticsProps {
  selectedPeriod?: string;
  onPeriodChange?: (period: string) => void;
  startDate?: string;
  endDate?: string;
}

export default function RevenueAnalytics({
  selectedPeriod: propSelectedPeriod = "This Month",
  onPeriodChange,
  startDate: propStartDate,
  endDate: propEndDate
}: RevenueAnalyticsProps) {
  const { isAuthenticated } = useAuth();
  const [selectedPeriod, setSelectedPeriod] = useState(propSelectedPeriod);

  // Calculate date range
  const dateRange = useMemo(() => {
    if (propStartDate && propEndDate) {
      return { startDate: propStartDate, endDate: propEndDate };
    }

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    switch (selectedPeriod) {
      case "Today":
        return { startDate: today.toISOString(), endDate: new Date().toISOString() };
      case "This Week":
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - today.getDay());
        return { startDate: weekStart.toISOString(), endDate: new Date().toISOString() };
      case "This Month":
        const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
        return { startDate: monthStart.toISOString(), endDate: new Date().toISOString() };
      case "Last 3 Months":
        const threeMonthsAgo = new Date(today);
        threeMonthsAgo.setMonth(today.getMonth() - 3);
        return { startDate: threeMonthsAgo.toISOString(), endDate: new Date().toISOString() };
      case "Total":
        return null;
      default:
        return null;
    }
  }, [selectedPeriod, propStartDate, propEndDate]);

  // Fetch revenue metrics
  const queryUrl = useMemo(() => {
    if (!dateRange) return null;
    const params = new URLSearchParams();
    params.append('startDate', dateRange.startDate);
    params.append('endDate', dateRange.endDate);
    return `/api/metrics/revenue?${params.toString()}`;
  }, [dateRange]);

  const { data: revenueMetrics, isLoading } = useQuery({
    queryKey: [queryUrl],
    enabled: isAuthenticated && !!queryUrl
  });

  // Fetch subscription info for overage charges
  const { data: subscriptionData } = useQuery({
    queryKey: ['/api/user/subscription'],
    enabled: isAuthenticated
  });

  const metrics = revenueMetrics || {};
  const subscription = subscriptionData?.user_subscription || {};

  // Calculate metrics
  const estimatedRevenue = metrics.totalRevenue || 0;
  const reservationsBooked = metrics.totalReservations || 0;
  const lifetimeRevenue = metrics.lifetimeRevenue || 0;
  const overageCharges = subscription.overage_charges || 0;

  // Revenue by service type
  const revenueByService = metrics.revenueBySource || {
    takeout: 0,
    catering: 0,
    dine_in: 0,
    delivery: 0
  };

  const totalServiceRevenue = Object.values(revenueByService).reduce((sum: number, val: any) => sum + (val || 0), 0);

  // Utility functions
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount || 0);
  };

  const formatPercentage = (value: number) => {
    return `${(value || 0).toFixed(1)}%`;
  };

  const getServiceIcon = (service: string) => {
    switch (service.toLowerCase()) {
      case 'takeout':
        return <ShoppingBag className="h-5 w-5" />;
      case 'delivery':
        return <Truck className="h-5 w-5" />;
      case 'dine_in':
      case 'dine-in':
        return <Store className="h-5 w-5" />;
      case 'catering':
        return <Users className="h-5 w-5" />;
      default:
        return <UtensilsCrossed className="h-5 w-5" />;
    }
  };

  const getServiceColor = (service: string) => {
    switch (service.toLowerCase()) {
      case 'takeout':
        return 'text-green-400';
      case 'delivery':
        return 'text-orange-400';
      case 'dine_in':
      case 'dine-in':
        return 'text-blue-400';
      case 'catering':
        return 'text-purple-400';
      default:
        return 'text-gray-400';
    }
  };

  return (
    <div className="space-y-6">
      {/* Period Selector - Mobile only */}
      <div className="flex justify-end lg:hidden">
        <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
          <SelectTrigger className="w-48 bg-transparent border-gray-800 text-gray-300">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Today">Today</SelectItem>
            <SelectItem value="This Week">This Week</SelectItem>
            <SelectItem value="This Month">This Month</SelectItem>
            <SelectItem value="Last 3 Months">Last 3 Months</SelectItem>
            <SelectItem value="Total">Total</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Revenue Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Estimated Revenue from Orders */}
        <Card className="premium-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-400">Revenue from Orders</p>
                <p className="text-2xl font-bold text-white">{formatCurrency(estimatedRevenue)}</p>
                <p className="text-xs text-gray-500 mt-1">{selectedPeriod}</p>
              </div>
              <div className="p-3 bg-green-900/20 rounded-full">
                <DollarSign className="h-6 w-6 text-green-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Reservations Booked */}
        <Card className="premium-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-400">Reservations Booked</p>
                <p className="text-2xl font-bold text-white">{reservationsBooked}</p>
                <p className="text-xs text-gray-500 mt-1">{selectedPeriod}</p>
              </div>
              <div className="p-3 bg-blue-900/20 rounded-full">
                <Calendar className="h-6 w-6 text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Revenue by Service Type */}
      <Card className="premium-card">
        <CardHeader>
          <CardTitle className="text-white">Revenue by Service Type</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Object.entries(revenueByService)
              .sort(([,a], [,b]) => (b as number) - (a as number))
              .map(([service, amount]) => {
                const percentage = totalServiceRevenue > 0
                  ? ((amount as number) / totalServiceRevenue) * 100
                  : 0;
                const serviceName = service.replace('_', '-').replace(/\b\w/g, l => l.toUpperCase());

                return (
                  <div key={service} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`${getServiceColor(service)}`}>
                          {getServiceIcon(service)}
                        </div>
                        <span className="text-gray-300">{serviceName}</span>
                      </div>
                      <div className="text-right">
                        <div className="text-white font-semibold">{formatCurrency(amount as number)}</div>
                        <div className="text-xs text-gray-400">{formatPercentage(percentage)}</div>
                      </div>
                    </div>
                    <Progress value={percentage} className="h-2" />
                  </div>
                );
              })}
          </div>
        </CardContent>
      </Card>

    </div>
  );
}
