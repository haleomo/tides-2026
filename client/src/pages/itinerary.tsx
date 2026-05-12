import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Markdown from "react-markdown";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ChevronUp, ChevronDown, Trash2, Edit2, Plus } from "lucide-react";

interface Itinerary {
  id: number;
  day: number;
  date: string;
  content: string;
  position: number;
  createdAt: string;
}

const itineraryFormSchema = z.object({
  day: z.number().int().positive("Day must be a positive number"),
  date: z.string().min(1, "Date is required"),
  content: z.string().min(1, "Content is required"),
  position: z.number().int().nonnegative(),
});

type ItineraryFormData = z.infer<typeof itineraryFormSchema>;

export default function Itinerary() {
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingContent, setEditingContent] = useState("");
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  const form = useForm<ItineraryFormData>({
    resolver: zodResolver(itineraryFormSchema),
    defaultValues: {
      day: 1,
      date: "",
      content: "",
      position: 0,
    },
  });

  // Fetch itineraries
  const { data: itineraries = [], isLoading } = useQuery({
    queryKey: ["itineraries"],
    queryFn: async () => {
      const res = await fetch("/api/itineraries");
      if (!res.ok) throw new Error("Failed to fetch itineraries");
      return res.json() as Promise<Itinerary[]>;
    },
    refetchInterval: 5000,
  });

  // Create itinerary
  const createMutation = useMutation({
    mutationFn: async (data: ItineraryFormData) => {
      const position = itineraries.length > 0 ? Math.max(...itineraries.map(i => i.position)) + 1 : 0;
      const res = await fetch("/api/itineraries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, position }),
      });
      if (!res.ok) throw new Error("Failed to create itinerary");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["itineraries"] });
      form.reset();
      setIsOpen(false);
    },
  });

  // Update itinerary
  const updateMutation = useMutation({
    mutationFn: async ({ id, content }: { id: number; content: string }) => {
      const res = await fetch(`/api/itineraries/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      if (!res.ok) throw new Error("Failed to update itinerary");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["itineraries"] });
      setEditingId(null);
      setIsEditDialogOpen(false);
    },
  });

  // Reorder itinerary (move up/down)
  const reorderMutation = useMutation({
    mutationFn: async ({ id, newPosition }: { id: number; newPosition: number }) => {
      const res = await fetch(`/api/itineraries/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ position: newPosition }),
      });
      if (!res.ok) throw new Error("Failed to reorder itinerary");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["itineraries"] });
    },
  });

  // Delete itinerary
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/itineraries/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete itinerary");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["itineraries"] });
    },
  });

  const handleMoveUp = (id: number, currentPosition: number) => {
    if (currentPosition > 0) {
      reorderMutation.mutate({ id, newPosition: currentPosition - 1 });
    }
  };

  const handleMoveDown = (id: number, currentPosition: number) => {
    if (currentPosition < itineraries.length - 1) {
      reorderMutation.mutate({ id, newPosition: currentPosition + 1 });
    }
  };

  const handleEditClick = (id: number, content: string) => {
    setEditingId(id);
    setEditingContent(content);
    setIsEditDialogOpen(true);
  };

  const handleSaveEdit = () => {
    if (editingId !== null) {
      updateMutation.mutate({ id: editingId, content: editingContent });
    }
  };

  const onSubmit = (data: ItineraryFormData) => {
    createMutation.mutate(data);
  };

  if (isLoading) {
    return <div className="p-8">Loading itinerary...</div>;
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Trip Itinerary</h1>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add Day
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Add New Day</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="day"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Day Number</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="1"
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date</FormLabel>
                      <FormControl>
                        <Input type="date" placeholder="2026-05-15" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="content"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Content (Markdown)</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Write your itinerary for this day. Supports **bold**, *italic*, # Heading, etc."
                          rows={6}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full" disabled={createMutation.isPending}>
                  {createMutation.isPending ? "Creating..." : "Create Day"}
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-4">
        {itineraries.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <p className="text-center text-muted-foreground">No itinerary items yet. Add the first day!</p>
            </CardContent>
          </Card>
        ) : (
          itineraries.map((item, index) => (
            <Card key={item.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-xl mb-1">Day {item.day}</CardTitle>
                    <p className="text-sm text-muted-foreground">{item.date}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleMoveUp(item.id, index)}
                      disabled={index === 0}
                      title="Move up"
                    >
                      <ChevronUp className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleMoveDown(item.id, index)}
                      disabled={index === itineraries.length - 1}
                      title="Move down"
                    >
                      <ChevronDown className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditClick(item.id, item.content)}
                      title="Edit"
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => deleteMutation.mutate(item.id)}
                      disabled={deleteMutation.isPending}
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <Markdown>{item.content}</Markdown>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Day {editingId ? itineraries.find(i => i.id === editingId)?.day : ""}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Content (Markdown)</label>
              <Textarea
                value={editingContent}
                onChange={(e) => setEditingContent(e.target.value)}
                rows={8}
                placeholder="Edit your itinerary content here..."
                className="mt-2"
              />
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handleSaveEdit}
                disabled={updateMutation.isPending}
                className="flex-1"
              >
                {updateMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
              <Button
                variant="outline"
                onClick={() => setIsEditDialogOpen(false)}
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
