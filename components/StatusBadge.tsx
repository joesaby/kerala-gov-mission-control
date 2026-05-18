import type { KpiStatus } from "../data/types.ts";

const LABEL: Record<KpiStatus, string> = {
  "on-track": "On track",
  "improving": "Improving",
  "slipping": "Slipping",
  "off-track": "Off track",
};

const TONE: Record<KpiStatus, string> = {
  "on-track": "badge-success",
  "improving": "badge-info",
  "slipping": "badge-warning",
  "off-track": "badge-error",
};

export function StatusBadge({ status }: { status: KpiStatus }) {
  return (
    <span class={`badge ${TONE[status]} badge-sm gap-1.5 font-medium`}>
      <span class="status-dot bg-current opacity-70" aria-hidden="true" />
      {LABEL[status]}
    </span>
  );
}
