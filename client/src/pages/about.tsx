import { Card, CardContent } from "@/components/ui/card";
import { Heart, Users, MapPin, Calendar } from "lucide-react";
import tidesLogo from "@assets/GH-Logo-Image.png";

export default function About() {
  return (
    <div className="flex flex-col min-h-full">
      <div className="p-6 pb-0">
        <h1 className="text-2xl font-bold text-foreground" data-testid="text-about-title">About This Trip</h1>
        <p className="text-sm text-muted-foreground mt-1">tides Class of 2026 Maui Linkup</p>
      </div>

      <div className="flex-1 p-6 space-y-6">
        <div className="flex justify-center">
          <img
            src={tidesLogo}
            alt="tides Class of 2026 Logo"
            className="w-32 h-32 object-contain"
            data-testid="img-about-logo"
          />
        </div>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="rounded-md bg-primary/10 p-2">
                <Heart className="h-4 w-4 text-primary" />
              </div>
              <h2 className="font-semibold text-foreground">Yo, tides!</h2>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              This app keeps the tides Class of 2026 synced for Maui. Plan arrivals, tap in with the group chat, drop pics, and stay on top of the schedule. One spot for everything "tides on Maui."
            </p>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-5 text-center">
              <div className="rounded-full bg-primary/10 p-3 w-12 h-12 flex items-center justify-center mx-auto mb-3">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <h3 className="font-semibold text-foreground mb-1">Connect</h3>
              <p className="text-xs text-muted-foreground">Tap in with classmates and keep the vibe alive</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5 text-center">
              <div className="rounded-full bg-primary/10 p-3 w-12 h-12 flex items-center justify-center mx-auto mb-3">
                <MapPin className="h-5 w-5 text-primary" />
              </div>
              <h3 className="font-semibold text-foreground mb-1">Explore</h3>
              <p className="text-xs text-muted-foreground">See the plans, spots, and what is next</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5 text-center">
              <div className="rounded-full bg-primary/10 p-3 w-12 h-12 flex items-center justify-center mx-auto mb-3">
                <Calendar className="h-5 w-5 text-primary" />
              </div>
              <h3 className="font-semibold text-foreground mb-1">Stay Updated</h3>
              <p className="text-xs text-muted-foreground">Catch updates fast so you do not miss anything</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardContent className="p-5">
            <h2 className="font-semibold text-foreground mb-2">How to Use</h2>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <span className="font-semibold text-primary shrink-0">1.</span>
                <span>Hit the <strong className="text-foreground">Photo Gallery</strong> for throwbacks and fresh Maui pics.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-semibold text-primary shrink-0">2.</span>
                <span>Use <strong className="text-foreground">Group Messages</strong> to plan meetups and keep everyone in the loop.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-semibold text-primary shrink-0">3.</span>
                <span>Check <strong className="text-foreground">Trip Events</strong> for times, places, and updates.</span>
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
