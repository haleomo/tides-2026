import { useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ArrowLeft, Calendar, ImagePlus, Loader2, MapPin, Tag, Upload } from "lucide-react";
import { Link, useRoute } from "wouter";
import type { Event, Photo } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth";

interface EventWithPhotos extends Event {
  photos: Photo[];
}

function getCategoryVariant(category: string): "default" | "secondary" | "destructive" {
  switch (category) {
    case "deadline":
      return "destructive";
    case "social":
    case "activity":
    default:
      return "secondary";
  }
}

export default function EventDetail() {
  const [, params] = useRoute("/events/:id");
  const eventId = params?.id ? Number(params.id) : NaN;
  const { toast } = useToast();
  const { user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [location, setLocation] = useState("");
  const [category, setCategory] = useState("general");
  const [photoTitle, setPhotoTitle] = useState("");
  const [photoDescription, setPhotoDescription] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);

  const { data: event, isLoading, error } = useQuery<EventWithPhotos>({
    queryKey: ["/api/events", String(eventId)],
    enabled: Number.isFinite(eventId),
  });

  useEffect(() => {
    if (!event) {
      return;
    }

    setTitle(event.title);
    setDescription(event.description ?? "");
    setEventDate(new Date(event.eventDate).toISOString().slice(0, 16));
    setLocation(event.location ?? "");
    setCategory(event.category);
    setPhotoTitle(`${event.title} photo`);
  }, [event]);

  const canEdit = !!user && !!event && (
    user.role === "admin" ||
    user.role === "editor" ||
    user.id === event.createdByUserId
  );
  const canUploadPhotos = !!user;

  const updateMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("PATCH", `/api/events/${eventId}`, {
        title: title.trim(),
        description: description.trim() || null,
        eventDate: new Date(eventDate).toISOString(),
        location: location.trim() || null,
        category,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      queryClient.invalidateQueries({ queryKey: ["/api/events", String(eventId)] });
      setIsEditing(false);
      toast({ title: "Event updated" });
    },
    onError: (err: Error) => {
      toast({ title: "Update failed", description: err.message, variant: "destructive" });
    },
  });

  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!photoFile) {
        throw new Error("No file selected");
      }

      const formData = new FormData();
      formData.append("photo", photoFile);
      formData.append("title", photoTitle.trim() || `${event?.title ?? "Event"} photo`);
      formData.append("description", photoDescription.trim());
      formData.append("uploadedBy", user?.fullName || "Event attendee");

      const res = await fetch(`/api/events/${eventId}/photos`, {
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
      queryClient.invalidateQueries({ queryKey: ["/api/events", String(eventId)] });
      setPhotoDescription("");
      setPhotoFile(null);
      toast({ title: "Photo uploaded" });
    },
    onError: (err: Error) => {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    },
  });

  if (!Number.isFinite(eventId)) {
    return (
      <div className="p-6">
        <p className="text-sm text-muted-foreground">Invalid event.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-10 w-40" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="p-6 space-y-4">
        <Link href="/events" className="inline-flex items-center text-sm text-primary">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Events
        </Link>
        <p className="text-sm text-muted-foreground">Unable to load this event.</p>
      </div>
    );
  }

  const formattedDate = new Date(event.eventDate);

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6">
      <div className="space-y-3">
        <Link href="/events" className="inline-flex items-center text-sm text-primary">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Events
        </Link>
        <div className="rounded-3xl border bg-gradient-to-br from-primary/10 via-background to-sky-100/50 p-6 md:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-3 max-w-3xl">
              <Badge variant={getCategoryVariant(event.category)} className="text-xs">
                <Tag className="mr-1 h-3 w-3" />
                {event.category}
              </Badge>
              <h1 className="text-3xl font-bold text-foreground">{event.title}</h1>
              <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  {formattedDate.toLocaleString("en-US", {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </span>
                {event.location && (
                  <span className="inline-flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    {event.location}
                  </span>
                )}
              </div>
              {event.createdByName && (
                <p className="text-sm text-muted-foreground">Posted by {event.createdByName}</p>
              )}
            </div>
            {canEdit && (
              <Button variant={isEditing ? "outline" : "default"} onClick={() => setIsEditing((value) => !value)} data-testid="button-toggle-edit-event">
                {isEditing ? "Cancel Edit" : "Edit Event"}
              </Button>
            )}
          </div>
        </div>
      </div>

      {isEditing && canEdit && (
        <Card>
          <CardHeader>
            <CardTitle>Edit Event</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Event title" data-testid="input-edit-event-title" />
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Event details" className="min-h-32" data-testid="input-edit-event-description" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input type="datetime-local" value={eventDate} onChange={(e) => setEventDate(e.target.value)} data-testid="input-edit-event-date" />
              <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Location" data-testid="input-edit-event-location" />
            </div>
            <div className="flex flex-wrap gap-2">
              {["general", "social", "activity", "deadline"].map((value) => (
                <Button key={value} type="button" variant={category === value ? "default" : "outline"} onClick={() => setCategory(value)} data-testid={`button-edit-category-${value}`}>
                  {value}
                </Button>
              ))}
            </div>
            <div className="flex gap-2">
              <Button onClick={() => updateMutation.mutate()} disabled={updateMutation.isPending || !title.trim() || !eventDate} data-testid="button-save-event">
                {updateMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Save Changes
              </Button>
              <Button variant="outline" onClick={() => setIsEditing(false)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>About This Event</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-base leading-7 text-muted-foreground whitespace-pre-wrap">
            {event.description || "No additional event details have been posted yet."}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Event Photos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {canUploadPhotos ? (
            <div className="rounded-2xl border border-dashed p-4 space-y-4 bg-muted/30">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                <ImagePlus className="h-4 w-4 text-primary" />
                Upload a photo for this event
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input value={photoTitle} onChange={(e) => setPhotoTitle(e.target.value)} placeholder="Photo title" data-testid="input-event-photo-title" />
                <Input type="file" accept="image/*" onChange={(e) => setPhotoFile(e.target.files?.[0] ?? null)} data-testid="input-event-photo-file" />
              </div>
              <Textarea value={photoDescription} onChange={(e) => setPhotoDescription(e.target.value)} placeholder="Optional caption" data-testid="input-event-photo-description" />
              <Button onClick={() => uploadMutation.mutate()} disabled={uploadMutation.isPending || !photoFile} data-testid="button-upload-event-photo">
                {uploadMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                Upload Photo
              </Button>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Log in to upload photos for this event.</p>
          )}

          {event.photos.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {event.photos.map((photo) => (
                <Card key={photo.id} className="overflow-hidden">
                  <img src={photo.imageUrl} alt={photo.title} className="h-52 w-full object-cover" />
                  <CardContent className="p-4 space-y-1">
                    <p className="font-medium text-foreground">{photo.title}</p>
                    {photo.description && <p className="text-sm text-muted-foreground">{photo.description}</p>}
                    <p className="text-xs text-muted-foreground">Uploaded by {photo.uploadedBy}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No photos uploaded for this event yet.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
