import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { LogIn, UserPlus, Loader2, ArrowLeft } from "lucide-react";
import { Link, useLocation, useSearch } from "wouter";
import tidesLogo from "@assets/header_logo_img_26xxd1.png";

const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

const registerSchema = z.object({
  fullName: z.string().min(1, "Full name is required"),
  email: z.string().email("Valid email is required"),
  nickname: z.string().optional(),
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string().min(1, "Please confirm your password"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type LoginValues = z.infer<typeof loginSchema>;
type RegisterValues = z.infer<typeof registerSchema>;

export default function AuthPage() {
  const search = useSearch();
  const initialMode = new URLSearchParams(search).get("mode") === "register" ? "register" : "login";
  const [mode, setMode] = useState<"login" | "register">(initialMode);
  const { user, login, register } = useAuth();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (user) {
      setLocation("/");
    }
  }, [user, setLocation]);

  const loginForm = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: "", password: "" },
  });

  const registerForm = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { fullName: "", email: "", nickname: "", username: "", password: "", confirmPassword: "" },
  });

  async function onLogin(data: LoginValues) {
    setIsSubmitting(true);
    try {
      await login(data.username, data.password);
      toast({ title: "You are in", description: "Welcome back." });
    } catch (error: any) {
      const msg = error.message.includes(":")
        ? error.message.split(": ").slice(1).join(": ")
        : error.message;
      toast({ title: "Login failed", description: msg, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function onRegister(data: RegisterValues) {
    setIsSubmitting(true);
    try {
      await register({
        fullName: data.fullName,
        email: data.email,
        nickname: data.nickname,
        username: data.username,
        password: data.password,
      });
      toast({ title: "Account ready", description: "You are all set." });
    } catch (error: any) {
      const msg = error.message.includes(":")
        ? error.message.split(": ").slice(1).join(": ")
        : error.message;
      toast({ title: "Registration failed", description: msg, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  }

  if (user) return null;

  return (
    <div className="min-h-full flex items-center justify-center bg-gradient-to-br from-[#0f274f] via-[#173c73] to-[#7cc7f2] p-4">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_25%,rgba(255,255,255,0.18),transparent_38%)] pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(125,199,242,0.32),transparent_44%)] pointer-events-none" />

      <div className="relative z-10 w-full max-w-md">
        <div className="flex flex-col items-center mb-6">
          <div className="bg-white/18 ring-1 ring-white/30 backdrop-blur-sm rounded-full p-3 mb-4 shadow-lg shadow-[#0f274f]/20">
            <img
              src={tidesLogo}
              alt="tides Class of 75 Logo"
              className="w-20 h-20 object-contain"
              data-testid="img-auth-logo"
            />
          </div>
          <h1 className="text-2xl font-bold text-white" data-testid="text-auth-title">
            tides Class of 2016
          </h1>
          <p className="text-sky-100 text-sm">Maui Trip Connect</p>
          <p className="text-sky-100 text-sm">Maui Trip Linkup</p>
        </div>

        <Card>
          <CardHeader className="pb-4">
            <div className="flex gap-2">
              <Button
                variant={mode === "login" ? "default" : "outline"}
                onClick={() => setMode("login")}
                className="flex-1"
                data-testid="button-tab-login"
              >
                <LogIn className="h-4 w-4 mr-2" />
                Log In
              </Button>
              <Button
                variant={mode === "register" ? "default" : "outline"}
                onClick={() => setMode("register")}
                className="flex-1"
                data-testid="button-tab-register"
              >
                <UserPlus className="h-4 w-4 mr-2" />
                Sign Up
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {mode === "login" ? (
              <Form key="login-form" {...loginForm}>
                <form onSubmit={loginForm.handleSubmit(onLogin)} className="space-y-4" autoComplete="off">
                  <FormField
                    control={loginForm.control}
                    name="username"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Username</FormLabel>
                        <FormControl>
                          <Input placeholder="Username" autoComplete="username" {...field} data-testid="input-login-username" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={loginForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="Password" autoComplete="current-password" {...field} data-testid="input-login-password" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <p className="text-xs text-muted-foreground">
                    Admin accounts (admin/root): set your password on first login.
                  </p>
                  <Button type="submit" className="w-full" disabled={isSubmitting} data-testid="button-login-submit">
                    {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <LogIn className="h-4 w-4 mr-2" />}
                    Sign In
                  </Button>
                </form>
              </Form>
            ) : (
              <Form key="register-form" {...registerForm}>
                <form onSubmit={registerForm.handleSubmit(onRegister)} className="space-y-4" autoComplete="off">
                  <FormField
                    control={registerForm.control}
                    name="fullName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Full Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Full name" autoComplete="off" data-testid="input-register-fullname" value={field.value} onChange={field.onChange} onBlur={field.onBlur} name={field.name} ref={field.ref} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={registerForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email Address</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="your@email.com" autoComplete="off" data-testid="input-register-email" value={field.value} onChange={field.onChange} onBlur={field.onBlur} name={field.name} ref={field.ref} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={registerForm.control}
                    name="nickname"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nickname (optional)</FormLabel>
                        <FormControl>
                          <Input placeholder="Nickname" autoComplete="off" {...field} data-testid="input-register-nickname" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={registerForm.control}
                    name="username"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Username</FormLabel>
                        <FormControl>
                          <Input placeholder="Pick a username" autoComplete="off" {...field} data-testid="input-register-username" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={registerForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="6+ characters" autoComplete="new-password" {...field} data-testid="input-register-password" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={registerForm.control}
                    name="confirmPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Confirm Password</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="Re-enter your password" autoComplete="new-password" {...field} data-testid="input-register-confirm" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" className="w-full" disabled={isSubmitting} data-testid="button-register-submit">
                    {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <UserPlus className="h-4 w-4 mr-2" />}
                    Make Account
                  </Button>
                </form>
              </Form>
            )}
          </CardContent>
        </Card>

        <div className="text-center mt-4">
          <Button variant="ghost" size="sm" asChild className="text-sky-100 hover:text-white hover:bg-white/10">
            <Link href="/" data-testid="link-back-home">
              <ArrowLeft className="h-4 w-4 mr-1" />
              Keep Browsing
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
