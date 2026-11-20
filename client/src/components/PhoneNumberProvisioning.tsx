import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Phone, Search, MapPin } from 'lucide-react';

interface PhoneNumber {
  phoneNumber: string;
  friendlyName: string;
  locality: string;
  region: string;
  postalCode: string;
  isoCountry: string;
  capabilities: {
    voice: boolean;
    sms: boolean;
    mms: boolean;
  };
}

interface PhoneNumberProvisioningProps {
  businessAddress?: {
    street?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  };
  onPhoneNumberProvisioned?: (phoneNumber: any) => void;
  showTitle?: boolean;
}

export default function PhoneNumberProvisioning({ 
  businessAddress, 
  onPhoneNumberProvisioned,
  showTitle = true 
}: PhoneNumberProvisioningProps) {
  const [searchParams, setSearchParams] = useState({
    areaCode: '',
    contains: '',
    type: 'local' as 'local' | 'toll-free',
    limit: 10
  });
  const [selectedNumber, setSelectedNumber] = useState<PhoneNumber | null>(null);
  const { toast } = useToast();

  // Search for available phone numbers
  const searchMutation = useMutation({
    mutationFn: async (params: typeof searchParams) => {
      const response = await apiRequest('POST', '/api/phone-numbers/search', params);
      return response as { phoneNumbers: PhoneNumber[] };
    },
    onError: (error) => {
      toast({
        title: 'Search Failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Provision selected phone number
  const provisionMutation = useMutation({
    mutationFn: async (data: { phoneNumber: string; phoneNumberType: string; businessAddress?: any }) => {
      const response = await apiRequest('POST', '/api/phone-numbers/provision', data);
      return response as { phoneAssignment: { phoneNumber: string } };
    },
    onSuccess: (data) => {
      toast({
        title: 'Phone Number Provisioned',
        description: `Successfully provisioned ${data.phoneAssignment.phoneNumber}`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/phone-numbers'] });
      onPhoneNumberProvisioned?.(data);
      setSelectedNumber(null);
    },
    onError: (error) => {
      toast({
        title: 'Provisioning Failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Get user's current phone numbers
  const { data: userPhoneNumbers } = useQuery({
    queryKey: ['/api/phone-numbers'],
    retry: false,
  }) as { data?: { phoneNumbers: any[] } };

  const handleSearch = () => {
    if (!searchParams.areaCode && !searchParams.contains) {
      toast({
        title: 'Search Criteria Required',
        description: 'Please enter an area code or phone number pattern to search',
        variant: 'destructive',
      });
      return;
    }
    searchMutation.mutate(searchParams);
  };

  const handleProvision = () => {
    if (!selectedNumber) return;
    
    provisionMutation.mutate({
      phoneNumber: selectedNumber.phoneNumber,
      phoneNumberType: searchParams.type,
      businessAddress
    });
  };

  const formatPhoneNumber = (phoneNumber: string) => {
    const cleaned = phoneNumber.replace(/\D/g, '');
    const match = cleaned.match(/^1?(\d{3})(\d{3})(\d{4})$/);
    if (match) {
      return `(${match[1]}) ${match[2]}-${match[3]}`;
    }
    return phoneNumber;
  };

  return (
    <div className="space-y-6">
      {showTitle && (
        <div>
          <h3 className="text-lg font-semibold">Phone Number Provisioning</h3>
          <p className="text-sm text-muted-foreground">
            Search and provision phone numbers for your AI receptionist
          </p>
        </div>
      )}

      {/* Current Phone Numbers */}
      {userPhoneNumbers?.phoneNumbers?.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Phone className="h-4 w-4" />
              Your Phone Numbers
            </CardTitle>
            <CardDescription>Currently provisioned phone numbers</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {userPhoneNumbers.phoneNumbers.map((phone: any) => (
                <div key={phone.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{formatPhoneNumber(phone.phoneNumber)}</p>
                      <p className="text-sm text-muted-foreground">
                        {phone.phoneNumberType} • ${(phone.monthlyCost / 100).toFixed(2)}/month
                      </p>
                    </div>
                  </div>
                  <Badge variant={phone.status === 'active' ? 'default' : 'secondary'}>
                    {phone.status}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-4 w-4" />
            Search Available Numbers
          </CardTitle>
          <CardDescription>Find phone numbers in your area or with specific patterns</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="areaCode">Area Code</Label>
              <Input
                id="areaCode"
                placeholder="e.g., 555"
                value={searchParams.areaCode}
                onChange={(e) => setSearchParams(prev => ({ ...prev, areaCode: e.target.value }))}
                data-testid="input-area-code"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contains">Contains Pattern</Label>
              <Input
                id="contains"
                placeholder="e.g., 1234"
                value={searchParams.contains}
                onChange={(e) => setSearchParams(prev => ({ ...prev, contains: e.target.value }))}
                data-testid="input-phone-pattern"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Phone Number Type</Label>
            <Select
              value={searchParams.type}
              onValueChange={(value: 'local' | 'toll-free') => 
                setSearchParams(prev => ({ ...prev, type: value }))
              }
            >
              <SelectTrigger data-testid="select-phone-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="local">Local Number (+$1.00/month)</SelectItem>
                <SelectItem value="toll-free">Toll-Free Number (+$2.00/month)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button 
            onClick={handleSearch} 
            disabled={searchMutation.isPending}
            className="w-full"
            data-testid="button-search-numbers"
          >
            {searchMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Search Available Numbers
          </Button>
        </CardContent>
      </Card>

      {/* Search Results */}
      {searchMutation.data?.phoneNumbers && (
        <Card>
          <CardHeader>
            <CardTitle>Available Phone Numbers</CardTitle>
            <CardDescription>
              Found {searchMutation.data.phoneNumbers.length} available numbers
            </CardDescription>
          </CardHeader>
          <CardContent>
            {searchMutation.data.phoneNumbers.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No phone numbers found matching your criteria. Try different search terms.
              </p>
            ) : (
              <div className="space-y-3">
                {searchMutation.data.phoneNumbers.map((phone: PhoneNumber) => (
                  <div
                    key={phone.phoneNumber}
                    className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                      selectedNumber?.phoneNumber === phone.phoneNumber
                        ? 'border-primary bg-primary/5'
                        : 'hover:border-primary/50'
                    }`}
                    onClick={() => setSelectedNumber(phone)}
                    data-testid={`phone-option-${phone.phoneNumber}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Phone className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="font-medium text-lg">
                            {formatPhoneNumber(phone.phoneNumber)}
                          </p>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <MapPin className="h-3 w-3" />
                            {phone.locality}, {phone.region} {phone.postalCode}
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <div className="flex gap-1">
                          {phone.capabilities.voice && <Badge variant="outline" className="text-xs">Voice</Badge>}
                          {phone.capabilities.sms && <Badge variant="outline" className="text-xs">SMS</Badge>}
                        </div>
                        <p className="text-sm font-medium">
                          ${searchParams.type === 'toll-free' ? '2.00' : '1.00'}/month
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Provision Selected Number */}
      {selectedNumber && (
        <Card className="border-primary">
          <CardHeader>
            <CardTitle className="text-primary">Provision Selected Number</CardTitle>
            <CardDescription>
              You've selected {formatPhoneNumber(selectedNumber.phoneNumber)}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-muted rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Selected Number:</p>
                  <p className="text-lg">{formatPhoneNumber(selectedNumber.phoneNumber)}</p>
                  <p className="text-sm text-muted-foreground">
                    {selectedNumber.locality}, {selectedNumber.region}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Monthly Cost</p>
                  <p className="text-lg font-semibold">
                    ${searchParams.type === 'toll-free' ? '2.00' : '1.00'}
                  </p>
                </div>
              </div>
            </div>

            {businessAddress && (
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <div className="flex items-center gap-2 mb-2">
                  <MapPin className="h-4 w-4 text-blue-600" />
                  <p className="text-sm font-medium text-blue-800 dark:text-blue-200">Emergency Address</p>
                </div>
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  {businessAddress.street}<br />
                  {businessAddress.city}, {businessAddress.state} {businessAddress.postalCode}
                </p>
              </div>
            )}

            <Button 
              onClick={handleProvision}
              disabled={provisionMutation.isPending}
              className="w-full"
              data-testid="button-provision-number"
            >
              {provisionMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Provision This Number
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}