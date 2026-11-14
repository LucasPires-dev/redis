import { Globe } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { VISIBILITY_LABEL, type Visibility } from "@/lib/visibility";

/**
 * "Quem pode ver": members of the church only, or everyone. `hints` explain,
 * for the area at hand, what each choice means.
 */
export function VisibilityField({
  id,
  value,
  onChange,
  hints,
  disabled,
}: {
  id: string;
  value: Visibility;
  onChange: (value: Visibility) => void;
  hints: Record<Visibility, string>;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>Quem pode ver</Label>
      <Select value={value} onValueChange={(v) => onChange(v as Visibility)} disabled={disabled}>
        <SelectTrigger id={id} aria-label="Quem pode ver">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {(Object.keys(VISIBILITY_LABEL) as Visibility[]).map((v) => (
            <SelectItem key={v} value={v}>
              {VISIBILITY_LABEL[v]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <p className="text-xs text-muted-foreground" data-testid="visibility-hint">
        {hints[value]}
      </p>
    </div>
  );
}

/** Marks something open to everyone. */
export function PublicBadge() {
  return (
    <Badge variant="secondary" className="gap-1" data-testid="public-badge">
      <Globe className="h-3 w-3" /> Aberto ao público
    </Badge>
  );
}
