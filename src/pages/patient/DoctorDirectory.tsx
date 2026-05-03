import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Search, Star, Clock, DollarSign } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { request } from "@/lib/http";

type DoctorRow = {
  id: string;
  specialty: string;
  experience: number;
  fees: number;
  rating: number;
  totalReviews?: number;
  available: boolean;
  user?: { name?: string; email?: string };
};

type DoctorsRes = {
  doctors: DoctorRow[];
  pagination: { total: number; page: number; limit: number };
};

function buildQuery(search: string, specialty: string, availability: string): string {
  const p = new URLSearchParams();
  p.set("limit", "60");
  p.set("page", "1");
  if (search.trim()) p.set("search", search.trim());
  if (specialty !== "All") p.set("specialty", specialty);
  if (availability === "available") p.set("available", "true");
  if (availability === "unavailable") p.set("available", "false");
  return `/api/doctors?${p.toString()}`;
}

export default function DoctorDirectory() {
  const [search, setSearch] = useState("");
  const [specialty, setSpecialty] = useState("All");
  const [availability, setAvailability] = useState("all");
  const [debounced, setDebounced] = useState("");
  const navigate = useNavigate();

  const q = useMemo(
    () => buildQuery(debounced, specialty, availability),
    [debounced, specialty, availability]
  );

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["doctors", q],
    queryFn: () => request<DoctorsRes>(q),
  });

  const doctors = data?.doctors ?? [];

  const specialties = useMemo(() => {
    const s = new Set<string>();
    (data?.doctors ?? []).forEach((d) => {
      if (d.specialty) s.add(d.specialty);
    });
    return ["All", ...Array.from(s).sort()];
  }, [data?.doctors]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Find a doctor</h2>
        <p className="text-muted-foreground">Browse MediBook providers from the live directory</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") setDebounced(search.trim());
            }}
            className="pl-10"
          />
        </div>
        <Button type="button" variant="secondary" onClick={() => setDebounced(search.trim())}>
          Search
        </Button>
        <Select value={specialty} onValueChange={setSpecialty}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Specialty" />
          </SelectTrigger>
          <SelectContent>
            {specialties.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={availability} onValueChange={setAvailability}>
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue placeholder="Availability" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="available">Available</SelectItem>
            <SelectItem value="unavailable">Unavailable</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isError && (
        <p className="text-destructive text-sm">
          {error instanceof Error ? error.message : "Could not load doctors"}
        </p>
      )}
      {isLoading && <p className="text-muted-foreground text-sm">Loading doctors…</p>}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {doctors.map((doc) => {
          const name = doc.user?.name || "Doctor";
          const initials = name
            .split(" ")
            .map((n) => n[0])
            .join("")
            .slice(0, 2)
            .toUpperCase();
          return (
            <Card key={doc.id} className="shadow-card hover:shadow-elevated transition-shadow">
              <CardContent className="p-5">
                <div className="flex items-start gap-4">
                  <Avatar className="h-12 w-12">
                    <AvatarFallback className="bg-primary text-primary-foreground font-semibold">{initials}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-foreground">{name}</h3>
                    <p className="text-sm text-muted-foreground">{doc.specialty}</p>
                  </div>
                  <Badge
                    variant={doc.available ? "default" : "secondary"}
                    className={doc.available ? "bg-success/10 text-success border-success/20" : ""}
                  >
                    {doc.available ? "Available" : "Unavailable"}
                  </Badge>
                </div>
                <div className="flex items-center gap-4 mt-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Star className="h-3.5 w-3.5 text-warning" />
                    {doc.rating?.toFixed?.(1) ?? doc.rating}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    {doc.experience} yrs
                  </span>
                  <span className="flex items-center gap-1">
                    <DollarSign className="h-3.5 w-3.5" />${doc.fees}
                  </span>
                </div>
                <Button
                  className="w-full mt-4"
                  disabled={!doc.available}
                  onClick={() => navigate(`/patient/appointments?doctor=${doc.id}`)}
                >
                  Book appointment
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
      {!isLoading && doctors.length === 0 && (
        <p className="text-center text-muted-foreground py-8">No doctors match your criteria.</p>
      )}
    </div>
  );
}
