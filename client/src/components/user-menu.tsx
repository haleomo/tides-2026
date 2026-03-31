import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { LogOut, Shield, LogIn, UserPlus } from "lucide-react";
import { Link } from "wouter";

export function UserMenu() {
  const { user, logout } = useAuth();

  if (!user) {
    return (
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="sm" asChild data-testid="button-header-login">
          <Link href="/auth">
            <LogIn className="h-4 w-4 mr-1" />
            Sign In
          </Link>
        </Button>
        <Button size="sm" asChild data-testid="button-header-register">
          <Link href="/auth?mode=register">
            <UserPlus className="h-4 w-4 mr-1" />
            Register
          </Link>
        </Button>
      </div>
    );
  }

  const initials = user.fullName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" data-testid="button-user-menu">
          <Avatar className="h-7 w-7">
            <AvatarFallback className="text-xs bg-primary text-primary-foreground">
              {initials}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="flex flex-col">
          <span className="font-semibold" data-testid="text-user-fullname">{user.fullName}</span>
          <span className="text-xs text-muted-foreground font-normal">@{user.username}</span>
          {user.role === "admin" && (
            <span className="flex items-center gap-1 text-xs text-primary mt-1">
              <Shield className="h-3 w-3" />
              Admin
            </span>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => logout()}
          className="cursor-pointer"
          data-testid="button-logout"
        >
          <LogOut className="h-4 w-4 mr-2" />
          Sign Out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
