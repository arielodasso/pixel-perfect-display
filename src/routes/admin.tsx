import { createFileRoute, Link, Outlet } from "@tanstack/react-router";
import { BarChart3, Building2, LayoutDashboard, LayoutGrid, Settings, Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { LucideIcon } from "lucide-react";
import { useOrganization, useProject } from "@/services/store";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Panel — Sigma Real Estate" },
      {
        name: "description",
        content: "Gestioná proyectos, unidades, leads y métricas de tus showrooms digitales.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminLayout,
});

type AdminTo =
  | "/admin"
  | "/admin/proyectos"
  | "/admin/unidades"
  | "/admin/leads"
  | "/admin/analytics"
  | "/admin/configuracion";

type NavItem = {
  to: AdminTo;
  label: string;
  icon: LucideIcon;
  exact?: boolean;
};

const nav: NavItem[] = [
  { to: "/admin", label: "Resumen", icon: LayoutDashboard, exact: true },
  { to: "/admin/proyectos", label: "Proyectos", icon: Building2 },
  { to: "/admin/unidades", label: "Unidades", icon: LayoutGrid },
  { to: "/admin/leads", label: "Leads", icon: Users },
  { to: "/admin/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/admin/configuracion", label: "Configuración", icon: Settings },
];

function AdminLayout() {
  const organization = useOrganization();
  const project = useProject();

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[248px_1fr]">
      <aside className="border-b border-sidebar-border bg-sidebar lg:sticky lg:top-0 lg:h-screen lg:border-b-0 lg:border-r">
        <div className="flex items-center justify-between gap-3 px-5 py-5">
          <Link to="/" className="text-sm font-semibold tracking-[0.3em] uppercase">
            Sigma
          </Link>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-3 pb-4 lg:flex-col lg:overflow-visible">
          {nav.map(({ to, label, icon: Icon, exact }) => (
            <Link
              key={to}
              to={to}
              activeOptions={{ exact: Boolean(exact) }}
              className="flex items-center gap-2.5 rounded-md px-3 py-2 text-sm whitespace-nowrap text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              activeProps={{
                className: "bg-sidebar-accent text-sidebar-accent-foreground font-medium",
              }}
            >
              <Icon className="size-4" />
              {label}
            </Link>
          ))}
        </nav>
        <div className="hidden px-5 py-4 lg:block">
          <p className="eyebrow">Organización</p>
          <p className="mt-2 text-sm">{organization.name}</p>
          <Button asChild size="sm" variant="outline" className="mt-4 w-full">
            <Link to="/showroom/$slug" params={{ slug: project.slug }}>
              Ver showroom
            </Link>
          </Button>
        </div>
      </aside>

      <main className="min-w-0">
        <Outlet />
      </main>
    </div>
  );
}
