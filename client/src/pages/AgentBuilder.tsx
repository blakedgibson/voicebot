import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import Navigation from "@/components/Navigation";
import AgentPreviewModal from "@/components/AgentPreviewModal";
import AudioPlayer from "@/components/AudioPlayer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { INDUSTRY_CONFIGS, getAllIndustries } from "@shared/industryConfig";
import type { VoicePreset, GeneratedAgentData, VoiceAgentFormData } from "@/types";

const formSchema = z.object({
  name: z.string().min(1, "Agent name is required").max(100, "Name too long"),
  description: z.string().min(10, "Description must be at least 10 characters").max(2000, "Description too long"),
  industry: z.string().min(1, "Please select an industry"),
  voiceId: z.string().min(1, "Please select a voice"),
  isPublic: z.boolean().default(false),
});

export default function AgentBuilder() {
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [selectedVoiceId, setSelectedVoiceId] = useState<string>("");
  const [generatedAgent, setGeneratedAgent] = useState<GeneratedAgentData | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [industryOpen, setIndustryOpen] = useState(false);
  const [industrySearch, setIndustrySearch] = useState("");

  const allIndustries = getAllIndustries().filter(i => i.id !== 'general_business');
  const isUnsupportedIndustry = industrySearch.length > 1 && !allIndustries.some(
    i => i.name.toLowerCase().includes(industrySearch.toLowerCase()) ||
         i.keywords.some(k => k.toLowerCase().includes(industrySearch.toLowerCase()))
  );

  const form = useForm<VoiceAgentFormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      description: "",
      industry: user?.selectedIndustry || "healthcare",
      voiceId: "",
      isPublic: false,
    },
  });

  const { data: voicePresets = [] } = useQuery<VoicePreset[]>({
    queryKey: ["/api/voice-presets"],
  });

  const generateMutation = useMutation({
    mutationFn: async (data: Omit<VoiceAgentFormData, 'isPublic'>) => {
      const response = await apiRequest("POST", "/api/agents/generate", data);
      return await response.json();
    },
    onSuccess: (data: GeneratedAgentData) => {
      setGeneratedAgent(data);
      setShowPreview(true);
    },
    onError: (error: Error) => {
      toast({
        title: "Generation Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (data: VoiceAgentFormData & { persona?: string; sampleScript?: string; audioUrl?: string }) => {
      const response = await apiRequest("POST", "/api/agents", data);
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Agent Created",
        description: "Your voice agent has been created successfully!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/agents"] });
      form.reset();
      setGeneratedAgent(null);
      setShowPreview(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Save Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onGenerate = async (data: VoiceAgentFormData) => {
    await generateMutation.mutateAsync({
      name: data.name,
      description: data.description,
      industry: data.industry,
      voiceId: data.voiceId,
    });
  };

  const onSave = async (isPublic: boolean = false) => {
    const formData = form.getValues();
    
    if (!generatedAgent) {
      toast({
        title: "Error",
        description: "Please generate the agent first",
        variant: "destructive",
      });
      return;
    }

    await saveMutation.mutateAsync({
      ...formData,
      isPublic,
      persona: generatedAgent.persona,
      sampleScript: generatedAgent.sampleScript,
      audioUrl: generatedAgent.audioUrl,
    });
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md mx-4">
          <CardContent className="pt-6 text-center">
            <h1 className="text-xl font-bold text-gray-900 mb-4">Please Sign In</h1>
            <p className="text-gray-600 mb-4">You need to be signed in to create voice agents.</p>
            <Button onClick={() => window.location.href = "/api/login"} data-testid="button-sign-in">
              Sign In
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Create Your Voice Agent</h1>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Describe your ideal voice agent and we'll bring it to life with AI. Choose a voice, personality, and purpose.
          </p>
        </div>

        <Card className="shadow-lg border-0">
          <CardContent className="p-8">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onGenerate)} className="space-y-8">
                {/* Agent Name */}
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Agent Name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Dr. Sarah Assistant" {...field} data-testid="input-agent-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Industry Context */}
                <FormField
                  control={form.control}
                  name="industry"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Industry Context</FormLabel>
                      <Popover open={industryOpen} onOpenChange={setIndustryOpen}>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              role="combobox"
                              aria-expanded={industryOpen}
                              className="w-full justify-between font-normal"
                              data-testid="select-industry"
                            >
                              {field.value
                                ? (INDUSTRY_CONFIGS[field.value as keyof typeof INDUSTRY_CONFIGS]?.name ?? field.value)
                                : "Search your industry..."}
                              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-full p-0" align="start">
                          <Command>
                            <CommandInput
                              placeholder="Type your industry..."
                              value={industrySearch}
                              onValueChange={setIndustrySearch}
                            />
                            <CommandList>
                              {isUnsupportedIndustry ? (
                                <div className="px-3 py-3 text-sm space-y-2">
                                  <p className="text-muted-foreground">
                                    We don't have a specialized template for <strong>"{industrySearch}"</strong> yet.
                                  </p>
                                  <p className="text-muted-foreground">
                                    We'll set you up with our <strong>General Professional</strong> template — message-taking, call routing, and callback scheduling.
                                  </p>
                                  <Button
                                    size="sm"
                                    variant="secondary"
                                    className="w-full mt-1"
                                    onClick={() => {
                                      field.onChange('general_business');
                                      setIndustryOpen(false);
                                    }}
                                  >
                                    Use General Professional Template
                                  </Button>
                                </div>
                              ) : (
                                <>
                                  <CommandEmpty>No industry found.</CommandEmpty>
                                  <CommandGroup>
                                    {allIndustries.map((industry) => (
                                      <CommandItem
                                        key={industry.id}
                                        value={industry.name}
                                        onSelect={() => {
                                          field.onChange(industry.id);
                                          setIndustryOpen(false);
                                          setIndustrySearch("");
                                        }}
                                      >
                                        <Check
                                          className={cn("mr-2 h-4 w-4", field.value === industry.id ? "opacity-100" : "opacity-0")}
                                        />
                                        {industry.name}
                                      </CommandItem>
                                    ))}
                                  </CommandGroup>
                                </>
                              )}
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                      {field.value === 'general_business' && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Using General Professional template — handles message-taking and call routing for any business type.
                        </p>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Agent Description */}
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Agent Description
                        <span className="text-gray-500 font-normal ml-2">(Be specific about personality, tone, and purpose)</span>
                      </FormLabel>
                      <FormControl>
                        <Textarea 
                          rows={8}
                          placeholder="Describe your voice agent's personality, tone, expertise, and primary function. For example: 'A warm, professional medical assistant who helps patients schedule appointments, explains basic medical procedures, and provides empathetic support during stressful times. Should sound caring but knowledgeable, with a reassuring bedside manner.'"
                          className="resize-none"
                          {...field}
                          data-testid="textarea-description"
                        />
                      </FormControl>
                      <div className="flex justify-between items-center mt-2">
                        <p className="text-sm text-gray-500">Be detailed for better results</p>
                        <span className="text-sm text-gray-400">{field.value.length}/2000</span>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Voice Selection */}
                <FormField
                  control={form.control}
                  name="voiceId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Choose Voice</FormLabel>
                      <FormControl>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {voicePresets.map((voice) => (
                            <div
                              key={voice.id}
                              className={`border-2 rounded-lg p-4 cursor-pointer transition-all duration-200 group ${
                                field.value === voice.id
                                  ? 'border-primary bg-primary/5'
                                  : 'border-gray-200 hover:border-primary'
                              }`}
                              onClick={() => {
                                field.onChange(voice.id);
                                setSelectedVoiceId(voice.id);
                              }}
                              data-testid={`voice-option-${voice.id}`}
                            >
                              <div className="flex items-center justify-between mb-3">
                                <div>
                                  <h4 className="font-medium text-gray-900">{voice.name}</h4>
                                  <p className="text-sm text-gray-500">{voice.description}</p>
                                </div>
                                <AudioPlayer audioUrl={voice.sampleUrl} className="w-8 h-8" />
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

                {/* Generate Button */}
                <div className="pt-6 border-t border-gray-200">
                  <Button 
                    type="submit" 
                    className="w-full bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90 text-white py-4 rounded-xl font-semibold text-lg transition-all duration-200 transform hover:scale-[1.02] shadow-lg hover:shadow-xl"
                    disabled={generateMutation.isPending}
                    data-testid="button-generate-agent"
                  >
                    {generateMutation.isPending ? (
                      <>
                        <i className="fas fa-spinner fa-spin mr-3"></i>
                        Generating Agent...
                      </>
                    ) : (
                      <>
                        <i className="fas fa-magic mr-3"></i>
                        Generate Voice Agent
                      </>
                    )}
                  </Button>
                  <p className="text-sm text-gray-500 text-center mt-3">
                    This will create your agent persona and generate a sample audio clip
                  </p>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </main>

      {/* Agent Preview Modal */}
      {showPreview && generatedAgent && (
        <AgentPreviewModal
          isOpen={showPreview}
          onClose={() => setShowPreview(false)}
          agentData={{
            name: form.getValues('name'),
            ...generatedAgent,
          }}
          onSave={onSave}
          isLoading={saveMutation.isPending}
        />
      )}
    </div>
  );
}
