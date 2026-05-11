import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ArrowLeft, Loader2, MapPinned, Save, Shield } from "lucide-react";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { Link, useLocation, useRoute } from "wouter";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Recommendation } from "@shared/schema";

const recommendationTypes = ["restaurant", "coffee shop", "activity", "shopping", "drive", "hike", "beach", "foods", "attraction", "park"] as const;

const formSchema = z.object({
title: z.string().min(1, "Title is required"),
location: z.string().min(1, "Location is required"),
description: z.string().min(1, "Description is required"),
type: z.enum(recommendationTypes),
});

type FormValues = z.infer<typeof formSchema>;

export default function RecommendationFormPage() {
const { user } = useAuth();
const { toast } = useToast();
const [, navigate] = useLocation();

const [isNewRoute] = useRoute("/recommendations/new");
const [, editParams] = useRoute("/recommendations/:id/edit");

const recommendationId = !isNewRoute && editParams?.id ? Number(editParams.id) : NaN;
const isEditMode = Number.isFinite(recommendationId);
const canManage = !!user && ["admin", "editor"].includes(user.role);

const form = useForm<FormValues>({
resolver: zodResolver(formSchema),
defaultValues: {
    title: "",
    location: "",
    description: "",
    type: "restaurant",
},
});

const { data: existingRecommendation, isLoading: isLoadingExisting } = useQuery<Recommendation>({
queryKey: ["/api/recommendations", String(recommendationId)],
enabled: isEditMode && !!user,
select: (data: any) => data as Recommendation,
});

useEffect(() => {
if (!isEditMode || !existingRecommendation) {
    return;
}

form.reset({
    title: existingRecommendation.title,
    location: existingRecommendation.location || "",
    description: existingRecommendation.description,
    type: existingRecommendation.type as FormValues["type"],
});
}, [isEditMode, existingRecommendation, form]);

const saveMutation = useMutation({
mutationFn: async (values: FormValues) => {
    if (isEditMode) {
    const res = await apiRequest("PATCH", `/api/recommendations/${recommendationId}`, values);
    return res.json();
    }

    const res = await apiRequest("POST", "/api/recommendations", values);
    return res.json();
},
onSuccess: (saved: Recommendation) => {
    queryClient.invalidateQueries({ queryKey: ["/api/recommendations"] });
    queryClient.invalidateQueries({ queryKey: ["/api/recommendations", String(saved.id)] });
    toast({ title: isEditMode ? "Recommendation updated" : "Recommendation created" });
    navigate(`/recommendations/${saved.id}`);
},
onError: (err: Error) => {
    toast({ title: "Save failed", description: err.message, variant: "destructive" });
},
});

if (!user) {
return (
    <div className="p-6 max-w-3xl mx-auto">
    <Card>
        <CardHeader>
        <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Log in required
        </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">Please log in to manage recommendations.</p>
        <Button asChild>
            <Link href="/auth">Log In</Link>
        </Button>
        </CardContent>
    </Card>
    </div>
);
}

if (!canManage) {
return (
    <div className="p-6 max-w-3xl mx-auto">
    <Card>
        <CardHeader>
        <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Permission required
        </CardTitle>
        </CardHeader>
        <CardContent>
        <p className="text-sm text-muted-foreground">Only administrators and editors can add or edit recommendations.</p>
        </CardContent>
    </Card>
    </div>
);
}

if (isEditMode && isLoadingExisting) {
return (
    <div className="p-6 max-w-3xl mx-auto">
    <Card>
        <CardContent className="p-6">
        <div className="inline-flex items-center text-sm text-muted-foreground">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Loading recommendation...
        </div>
        </CardContent>
    </Card>
    </div>
);
}

return (
<div className="p-6 max-w-3xl mx-auto space-y-4">
    <Link href={isEditMode ? `/recommendations/${recommendationId}` : "/recommendations"} className="inline-flex items-center text-sm text-primary">
    <ArrowLeft className="mr-2 h-4 w-4" />
    {isEditMode ? "Back to Recommendation" : "Back to Recommendations"}
    </Link>

    <Card>
    <CardHeader>
        <CardTitle>{isEditMode ? "Edit Recommendation" : "Add Recommendation"}</CardTitle>
    </CardHeader>
    <CardContent>
        <Form {...form}>
        <form onSubmit={form.handleSubmit((values) => saveMutation.mutate(values))} className="space-y-4">
            <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Title</FormLabel>
                <FormControl>
                    <Input {...field} placeholder="Best tacos in town" data-testid="input-recommendation-form-title" />
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
                <FormLabel>Location</FormLabel>
                <FormControl>
                    <Input {...field} placeholder="Wailuku" data-testid="input-recommendation-form-location" />
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
            />

            <FormField
            control={form.control}
            name="type"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Type</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                    <SelectTrigger data-testid="select-recommendation-form-type">
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

            <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Description</FormLabel>
                <FormControl>
                    <Textarea {...field} className="min-h-32" placeholder="Why should people check it out?" data-testid="input-recommendation-form-description" />
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
            />

            <Button type="submit" disabled={saveMutation.isPending} data-testid="button-save-recommendation-form">
            {saveMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            {isEditMode ? "Save Changes" : "Create Recommendation"}
            </Button>
        </form>
        </Form>
    </CardContent>
    </Card>

    <p className="text-xs text-muted-foreground inline-flex items-center gap-1">
    <MapPinned className="h-3 w-3" />
    Recommendations are shown sorted by location, then title on the list page.
    </p>
</div>
);
}
