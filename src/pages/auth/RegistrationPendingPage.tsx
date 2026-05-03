import { Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Heart } from "lucide-react";

export default function RegistrationPendingPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md shadow-elevated">
        <CardHeader className="text-center">
          <Heart className="h-8 w-8 text-primary mx-auto mb-2" />
          <CardTitle>Next steps</CardTitle>
          <CardDescription>Almost there</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-muted-foreground">
          <ol className="list-decimal list-inside space-y-2 text-left">
            <li>Open the verification email and click the link (check spam).</li>
            <li>Wait for a clinic administrator to approve your account.</li>
            <li>Sign in once you receive approval (you may get another email).</li>
          </ol>
          <div className="flex flex-col gap-2 pt-2">
            <Button asChild variant="default" className="w-full">
              <Link to="/login">Sign in</Link>
            </Button>
            <Button asChild variant="outline" className="w-full">
              <Link to="/resend-verification">Resend verification email</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
