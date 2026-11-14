import { useState } from "react";
import { Download } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { apiErrorMessage } from "@/lib/api/client";
import { downloadCertificate } from "@/lib/api/courses";

/** Downloads an enrollment's completion certificate (PDF). */
export function CertificateButton({
  enrollmentId,
  courseName,
  personName,
  compact,
}: {
  enrollmentId: string;
  courseName: string;
  personName: string;
  /** Small icon-and-word button for lists. */
  compact?: boolean;
}) {
  const [loading, setLoading] = useState(false);
  const download = async () => {
    setLoading(true);
    try {
      await downloadCertificate(enrollmentId, courseName, personName);
    } catch (e) {
      toast.error(apiErrorMessage(e, "Não foi possível baixar o certificado."));
    } finally {
      setLoading(false);
    }
  };
  return (
    <Button
      size="sm"
      variant={compact ? "ghost" : "default"}
      className={compact ? "h-7 gap-1 px-2 text-xs" : "gap-1.5"}
      disabled={loading}
      onClick={download}
      aria-label={`Baixar certificado de ${personName}`}
    >
      <Download className={compact ? "h-3.5 w-3.5" : "h-4 w-4"} />
      {loading ? "Gerando…" : compact ? "Certificado" : "Baixar certificado"}
    </Button>
  );
}
