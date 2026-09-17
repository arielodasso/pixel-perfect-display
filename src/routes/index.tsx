import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowUpRight, Building2, LineChart, Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import { organization, project, projectImages } from "@/data/demo";
import { formatNumber, formatPrice } from "@/lib/format";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Sigma — Showrooms digitales para desarrolladoras" },
      {
        name: "description",
        content:
          "Publicá tu proyecto en minutos: unidades por piso, precios, planos y consultas centralizadas.",
      },
      { property: "og:title", content: "Sigma — Showrooms digitales para desarrolladoras" },
      {
        property: "og:description",
        content:
          "Publicá tu proyecto en minutos: unidades por piso, precios, planos y consultas centralizadas.",
      },
    ],
  }),
  component: Home,
});

function Home() {
  return (
    <main className="min-h-screen">
      <header className="sticky top-0 z-40 glass">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
          <span className="text-sm font-semibold tracking-[0.3em] uppercase">Sigma</span>
          <nav className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm">
              <Link to="/admin">Panel</Link>
            </Button>
            <Button asChild size="sm">
              <Link to="/showroom/$slug" params={{ slug: project.slug }}>
                Ver showroom
              </Link>
            </Button>
          </nav>
        </div>
      </header>

      <section className="relative overflow-hidden">
        <img
          src={projectImages.hero}
          alt="Fachada del proyecto Torre Horizonte"
          className="absolute inset-0 size-full object-cover opacity-25"
        />
        <div className="relative mx-auto max-w-6xl px-5 py-24 sm:py-32">
          <p className="eyebrow">Showrooms digitales inmobiliarios</p>
          <h1 className="display-xl mt-5 max-w-[22ch] text-5xl sm:text-7xl">
            Tu proyecto, listo para vender online.
          </h1>
          <p className="mt-6 max-w-[52ch] text-base text-muted-foreground sm:text-lg">
            Sigma reúne el edificio, sus unidades, precios, planos y consultas en una sola
            experiencia. {organization.name} ya publica {project.name} desde{" "}
            {formatPrice(project.priceFrom, project.currency)}.
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link to="/showroom/$slug" params={{ slug: project.slug }}>
                Recorrer {project.name} <ArrowUpRight className="size-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/admin">Entrar al panel</Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-4 px-5 pb-24 sm:grid-cols-3">
        {[
          {
            icon: Building2,
            title: "Explorador de unidades",
            text: "Corte del edificio piso por piso con estado, superficie y precio en vivo.",
          },
          {
            icon: Users,
            title: "Leads centralizados",
            text: `Cada consulta llega con la unidad de interés. Ya hay ${formatNumber(project.leads)} registradas.`,
          },
          {
            icon: LineChart,
            title: "Métricas del proyecto",
            text: `${formatNumber(project.visits)} visitas al showroom, embudo y tipologías más buscadas.`,
          },
        ].map(({ icon: Icon, title, text }) => (
          <article key={title} className="panel p-6">
            <Icon className="size-5 text-primary" />
            <h2 className="mt-4 text-lg font-medium">{title}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{text}</p>
          </article>
        ))}
      </section>

      <footer className="hairline">
        <div className="mx-auto max-w-6xl px-5 py-8 text-xs text-muted-foreground">
          Sigma Real Estate — {organization.name} · {organization.email}
        </div>
      </footer>
    </main>
  );
}
