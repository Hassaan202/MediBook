import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Search, Star, Clock, DollarSign } from "lucide-react";
import { doctors } from "@/data/mockData";
import { useNavigate } from "react-router-dom";

const specialties = ["All", ...new Set(doctors.map((d) => d.specialty))];

export default function DoctorDirectory() {
  const [search, setSearch] = useState("");
  const [specialty, setSpecialty] = useState("All");
  const [availability, setAvailability] = useState("all");
  const navigate = useNavigate();

  const filtered = doctors.filter((d) => {
    const matchSearch = d.name.toLowerCase().includes(search.toLowerCase()) || d.specialty.toLowerCase().includes(search.toLowerCase());
    const matchSpecialty = specialty === "All" || d.specialty === specialty;
    const matchAvailability = availability === "all" || (availability === "available" ? d.available : !d.available);
    return matchSearch && matchSpecialty && matchAvailability;
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Find a Doctor</h2>
        <p className="text-muted-foreground">Browse and book appointments with top specialists</p>
      </div>

      
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search by name or specialty..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
        </div>
        <Select value={specialty} onValueChange={setSpecialty}>
          <SelectTrigger className="w-full sm:w-48"><SelectValue placeholder="Specialty" /></SelectTrigger>
          <SelectContent>
            {specialties.map((s) => (<SelectItem key={s} value={s}>{s}</SelectItem>))}
          </SelectContent>
        </Select>
        <Select value={availability} onValueChange={setAvailability}>
          <SelectTrigger className="w-full sm:w-44"><SelectValue placeholder="Availability" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="available">Available</SelectItem>
            <SelectItem value="unavailable">Unavailable</SelectItem>
          </SelectContent>
        </Select>
      </div>

      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((doc) => (
          <Card key={doc.id} className="shadow-card hover:shadow-elevated transition-shadow">
            <CardContent className="p-5">
              <div className="flex items-start gap-4">
                <Avatar className="h-12 w-12">
                  <AvatarFallback className="bg-primary text-primary-foreground font-semibold">{doc.avatar}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-foreground">{doc.name}</h3>
                  <p className="text-sm text-muted-foreground">{doc.specialty}</p>
                </div>
                <Badge variant={doc.available ? "default" : "secondary"} className={doc.available ? "bg-success/10 text-success border-success/20" : ""}>
                  {doc.available ? "Available" : "Unavailable"}
                </Badge>
              </div>
              <div className="flex items-center gap-4 mt-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1"><Star className="h-3.5 w-3.5 text-warning" />{doc.rating}</span>
                <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{doc.experience} yrs</span>
                <span className="flex items-center gap-1"><DollarSign className="h-3.5 w-3.5" />${doc.fees}</span>
              </div>
              <Button className="w-full mt-4" disabled={!doc.available} onClick={() => navigate(`/patient/appointments?doctor=${doc.id}`)}>
                Book Appointment
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
      {filtered.length === 0 && <p className="text-center text-muted-foreground py-8">No doctors found matching your criteria.</p>}
    </div>
  );
}
