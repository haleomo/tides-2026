import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Camera, Upload, X, Loader2, AlertCircle, LogIn, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth";
import { Link } from "wouter";
import type { Photo } from "@shared/schema";

const uploadFormSchema = z.object({
  uploadedBy: z.string().min(1, "Your name is required"),
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
});

type UploadFormValues = z.infer<typeof uploadFormSchema>;

export default function Photos() {
  const { toast } = useToast();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const canPostPhotos = user ? ["admin", "editor", "contributor"].includes(user.role) : false;
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);

  const form = useForm<UploadFormValues>({
    resolver: zodResolver(uploadFormSchema),
    defaultValues: { uploadedBy: user?.fullName || "", title: "", description: "" },
  });

  const { data: photos, isLoading, error } = useQuery<Photo[]>({
    queryKey: ["/api/photos"],
  });

  const uploadMutation = useMutation({
    mutationFn: async (values: UploadFormValues) => {
      if (!file) throw new Error("No file selected");
      const formData = new FormData();
      formData.append("photo", file);
      formData.append("title", values.title);
      formData.append("description", values.description || "");
      formData.append("uploadedBy", values.uploadedBy);

      const res = await fetch("/api/photos", {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/photos"] });
      setOpen(false);
      form.reset();
      setFile(null);
      setPreview(null);
      toast({ title: "Photo uploaded successfully!" });
    },
    onError: (err: Error) => {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/photos/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/photos"] });
      setSelectedPhoto(null);
      toast({ title: "Photo deleted" });
    },
    onError: (err: Error) => {
      toast({ title: "Delete failed", description: err.message, variant: "destructive" });
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) {
      setFile(f);
      const reader = new FileReader();
      reader.onload = () => setPreview(reader.result as string);
      reader.readAsDataURL(f);
    }
  };

  const onSubmit = (values: UploadFormValues) => {
    if (!canPostPhotos) {
      toast({ title: "Permission denied", description: "Only contributors, editors, and admins can post photos.", variant: "destructive" });
      return;
    }
    if (!file) {
      toast({ title: "Please select a photo", variant: "destructive" });
      return;
    }
    uploadMutation.mutate(values);
  };

  return (
    <div className="flex flex-col min-h-full">
      <div className="flex flex-wrap items-center justify-between gap-3 p-6 pb-0">
        <div>
          <h1 className="text-2xl font-bold text-foreground" data-testid="text-photos-title">Photo Gallery</h1>
          <p className="text-sm text-muted-foreground mt-1">Drop your best pics and relive the moments</p>
        </div>
        {user && canPostPhotos ? (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-upload-photo">
                <Upload className="h-4 w-4 mr-2" />
                Post Photo
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Post a Photo</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="uploadedBy"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Your Name</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Name" data-testid="input-uploaded-by" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Title</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="e.g. Senior Prom 2026" data-testid="input-photo-title" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea
                            {...field}
                            placeholder="Tell us about this photo..."
                            className="resize-none"
                            data-testid="input-photo-description"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div>
                    <label className="text-sm font-medium text-foreground">Photo</label>
                    {preview ? (
                      <div className="relative mt-2">
                        <img src={preview} alt="Preview" className="w-full h-48 object-cover rounded-md" />
                        <Button
                          size="icon"
                          variant="secondary"
                          className="absolute top-2 right-2"
                          type="button"
                          onClick={() => { setFile(null); setPreview(null); }}
                          data-testid="button-remove-preview"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-border rounded-md cursor-pointer mt-2">
                        <Camera className="h-8 w-8 text-muted-foreground mb-2" />
                        <span className="text-sm text-muted-foreground">Click to choose a photo</span>
                        <input
                          type="file"
                          className="hidden"
                          accept="image/*"
                          onChange={handleFileChange}
                          data-testid="input-photo-file"
                        />
                      </label>
                    )}
                  </div>
                  <Button type="submit" className="w-full" disabled={uploadMutation.isPending} data-testid="button-submit-photo">
                    {uploadMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Upload className="h-4 w-4 mr-2" />}
                    {uploadMutation.isPending ? "Posting..." : "Post Photo"}
                  </Button>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        ) : user ? (
          <p className="text-sm text-muted-foreground" data-testid="text-no-photo-permission">
            Your role is view-only. Ask an admin for contributor access to post photos.
          </p>
        ) : (
          <Button asChild data-testid="button-login-to-upload">
            <Link href="/auth">
              <LogIn className="h-4 w-4 mr-2" />
              Log in to post
            </Link>
          </Button>
        )}
      </div>

      <div className="flex-1 p-6">
        {error ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="rounded-full bg-destructive/10 p-4 mb-4">
              <AlertCircle className="h-8 w-8 text-destructive" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-1">Failed to load photos</h3>
            <p className="text-sm text-muted-foreground max-w-sm">{error.message}</p>
          </div>
        ) : isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Card key={i}>
                <Skeleton className="h-48 w-full rounded-t-md" />
                <CardContent className="p-3">
                  <Skeleton className="h-4 w-3/4 mb-2" />
                  <Skeleton className="h-3 w-1/2" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : photos && photos.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {photos.map((photo) => (
              <Card
                key={photo.id}
                className="overflow-visible cursor-pointer hover-elevate"
                onClick={() => setSelectedPhoto(photo)}
                data-testid={`card-photo-${photo.id}`}
              >
                <div className="overflow-hidden rounded-t-md relative">
                  <img
                    src={photo.imageUrl}
                    alt={photo.title}
                    className="w-full h-48 object-cover"
                  />
                  {isAdmin && (
                    <Button
                      size="icon"
                      variant="destructive"
                      className="absolute top-2 right-2"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteMutation.mutate(photo.id);
                      }}
                      disabled={deleteMutation.isPending}
                      data-testid={`button-delete-photo-${photo.id}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                <CardContent className="p-3">
                  <h3 className="font-semibold text-sm text-foreground truncate">{photo.title}</h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    by {photo.uploadedBy} {new Date(photo.createdAt).toLocaleDateString()}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="rounded-full bg-primary/10 p-4 mb-4">
              <Camera className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-1">No photos yet</h3>
            <p className="text-sm text-muted-foreground mb-4 max-w-sm">
              Nothing posted yet. Be first and drop a fire memory.
            </p>
            {user && canPostPhotos ? (
              <Button onClick={() => setOpen(true)} data-testid="button-upload-first">
                <Upload className="h-4 w-4 mr-2" />
                Post First Photo
              </Button>
            ) : user ? (
              <p className="text-sm text-muted-foreground" data-testid="text-no-photo-permission-empty">
                Your role is view-only. Ask an admin for contributor access to post photos.
              </p>
            ) : (
              <Button asChild data-testid="button-login-to-upload-first">
                <Link href="/auth">
                  <LogIn className="h-4 w-4 mr-2" />
                  Log in to post photos
                </Link>
              </Button>
            )}
          </div>
        )}
      </div>

      <Dialog open={!!selectedPhoto} onOpenChange={() => setSelectedPhoto(null)}>
        <DialogContent className="sm:max-w-2xl">
          {selectedPhoto && (
            <>
              <DialogHeader>
                <DialogTitle>{selectedPhoto.title}</DialogTitle>
              </DialogHeader>
              <img
                src={selectedPhoto.imageUrl}
                alt={selectedPhoto.title}
                className="w-full max-h-[60vh] object-contain rounded-md"
                data-testid="img-photo-detail"
              />
              {selectedPhoto.description && (
                <p className="text-sm text-muted-foreground">{selectedPhoto.description}</p>
              )}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs text-muted-foreground">
                  Posted by {selectedPhoto.uploadedBy} on {new Date(selectedPhoto.createdAt).toLocaleDateString()}
                </p>
                {isAdmin && (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => deleteMutation.mutate(selectedPhoto.id)}
                    disabled={deleteMutation.isPending}
                    data-testid="button-delete-photo-detail"
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Delete
                  </Button>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
