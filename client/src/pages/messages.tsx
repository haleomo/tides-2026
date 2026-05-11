import { useRef, useEffect, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Send, MessageCircle, Loader2, AlertCircle, LogIn, Trash2, CornerDownRight, ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Form, FormField, FormItem, FormControl, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { insertMessageSchema } from "@shared/schema";
import { useAuth } from "@/lib/auth";
import { Link } from "wouter";
import type { Message, MessageComment } from "@shared/schema";

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function getAvatarColor(name: string) {
  const colors = [
    "bg-primary",
    "bg-primary/80",
    "bg-sky-500 dark:bg-sky-400",
    "bg-blue-700 dark:bg-blue-500",
    "bg-slate-700 dark:bg-slate-500",
    "bg-cyan-600 dark:bg-cyan-500",
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

interface MessageItemProps {
  msg: Message;
  isAdmin: boolean;
  canComment: boolean;
}

function MessageItem({ msg, isAdmin, canComment }: MessageItemProps) {
  const { toast } = useToast();
  const [threadOpen, setThreadOpen] = useState(false);
  const [replyContent, setReplyContent] = useState("");

  const { data: comments, isLoading: commentsLoading } = useQuery<MessageComment[]>({
    queryKey: ["/api/messages", msg.id, "comments"],
    queryFn: async () => {
      const res = await fetch(`/api/messages/${msg.id}/comments`, { credentials: "include" });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    enabled: threadOpen,
    refetchInterval: threadOpen ? 5000 : false,
  });

  const deleteMsgMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", `/api/messages/${msg.id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/messages"] });
      toast({ title: "Message deleted" });
    },
    onError: (err: Error) => toast({ title: "Delete failed", description: err.message, variant: "destructive" }),
  });

  const replyMutation = useMutation({
    mutationFn: async (content: string) => {
      const res = await apiRequest("POST", `/api/messages/${msg.id}/comments`, { content });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/messages", msg.id, "comments"] });
      setReplyContent("");
      toast({ title: "Reply posted" });
    },
    onError: (err: Error) => toast({ title: "Failed to post reply", description: err.message, variant: "destructive" }),
  });

  const deleteCommentMutation = useMutation({
    mutationFn: async (commentId: number) => {
      await apiRequest("DELETE", `/api/messages/${msg.id}/comments/${commentId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/messages", msg.id, "comments"] });
      toast({ title: "Reply deleted" });
    },
    onError: (err: Error) => toast({ title: "Delete failed", description: err.message, variant: "destructive" }),
  });

  const handleReply = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = replyContent.trim();
    if (!trimmed) return;
    replyMutation.mutate(trimmed);
  };

  const replyCount = comments?.length ?? 0;

  return (
    <div className="flex items-start gap-3" data-testid={`message-${msg.id}`}>
      <Avatar className="h-9 w-9 shrink-0">
        <AvatarFallback className={`${getAvatarColor(msg.author)} text-white text-xs`}>
          {getInitials(msg.author)}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2 flex-wrap">
          <span className="font-semibold text-sm text-foreground" data-testid={`text-message-author-${msg.id}`}>{msg.author}</span>
          <span className="text-xs text-muted-foreground">{new Date(msg.createdAt).toLocaleString()}</span>
        </div>
        <Card className="mt-1">
          <CardContent className="p-3">
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm text-foreground whitespace-pre-wrap break-words flex-1" data-testid={`text-message-content-${msg.id}`}>{msg.content}</p>
              {isAdmin && (
                <Button
                  size="icon"
                  variant="ghost"
                  className="shrink-0 text-destructive"
                  onClick={() => deleteMsgMutation.mutate()}
                  disabled={deleteMsgMutation.isPending}
                  data-testid={`button-delete-message-${msg.id}`}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Thread toggle */}
        <button
          onClick={() => setThreadOpen((prev) => !prev)}
          className="flex items-center gap-1 mt-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          data-testid={`button-toggle-thread-${msg.id}`}
        >
          {threadOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
          {threadOpen
            ? `${replyCount} ${replyCount === 1 ? "reply" : "replies"}`
            : replyCount > 0
            ? `${replyCount} ${replyCount === 1 ? "reply" : "replies"} · Reply`
            : "Reply"}
        </button>

        {/* Thread body */}
        {threadOpen && (
          <div className="mt-2 ml-3 pl-3 border-l border-border space-y-2">
            {commentsLoading && (
              <div className="space-y-2">
                {[1, 2].map((i) => (
                  <div key={i} className="flex items-start gap-2">
                    <Skeleton className="h-7 w-7 rounded-full shrink-0" />
                    <Skeleton className="h-10 flex-1 rounded-md" />
                  </div>
                ))}
              </div>
            )}

            {comments?.map((comment) => (
              <div key={comment.id} className="flex items-start gap-2" data-testid={`comment-${comment.id}`}>
                <Avatar className="h-7 w-7 shrink-0">
                  <AvatarFallback className={`${getAvatarColor(comment.authorName)} text-white text-[10px]`}>
                    {getInitials(comment.authorName)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0 bg-muted/50 rounded-md px-3 py-2">
                  <div className="flex items-baseline justify-between gap-2 flex-wrap">
                    <span className="font-semibold text-xs text-foreground">{comment.authorName}</span>
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] text-muted-foreground">{new Date(comment.createdAt).toLocaleString()}</span>
                      {isAdmin && (
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-5 w-5 text-destructive"
                          onClick={() => deleteCommentMutation.mutate(comment.id)}
                          disabled={deleteCommentMutation.isPending}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                  <p className="text-sm text-foreground whitespace-pre-wrap break-words mt-0.5">{comment.content}</p>
                </div>
              </div>
            ))}

            {comments?.length === 0 && !commentsLoading && (
              <p className="text-xs text-muted-foreground italic">No replies yet.</p>
            )}

            {canComment && (
              <form onSubmit={handleReply} className="flex items-end gap-2 pt-1">
                <Textarea
                  value={replyContent}
                  onChange={(e) => setReplyContent(e.target.value)}
                  placeholder="Write a reply..."
                  className="resize-none text-sm min-h-0"
                  rows={1}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleReply(e as unknown as React.FormEvent);
                    }
                  }}
                />
                <Button
                  type="submit"
                  size="sm"
                  disabled={replyMutation.isPending || !replyContent.trim()}
                  className="self-end"
                >
                  {replyMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <CornerDownRight className="h-4 w-4" />
                  )}
                </Button>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function Messages() {
  const { toast } = useToast();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const canPostMessages = user ? ["admin", "editor", "contributor"].includes(user.role) : false;
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const form = useForm({
    resolver: zodResolver(insertMessageSchema),
    defaultValues: { author: user?.fullName || "", content: "" },
  });

  useEffect(() => {
    if (user?.fullName) {
      form.setValue("author", user.fullName);
    }
  }, [user, form]);

  const { data: messages, isLoading, error } = useQuery<Message[]>({
    queryKey: ["/api/messages"],
    refetchInterval: 5000,
  });

  const sendMutation = useMutation({
    mutationFn: async (values: { author: string; content: string }) => {
      const res = await apiRequest("POST", "/api/messages", values);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/messages"] });
      form.setValue("content", "");
      toast({ title: "Message sent!" });
    },
    onError: (err: Error) => {
      toast({ title: "Failed to send", description: err.message, variant: "destructive" });
    },
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const onSubmit = (values: { author: string; content: string }) => {
    if (!canPostMessages) {
      toast({ title: "Permission denied", description: "Only contributors, editors, and admins can post messages.", variant: "destructive" });
      return;
    }
    sendMutation.mutate(values);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-6 pb-0">
        <h1 className="text-2xl font-bold text-foreground" data-testid="text-messages-title">Group Messages</h1>
        <p className="text-sm text-muted-foreground mt-1">Drop updates with the tides crew</p>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {error ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="rounded-full bg-destructive/10 p-4 mb-4">
              <AlertCircle className="h-8 w-8 text-destructive" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-1">Failed to load messages</h3>
            <p className="text-sm text-muted-foreground max-w-sm">{(error as Error).message}</p>
          </div>
        ) : isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-start gap-3">
                <Skeleton className="h-9 w-9 rounded-full shrink-0" />
                <div className="flex-1">
                  <Skeleton className="h-3 w-24 mb-2" />
                  <Skeleton className="h-16 w-full rounded-md" />
                </div>
              </div>
            ))}
          </div>
        ) : messages && messages.length > 0 ? (
          messages.map((msg) => (
            <MessageItem key={msg.id} msg={msg} isAdmin={isAdmin} canComment={canPostMessages} />
          ))
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="rounded-full bg-primary/10 p-4 mb-4">
              <MessageCircle className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-1">No messages yet</h3>
            <p className="text-sm text-muted-foreground max-w-sm">
              Start it off. Hype the trip, share plans, or ask what is up.
            </p>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {user ? canPostMessages ? (
        <div className="border-t p-4">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="flex gap-2">
              <FormField
                control={form.control}
                name="content"
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormControl>
                      <Textarea
                        {...field}
                        placeholder="Drop a message..."
                        className="resize-none"
                        rows={2}
                        data-testid="input-message-content"
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            form.handleSubmit(onSubmit)();
                          }
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button
                type="submit"
                size="icon"
                disabled={sendMutation.isPending}
                className="self-end"
                data-testid="button-send-message"
              >
                {sendMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </form>
          </Form>
        </div>
      ) : (
        <div className="border-t p-4 text-center">
          <p className="text-sm text-muted-foreground" data-testid="text-no-message-permission">
            Your role is view-only. Ask an admin to grant contributor access to post messages.
          </p>
        </div>
      ) : (
        <div className="border-t p-4 text-center">
          <p className="text-sm text-muted-foreground mb-2" data-testid="text-login-to-chat">Log in to jump in the chat</p>
          <Button asChild data-testid="button-login-to-chat">
            <Link href="/auth">
              <LogIn className="h-4 w-4 mr-2" />
              Log In
            </Link>
          </Button>
        </div>
      )}
    </div>
  );
}
