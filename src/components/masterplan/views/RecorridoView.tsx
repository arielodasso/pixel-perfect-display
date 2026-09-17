import { TourViewer } from "@/features/virtual-tour/TourViewer";
import type { VirtualTour } from "@/features/virtual-tour/types";
import type { ShowroomSettings } from "@/services/store";
import type { Organization, Project, Unit } from "@/types/domain";

interface Props {
  tour: VirtualTour;
  project: Project;
  organization: Organization;
  settings: ShowroomSettings;
  units: Unit[];
  onConsult: (unit: Unit | null) => void;
}

export function RecorridoView({ tour, project, organization, settings, units, onConsult }: Props) {
  return (
    <TourViewer
      tour={tour}
      project={project}
      organization={organization}
      settings={settings}
      units={units}
      onConsult={onConsult}
      preview={!tour.published}
      embedded
    />
  );
}
