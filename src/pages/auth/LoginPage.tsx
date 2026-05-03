import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import type { UserRole } from "@/types/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Heart, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ApiError } from "@/lib/http";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { login } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const roleRedirects: Record<UserRole, string> = {
    patient: "/patient",
    doctor: "/doctor",
    admin: "/admin",
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!email || !password) {
      setError("Please fill in all fields");
      return;
    }
    setLoading(true);
    try {
      const session = await login(email, password);
      toast({ title: "Welcome back!", description: `Signed in as ${session.name}` });
      navigate(roleRedirects[session.role] || "/patient");
    } catch (err: unknown) {
      const msg =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Sign in failed";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const quickLogin = (em: string) => {
    setEmail(em);
    setPassword("password");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2">
            <Heart className="h-8 w-8 text-primary" />
            <h1 className="text-2xl font-bold text-foreground">MediBook</h1>
          </div>
          <p className="text-muted-foreground">Manage your healthcare appointments and records securely</p>
        </div>

        <Card className="shadow-elevated">
          <CardHeader>
            <CardTitle>Sign In</CardTitle>
            <CardDescription>Enter your credentials (API must be running; use seed accounts after `npm run seed`)</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="flex items-center gap-2 p-3 rounded-md bg-destructive/10 text-destructive text-sm">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Signing in…" : "Sign In"}
              </Button>
            </form>

            <div className="mt-6 space-y-3">
              <p className="text-xs text-muted-foreground text-center">Quick fill (seed, password: password)</p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: "Patient 1", email: "patient1@medibook.com" },
                  { label: "Doctor 1", email: "doctor1@medibook.com" },
                  { label: "Admin", email: "admin@medibook.com" },
                  { label: "Patient 2", email: "patient2@medibook.com" },
                ].map((acc) => (
                  <Button key={acc.email} variant="outline" size="sm" onClick={() => quickLogin(acc.email)} className="text-xs">
                    {acc.label}
                  </Button>
                ))}
              </div>
            </div>

            <p className="text-sm text-center text-muted-foreground mt-4">
              Don&apos;t have an account?{" "}
              <Link to="/register" className="text-primary hover:underline font-medium">
                Register
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
