import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { PersonSearch } from "@/components/cells/PersonSearch";
import {
  initialSelection,
  selectionComplete,
  toChoices,
  type FeeSelection,
} from "@/lib/fee-selection";
import { FeeChoicesPicker } from "@/components/courses/FeeChoicesPicker";
import { holdsSeat, useAddEnrollment, type CourseClass, type Enrollment } from "@/lib/api/courses";
import { useCpfPrompt } from "@/hooks/use-cpf-prompt";
import type { PersonMini } from "@/lib/api/people";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  courseClass: CourseClass;
  existingEnrollments: Enrollment[];
}

export function AddEnrollmentDialog({
  open,
  onOpenChange,
  courseClass,
  existingEnrollments,
}: Props) {
  const addEnrollment = useAddEnrollment();
  const [selected, setSelected] = useState<PersonMini | null>(null);
  const [selection, setSelection] = useState<FeeSelection>({});
  const [installments, setInstallments] = useState(1);
  const [sendCharge, setSendCharge] = useState(false);
  const paid = courseClass.fee_items.length > 0;
  const cpfPrompt = useCpfPrompt(selected?.name);

  // People who already hold a seat can't be enrolled again (cancelled ones can).
  const excludeIds = new Set(existingEnrollments.filter(holdsSeat).map((e) => e.person.id));

  useEffect(() => {
    if (!open) return;
    setSelected(null);
    setSelection(initialSelection(courseClass.fee_items));
    setInstallments(1);
    setSendCharge(false);
  }, [open, courseClass.fee_items]);

  const submit = (cpf?: string) => {
    if (!selected) return;
    addEnrollment.mutate(
      {
        classId: courseClass.id,
        person_id: selected.id,
        ...(paid ? { items: toChoices(selection), installments, send_charge: sendCharge } : {}),
        ...(cpf ? { cpf } : {}),
      },
      {
        onSuccess: () => {
          toast.success(`${selected.name} inscrito na turma`);
          onOpenChange(false);
        },
        onError: (e) =>
          cpfPrompt.handleError(e, "Não foi possível inscrever o aluno.", (c) => submit(c)),
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Inscrever aluno</DialogTitle>
          {paid && (
            <DialogDescription>
              Turma paga: escolha os itens. O pagamento pode ser feito na secretaria (registre
              depois em “Financeiro”) ou por um link do Asaas.
            </DialogDescription>
          )}
        </DialogHeader>

        <div className="space-y-4">
          {selected ? (
            <div className="flex items-center justify-between rounded-md border px-3 py-2">
              <div>
                <p className="text-sm font-medium">{selected.name}</p>
                <p className="text-xs text-muted-foreground">{selected.email}</p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setSelected(null)}>
                Trocar
              </Button>
            </div>
          ) : (
            <div className="space-y-1.5">
              <Label>Buscar pessoa</Label>
              <PersonSearch
                endpoint={`/api/course-classes/${courseClass.id}/search-people/`}
                onSelect={setSelected}
                excludeIds={excludeIds}
                placeholder="Buscar por nome ou email"
              />
            </div>
          )}

          {paid && (
            <>
              <FeeChoicesPicker
                items={courseClass.fee_items}
                selection={selection}
                onChange={setSelection}
                maxInstallments={courseClass.max_installments}
                installments={installments}
                onInstallmentsChange={setInstallments}
              />
              <label className="flex items-start gap-2 text-sm">
                <Checkbox
                  checked={sendCharge}
                  onCheckedChange={(v) => setSendCharge(v === true)}
                  className="mt-0.5"
                />
                <span>
                  Gerar link de pagamento online (Asaas)
                  <span className="block text-xs text-muted-foreground">
                    Sem o link, a matrícula fica aguardando pagamento presencial, sem prazo de
                    reserva.
                  </span>
                </span>
              </label>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={() => submit()}
            disabled={
              !selected ||
              addEnrollment.isPending ||
              (paid && !selectionComplete(courseClass.fee_items, selection))
            }
          >
            {addEnrollment.isPending ? "Salvando…" : "Inscrever"}
          </Button>
        </DialogFooter>
        {cpfPrompt.dialog}
      </DialogContent>
    </Dialog>
  );
}
