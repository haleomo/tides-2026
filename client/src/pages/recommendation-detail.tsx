import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Calendar, Camera, Edit3, ImagePlus, Loader2, MapPinned, MessageCircle, Plus, Shield, Tag, Trash2, Upload } from "lucide-react";
import type { Photo, Recommendation, RecommendationComment } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";

const recommendationTypes = ["restaurant", "coffee shop", "activity", "shopping", "drive", "hike", "beach", "foods", "attraction", "park"] as const;

const editSchema = z.object({
  title: z.string().min(1, "Title is required"),
  location: z.string().min(1, "Location is required"),
  description: z.string().min(1, "Description is required"),
  type: z.enum(recommendationTypes),
});

type EditValues = z.infer<typeof editSchema>;

const commentSchema = z.object({
  content: z.string().min(1, "Comment is required"),
});

type CommentValues = z.infer<typeof commentSchema>;

interface RecommendationDetailPayload extends Recommendation {
  comments: RecommendationComment[];
  photos: Photo[];
}

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

export default function RecommendationDetailPage() {
  const [, params] = useRoute("/recommendations/:id");
  const recommendationId = params?.id ? Number(params.id) : NaN;
  const { user } = useAuth();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoTitle, setPhotoTitle] = useState("");
  const [photoDescription, setPhotoDescription] = useState("");

  const { data: recommendation, isLoading, error } = useQuery<RecommendationDetailPayload>({
    queryKey: ["/api/recommendations", String(recommendationId)],
    enabled: Number.isFinite(recommendationId) && !!user,
  });

  const canEdit = !!user && !!recommendation && (user.role === "admin" || user.role === "editor" || recommendation.createdByUserId === user.id);
  const canComment = !!user && ["admin", "editor", "contributor"].includes(user.role);
  const canUpload = canComment;
  const canDeletePhotos = !!user && ["admin", "editor"].includes(user.role);

  const editForm = useForm<EditValues>({
    resolver: zodResolver(editSchema),
    defaultValues: { title: "", location: "", description: "", type: "restaurant" },
  });

  const commentForm = useForm<CommentValues>({
    resolver: zodResolver(commentSchema),
    defaultValues: { content: "" },
  });

  useEffect(() => {
    if (!recommendation) return;
    editForm.reset({
      title: recommendation.title,
      location: recommendation.location || "",
      description: recommendation.description,
      type: recommendation.type as typeof recommendationTypes[number],
    });
    setPhotoTitle(recommendation.title);
  }, [recommendation, editForm]);

  const updateMutation = useMutation({
    mutationFn: async (values: EditValues) => {
      const res = await apiRequest("PATCH", `/api/recommendations/${recommendationId}`, {
        title: values.title,
        location: values.location,
        description: values.description,
        type: values.type,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/recommendations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/recommendations", String(recommendationId)] });
      setIsEditing(false);
      toast({ title: "Recommendation updated" });
    },
    onError: (err: Error) => {
      toast({ title: "Update failed", description: err.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("DELETE", `/api/recommendations/${recommendationId}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/recommendations"] });
      toast({ title: "Recommendation deleted" });
    },
    onError: (err: Error) => {
      toast({ title: "Delete failed", description: err.message, variant: "destructive" });
    },
  });

  const commentMutation = useMutation({
    mutationFn: async (values: CommentValues) => {
      const res = await apiRequest("POST", `/api/recommendations/${recommendationId}/comments`, values);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/recommendations", String(recommendationId)] });
      commentForm.reset({ content: "" });
      toast({ title: "Comment added" });
    },
    onError: (err: Error) => {
      toast({ title: "Comment failed", description: err.message, variant: "destructive" });
    },
  });

  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!photoFile) {
        throw new Error("No file selected");
      }

      const formData = new FormData();
      formData.append("photo", photoFile);
      formData.append("title", photoTitle.trim() || recommendation?.title || "Recommendation photo");
      formData.append("description", photoDescription.trim());
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/recommendations", String(recommendationId)] });
      setPhotoFile(null);
      setPhotoDescription("");
      toast({ title: "Photo uploaded" });
    },
    onError: (err: Error) => {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    },
  });

  const deletePhotoMutation = useMutation({
    mutationFn: async (photoId: number) => {
      const res = await apiRequest("DELETE", `/api/recommendations/${recommendationId}/photos/${photoId}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/recommendations", String(recommendationId)] });
      toast({ title: "Photo deleted" });
    },
    onError: (err: Error) => {
      toast({ title: "Delete failed", description: err.message, variant: "destructive" });
    },
  });

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-full py-20 text-center px-6">
        <div className="rounded-full bg-primary/10 p-4 mb-4">
          <Shield className="h-8 w-8 text-primary" />
        </div>
        <h3 className="text-lg font-semibold text-foreground mb-1">Log in to view recommendations</h3>
        <p className="text-sm text-muted-foreground max-w-sm mb-4">Registered users can view local recommendations.</p>
        <Button asChild>
          <Link href="/auth">Log In</Link>
        </Button>
      </div>
    );
  }

  if (!Number.isFinite(recommendationId)) {
    return <div className="p-6">Invalid recommendation.</div>;
  }

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-10 w-52" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error || !recommendation) {
    return (
      <div className="p-6 space-y-4">
        <Link href="/recommendations" className="inline-flex items-center text-sm text-primary">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Recommendations
        </Link>
        <p className="text-sm text-muted-foreground">Unable to load this recommendation.</p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6">
      <div className="space-y-3">
        <Link href="/recommendations" className="inline-flex items-center text-sm text-primary">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Recommendations
        </Link>
        <div className="rounded-3xl border bg-gradient-to-br from-primary/10 via-background to-sky-100/50 p-6 md:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-3 max-w-3xl">
              <Badge variant={getTypeVariant(recommendation.type)} className="text-xs capitalize">
                <Tag className="mr-1 h-3 w-3" />
                {recommendation.type}
              </Badge>
              <h1 className="text-3xl font-bold text-foreground">{recommendation.title}</h1>
              <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-2">
                  <MapPinned className="h-4 w-4" />
                  {recommendation.location || "Unspecified"}
                </span>
                <span className="inline-flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  {new Date(recommendation.createdAt).toLocaleString()}
                </span>
                {recommendation.createdByName && <span>Posted by {recommendation.createdByName}</span>}
              </div>
            </div>
            {canEdit && (
              <div className="flex items-center gap-2">
                <Button variant={isEditing ? "outline" : "default"} onClick={() => setIsEditing((value) => !value)} data-testid="button-toggle-edit-recommendation">
                  <Edit3 className="mr-2 h-4 w-4" />
                  {isEditing ? "Cancel Edit" : "Edit"}
                </Button>
                <Button variant="destructive" onClick={() => deleteMutation.mutate()} data-testid="button-delete-recommendation">
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {isEditing && canEdit && (
        <Card>
          <CardHeader>
            <CardTitle>Edit Recommendation</CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...editForm}>
              <form onSubmit={editForm.handleSubmit((values) => updateMutation.mutate(values))} className="space-y-4">
                <FormField
                  control={editForm.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Title</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="input-edit-recommendation-title" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="location"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Location</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="input-edit-recommendation-location" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea {...field} className="min-h-32" data-testid="input-edit-recommendation-description" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Type</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-edit-recommendation-type">
                            <SelectValue placeholder="Pick a type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {recommendationTypes.map((type) => (
                            <SelectItem key={type} value={type}>{type}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex gap-2">
                  <Button type="submit" disabled={updateMutation.isPending} data-testid="button-save-recommendation">
                    {updateMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Save Changes
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setIsEditing(false)}>
                    Cancel
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Description</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="whitespace-pre-wrap text-sm leading-7 text-muted-foreground">{recommendation.description}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-primary" />
            User Comments
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {canComment ? (
            <Form {...commentForm}>
              <form onSubmit={commentForm.handleSubmit((values) => commentMutation.mutate(values))} className="space-y-3">
                <FormField
                  control={commentForm.control}
                  name="content"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Textarea {...field} placeholder="Add a comment..." className="min-h-24" data-testid="input-recommendation-comment" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" disabled={commentMutation.isPending} data-testid="button-add-comment">
                  {commentMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                  Add Comment
                </Button>
              </form>
            </Form>
          ) : (
            <p className="text-sm text-muted-foreground">Only contributors, editors, and admins can add comments.</p>
          )}

          {recommendation.comments.length > 0 ? (
            <div className="space-y-3">
              {recommendation.comments.map((comment) => (
                <div key={comment.id} className="rounded-2xl border p-4">
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <span className="font-medium text-foreground">{comment.authorName}</span>
                    <span className="text-xs text-muted-foreground">{new Date(comment.createdAt).toLocaleString()}</span>
                  </div>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{comment.content}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No comments yet.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ImagePlus className="h-5 w-5 text-primary" />
            Photos
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {canUpload ? (
            <div className="space-y-4 rounded-2xl border border-dashed bg-muted/30 p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input value={photoTitle} onChange={(e) => setPhotoTitle(e.target.value)} placeholder="Photo title" data-testid="input-recommendation-photo-title" />
                <Input type="file" accept="image/*" onChange={(e) => setPhotoFile(e.target.files?.[0] ?? null)} data-testid="input-recommendation-photo-file" />
              </div>
              <Textarea value={photoDescription} onChange={(e) => setPhotoDescription(e.target.value)} placeholder="Optional caption" data-testid="input-recommendation-photo-description" />
              <Button onClick={() => uploadMutation.mutate()} disabled={uploadMutation.isPending || !photoFile} data-testid="button-upload-recommendation-photo">
                {uploadMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                Upload Photo
              </Button>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Only contributors, editors, and admins can upload photos.</p>
          )}

          {recommendation.photos.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {recommendation.photos.map((photo) => (
                <Card key={photo.id} className="overflow-hidden">
                  <img src={photo.imageUrl} alt={photo.title} className="h-52 w-full object-cover" />
                  <CardContent className="p-4 space-y-1">
                    <p className="font-medium text-foreground">{photo.title}</p>
                    {photo.description && <p className="text-sm text-muted-foreground">{photo.description}</p>}
                    <p className="text-xs text-muted-foreground">Uploaded by {photo.uploadedBy}</p>
                    {canDeletePhotos && (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => deletePhotoMutation.mutate(photo.id)}
                        disabled={deletePhotoMutation.isPending}
                        data-testid={`button-delete-recommendation-photo-${photo.id}`}
                      >
                        {deletePhotoMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                        Delete Photo
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No photos uploaded yet.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
