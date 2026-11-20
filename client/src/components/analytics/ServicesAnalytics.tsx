import React, { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  ShoppingBag,
  Calendar,
  Truck,
  UtensilsCrossed,
  HelpCircle,
  Boxes
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";

interface ServicesAnalyticsProps {
  selectedPeriod?: string;
  onPeriodChange?: (period: string) => void;
}

export default function ServicesAnalytics({
  selectedPeriod: propSelectedPeriod = "This Month",
  onPeriodChange
}: ServicesAnalyticsProps) {
  const { isAuthenticated } = useAuth();
  const [selectedPeriod, setSelectedPeriod] = useState(propSelectedPeriod);

  // Fetch calls data to calculate service types with auto-refresh
  const { data: conversationsData } = useQuery({
    queryKey: ['/api/conversations'],
    enabled: isAuthenticated,
    refetchInterval: 30000, // Auto-refresh every 30 seconds for real-time updates
    refetchOnWindowFocus: true // Refresh when user returns to the tab
  });

  const calls = Array.isArray(conversationsData?.conversations)
    ? conversationsData.conversations
    : Array.isArray(conversationsData)
    ? conversationsData
    : [];

  // Calculate service type counts
  const serviceTypeCounts = useMemo(() => {
    const counts = {
      orders: 0,
      reservations: 0,
      deliveries: 0,
      catering: 0,
      faqInfo: 0,
      other: 0
    };

    if (!Array.isArray(calls)) return counts;

    calls.forEach((call: any) => {
      const callType = (call.callType || call.interactionType || '').toLowerCase();
      const intent = (call.intent || call.purpose || '').toLowerCase();

      if (callType.includes('order') || intent.includes('order')) {
        counts.orders++;
      } else if (callType.includes('reservation') || intent.includes('reservation') || intent.includes('book')) {
        counts.reservations++;
      } else if (callType.includes('delivery') || intent.includes('delivery')) {
        counts.deliveries++;
      } else if (callType.includes('catering') || intent.includes('catering')) {
        counts.catering++;
      } else if (callType.includes('faq') || callType.includes('info') || intent.includes('info') || intent.includes('question')) {
        counts.faqInfo++;
      } else {
        counts.other++;
      }
    });

    return counts;
  }, [calls]);

  const totalServices = Object.values(serviceTypeCounts).reduce((sum, count) => sum + count, 0);

  const handlePeriodChange = (value: string) => {
    setSelectedPeriod(value);
    if (onPeriodChange) {
      onPeriodChange(value);
    }
  };

  return (
    <div className="space-y-6">
      {/* Period Selector - Mobile only */}
      <div className="flex justify-end lg:hidden">
        <Select value={selectedPeriod} onValueChange={handlePeriodChange}>
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

      {/* Service Type Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Orders */}
        <Card className="premium-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-400">Orders</p>
                <p className="text-2xl font-bold text-white">{serviceTypeCounts.orders}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {totalServices > 0 ? ((serviceTypeCounts.orders / totalServices) * 100).toFixed(1) : 0}% of total
                </p>
              </div>
              <div className="p-3 bg-green-900/20 rounded-full">
                <ShoppingBag className="h-6 w-6 text-green-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Reservations */}
        <Card className="premium-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-400">Reservations</p>
                <p className="text-2xl font-bold text-white">{serviceTypeCounts.reservations}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {totalServices > 0 ? ((serviceTypeCounts.reservations / totalServices) * 100).toFixed(1) : 0}% of total
                </p>
              </div>
              <div className="p-3 bg-purple-900/20 rounded-full">
                <Calendar className="h-6 w-6 text-purple-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Deliveries */}
        <Card className="premium-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-400">Deliveries</p>
                <p className="text-2xl font-bold text-white">{serviceTypeCounts.deliveries}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {totalServices > 0 ? ((serviceTypeCounts.deliveries / totalServices) * 100).toFixed(1) : 0}% of total
                </p>
              </div>
              <div className="p-3 bg-blue-900/20 rounded-full">
                <Truck className="h-6 w-6 text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Catering */}
        <Card className="premium-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-400">Catering</p>
                <p className="text-2xl font-bold text-white">{serviceTypeCounts.catering}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {totalServices > 0 ? ((serviceTypeCounts.catering / totalServices) * 100).toFixed(1) : 0}% of total
                </p>
              </div>
              <div className="p-3 bg-orange-900/20 rounded-full">
                <UtensilsCrossed className="h-6 w-6 text-orange-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* FAQ/Info */}
        <Card className="premium-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-400">FAQ/Info</p>
                <p className="text-2xl font-bold text-white">{serviceTypeCounts.faqInfo}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {totalServices > 0 ? ((serviceTypeCounts.faqInfo / totalServices) * 100).toFixed(1) : 0}% of total
                </p>
              </div>
              <div className="p-3 bg-yellow-900/20 rounded-full">
                <HelpCircle className="h-6 w-6 text-yellow-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Other */}
        <Card className="premium-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-400">Other</p>
                <p className="text-2xl font-bold text-white">{serviceTypeCounts.other}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {totalServices > 0 ? ((serviceTypeCounts.other / totalServices) * 100).toFixed(1) : 0}% of total
                </p>
              </div>
              <div className="p-3 bg-gray-700/20 rounded-full">
                <Boxes className="h-6 w-6 text-gray-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
