import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { insertRsvpSchema, type Rsvp } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { UserCheck, Clock, MapPin, Car, Loader2 } from "lucide-react";

const rsvpFormSchema = insertRsvpSchema.extend({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Please enter a valid email").or(z.literal("")).optional().nullable(),
  status: z.string().min(1, "Please select your attendance status"),
});

type RsvpFormValues = z.infer<typeof rsvpFormSchema>;

const statusLabels: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  interested: { label: "Maybe", variant: "secondary" },
  attending: { label: "I am in", variant: "default" },
  unable: { label: "Can not make it", variant: "outline" },
};

const accommodationLabels: Record<string, string> = {
  own_place: "Have my own place",
  need_hotel: "Need hotel recommendation",
  sharing: "Sharing with another classmate",
  other: "Other",
};

const transportationLabels: Record<string, string> = {
  own_transport: "Have my own transportation",
  need_ride_airport: "Need ride from airport",
  need_ride_bus: "Need ride from bus station",
  need_ride_ferry: "Need ride from ferry terminal",
  other: "Other",
};

export default function Rsvp() {
  const { toast } = useToast();

  const { data: rsvps = [], isLoading } = useQuery<Rsvp[]>({
    queryKey: ["/api/rsvps"],
  });

  const form = useForm<RsvpFormValues>({
    resolver: zodResolver(rsvpFormSchema),
    defaultValues: {
      name: "",
      email: "",
      status: "",
      arrivalDate: "",
      departureDate: "",
      accommodation: "",
      transportation: "",
      notes: "",
    },
  });

  const mutation = useMutation({
    mutationFn: async (data: RsvpFormValues) => {
      const res = await apiRequest("POST", "/api/rsvps", {
        ...data,
        email: data.email || null,
        arrivalDate: data.arrivalDate || null,
        departureDate: data.departureDate || null,
        accommodation: data.accommodation || null,
        transportation: data.transportation || null,
        notes: data.notes || null,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/rsvps"] });
      form.reset();
      toast({
        title: "RSVP sent",
        description: "You are on the list.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  function onSubmit(data: RsvpFormValues) {
    mutation.mutate(data);
  }

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground" data-testid="text-rsvp-title">RSVP</h1>
        <p className="text-muted-foreground mt-1">
          Let the crew know if you are in and share your travel details.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserCheck className="h-5 w-5 text-primary" />
            Your RSVP
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Your Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter your name" {...field} data-testid="input-rsvp-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email (optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="your@email.com" {...field} value={field.value ?? ""} data-testid="input-rsvp-email" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Attendance Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-rsvp-status">
                          <SelectValue placeholder="Select your status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="interested">Maybe</SelectItem>
                        <SelectItem value="attending">I am in</SelectItem>
                        <SelectItem value="unable">Can not make it</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="arrivalDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Arrival Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} value={field.value ?? ""} data-testid="input-rsvp-arrival" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="departureDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Departure Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} value={field.value ?? ""} data-testid="input-rsvp-departure" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="accommodation"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Accommodation</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value ?? undefined}>
                      <FormControl>
                        <SelectTrigger data-testid="select-rsvp-accommodation">
                          <SelectValue placeholder="Pick your stay plan" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="own_place">Have my own place</SelectItem>
                        <SelectItem value="need_hotel">Need hotel recommendation</SelectItem>
                        <SelectItem value="sharing">Sharing with another classmate</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="transportation"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Transportation</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value ?? undefined}>
                      <FormControl>
                        <SelectTrigger data-testid="select-rsvp-transportation">
                          <SelectValue placeholder="Pick your ride plan" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="own_transport">Have my own transportation</SelectItem>
                        <SelectItem value="need_ride_airport">Need ride from airport</SelectItem>
                        <SelectItem value="need_ride_bus">Need ride from bus station</SelectItem>
                        <SelectItem value="need_ride_ferry">Need ride from ferry terminal</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Additional Notes (optional)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Anything else we should know?"
                        className="resize-none"
                        {...field}
                        value={field.value ?? ""}
                        data-testid="input-rsvp-notes"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type="submit" disabled={mutation.isPending} data-testid="button-rsvp-submit">
                {mutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  "Send RSVP"
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      <div>
        <h2 className="text-lg font-semibold text-foreground mb-4" data-testid="text-responses-title">
          Who is In ({rsvps.length})
        </h2>
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : rsvps.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center text-muted-foreground">
              No RSVPs yet. Be first.
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {rsvps.map((rsvp) => (
              <Card key={rsvp.id} data-testid={`card-rsvp-${rsvp.id}`}>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="font-semibold text-foreground" data-testid={`text-rsvp-name-${rsvp.id}`}>
                      {rsvp.name}
                    </span>
                    {rsvp.status && statusLabels[rsvp.status] && (
                      <Badge variant={statusLabels[rsvp.status].variant} data-testid={`badge-rsvp-status-${rsvp.id}`}>
                        {statusLabels[rsvp.status].label}
                      </Badge>
                    )}
                  </div>
                  {(rsvp.arrivalDate || rsvp.departureDate) && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="h-3.5 w-3.5 shrink-0" />
                      <span>
                        {rsvp.arrivalDate && `Arriving: ${rsvp.arrivalDate}`}
                        {rsvp.arrivalDate && rsvp.departureDate && " | "}
                        {rsvp.departureDate && `Departing: ${rsvp.departureDate}`}
                      </span>
                    </div>
                  )}
                  {rsvp.accommodation && accommodationLabels[rsvp.accommodation] && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <MapPin className="h-3.5 w-3.5 shrink-0" />
                      <span>{accommodationLabels[rsvp.accommodation]}</span>
                    </div>
                  )}
                  {rsvp.transportation && transportationLabels[rsvp.transportation] && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Car className="h-3.5 w-3.5 shrink-0" />
                      <span>{transportationLabels[rsvp.transportation]}</span>
                    </div>
                  )}
                  {rsvp.notes && (
                    <p className="text-sm text-muted-foreground italic">"{rsvp.notes}"</p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
