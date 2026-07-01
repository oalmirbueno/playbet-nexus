import ComercialPipeline from "@/pages/ComercialPipeline";

// Manager's pipeline reuses the main kanban — RLS filters cards to the manager's squad.
export default function GerentePipeline() {
  return <ComercialPipeline />;
}
