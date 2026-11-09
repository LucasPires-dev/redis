import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useRenewCell, type Cell } from "@/lib/api/cells";
import { apiErrorMessage } from "@/lib/api/client";
import { formatDate, useSeasons } from "@/lib/api/seasons";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cell: Cell;
}

// Carries the cell over to a later season. The current cell stays as history.
export function RenewCellDialog({ open, onOpenChange, cell }: Props) {
  const { data: seasons } = useSeasons();
  const renew = useRenewCell(cell.id);
  const navigate = useNavigate();
  const [seasonId, setSeasonId] = useState("");
  const [copyMembers, setCopyMembers] = useState(true);

  // Only seasons that start after this cell's season.
  const options = (seasons ?? [])
    .filter((s) => !cell.season || s.start_date > cell.season.start_date)
    .sort((a, b) => a.start_date.localeCompare(b.start_date));

  useEffect(() => {
    if (open) {
      setSeasonId(options[0]?.id ?? "");
      setCopyMembers(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, seasons]);

  const submit = () =>
    renew.mutate(
      { season_id: seasonId, copy_members: copyMembers },
      {
        onSuccess: (created) => {
          toast.success("Célula renovada para a nova temporada");
          onOpenChange(false);
          navigate({ to: "/app/celulas/$id", params: { id: created.id } });
        },
        onError: (e) => toast.error(apiErrorMessage(e, "Não foi possível renovar a célula.")),
      },
    );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Renovar para outra temporada</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Cria a célula "{cell.name}" na temporada escolhida, com os mesmos dados e líderes. Esta
          célula, com seus membros e encontros, continua guardada como histórico.
        </p>
        {options.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Não há temporada posterior cadastrada. Peça ao responsável geral para criar a próxima.
          </p>
        ) : (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Temporada</Label>
              <Select value={seasonId} onValueChange={setSeasonId}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {options.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name} ({formatDate(s.start_date)} a {formatDate(s.end_date)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <Checkbox checked={copyMembers} onCheckedChange={(c) => setCopyMembers(c === true)} />
              Levar os {cell.member_count} membros atuais
            </label>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={submit} disabled={!seasonId || renew.isPending}>
            {renew.isPending ? "Renovando…" : "Renovar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
