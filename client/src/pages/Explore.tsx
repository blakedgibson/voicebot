import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import Navigation from "@/components/Navigation";
import VoiceAgentCard from "@/components/VoiceAgentCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { INDUSTRIES, type Industry, type VoiceAgentWithUser } from "@shared/schema";

export default function Explore() {
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [selectedIndustry, setSelectedIndustry] = useState<Industry | "">("");
  const [sortBy, setSortBy] = useState("popular");

  const { data: agents = [], isLoading } = useQuery<VoiceAgentWithUser[]>({
    queryKey: ["/api/explore", { industry: selectedIndustry, search, sort: sortBy }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedIndustry) params.append('industry', selectedIndustry);
      if (search) params.append('search', search);
      
      const response = await fetch(`/api/explore?${params}`);
      if (!response.ok) throw new Error('Failed to fetch agents');
      return response.json();
    },
  });

  const likeMutation = useMutation({
    mutationFn: async (agentId: string) => {
      const response = await apiRequest("POST", `/api/agents/${agentId}/like`);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/explore"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const duplicateMutation = useMutation({
    mutationFn: async (agentId: string) => {
      const response = await apiRequest("POST", `/api/agents/${agentId}/duplicate`);
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Agent Duplicated",
        description: "The agent has been added to your collection!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/agents"] });
      queryClient.invalidateQueries({ queryKey: ["/api/explore"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleLike = async (agentId: string) => {
    if (!isAuthenticated) {
      toast({
        title: "Sign In Required",
        description: "Please sign in to like agents",
        variant: "destructive",
      });
      return;
    }
    await likeMutation.mutateAsync(agentId);
  };

  const handleDuplicate = async (agentId: string) => {
    if (!isAuthenticated) {
      toast({
        title: "Sign In Required", 
        description: "Please sign in to duplicate agents",
        variant: "destructive",
      });
      return;
    }
    await duplicateMutation.mutateAsync(agentId);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Explore Voice Agents</h1>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Discover amazing voice agents created by our community. Get inspired or duplicate agents to customize for your needs.
          </p>
        </div>

        {/* Search and Filters */}
        <Card className="shadow-sm border-0 mb-8">
          <CardContent className="p-6">
            <div className="flex flex-col lg:flex-row gap-4 items-center">
              <div className="flex-1 relative">
                <i className="fas fa-search absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"></i>
                <Input
                  type="text"
                  placeholder="Search agents by name, description, or industry..."
                  className="pl-10"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  data-testid="input-search"
                />
              </div>
              <div className="flex gap-3">
                <Select value={selectedIndustry} onValueChange={(value) => setSelectedIndustry(value as Industry)} data-testid="select-industry-filter">
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="All Industries" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Industries</SelectItem>
                    {Object.entries(INDUSTRIES).map(([key, industry]) => (
                      <SelectItem key={key} value={key}>
                        {industry.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                <Select value={sortBy} onValueChange={setSortBy} data-testid="select-sort">
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="popular">Most Popular</SelectItem>
                    <SelectItem value="newest">Newest</SelectItem>
                    <SelectItem value="most-used">Most Used</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Loading State */}
        {isLoading && (
          <div className="text-center py-12">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Loading agents...</p>
          </div>
        )}

        {/* Agent Gallery Grid */}
        {!isLoading && (
          <>
            {agents.length === 0 ? (
              <Card className="shadow-sm">
                <CardContent className="text-center py-12">
                  <i className="fas fa-search text-4xl text-gray-400 mb-4"></i>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No Agents Found</h3>
                  <p className="text-gray-600 mb-4">
                    {search || selectedIndustry 
                      ? "Try adjusting your search criteria or filters"
                      : "No public agents have been shared yet"}
                  </p>
                  {!search && !selectedIndustry && (
                    <Button onClick={() => window.location.href = '/builder'} data-testid="button-create-agent">
                      Create the First Agent
                    </Button>
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {agents.map((agent) => (
                  <Card key={agent.id} className="shadow-sm border-0 hover:shadow-lg transition-all duration-200 hover:-translate-y-1">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center space-x-3">
                          <div 
                            className="w-12 h-12 rounded-lg flex items-center justify-center text-white"
                            style={{ backgroundColor: INDUSTRIES[agent.industry as Industry]?.color || '#6366F1' }}
                          >
                            <i className={INDUSTRIES[agent.industry as Industry]?.icon || 'fas fa-robot'}></i>
                          </div>
                          <div>
                            <h3 className="font-semibold text-gray-900" data-testid={`agent-name-${agent.id}`}>{agent.name}</h3>
                            <p className="text-sm text-gray-500">
                              by {agent.user.firstName} {agent.user.lastName}
                            </p>
                          </div>
                        </div>
                        <Badge 
                          variant="secondary"
                          style={{ 
                            backgroundColor: `${INDUSTRIES[agent.industry as Industry]?.color}20`,
                            color: INDUSTRIES[agent.industry as Industry]?.color 
                          }}
                        >
                          {INDUSTRIES[agent.industry as Industry]?.name}
                        </Badge>
                      </div>
                      
                      <p className="text-gray-700 text-sm mb-4" data-testid={`agent-description-${agent.id}`}>
                        {agent.description}
                      </p>

                      {/* Audio Preview */}
                      {agent.audioUrl && (
                        <VoiceAgentCard agent={agent} />
                      )}

                      {/* Stats */}
                      <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                        <div className="flex items-center space-x-4">
                          <span className="flex items-center" data-testid={`agent-likes-${agent.id}`}>
                            <i className="fas fa-heart text-red-400 mr-1"></i>
                            {agent.likes}
                          </span>
                          <span className="flex items-center" data-testid={`agent-duplicates-${agent.id}`}>
                            <i className="fas fa-copy text-blue-400 mr-1"></i>
                            {agent.duplicates}
                          </span>
                        </div>
                        <span>{new Date(agent.createdAt).toLocaleDateString()}</span>
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2">
                        <Button 
                          className="flex-1"
                          onClick={() => handleDuplicate(agent.id)}
                          disabled={duplicateMutation.isPending}
                          data-testid={`button-duplicate-${agent.id}`}
                        >
                          <i className="fas fa-copy mr-2"></i>
                          {duplicateMutation.isPending ? 'Duplicating...' : 'Duplicate'}
                        </Button>
                        
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleLike(agent.id)}
                          disabled={likeMutation.isPending}
                          data-testid={`button-like-${agent.id}`}
                        >
                          <i className={`fas fa-heart ${agent.isLiked ? 'text-red-500' : ''}`}></i>
                        </Button>
                        
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            navigator.share?.({
                              title: agent.name,
                              text: agent.description,
                              url: window.location.href,
                            });
                          }}
                          data-testid={`button-share-${agent.id}`}
                        >
                          <i className="fas fa-share-alt"></i>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* Load More */}
            {agents.length > 0 && agents.length % 20 === 0 && (
              <div className="text-center mt-12">
                <Button variant="outline" data-testid="button-load-more">
                  Load More Agents
                </Button>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
