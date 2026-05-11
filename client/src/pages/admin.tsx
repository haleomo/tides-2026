import { useEffect, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Shield, KeyRound, Loader2, AlertCircle, Users, Trash2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth";
import { useLocation } from "wouter";

interface AdminUser {
  id: string;
  username: string;
  fullName: string;
  email: string;
  nickname: string | null;
  role: string;
  needsPasswordSetup: boolean;
}

const roleOptions = ["admin", "editor", "contributor", "viewer"] as const;

export default function Admin() {
  const { toast } = useToast();
  const { user, refreshSession } = useAuth();
  const [, setLocation] = useLocation();
  const isAdmin = user?.role === "admin";
  const [roleDrafts, setRoleDrafts] = useState<Record<string, string>>({});

  const { data: users, isLoading, error } = useQuery<AdminUser[]>({
    queryKey: ["/api/admin/users"],
    enabled: isAdmin,
  });

  useEffect(() => {
    if (!users) return;
    const nextDrafts: Record<string, string> = {};
    for (const u of users) {
      nextDrafts[u.id] = u.role;
    }
    setRoleDrafts(nextDrafts);
  }, [users]);

  useEffect(() => {
    if (error && error.message.includes("401")) {
      refreshSession();
    }
  }, [error, refreshSession]);

  const resetPasswordMutation = useMutation({
    mutationFn: async (userId: string) => {
      const res = await apiRequest("POST", `/api/admin/reset-password/${userId}`);
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({ title: "Password reset", description: data.message });
    },
    onError: (err: Error) => {
      toast({ title: "Reset failed", description: err.message, variant: "destructive" });
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      const res = await apiRequest("DELETE", `/api/admin/users/${userId}`);
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({ title: "User removed", description: data.message });
    },
    onError: (err: Error) => {
      toast({ title: "Remove failed", description: err.message, variant: "destructive" });
    },
  });

  const changeRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      const res = await apiRequest("POST", `/api/admin/change-role/${userId}`, { role });
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({ title: "Role updated", description: data.message });
    },
    onError: (err: Error) => {
      toast({ title: "Role change failed", description: err.message, variant: "destructive" });
    },
  });

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-full py-20 text-center">
        <div className="rounded-full bg-destructive/10 p-4 mb-4">
          <Shield className="h-8 w-8 text-destructive" />
        </div>
        <h3 className="text-lg font-semibold text-foreground mb-1">Access Denied</h3>
        <p className="text-sm text-muted-foreground max-w-sm">
          This page is only accessible to administrators.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-full">
      <div className="p-6 pb-0">
        <h1 className="text-2xl font-bold text-foreground" data-testid="text-admin-title">User Management</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage user accounts, roles, and password resets</p>
      </div>

      <div className="flex-1 p-6">
        {error ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="rounded-full bg-destructive/10 p-4 mb-4">
              <AlertCircle className="h-8 w-8 text-destructive" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-1">Failed to load users</h3>
            <p className="text-sm text-muted-foreground max-w-sm">{(error as Error).message}</p>
          </div>
        ) : isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="flex-1">
                      <Skeleton className="h-4 w-32 mb-2" />
                      <Skeleton className="h-3 w-48" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : users && users.length > 0 ? (
          <div className="space-y-3">
            {users.map((u) => (
              <Card key={u.id} data-testid={`card-user-${u.id}`}>
                <CardContent className="p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex items-center justify-center bg-primary/10 rounded-full w-10 h-10 shrink-0">
                        <Users className="h-5 w-5 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-foreground" data-testid={`text-user-name-${u.id}`}>{u.fullName}</span>
                          <Badge variant="secondary" className="no-default-hover-elevate no-default-active-elevate text-xs">
                            {u.role}
                          </Badge>
                          {u.needsPasswordSetup && (
                            <Badge variant="destructive" className="no-default-hover-elevate no-default-active-elevate text-xs">
                              needs password
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5" data-testid={`text-user-details-${u.id}`}>
                          @{u.username}  {u.email}
                          {u.nickname ? ` "${u.nickname}"` : ""}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="flex items-center gap-2">
                        <select
                          className="h-9 rounded-md border border-input bg-background px-3 text-sm text-foreground"
                          value={roleDrafts[u.id] ?? u.role}
                          onChange={(e) => setRoleDrafts((prev) => ({ ...prev, [u.id]: e.target.value }))}
                          disabled={u.id === user?.id || changeRoleMutation.isPending}
                          data-testid={`select-role-${u.id}`}
                        >
                          {roleOptions.map((role) => (
                            <option key={role} value={role}>{role}</option>
                          ))}
                        </select>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => changeRoleMutation.mutate({ userId: u.id, role: roleDrafts[u.id] ?? u.role })}
                          disabled={u.id === user?.id || changeRoleMutation.isPending || (roleDrafts[u.id] ?? u.role) === u.role}
                          data-testid={`button-save-role-${u.id}`}
                        >
                          {changeRoleMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                          Save Role
                        </Button>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => resetPasswordMutation.mutate(u.id)}
                        disabled={resetPasswordMutation.isPending || u.id === user?.id}
                        data-testid={`button-reset-password-${u.id}`}
                      >
                        {resetPasswordMutation.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-1" />
                        ) : (
                          <KeyRound className="h-4 w-4 mr-1" />
                        )}
                        Reset Password
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => deleteUserMutation.mutate(u.id)}
                        disabled={deleteUserMutation.isPending || u.id === user?.id}
                        data-testid={`button-delete-user-${u.id}`}
                      >
                        {deleteUserMutation.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-1" />
                        ) : (
                          <Trash2 className="h-4 w-4 mr-1" />
                        )}
                        Remove
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="rounded-full bg-primary/10 p-4 mb-4">
              <Users className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-1">No users found</h3>
          </div>
        )}
      </div>
    </div>
  );
}
