import { Building2, CalendarCheck, Dumbbell, Droplet, Flame, Users, LayoutGrid } from "lucide-react";

const MAP: Record<string, React.ElementType> = {
  salao:         Users,
  piscina:       Droplet,
  reuniao:       CalendarCheck,
  academia:      Dumbbell,
  churrasqueira: Flame,
  quadra:        LayoutGrid,
  default:       Building2,
};

export function getIcone(slug: string): React.ElementType {
  return MAP[slug] ?? Building2;
}
