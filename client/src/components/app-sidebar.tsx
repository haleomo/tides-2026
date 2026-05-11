import { Home, Camera, MessageCircle, Calendar, Info, UserCheck, Shield, MapPinned } from "lucide-react";
import { Link, useLocation } from "wouter";
import tidesLogo from "@assets/GH-Logo-Image.png";
import { useAuth } from "@/lib/auth";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";

const navItems = [
  { title: "Home", url: "/", icon: Home },
  { title: "Photo Gallery", url: "/photos", icon: Camera },
  { title: "Messages", url: "/messages", icon: MessageCircle },
  { title: "Trip Events", url: "/events", icon: Calendar },
  { title: "Recommendations", url: "/recommendations", icon: MapPinned },
  { title: "RSVP", url: "/rsvp", icon: UserCheck },
  { title: "About", url: "/about", icon: Info },
];

export function AppSidebar() {
  const [location] = useLocation();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  return (
    <Sidebar>
      <SidebarHeader className="p-4">
        <Link href="/" className="flex items-center gap-3">
          <img src={tidesLogo} alt="tides Logo" className="w-10 h-10 object-contain" />
          <div className="flex flex-col">
            <span className="font-bold text-sm leading-tight text-sidebar-foreground">tides 2026</span>
            <span className="text-xs text-muted-foreground">Maui Trip</span>
          </div>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    data-active={location === item.url}
                    className="data-[active=true]:bg-sidebar-accent"
                  >
                    <Link href={item.url} data-testid={`link-nav-${item.title.toLowerCase().replace(/\s+/g, "-")}`}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        {isAdmin && (
          <SidebarGroup>
            <SidebarGroupLabel>Administration</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    data-active={location === "/admin"}
                    className="data-[active=true]:bg-sidebar-accent"
                  >
                    <Link href="/admin" data-testid="link-nav-admin">
                      <Shield className="h-4 w-4" />
                      <span>User Management</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
      <SidebarFooter className="p-4">
        <p className="text-xs text-muted-foreground text-center">
          Class of 2026 Grad Trip
        </p>
      </SidebarFooter>
    </Sidebar>
  );
}
