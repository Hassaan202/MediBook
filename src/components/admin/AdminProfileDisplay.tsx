import type { ReactNode } from "react";
import { format, parseISO } from "date-fns";
import { Badge } from "@/components/ui/badge";

type Address = { street?: string; city?: string; state?: string; zipCode?: string; country?: string };
type Emergency = { name?: string; phone?: string; relationship?: string };

type PatientProfile = {
  dateOfBirth?: string;
  gender?: string;
  bloodType?: string;
  phone?: string;
  address?: Address;
  emergencyContact?: Emergency;
};

type DoctorProfile = {
  specialty?: string;
  experience?: number;
  fees?: number;
  bio?: string;
  qualifications?: string[];
};

export type ActivityEntry = {
  action?: string;
  description?: string;
  timestamp?: string;
  category?: string;
  severity?: string;
};

export function formatDisplayDate(iso?: string) {
  if (!iso) return "—";
  try {
    const s = iso.includes("T") ? iso : `${iso}T00:00:00`;
    return format(parseISO(s), "PP");
  } catch {
    return iso;
  }
}

export function formatDisplayDateTime(iso?: string) {
  if (!iso) return "—";
  try {
    return format(parseISO(iso), "PPp");
  } catch {
    return String(iso);
  }
}

function humanizeAction(action?: string) {
  if (!action) return "Activity";
  return action
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2">
      <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-sm text-foreground mt-0.5 break-words">{value || "—"}</p>
    </div>
  );
}

function capitalizeWord(s: string) {
  if (!s) return "—";
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

/** Patient or doctor profile — hides raw IDs and Mongo noise. */
export function AdminProfileFields({ role, profile }: { role: string; profile: Record<string, unknown> | null }) {
  if (!profile || Object.keys(profile).length === 0) {
    return <p className="text-sm text-muted-foreground">No profile on file for this account type.</p>;
  }

  if (role === "doctor") {
    const p = profile as unknown as DoctorProfile;
    const quals = Array.isArray(p.qualifications) ? p.qualifications.filter(Boolean).join(", ") : "—";
    return (
      <div className="grid gap-2 sm:grid-cols-2">
        <Detail label="Specialty" value={p.specialty ?? "—"} />
        <Detail label="Experience" value={p.experience != null ? `${p.experience} years` : "—"} />
        <Detail label="Consultation fee" value={p.fees != null ? `$${p.fees}` : "—"} />
        <Detail label="Qualifications" value={quals} />
        {p.bio ? (
          <div className="sm:col-span-2 rounded-lg border border-border/60 bg-muted/20 px-3 py-2">
            <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Bio</p>
            <p className="text-sm text-foreground mt-0.5 whitespace-pre-wrap">{p.bio}</p>
          </div>
        ) : null}
      </div>
    );
  }

  if (role === "patient") {
    const p = profile as unknown as PatientProfile;
    const addr = p.address || {};
    const addrLine = [addr.street, addr.city, addr.state, addr.zipCode, addr.country].filter(Boolean).join(", ");
    const ec = p.emergencyContact || {};

    return (
      <div className="grid gap-2 sm:grid-cols-2">
        <Detail label="Date of birth" value={formatDisplayDate(p.dateOfBirth)} />
        <Detail label="Gender" value={p.gender ? capitalizeWord(p.gender) : "—"} />
        <Detail label="Blood type" value={p.bloodType ?? "—"} />
        <Detail label="Phone" value={p.phone ?? "—"} />
        <div className="sm:col-span-2 rounded-lg border border-border/60 bg-muted/20 px-3 py-2">
          <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Address</p>
          <p className="text-sm text-foreground mt-0.5">{addrLine || "—"}</p>
        </div>
        <div className="sm:col-span-2 rounded-lg border border-border/60 bg-muted/20 px-3 py-2">
          <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Emergency contact</p>
          <p className="text-sm text-foreground mt-0.5">
            {[ec.name, ec.phone, ec.relationship].filter(Boolean).join(" · ") || "—"}
          </p>
        </div>
      </div>
    );
  }

  return <p className="text-sm text-muted-foreground">No displayable profile for this role.</p>;
}

export function AdminActivityLog({ entries }: { entries: ActivityEntry[] }) {
  if (!entries?.length) {
    return <p className="text-sm text-muted-foreground">No recent activity recorded.</p>;
  }

  return (
    <ul className="space-y-0 divide-y divide-border/60 rounded-lg border border-border/60 bg-muted/10">
      {entries.map((a, i) => (
        <li key={`${a.timestamp}-${i}`} className="px-3 py-3 first:rounded-t-lg last:rounded-b-lg">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium text-foreground">{humanizeAction(a.action)}</span>
            {a.category ? (
              <Badge variant="outline" className="text-[10px] font-normal capitalize">
                {a.category}
              </Badge>
            ) : null}
            {a.severity ? (
              <Badge variant="secondary" className="text-[10px] font-normal capitalize">
                {a.severity}
              </Badge>
            ) : null}
          </div>
          {a.description ? <p className="text-sm text-muted-foreground mt-1">{a.description}</p> : null}
          <p className="text-xs text-muted-foreground mt-1.5">{formatDisplayDateTime(a.timestamp)}</p>
        </li>
      ))}
    </ul>
  );
}

type AccountFields = {
  role: string;
  isActive?: boolean;
  createdAt?: string;
  emailVerified?: boolean;
  registrationApproved?: boolean;
  registrationRejectedAt?: string | null;
  lastLogin?: string | null;
};

export function AdminAccountSummary({ user }: { user: AccountFields }) {
  const active = user.isActive !== false;
  const verified =
    user.emailVerified === true ? "Yes" : user.emailVerified === false ? "No" : "—";
  let approval = "—";
  if (user.role === "admin") {
    approval = "N/A";
  } else if (user.registrationRejectedAt) {
    approval = "Rejected";
  } else if (user.registrationApproved === true) {
    approval = "Approved";
  } else if (user.registrationApproved === false) {
    approval = "Pending approval";
  }

  return (
    <div className="grid gap-2 sm:grid-cols-2">
      <Detail label="Role" value={capitalizeWord(user.role)} />
      <Detail label="Account status" value={active ? "Active" : "Inactive"} />
      <Detail label="Email verified" value={verified} />
      <Detail label="Registration" value={approval} />
      <Detail label="Member since" value={formatDisplayDate(user.createdAt)} />
      <Detail label="Last sign-in" value={user.lastLogin ? formatDisplayDateTime(user.lastLogin) : "—"} />
      {user.registrationRejectedAt ? (
        <div className="sm:col-span-2 rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2">
          <p className="text-[10px] font-medium uppercase tracking-wide text-destructive">Rejected on</p>
          <p className="text-sm text-foreground mt-0.5">{formatDisplayDateTime(user.registrationRejectedAt)}</p>
        </div>
      ) : null}
    </div>
  );
}

export function AdminProfileSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-2">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</h3>
      {children}
    </div>
  );
}

export function AdminProfileSections({ children }: { children: ReactNode }) {
  return <div className="space-y-5">{children}</div>;
}
