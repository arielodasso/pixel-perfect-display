import { BuildingModelViewer } from "@/components/building/BuildingModelViewer";
import type { Project } from "@/types/domain";

interface Props {
  project: Project;
}

export function ModelView({ project }: Props) {
  return (
    <div className="h-full w-full overflow-hidden">
      <BuildingModelViewer
        modelUrl="/assets/modern-building.glb"
        className="h-full w-full"
      />
    </div>
  );
}