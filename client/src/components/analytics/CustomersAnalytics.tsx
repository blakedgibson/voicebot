import React, { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Users,
  Phone,
  TrendingUp,
  User,
  Mail
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";

interface CustomersAnalyticsProps {
  selectedPeriod?: string;
}

export default function CustomersAnalytics({ selectedPeriod: propSelectedPeriod = "This Month" }: CustomersAnalyticsProps) {
  const { isAuthenticated } = useAuth();
  const [selectedPeriod, setSelectedPeriod] = useState(propSelectedPeriod);

  // Fetch customers from API
  const { data: customersResponse, isLoading } = useQuery({
    queryKey: ['/api/metrics/customers'],
    enabled: isAuthenticated,
    queryFn: async () => {
      const response = await fetch('/api/metrics/customers?limit=100');
      if (!response.ok) throw new Error('Failed to fetch customers');
      return await response.json();
    }
  });

  // Fetch customer segments
  const { data: segmentsResponse } = useQuery({
    queryKey: ['/api/metrics/customers/segments'],
    enabled: isAuthenticated,
    queryFn: async () => {
      const response = await fetch('/api/metrics/customers/segments');
      if (!response.ok) throw new Error('Failed to fetch segments');
      return await response.json();
    }
  });

  const customers = customersResponse?.data || [];
  const segments = segmentsResponse?.data || { total: 0, new: 0, repeat: 0 };

  // Calculate metrics
  const uniqueCallers = segments.total || customers.length || 0;
  const repeatCustomers = segments.repeat || 0;
  const newCustomers = segments.new || 0;
  const repeatPercentage = uniqueCallers > 0 ? (repeatCustomers / uniqueCallers) * 100 : 0;

  // Utility functions
  const formatPhoneNumber = (phone: string) => {
    if (!phone) return '';
    if (phone.startsWith('+1')) {
      const cleaned = phone.slice(2);
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    }
    return phone;
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

      {/* Customer Engagement Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Unique Callers */}
        <Card className="premium-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-400">Unique Callers</p>
                <p className="text-2xl font-bold text-white">{uniqueCallers}</p>
                <p className="text-xs text-gray-500 mt-1">{selectedPeriod}</p>
              </div>
              <div className="p-3 bg-blue-900/20 rounded-full">
                <Users className="h-6 w-6 text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Repeat Customers */}
        <Card className="premium-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-400">Repeat Customers</p>
                <p className="text-2xl font-bold text-white">{repeatCustomers}</p>
                <p className="text-xs text-gray-500 mt-1">{repeatPercentage.toFixed(1)}% of total</p>
              </div>
              <div className="p-3 bg-green-900/20 rounded-full">
                <TrendingUp className="h-6 w-6 text-green-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* New Customers */}
        <Card className="premium-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-400">New Customers</p>
                <p className="text-2xl font-bold text-white">{newCustomers}</p>
                <p className="text-xs text-gray-500 mt-1">First-time callers</p>
              </div>
              <div className="p-3 bg-purple-900/20 rounded-full">
                <User className="h-6 w-6 text-purple-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Customer Contact List */}
      <Card className="premium-card">
        <CardHeader>
          <CardTitle className="text-white">Customer Contact List</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-12">
              <p className="text-gray-400">Loading customers...</p>
            </div>
          ) : customers.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-semibold text-white mb-2">No Customers Yet</h3>
              <p className="text-gray-400">Customer data will appear here once you start receiving calls.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-gray-700">
                    <TableHead className="text-gray-300">Name</TableHead>
                    <TableHead className="text-gray-300">Phone</TableHead>
                    <TableHead className="text-gray-300">Email</TableHead>
                    <TableHead className="text-gray-300"># of Calls</TableHead>
                    <TableHead className="text-gray-300">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {customers.map((customer: any) => {
                    const isRepeat = (customer.totalCalls || 0) > 1;
                    const isNew = (customer.totalCalls || 0) === 1;

                    return (
                      <TableRow key={customer.id} className="border-gray-700 hover:bg-gray-800/50">
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold text-sm">
                              {customer.customerName ? customer.customerName.charAt(0).toUpperCase() : 'U'}
                            </div>
                            <div className="text-white font-medium">
                              {customer.customerName || 'Unknown Caller'}
                            </div>
                          </div>
                        </TableCell>

                        <TableCell>
                          <div className="text-gray-300 font-mono text-sm">
                            {formatPhoneNumber(customer.phoneNumber)}
                          </div>
                        </TableCell>

                        <TableCell>
                          <div className="text-gray-300 text-sm">
                            {customer.email || <span className="text-gray-500">Not captured</span>}
                          </div>
                        </TableCell>

                        <TableCell>
                          <div className="text-white font-semibold">{customer.totalCalls || 0}</div>
                        </TableCell>

                        <TableCell>
                          <Badge className={
                            isRepeat
                              ? 'bg-green-900/20 text-green-400 border-green-800'
                              : 'bg-purple-900/20 text-purple-400 border-purple-800'
                          }>
                            {isRepeat ? 'Repeat' : 'New'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
