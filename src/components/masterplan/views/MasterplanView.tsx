import type { Project, Unit } from "@/types/domain";

import { Masterplan3D } from "../Masterplan3D";
import { UnitRenderPanel } from "../UnitRenderPanel";

interface Props {
  project: Project;
  units: Unit[];
  selected: Unit | null;
  onSelect: (unit: Unit | null) => void;
  onConsult: (unit: Unit) => void;
  onCompare: (unit: Unit) => void;
  compareActive: boolean;
  onTour360: (unit: Unit) => void;
}

export function MasterplanView({
  project,
  units,
  selected,
  onSelect,
  onConsult,
  onCompare,
  compareActive,
  onTour360,
}: Props) {
  return (
    <div className="relative h-full w-full overflow-hidden">
      <Masterplan3D
        project={project}
        units={units}
        selectedCode={selected?.code ?? null}
        onSelect={onSelect}
      />

      <div className="pointer-events-none absolute inset-x-3 bottom-3 flex flex-col items-end lg:inset-x-auto lg:bottom-4 lg:right-4 lg:top-4 lg:w-[368px]">
        <UnitRenderPanel
          unit={selected}
          project={project}
          onConsult={onConsult}
          onCompare={onCompare}
          compareActive={compareActive}
          onTour360={onTour360}
          className="pointer-events-auto max-h-[46vh] w-full overflow-y-auto rounded-xl lg:max-h-full"
        />
      </div>
    </div>
  );
}
