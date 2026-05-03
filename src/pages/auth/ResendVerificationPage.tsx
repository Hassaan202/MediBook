import { useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Heart } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ApiError, request } from "@/lib/http";

export default function ResendVerificationPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    try {
      const data = await request<{ emailed?: boolean } | null>("/api/auth/resend-verification", {
        method: "POST",
        json: { email: email.trim() },
      });
      if (data?.emailed) {
        toast({
          title: "Email sent",
          description: "Check your Mailtrap inbox (or your mailbox). The link expires in 48 hours.",
        });
      } else {
        toast({
          title: "Request received",
          description:
            "No verification email was sent. Use the exact email you signed up with, or you may already be verified — try signing in or register first.",
        });
      }
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof ApiError ? err.message : "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md shadow-elevated">
        <CardHeader>
          <Heart className="h-8 w-8 text-primary mb-2" />
          <CardTitle>Resend verification</CardTitle>
          <CardDescription>We will email you a new link if your account is still unverified.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Sending…" : "Send link"}
            </Button>
            <Button asChild variant="ghost" className="w-full">
              <Link to="/login">Back to sign in</Link>
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
