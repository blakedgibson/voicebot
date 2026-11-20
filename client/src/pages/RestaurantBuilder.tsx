import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import PremiumNavigation from "@/components/PremiumNavigation";
import RestaurantPreviewModal from "@/components/RestaurantPreviewModal";
import AudioPlayer from "@/components/AudioPlayer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import logoImage from "@assets/Screenshot_2025-09-07_at_12.57.13_PM-removebg-preview_1757268155334.png";
import type { VoicePreset } from "@shared/schema";

const formSchema = z.object({
  url: z.string().url().optional().or(z.literal("")),
  businessName: z.string().min(1, "Business name is required"),
  location: z.string().optional(),
  voiceId: z.string().min(1, "Please select a voice"),
  isPublic: z.boolean().default(false),
});

interface ScrapedData {
  restaurantData: {
    businessName: string;
    address?: string;
    phone?: string;
    website?: string;
    hours?: Record<string, string>;
    menuItems?: Array<{ name: string; price?: string; description?: string }>;
    services?: string[];
    reservationInfo?: string;
    googleMapsData?: any;
  };
  suggestedPrompt: string;
  scrapedSuccessfully: boolean;
  googleMapsFound: boolean;
}

interface RestaurantAgent {
  agent: any;
  restaurantData: any;
  persona: string;
  sampleScript: string;
  audioUrl: string;
}

export default function RestaurantBuilder() {
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [scrapedData, setScrapedData] = useState<ScrapedData | null>(null);
  const [generatedAgent, setGeneratedAgent] = useState<RestaurantAgent | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [isScrapingStage, setIsScrapingStage] = useState(true);
  const [isAutoTraining, setIsAutoTraining] = useState(false);

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      url: "",
      businessName: "",
      location: "",
      voiceId: "",
      isPublic: false,
    },
  });

  const { data: voicePresets = [] } = useQuery<VoicePreset[]>({
    queryKey: ["/api/voice-presets"],
  });

  const scrapeMutation = useMutation({
    mutationFn: async (data: { url?: string; businessName: string; location?: string }) => {
      const response = await fetch("/api/restaurant/scrape", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to scrape data: ${response.statusText}`);
      }
      
      return await response.json();
    },
    onSuccess: (data: ScrapedData) => {
      setScrapedData(data);
      setIsScrapingStage(false);
      
      toast({
        title: "Restaurant Data Found!",
        description: data.scrapedSuccessfully 
          ? "Successfully scraped website data" 
          : "Using Google Maps data",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Scraping Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Handle URL parameters for auto-training
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const source = urlParams.get('source');
    const url = urlParams.get('url');
    const query = urlParams.get('query');

    if (source && (url || query)) {
      setIsAutoTraining(true);
      
      if (source === 'website' && url) {
        // Pre-fill the form with website URL
        form.setValue('url', decodeURIComponent(url));
        // Auto-extract business name from URL
        const domain = new URL(decodeURIComponent(url)).hostname.replace('www.', '');
        const businessName = domain.split('.')[0].charAt(0).toUpperCase() + domain.split('.')[0].slice(1);
        form.setValue('businessName', businessName);
        
        toast({
          title: "Training AI on Website",
          description: "Automatically extracting data from your website...",
        });
        
        // Auto-submit the form
        setTimeout(() => {
          scrapeMutation.mutate({
            url: decodeURIComponent(url),
            businessName: businessName,
          });
        }, 1000);
        
      } else if (source === 'google-maps' && query) {
        // Pre-fill the form with Google Maps query
        const businessName = decodeURIComponent(query).split(',')[0]; // Extract business name part
        form.setValue('businessName', businessName);
        
        toast({
          title: "Training AI on Google Maps",
          description: "Automatically extracting data from Google Maps...",
        });
        
        // Auto-submit the form
        setTimeout(() => {
          scrapeMutation.mutate({
            businessName: businessName,
          });
        }, 1000);
      }
    }
  }, []);

  const createMutation = useMutation({
    mutationFn: async (data: { restaurantData: any; voiceId: string; isPublic: boolean }) => {
      const response = await apiRequest("POST", "/api/restaurant/create-agent", data);
      return await response.json();
    },
    onSuccess: (data: RestaurantAgent) => {
      setGeneratedAgent(data);
      setShowPreview(true);
    },
    onError: (error: Error) => {
      toast({
        title: "Creation Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onScrape = async (data: any) => {
    await scrapeMutation.mutateAsync({
      url: data.url || undefined,
      businessName: data.businessName,
      location: data.location || undefined,
    });
  };

  const onCreateAgent = async (data: any) => {
    if (!scrapedData) {
      toast({
        title: "Error",
        description: "Please scrape restaurant data first",
        variant: "destructive",
      });
      return;
    }

    await createMutation.mutateAsync({
      restaurantData: scrapedData.restaurantData,
      voiceId: data.voiceId,
      isPublic: data.isPublic,
    });
  };

  const handleBackToScraping = () => {
    setIsScrapingStage(true);
    setScrapedData(null);
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <Card className="w-full max-w-lg bg-gray-900 border-gray-700">
          <CardContent className="pt-8 pb-8 px-8">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <img src={logoImage} alt="VoiceBot Logo" className="w-6 h-6 object-contain" />
              </div>
              <h1 className="text-2xl font-bold text-white mb-2">Create Your AI Receptionist</h1>
              <p className="text-gray-300">Sign up to continue training your restaurant's AI voice agent</p>
            </div>

            <form className="space-y-6">
              <div>
                <Label htmlFor="fullName" className="text-white">Full Name</Label>
                <Input 
                  id="fullName"
                  type="text" 
                  placeholder="Enter your full name"
                  className="mt-2 bg-gray-800 border-gray-800 text-white placeholder-gray-400"
                />
              </div>
              
              <div>
                <Label htmlFor="email" className="text-white">Email Address</Label>
                <Input 
                  id="email"
                  type="email" 
                  placeholder="Enter your email"
                  className="mt-2 bg-gray-800 border-gray-800 text-white placeholder-gray-400"
                />
              </div>
              
              <div>
                <Label htmlFor="phone" className="text-white">Phone Number</Label>
                <Input 
                  id="phone"
                  type="tel" 
                  placeholder="Enter your phone number"
                  className="mt-2 bg-gray-800 border-gray-800 text-white placeholder-gray-400"
                />
              </div>

              <Button 
                onClick={() => window.location.href = "/api/login"}
                className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white py-3 rounded-xl font-semibold transition-all duration-300"
                data-testid="button-google-signup"
              >
                <i className="fab fa-google mr-3"></i>
                Continue with Google
              </Button>
              
              <p className="text-xs text-gray-400 text-center mt-4">
                By signing up, you agree to our Terms of Service and Privacy Policy
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      <PremiumNavigation />
      
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold text-white mb-4">Restaurant Voice Receptionist</h1>
          <p className="text-gray-300 max-w-2xl mx-auto">
            Automatically extract your restaurant's information from your website or Google Maps listing, 
            then create an AI voice agent that can handle reservations, answer questions, and provide customer service.
          </p>
        </div>

        {/* Auto-Training Status */}
        {isAutoTraining && (
          <div className="mb-8">
            <Card className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border-blue-500/20">
              <CardContent className="p-6">
                <div className="flex items-center space-x-4">
                  <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                    <i className="fas fa-robot text-white text-sm animate-pulse"></i>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-white mb-2">
                      AI Training in Progress
                    </h3>
                    <p className="text-gray-300">
                      {scrapeMutation.isPending 
                        ? "Extracting and analyzing your business data..." 
                        : "Training completed successfully! Your AI is ready to customize."}
                    </p>
                  </div>
                  {scrapeMutation.isPending && (
                    <div className="w-6 h-6">
                      <i className="fas fa-spinner animate-spin text-blue-400 text-lg"></i>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Progress Steps */}
        <div className="flex items-center justify-center mb-8">
          <div className="flex items-center space-x-4">
            <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
              isScrapingStage ? 'bg-primary border-primary text-white' : 'bg-green-500 border-green-500 text-white'
            }`}>
              {isScrapingStage ? '1' : <i className="fas fa-check text-sm"></i>}
            </div>
            <span className={`text-sm font-medium ${isScrapingStage ? 'text-primary' : 'text-green-600'}`}>
              Extract Data
            </span>
            
            <div className={`w-12 h-0.5 ${isScrapingStage ? 'bg-gray-300' : 'bg-green-500'}`}></div>
            
            <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
              isScrapingStage 
                ? 'bg-gray-100 border-gray-300 text-gray-500' 
                : 'bg-primary border-primary text-white'
            }`}>
              2
            </div>
            <span className={`text-sm font-medium ${isScrapingStage ? 'text-gray-500' : 'text-primary'}`}>
              Configure Agent
            </span>
          </div>
        </div>

        <Card className="shadow-lg border-0">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <i className={`fas ${isScrapingStage ? 'fa-globe' : 'fa-microphone'} text-primary`}></i>
              <span>
                {isScrapingStage ? 'Extract Restaurant Information' : 'Configure Voice Agent'}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-8">
            {isScrapingStage ? (
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onScrape)} className="space-y-6">
                  <FormField
                    control={form.control}
                    name="url"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Restaurant Website URL (Optional)</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="https://yourrestaurant.com" 
                            {...field} 
                            data-testid="input-website-url" 
                          />
                        </FormControl>
                        <p className="text-sm text-gray-500">
                          We'll extract menu items, hours, contact info, and more from your website
                        </p>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex items-center space-x-4 py-4">
                    <div className="flex-1 border-t border-gray-300"></div>
                    <span className="px-3 text-sm font-medium text-gray-500 bg-gray-50 rounded-lg">OR</span>
                    <div className="flex-1 border-t border-gray-300"></div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="businessName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Restaurant Name</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="Mario's Italian Restaurant" 
                              {...field} 
                              data-testid="input-business-name" 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="location"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Location (Optional)</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="New York, NY" 
                              {...field} 
                              data-testid="input-location" 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full bg-primary hover:bg-primary/90 text-white py-4 rounded-xl font-semibold text-lg"
                    disabled={scrapeMutation.isPending}
                    data-testid="button-extract-data"
                  >
                    {scrapeMutation.isPending ? (
                      <>
                        <i className="fas fa-spinner fa-spin mr-3"></i>
                        Extracting Restaurant Data...
                      </>
                    ) : (
                      <>
                        <i className="fas fa-search mr-3"></i>
                        Extract Restaurant Data
                      </>
                    )}
                  </Button>
                </form>
              </Form>
            ) : (
              scrapedData && (
                <div className="space-y-8">
                  {/* Extracted Data Preview */}
                  <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-semibold text-green-900 flex items-center">
                        <i className="fas fa-check-circle mr-2"></i>
                        Restaurant Data Extracted
                      </h3>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={handleBackToScraping}
                        data-testid="button-edit-data"
                      >
                        <i className="fas fa-edit mr-1"></i>
                        Edit
                      </Button>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <strong>Name:</strong> {scrapedData.restaurantData.businessName}
                      </div>
                      {scrapedData.restaurantData.address && (
                        <div>
                          <strong>Address:</strong> {scrapedData.restaurantData.address}
                        </div>
                      )}
                      {scrapedData.restaurantData.phone && (
                        <div>
                          <strong>Phone:</strong> {scrapedData.restaurantData.phone}
                        </div>
                      )}
                      {scrapedData.restaurantData.services && scrapedData.restaurantData.services.length > 0 && (
                        <div className="md:col-span-2">
                          <strong>Services:</strong> {' '}
                          {scrapedData.restaurantData.services.map(service => (
                            <Badge key={service} variant="secondary" className="mr-1">
                              {service}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>

                    {scrapedData.restaurantData.menuItems && scrapedData.restaurantData.menuItems.length > 0 && (
                      <div className="mt-4">
                        <strong className="text-sm">Sample Menu Items:</strong>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2 text-sm">
                          {scrapedData.restaurantData.menuItems.slice(0, 4).map((item, index) => (
                            <div key={index} className="flex justify-between">
                              <span>{item.name}</span>
                              {item.price && <span className="text-green-600">{item.price}</span>}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Voice Selection */}
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onCreateAgent)} className="space-y-6">
                      <FormField
                        control={form.control}
                        name="voiceId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Choose Voice for Your Receptionist</FormLabel>
                            <FormControl>
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {voicePresets.map((voice) => (
                                  <div
                                    key={voice.id}
                                    className={`border-2 rounded-lg p-4 cursor-pointer transition-all duration-200 ${
                                      field.value === voice.id
                                        ? 'border-primary bg-primary/5'
                                        : 'border-gray-200 hover:border-primary'
                                    }`}
                                    onClick={() => field.onChange(voice.id)}
                                    data-testid={`voice-option-${voice.id}`}
                                  >
                                    <div className="flex items-center justify-between mb-3">
                                      <div>
                                        <h4 className="font-medium text-gray-900">{voice.name}</h4>
                                        <p className="text-sm text-gray-500">{voice.description}</p>
                                      </div>
                                      <AudioPlayer audioUrl={voice.sampleUrl || ""} className="w-8 h-8" />
                                    </div>
                                    <div className="flex items-center space-x-1 text-xs text-gray-500">
                                      {voice.personality.map((trait, index) => (
                                        <span key={trait}>
                                          {trait}
                                          {index < voice.personality.length - 1 && <span className="mx-1">•</span>}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* Public Setting */}
                      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div>
                          <Label htmlFor="make-public" className="text-sm font-medium">
                            Make agent public
                          </Label>
                          <p className="text-xs text-gray-500">
                            Allow others to discover and duplicate your restaurant agent
                          </p>
                        </div>
                        <FormField
                          control={form.control}
                          name="isPublic"
                          render={({ field }) => (
                            <Switch
                              id="make-public"
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              data-testid="switch-make-public"
                            />
                          )}
                        />
                      </div>

                      <Button 
                        type="submit" 
                        className="w-full bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90 text-white py-4 rounded-xl font-semibold text-lg"
                        disabled={createMutation.isPending}
                        data-testid="button-create-agent"
                      >
                        {createMutation.isPending ? (
                          <>
                            <i className="fas fa-spinner fa-spin mr-3"></i>
                            Creating Voice Receptionist...
                          </>
                        ) : (
                          <>
                            <img src={logoImage} alt="VoiceBot Logo" className="w-4 h-4 mr-3 object-contain" />
                            Create Voice Receptionist
                          </>
                        )}
                      </Button>
                    </form>
                  </Form>
                </div>
              )
            )}
          </CardContent>
        </Card>
      </main>

      {/* Restaurant Preview Modal */}
      {showPreview && generatedAgent && (
        <RestaurantPreviewModal
          isOpen={showPreview}
          onClose={() => setShowPreview(false)}
          agentData={generatedAgent}
          restaurantData={scrapedData?.restaurantData}
        />
      )}
    </div>
  );
}