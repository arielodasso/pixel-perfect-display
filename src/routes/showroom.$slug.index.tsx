import { createFileRoute } from "@tanstack/react-router";

import { ShowroomShell } from "@/components/masterplan/ShowroomShell";
import { project as projectDemo } from "@/data/demo";
import { formatPrice } from "@/lib/format";

export const Route = createFileRoute("/showroom/$slug/")({
  head: () => {
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
  component: ShowroomIndex,
});

function ShowroomIndex() {
  return <ShowroomShell />;
}
