import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Heart, Loader2 } from "lucide-react";
import { ApiError, request } from "@/lib/http";

export default function VerifyEmailPage() {
  const [params] = useSearchParams();
  const token = params.get("token") || "";
  const [status, setStatus] = useState<"loading" | "ok" | "err">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!token) {
      setStatus("err");
      setMessage("Missing verification token. Open the link from your email.");
      return;
    }
    (async () => {
      try {
        await request("/api/auth/verify-email", { method: "POST", json: { token } });
        setStatus("ok");
        setMessage("Your email is verified. An administrator still needs to approve your account before you can sign in.");
      } catch (e) {
        setStatus("err");
        setMessage(e instanceof ApiError ? e.message : "Verification failed");
      }
    })();
  }, [token]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md shadow-elevated">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-2">
            <Heart className="h-8 w-8 text-primary" />
          </div>
          <CardTitle>Email verification</CardTitle>
          <CardDescription>MediBook</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-center">
          {status === "loading" && (
            <div className="flex flex-col items-center gap-2 text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin" />
              <p>Verifying…</p>
            </div>
          )}
          {status !== "loading" && <p className="text-sm text-foreground">{message}</p>}
          <Button asChild variant="outline" className="w-full">
            <Link to="/login">Back to sign in</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
