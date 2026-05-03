import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import type { UserRole } from "@/types/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Heart, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ApiError } from "@/lib/http";

export default function RegisterPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Exclude<UserRole, "admin">>("patient");
  const [specialty, setSpecialty] = useState("");
  const [experience, setExperience] = useState("5");
  const [fees, setFees] = useState("150");
  const [dateOfBirth, setDateOfBirth] = useState("1990-01-15");
  const [gender, setGender] = useState("Male");
  const [bloodType, setBloodType] = useState("O+");
  const [phone, setPhone] = useState("(555) 123-4567");
  const [ecName, setEcName] = useState("Emergency Contact");
  const [ecPhone, setEcPhone] = useState("(555) 987-6543");
  const [ecRel, setEcRel] = useState("Family");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { register } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!name || !email || !password) {
      setError("Please fill in all required fields");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    if (!/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/\d/.test(password)) {
      setError("Password must include uppercase, lowercase, and a number");
      return;
    }
    if (role === "doctor") {
      if (!specialty.trim()) {
        setError("Specialty is required for doctors");
        return;
      }
      const ex = parseFloat(experience);
      const fe = parseFloat(fees);
      if (Number.isNaN(ex) || ex < 0 || Number.isNaN(fe) || fe < 0) {
        setError("Experience and fees must be valid numbers");
        return;
      }
    }
    if (role === "patient") {
      if (!phone.trim() || !ecName.trim() || !ecPhone.trim()) {
        setError("Phone and emergency contact are required");
        return;
      }
    }
    setLoading(true);
    try {
      const body: Record<string, unknown> = { name, email, password, role };
      if (role === "doctor") {
        body.specialty = specialty.trim();
        body.experience = parseFloat(experience);
        body.fees = parseFloat(fees);
      } else {
        body.dateOfBirth = dateOfBirth;
        body.gender = gender;
        body.bloodType = bloodType;
        body.phone = phone.trim();
        body.emergencyContact = {
          name: ecName.trim(),
          phone: ecPhone.trim(),
          relationship: ecRel.trim() || "Family",
        };
      }
      const session = await register(body);
      toast({ title: "Account created", description: "Welcome to MediBook" });
      const dest =
        session.role === "doctor" ? "/doctor" : session.role === "admin" ? "/admin" : "/patient";
      navigate(dest);
    } catch (err: unknown) {
      const msg =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Registration failed";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-lg space-y-6">
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2">
            <Heart className="h-8 w-8 text-primary" />
            <h1 className="text-2xl font-bold text-foreground">MediBook</h1>
          </div>
          <p className="text-muted-foreground">Create a patient or doctor account</p>
        </div>

        <Card className="shadow-elevated">
          <CardHeader>
            <CardTitle>Register</CardTitle>
            <CardDescription>Password: 8+ chars with upper, lower, and digit</CardDescription>
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
                <Label htmlFor="name">Full name</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Role</Label>
                <Select value={role} onValueChange={(v) => setRole(v as typeof role)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="patient">Patient</SelectItem>
                    <SelectItem value="doctor">Doctor</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {role === "doctor" && (
                <>
                  <div className="space-y-2">
                    <Label>Specialty</Label>
                    <Input value={specialty} onChange={(e) => setSpecialty(e.target.value)} placeholder="e.g. Cardiology" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Years experience</Label>
                      <Input type="number" min={0} value={experience} onChange={(e) => setExperience(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Consultation fee (USD)</Label>
                      <Input type="number" min={0} step="1" value={fees} onChange={(e) => setFees(e.target.value)} />
                    </div>
                  </div>
                </>
              )}

              {role === "patient" && (
                <>
                  <div className="space-y-2">
                    <Label>Date of birth</Label>
                    <Input type="date" value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Gender</Label>
                      <Select value={gender} onValueChange={setGender}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Male">Male</SelectItem>
                          <SelectItem value="Female">Female</SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Blood type</Label>
                      <Select value={bloodType} onValueChange={setBloodType}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map((bt) => (
                            <SelectItem key={bt} value={bt}>
                              {bt}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Phone</Label>
                    <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Emergency contact name</Label>
                      <Input value={ecName} onChange={(e) => setEcName(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Emergency contact phone</Label>
                      <Input value={ecPhone} onChange={(e) => setEcPhone(e.target.value)} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Relationship (optional)</Label>
                    <Input value={ecRel} onChange={(e) => setEcRel(e.target.value)} />
                  </div>
                </>
              )}

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Creating account…" : "Create account"}
              </Button>
            </form>
            <p className="text-sm text-center text-muted-foreground mt-4">
              Already have an account?{" "}
              <Link to="/login" className="text-primary hover:underline font-medium">
                Sign in
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
