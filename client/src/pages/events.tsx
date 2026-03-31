import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Calendar, MapPin, Clock, Tag, AlertCircle, Trash2, Plus, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth";
import type { Event } from "@shared/schema";

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

function isUpcoming(date: string | Date) {
  return new Date(date) >= new Date();
}

export default function Events() {
  const { toast } = useToast();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin" || user?.role === "root";
  const canAddEvents = isAdmin || user?.role === "editor";
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [location, setLocation] = useState("");
  const [category, setCategory] = useState("general");

  const { data: events, isLoading, error } = useQuery<Event[]>({
    queryKey: ["/api/events"],
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/events/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      toast({ title: "Event deleted" });
    },
    onError: (err: Error) => {
      toast({ title: "Delete failed", description: err.message, variant: "destructive" });
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: { title: string; description?: string; eventDate: string; location?: string; category: string }) => {
      const res = await apiRequest("POST", "/api/events", {
        title: data.title,
        description: data.description || null,
        eventDate: new Date(data.eventDate).toISOString(),
        location: data.location || null,
        category: data.category,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      toast({ title: "Event added" });
      setTitle("");
      setDescription("");
      setEventDate("");
      setLocation("");
      setCategory("general");
      setShowForm(false);
    },
    onError: (err: Error) => {
      toast({ title: "Failed to add event", description: err.message, variant: "destructive" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !eventDate) return;
    createMutation.mutate({ title: title.trim(), description: description.trim(), eventDate, location: location.trim(), category });
  };

  const sortedEvents = events?.slice().sort(
    (a, b) => new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime()
  );

  const upcoming = sortedEvents?.filter((e) => isUpcoming(e.eventDate)) || [];
  const past = sortedEvents?.filter((e) => !isUpcoming(e.eventDate)) || [];

  return (
    <div className="flex flex-col min-h-full">
      <div className="p-6 pb-0">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-foreground" data-testid="text-events-title">Trip Events</h1>
            <p className="text-sm text-muted-foreground mt-1">Plans, meetups, and key dates for Maui</p>
          </div>
          {canAddEvents && !showForm && (
            <Button onClick={() => setShowForm(true)} data-testid="button-add-event">
              <Plus className="h-4 w-4 mr-1" />
              New Event
            </Button>
          )}
        </div>
      </div>

      <div className="flex-1 p-6 space-y-8">
        {showForm && canAddEvents && (
          <Card>
            <CardContent className="p-4">
              <h3 className="font-semibold text-foreground mb-3">Add Event</h3>
              <form onSubmit={handleSubmit} className="space-y-3">
                <Input
                  placeholder="Event name"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  data-testid="input-event-title"
                />
                <Input
                  placeholder="Quick details (optional)"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  data-testid="input-event-description"
                />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Input
                    type="datetime-local"
                    value={eventDate}
                    onChange={(e) => setEventDate(e.target.value)}
                    required
                    data-testid="input-event-date"
                  />
                  <Input
                    placeholder="Location (optional)"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    data-testid="input-event-location"
                  />
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm text-muted-foreground">Tag:</span>
                  {["general", "social", "activity", "deadline"].map((cat) => (
                    <Button
                      key={cat}
                      type="button"
                      size="sm"
                      variant={category === cat ? "default" : "outline"}
                      onClick={() => setCategory(cat)}
                      data-testid={`button-category-${cat}`}
                    >
                      {cat}
                    </Button>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <Button type="submit" disabled={createMutation.isPending || !title.trim() || !eventDate} data-testid="button-submit-event">
                    {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                    Post Event
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setShowForm(false)} data-testid="button-cancel-event">
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {error ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="rounded-full bg-destructive/10 p-4 mb-4">
              <AlertCircle className="h-8 w-8 text-destructive" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-1">Failed to load events</h3>
            <p className="text-sm text-muted-foreground max-w-sm">{error.message}</p>
          </div>
        ) : isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <div className="flex gap-4">
                    <Skeleton className="h-14 w-14 rounded-md shrink-0" />
                    <div className="flex-1">
                      <Skeleton className="h-4 w-48 mb-2" />
                      <Skeleton className="h-3 w-full mb-2" />
                      <Skeleton className="h-3 w-32" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : events && events.length > 0 ? (
          <>
            {upcoming.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                  <Clock className="h-4 w-4 text-primary" />
                  Coming Up
                </h2>
                <div className="space-y-3">
                  {upcoming.map((event) => (
                    <EventCard key={event.id} event={event} isAdmin={isAdmin} onDelete={(id) => deleteMutation.mutate(id)} isDeleting={deleteMutation.isPending} />
                  ))}
                </div>
              </div>
            )}
            {past.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold text-muted-foreground mb-4">Past Plans</h2>
                <div className="space-y-3 opacity-70">
                  {past.map((event) => (
                    <EventCard key={event.id} event={event} isAdmin={isAdmin} onDelete={(id) => deleteMutation.mutate(id)} isDeleting={deleteMutation.isPending} />
                  ))}
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="rounded-full bg-primary/10 p-4 mb-4">
              <Calendar className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-1">Nothing on deck yet</h3>
            <p className="text-sm text-muted-foreground max-w-sm">
              New plans and key dates will show up here.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function EventCard({ event, isAdmin, onDelete, isDeleting }: { event: Event; isAdmin: boolean; onDelete: (id: number) => void; isDeleting: boolean }) {
  const date = new Date(event.eventDate);
  const month = date.toLocaleString("default", { month: "short" }).toUpperCase();
  const day = date.getDate();

  return (
    <Card data-testid={`card-event-${event.id}`}>
      <CardContent className="p-4">
        <div className="flex gap-4">
          <div className="flex flex-col items-center justify-center bg-primary/10 rounded-md w-14 h-14 shrink-0">
            <span className="text-xs font-bold text-primary leading-none">{month}</span>
            <span className="text-xl font-bold text-primary leading-tight">{day}</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 flex-wrap">
              <h3 className="font-semibold text-foreground" data-testid={`text-event-title-${event.id}`}>{event.title}</h3>
              <div className="flex items-center gap-2 shrink-0">
                <Badge variant={getCategoryVariant(event.category)} className="no-default-hover-elevate no-default-active-elevate text-xs">
                  <Tag className="h-3 w-3 mr-1" />
                  {event.category}
                </Badge>
                {isAdmin && (
                  <Button
                    size="icon"
                    variant="ghost"
                    className="text-destructive"
                    onClick={() => onDelete(event.id)}
                    disabled={isDeleting}
                    data-testid={`button-delete-event-${event.id}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
            {event.description && (
              <p className="text-sm text-muted-foreground mt-1" data-testid={`text-event-desc-${event.id}`}>{event.description}</p>
            )}
            <div className="flex flex-wrap items-center gap-4 mt-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {date.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
              </span>
              {event.location && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {event.location}
                </span>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
