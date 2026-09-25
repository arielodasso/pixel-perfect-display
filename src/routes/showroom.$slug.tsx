import { createFileRoute, notFound, Outlet } from "@tanstack/react-router";

import { project as projectDemo } from "@/data/demo";

export const Route = createFileRoute("/showroom/$slug")({
  loader: ({ params }) => {
    if (params.slug !== projectDemo.slug) throw notFound();
    return { slug: params.slug };
  },
  component: ShowroomLayout,
});

function ShowroomLayout() {
  return <Outlet />;
}
