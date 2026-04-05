import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth, UserRole } from "@/contexts/AuthContext";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarTrigger, useSidebar,
} from "@/components/ui/sidebar";
import { NavLink } from "@/components/NavLink";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  LayoutDashboard, Calendar, FileText, Search, Stethoscope, ClipboardList, Pill,
  Users, BarChart3, Shield, LogOut, Menu, Heart
} from "lucide-react";

const roleNavItems: Record<UserRole, { title: string; url: string; icon: React.ElementType }[]> = {
  patient: [
    { title: "Dashboard", url: "/patient", icon: LayoutDashboard },
    { title: "Find Doctors", url: "/patient/doctors", icon: Search },
    { title: "Appointments", url: "/patient/appointments", icon: Calendar },
    { title: "Medical Records", url: "/patient/records", icon: FileText },
  ],
  doctor: [
    { title: "Dashboard", url: "/doctor", icon: LayoutDashboard },
    { title: "Consultations", url: "/doctor/consultations", icon: Stethoscope },
    { title: "Clinical Notes", url: "/doctor/notes", icon: ClipboardList },
    { title: "Prescriptions", url: "/doctor/prescriptions", icon: Pill },
  ],
  admin: [
    { title: "Dashboard", url: "/admin", icon: LayoutDashboard },
    { title: "Users", url: "/admin/users", icon: Users },
    { title: "Appointments", url: "/admin/appointments", icon: Calendar },
    { title: "Audit Logs", url: "/admin/audit", icon: Shield },
  ],
};

function AppSidebarContent() {
  const { user, logout } = useAuth();
  const { state } = useSidebar();
  const collapsed = state === "collapsed";

  if (!user) return null;
  const items = roleNavItems[user.role];

  return (
    <Sidebar collapsible="icon" className="border-r-0">
      <div className="flex items-center gap-2 p-4 border-b border-sidebar-border">
        <Heart className="h-6 w-6 text-sidebar-primary shrink-0" />
        {!collapsed && <span className="font-semibold text-sidebar-foreground text-lg">HealthCare</span>}
      </div>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/50 uppercase text-xs tracking-wider">
            {!collapsed && "Navigation"}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink to={item.url} end className="hover:bg-sidebar-accent/50 transition-colors" activeClassName="bg-sidebar-accent text-sidebar-primary font-medium">
                      <item.icon className="mr-2 h-4 w-4 shrink-0" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <div className="mt-auto p-4 border-t border-sidebar-border">
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8 shrink-0">
            <AvatarFallback className="bg-sidebar-primary text-sidebar-primary-foreground text-xs">
              {user.name.split(" ").map((n) => n[0]).join("")}
            </AvatarFallback>
          </Avatar>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-sidebar-foreground truncate">{user.name}</p>
              <p className="text-xs text-sidebar-foreground/50 capitalize">{user.role}</p>
            </div>
          )}
          {!collapsed && (
            <Button variant="ghost" size="icon" onClick={logout} className="text-sidebar-foreground/60 hover:text-sidebar-foreground shrink-0 h-8 w-8">
              <LogOut className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </Sidebar>
  );
}

export function DashboardLayout({ children, allowedRoles }: { children: React.ReactNode; allowedRoles: UserRole[] }) {
  const { user, isAuthenticated } = useAuth();
  const location = useLocation();

  if (!isAuthenticated || !user) return <Navigate to="/login" state={{ from: location }} replace />;
  if (!allowedRoles.includes(user.role)) return <Navigate to={`/${user.role}`} replace />;

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebarContent />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 flex items-center border-b bg-card px-4 shrink-0">
            <SidebarTrigger className="mr-4">
              <Menu className="h-5 w-5" />
            </SidebarTrigger>
            <h1 className="text-lg font-semibold text-foreground">
              {user.role === "patient" ? "Patient Portal" : user.role === "doctor" ? "Doctor Portal" : "Admin Panel"}
            </h1>
          </header>
          <main className="flex-1 p-4 md:p-6 overflow-auto animate-fade-in">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
