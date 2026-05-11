import { useMemo, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { MapPinned, Plus, Loader2, AlertCircle, Shield, Tag, LogIn, Upload, X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { queryClient } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import type { Recommendation } from "@shared/schema";
import { recommendationTypeValues } from "@shared/schema";
import { Link } from "wouter";

function getTypeVariant(type: string): "default" | "secondary" | "destructive" {
  switch (type) {
    case "beach":
    case "hike":
      return "default";
    case "shopping":
      return "secondary";
    default:
      return "outline";
  }
}

export default function RecommendationsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const canEdit = !!user && ["admin", "editor"].includes(user.role);
  const canUpload = !!user && ["admin", "editor", "contributor"].includes(user.role);
  const [uploadingRecommendationId, setUploadingRecommendationId] = useState<number | null>(null);
  const [filterType, setFilterType] = useState<string>("all");
  const [filterLocation, setFilterLocation] = useState<string>("all");

  const { data: recommendations, isLoading, error } = useQuery<Recommendation[]>({
    queryKey: ["/api/recommendations"],
    enabled: !!user,
  });

  const uniqueLocations = useMemo(() => {
    if (!recommendations) return [];
    const locs = Array.from(
      new Set(recommendations.map((r) => r.location?.trim()).filter(Boolean))
    ) as string[];
    return locs.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
  }, [recommendations]);

  const sortedRecommendations = useMemo(() => {
    if (!recommendations) return [];
    return [...recommendations].sort((left, right) => {
      const locationComparison = (left.location || "").localeCompare(right.location || "", undefined, { sensitivity: "base" });
      if (locationComparison !== 0) {
        return locationComparison;
      }
      return left.title.localeCompare(right.title, undefined, { sensitivity: "base" });
    });
  }, [recommendations]);

  const filteredRecommendations = useMemo(() => {
    return sortedRecommendations.filter((r) => {
      const typeMatch = filterType === "all" || r.type === filterType;
      const locationMatch = filterLocation === "all" || (r.location?.trim() || "") === filterLocation;
      return typeMatch && locationMatch;
    });
  }, [sortedRecommendations, filterType, filterLocation]);

  const hasActiveFilters = filterType !== "all" || filterLocation !== "all";

  const uploadPhotoMutation = useMutation({
    mutationFn: async ({ recommendationId, file }: { recommendationId: number; file: File }) => {
      const formData = new FormData();
      formData.append("photo", file);
      formData.append("title", "Recommendation photo");
      formData.append("description", "");
      formData.append("uploadedBy", user?.fullName || "Member");

      const res = await fetch(`/api/recommendations/${recommendationId}/photos`, {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      if (!res.ok) {
        throw new Error(await res.text());
      }

      return res.json();
    },
    onSuccess: (_created, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/recommendations", String(variables.recommendationId)] });
      toast({ title: "Photo uploaded" });
    },
    onError: (err: Error) => {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    },
    onSettled: () => {
      setUploadingRecommendationId(null);
    },
  });

  const handlePhotoSelected = (recommendationId: number, file: File | null) => {
    if (!file) return;
    setUploadingRecommendationId(recommendationId);
    uploadPhotoMutation.mutate({ recommendationId, file });
  };

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-full py-20 text-center px-6">
        <div className="rounded-full bg-primary/10 p-4 mb-4">
          <LogIn className="h-8 w-8 text-primary" />
        </div>
        <h3 className="text-lg font-semibold text-foreground mb-1">Log in to view recommendations</h3>
        <p className="text-sm text-muted-foreground max-w-sm mb-4">
          Registered users can browse local recommendations, while editors and admins can add new ones.
        </p>
        <Button asChild>
          <Link href="/auth">Log In</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-full">
      <div className="p-6 pb-0">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-foreground" data-testid="text-recommendations-title">Local Recommendations</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {hasActiveFilters
                ? `Showing ${filteredRecommendations.length} of ${sortedRecommendations.length} recommendations`
                : "Browse by area. Cards are sorted by location, then title."}
            </p>
          </div>
          {canEdit && (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary">
                <Shield className="h-3.5 w-3.5" />
                Editors can add and edit
              </div>
              <Button asChild data-testid="button-open-add-recommendation-page">
                <Link href="/recommendations/new">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Recommendation
                </Link>
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Filter bar */}
      <div className="px-6 pb-0 pt-4">
        <div className="flex flex-wrap items-center gap-3">
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-44" data-testid="select-filter-type">
              <SelectValue placeholder="All types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              {recommendationTypeValues.map((t) => (
                <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filterLocation} onValueChange={setFilterLocation}>
            <SelectTrigger className="w-48" data-testid="select-filter-location">
              <SelectValue placeholder="All locations" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All locations</SelectItem>
              {uniqueLocations.map((loc) => (
                <SelectItem key={loc} value={loc}>{loc}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { setFilterType("all"); setFilterLocation("all"); }}
              data-testid="button-clear-filters"
            >
              <X className="mr-1 h-3.5 w-3.5" />
              Clear filters
            </Button>
          )}
        </div>
      </div>

      <div className="flex-1 p-6 space-y-6">
        {error ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="rounded-full bg-destructive/10 p-4 mb-4">
              <AlertCircle className="h-8 w-8 text-destructive" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-1">Failed to load recommendations</h3>
            <p className="text-sm text-muted-foreground max-w-sm">{(error as Error).message}</p>
          </div>
        ) : isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i}>
                <CardContent className="p-5 space-y-3">
                  <Skeleton className="h-5 w-1/2" />
                  <Skeleton className="h-3 w-1/3" />
                  <Skeleton className="h-16 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredRecommendations.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredRecommendations.map((recommendation) => (
              <Card
                key={recommendation.id}
                className="cursor-pointer hover-elevate"
                data-testid={`card-recommendation-${recommendation.id}`}
                onClick={() => navigate(`/recommendations/${recommendation.id}`)}
              >
                <CardContent className="p-5 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-2">
                      <h3 className="text-lg font-semibold text-foreground">{recommendation.title}</h3>
                      <Badge variant={getTypeVariant(recommendation.type)} className="no-default-hover-elevate no-default-active-elevate text-xs capitalize">
                        <Tag className="mr-1 h-3 w-3" />
                        {recommendation.type}
                      </Badge>
                    </div>
                    <MapPinned className="h-5 w-5 text-muted-foreground shrink-0" />
                  </div>
                  <p className="text-sm font-medium text-foreground inline-flex items-center gap-1">
                    <MapPinned className="h-4 w-4 text-primary" />
                    {recommendation.location || "Unspecified"}
                  </p>
                  <p className="text-sm text-muted-foreground line-clamp-3">{recommendation.description}</p>
                  {recommendation.createdByName && (
                    <p className="text-xs text-muted-foreground">Posted by {recommendation.createdByName}</p>
                  )}
                  {canUpload && (
                    <div
                      className="pt-1"
                      onClick={(event) => event.stopPropagation()}
                    >
                      <Input
                        id={`upload-recommendation-photo-${recommendation.id}`}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(event) => {
                          handlePhotoSelected(recommendation.id, event.target.files?.[0] ?? null);
                          event.currentTarget.value = "";
                        }}
                        disabled={uploadPhotoMutation.isPending}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => document.getElementById(`upload-recommendation-photo-${recommendation.id}`)?.click()}
                        disabled={uploadPhotoMutation.isPending}
                        data-testid={`button-upload-recommendation-photo-${recommendation.id}`}
                      >
                        {uploadPhotoMutation.isPending && uploadingRecommendationId === recommendation.id ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Upload className="mr-2 h-4 w-4" />
                        )}
                        Upload Photo
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="rounded-full bg-primary/10 p-4 mb-4">
              <MapPinned className="h-8 w-8 text-primary" />
            </div>
            {hasActiveFilters ? (
              <>
                <h3 className="text-lg font-semibold text-foreground mb-1">No matches found</h3>
                <p className="text-sm text-muted-foreground max-w-sm mb-4">Try adjusting your filters.</p>
                <Button variant="outline" size="sm" onClick={() => { setFilterType("all"); setFilterLocation("all"); }}>
                  <X className="mr-1 h-3.5 w-3.5" /> Clear filters
                </Button>
              </>
            ) : (
              <>
                <h3 className="text-lg font-semibold text-foreground mb-1">No recommendations yet</h3>
                <p className="text-sm text-muted-foreground max-w-sm">Check back soon for favorite spots around Maui.</p>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
