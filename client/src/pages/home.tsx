import { Camera, MessageCircle, Calendar, ArrowRight, UserCheck, UserX, HelpCircle, Users, Loader2 } from "lucide-react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import type { Rsvp } from "@shared/schema";
import tidesLogo from "@assets/GH-Logo-Image.png";
import honuOnTheBeach from "@assets/HonuOnTheBeach.jpeg";

const features = [
  {
    icon: Camera,
    title: "Photo Gallery",
    description: "Share throwbacks and fresh Maui pics",
    href: "/photos",
  },
  {
    icon: MessageCircle,
    title: "Group Messages",
    description: "Drop updates, plans, and random chaos",
    href: "/messages",
  },
  {
    icon: Calendar,
    title: "Trip Events",
    description: "See what's next and when to show up",
    href: "/events",
  },
];

function getInitials(name: string) {
  return name
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function WhosComingSection() {
  const { data: rsvps, isLoading } = useQuery<Rsvp[]>({
    queryKey: ["/api/rsvps"],
  });

  if (isLoading) {
    return (
      <Card className="mt-6">
        <CardContent className="p-5 flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!rsvps || rsvps.length === 0) {
    return (
      <Card className="mt-6">
        <CardContent className="p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="rounded-md bg-primary/10 p-2">
              <Users className="h-4 w-4 text-primary" />
            </div>
            <h3 className="font-semibold text-foreground">Who's Coming</h3>
          </div>
          <p className="text-sm text-muted-foreground">
            No RSVPs yet. Be first to <Link href="/rsvp" className="text-primary font-medium underline underline-offset-2">lock in</Link>.
          </p>
        </CardContent>
      </Card>
    );
  }

  const attending = rsvps.filter((r) => r.status === "attending");
  const interested = rsvps.filter((r) => r.status === "interested");
  const unable = rsvps.filter((r) => r.status === "unable");

  const groups = [
    { label: "Attending", items: attending, icon: UserCheck, color: "text-green-600 dark:text-green-400", bgColor: "bg-green-500/10" },
    { label: "Interested", items: interested, icon: HelpCircle, color: "text-yellow-600 dark:text-yellow-400", bgColor: "bg-yellow-500/10" },
    { label: "Regrets", items: unable, icon: UserX, color: "text-muted-foreground", bgColor: "bg-muted/50" },
  ];

  return (
    <Card className="mt-6" data-testid="card-whos-coming">
      <CardContent className="p-5">
        <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="rounded-md bg-primary/10 p-2">
              <Users className="h-4 w-4 text-primary" />
            </div>
            <h3 className="font-semibold text-foreground">Who's Coming</h3>
            <Badge variant="secondary" data-testid="badge-rsvp-total">{rsvps.length} responses</Badge>
          </div>
          <Link href="/rsvp">
            <Button variant="outline" size="sm" data-testid="button-rsvp-link">
              <UserCheck className="h-4 w-4 mr-1" />
              RSVP
            </Button>
          </Link>
        </div>

        <div className="space-y-4">
          {groups.map((group) => {
            if (group.items.length === 0) return null;
            return (
              <div key={group.label} data-testid={`section-rsvp-${group.label.toLowerCase()}`}>
                <div className="flex items-center gap-2 mb-2">
                  <group.icon className={`h-4 w-4 ${group.color}`} />
                  <span className={`text-sm font-medium ${group.color}`}>{group.label}</span>
                  <span className="text-xs text-muted-foreground">({group.items.length})</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {group.items.map((rsvp) => (
                    <div
                      key={rsvp.id}
                      className={`flex items-center gap-2 rounded-md px-3 py-1.5 ${group.bgColor}`}
                      data-testid={`rsvp-person-${rsvp.id}`}
                    >
                      <Avatar className="h-6 w-6">
                        <AvatarFallback className="text-[10px]">{getInitials(rsvp.name)}</AvatarFallback>
                      </Avatar>
                      <span className="text-sm text-foreground">{rsvp.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

export default function Home() {
  return (
    <div className="flex flex-col min-h-full">
      <div className="relative overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${honuOnTheBeach})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-br from-[#0f274f]/70 via-[#173c73]/55 to-[#7cc7f2]/40" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_25%,rgba(255,255,255,0.2),transparent_40%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_72%_78%,rgba(125,199,242,0.28),transparent_44%)]" />

        <div className="relative z-10 flex flex-col items-center justify-center px-6 py-16 md:py-24 text-center">
          <div className="bg-white/18 ring-1 ring-white/30 backdrop-blur-sm rounded-full p-4 mb-6 shadow-lg shadow-[#0f274f]/20">
            <img
              src={tidesLogo}
              alt="Tides Class of 2026 Logo"
              className="w-28 h-28 md:w-40 md:h-40 object-contain"
              data-testid="img-hero-logo"
            />
          </div>
          <h1 className="text-3xl md:text-5xl font-bold text-white mb-3 tracking-tight">
            Tides Class of 2026
          </h1>
          <p className="text-lg md:text-xl text-sky-100 mb-2 max-w-lg">
            Maui Linkup
          </p>
          <p className="text-sm md:text-base text-sky-50/85 mb-8 max-w-md">
            Plan it, post it, and do not miss a thing.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link href="/photos">
              <Button variant="default" data-testid="button-hero-photos">
                <Camera className="h-4 w-4 mr-2" />
                See Photos
              </Button>
            </Link>
            <Link href="/messages">
              <Button variant="outline" className="bg-white/10 text-white backdrop-blur-sm border-white/30 hover:bg-white/20" data-testid="button-hero-messages">
                <MessageCircle className="h-4 w-4 mr-2" />
                Hop In Chat
              </Button>
            </Link>
            <Link href="/rsvp">
              <Button variant="outline" className="bg-white/10 text-white backdrop-blur-sm border-white/30 hover:bg-white/20" data-testid="button-hero-rsvp">
                <UserCheck className="h-4 w-4 mr-2" />
                Lock In RSVP
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="flex-1 p-6 md:p-8">
        <h2 className="text-xl font-semibold mb-6 text-foreground">Jump In</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {features.map((feature) => (
            <Link key={feature.title} href={feature.href}>
              <Card className="hover-elevate cursor-pointer h-full" data-testid={`card-feature-${feature.title.toLowerCase().replace(/\s+/g, "-")}`}>
                <CardContent className="p-5">
                  <div className="flex items-start gap-4">
                    <div className="rounded-md bg-primary/10 p-2.5 shrink-0">
                      <feature.icon className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-foreground mb-1">{feature.title}</h3>
                      <p className="text-sm text-muted-foreground">{feature.description}</p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0 mt-1" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        <Card className="mt-6">
          <CardContent className="p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="rounded-md bg-primary/10 p-2">
                <Calendar className="h-4 w-4 text-primary" />
              </div>
              <h3 className="font-semibold text-foreground">Coming Up</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              Hit <Link href="/events" className="text-primary font-medium underline underline-offset-2">Trip Events</Link> for the latest plans, times, and meetups.
            </p>
          </CardContent>
        </Card>

        <WhosComingSection />
      </div>
    </div>
  );
}
