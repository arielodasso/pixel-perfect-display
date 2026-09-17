import { createFileRoute, notFound, Outlet, useRouterState } from "@tanstack/react-router";

import { ShowroomShell } from "@/components/masterplan/ShowroomShell";
import { project as projectDemo } from "@/data/demo";
import { formatPrice } from "@/lib/format";

export const Route = createFileRoute("/showroom/$slug")({
  loader: ({ params }) => {
    if (params.slug !== projectDemo.slug) throw notFound();
    return { slug: params.slug };
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      return {
        meta: [{ title: "Showroom no encontrado" }, { name: "robots", content: "noindex" }],
      };
    }
    const title = `${projectDemo.name} — ${projectDemo.city} | Showroom digital`;
    const description = `${projectDemo.tagline} ${projectDemo.floors} pisos, unidades de 1 a 3 ambientes desde ${formatPrice(projectDemo.priceFrom, projectDemo.currency)}.`;
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
      ],
    };
  },
  component: Showroom,
});

function Showroom() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  // Si la URL cae en una ruta hija (p. ej. /showroom/$slug/tour), la rendimos
  // directamente: el shell es standalone y no envuelve sus rutas anidadas.
  if (pathname !== `/showroom/${projectDemo.slug}`) {
    return <Outlet />;
  }

  return <ShowroomShell />;
}
