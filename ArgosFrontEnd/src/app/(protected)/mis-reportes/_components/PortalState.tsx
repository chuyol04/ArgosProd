import Link from "next/link";
import { AlertTriangle, FileQuestion, LockKeyhole } from "lucide-react";

type PortalStateProps = {
  kind: "empty" | "error" | "restricted" | "not-found";
  title: string;
  description: string;
  backHref?: string;
  backLabel?: string;
};

const icons = {
  empty: FileQuestion,
  error: AlertTriangle,
  restricted: LockKeyhole,
  "not-found": FileQuestion,
};

export function PortalState({
  kind,
  title,
  description,
  backHref,
  backLabel = "Volver a mis reportes",
}: PortalStateProps) {
  const Icon = icons[kind];

  return (
    <div className="flex min-h-[320px] items-center justify-center rounded-xl border border-dashed bg-card px-5 py-12 text-center">
      <div className="max-w-md">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <Icon className="h-6 w-6" aria-hidden="true" />
        </span>
        <h2 className="mt-4 text-lg font-semibold">{title}</h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
        {backHref && (
          <Link
            href={backHref}
            className="mt-6 inline-flex min-h-11 items-center justify-center rounded-md border bg-background px-4 text-sm font-medium hover:bg-muted"
          >
            {backLabel}
          </Link>
        )}
      </div>
    </div>
  );
}
