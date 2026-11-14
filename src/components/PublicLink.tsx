import { Share2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/** A public page's link, to share (copy, or the phone's share sheet). */
export function PublicLink({ path, label = "Link público" }: { path: string; label?: string }) {
  const url = typeof window === "undefined" ? "" : `${window.location.origin}${path}`;
  async function share() {
    try {
      if (navigator.share) {
        await navigator.share({ url });
        return;
      }
      await navigator.clipboard.writeText(url);
      toast.success("Link copiado.");
    } catch {
      // Share sheet closed, or no clipboard: the link stays visible to copy by hand.
    }
  }
  return (
    <div className="space-y-1.5">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="flex gap-2">
        <Input readOnly value={url} className="text-xs" data-testid="public-link" />
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="shrink-0 gap-1.5"
          onClick={share}
        >
          <Share2 className="h-4 w-4" /> Compartilhar
        </Button>
      </div>
    </div>
  );
}
