import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useMe } from "@/lib/api/auth";
import {
  useCreateCourseClass,
  useUpdateCourseClass,
  WEEKDAY_LABEL,
  type ClassFeeItem,
  type CourseClass,
  type CourseClassInput,
} from "@/lib/api/courses";
import { useCampuses } from "@/lib/api/ministries";
import { apiErrorMessage } from "@/lib/api/client";
import { formatBRL, MIN_PAID_PRICE_CENTS } from "@/lib/api/payments";
import { centsToInput, parseCents } from "@/lib/money";

const NONE = "none";
const WEEKDAYS = [1, 2, 3, 4, 5, 6, 7] as const;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  courseId: string;
  /** Editing an existing class; omitted to create one. */
  courseClass?: CourseClass;
}

/** One fee item while it's being edited: prices and options as typed text. */
interface ItemDraft {
  key: string;
  id?: string;
  name: string;
  price: string;
  required: boolean;
  options: string;
}

let draftKey = 0;
const nextKey = () => `item-${++draftKey}`;

function toDraft(item: ClassFeeItem): ItemDraft {
  return {
    key: nextKey(),
    id: item.id,
    name: item.name,
    price: centsToInput(item.price_cents),
    required: item.required,
    options: item.options.join(", "),
  };
}

export function CourseClassFormDialog({ open, onOpenChange, courseId, courseClass }: Props) {
  const { data: me } = useMe();
  const { data: campuses } = useCampuses();
  const createClass = useCreateCourseClass();
  const updateClass = useUpdateCourseClass(courseClass?.id ?? "");
  const editing = !!courseClass;
  const saving = createClass.isPending || updateClass.isPending;

  const [name, setName] = useState("");
  const [campusId, setCampusId] = useState("");
  const [weekday, setWeekday] = useState<string>(NONE);
  const [startTime, setStartTime] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [description, setDescription] = useState("");
  const [selfEnrollment, setSelfEnrollment] = useState(false);
  const [capacity, setCapacity] = useState("");
  const [deadline, setDeadline] = useState("");
  const [reservationDays, setReservationDays] = useState("3");
  const [maxInstallments, setMaxInstallments] = useState("1");
  const [refundBeforeStart, setRefundBeforeStart] = useState(true);
  const [items, setItems] = useState<ItemDraft[]>([]);

  // Reset only when opening (or switching class) — not when campuses/me load,
  // which would wipe what the user already typed.
  useEffect(() => {
    if (!open) return;
    const c = courseClass;
    setName(c?.name ?? "");
    setCampusId(c?.campus.id ?? "");
    setWeekday(c?.weekday ? String(c.weekday) : NONE);
    setStartTime(c?.start_time?.slice(0, 5) ?? "");
    setStartDate(c?.start_date ?? "");
    setEndDate(c?.end_date ?? "");
    setDescription(c?.description ?? "");
    setSelfEnrollment(c?.self_enrollment ?? false);
    setCapacity(c?.max_capacity != null ? String(c.max_capacity) : "");
    setDeadline(c?.enrollment_deadline ?? "");
    setReservationDays(String(c?.reservation_days ?? 3));
    setMaxInstallments(String(c?.max_installments ?? 1));
    setRefundBeforeStart(c?.refund_before_start ?? true);
    setItems((c?.fee_items ?? []).map(toDraft));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, courseClass?.id]);

  useEffect(() => {
    if (open && !courseClass && !campusId && me?.campus?.id) setCampusId(me.campus.id);
  }, [open, courseClass, campusId, me?.campus?.id]);

  const updateItem = (key: string, patch: Partial<ItemDraft>) =>
    setItems((prev) => prev.map((i) => (i.key === key ? { ...i, ...patch } : i)));

  const parsedItems = items.map((i) => ({ draft: i, cents: parseCents(i.price) }));
  const itemErrors = new Map<string, string>();
  const names = new Set<string>();
  for (const { draft, cents } of parsedItems) {
    const key = draft.name.trim().toLowerCase();
    if (!key) itemErrors.set(draft.key, "Informe o nome do item.");
    else if (names.has(key)) itemErrors.set(draft.key, "Já existe um item com esse nome.");
    else if (!(cents > 0)) itemErrors.set(draft.key, "Informe um valor válido.");
    names.add(key);
  }
  const basePrice = parsedItems
    .filter(({ draft, cents }) => draft.required && cents > 0)
    .reduce((sum, { cents }) => sum + cents, 0);
  const priceError =
    basePrice > 0 && basePrice < MIN_PAID_PRICE_CENTS
      ? `A soma dos itens obrigatórios deve ser de pelo menos ${formatBRL(MIN_PAID_PRICE_CENTS)} (mínimo do Asaas) — ou zero.`
      : "";
  const hasPaidItems = parsedItems.some(({ cents }) => cents > 0);

  const valid =
    name.trim().length > 0 && campusId.length > 0 && itemErrors.size === 0 && !priceError;

  const submit = () => {
    const payload: CourseClassInput = {
      course_id: courseId,
      campus_id: campusId,
      name: name.trim(),
      weekday: weekday === NONE ? null : Number(weekday),
      start_time: startTime || null,
      start_date: startDate || null,
      end_date: endDate || null,
      description: description.trim(),
      self_enrollment: selfEnrollment,
      max_capacity: capacity ? Number(capacity) : null,
      enrollment_deadline: deadline || null,
      reservation_days: Number(reservationDays) || 3,
      max_installments: Number(maxInstallments) || 1,
      refund_before_start: refundBeforeStart,
      fee_items: parsedItems.map(({ draft, cents }, order) => ({
        ...(draft.id ? { id: draft.id } : {}),
        name: draft.name.trim(),
        price_cents: cents,
        required: draft.required,
        options: draft.options
          .split(",")
          .map((o) => o.trim())
          .filter(Boolean),
        order,
      })),
    };
    const handlers = {
      onSuccess: () => {
        toast.success(editing ? "Turma atualizada" : "Turma criada");
        onOpenChange(false);
      },
      onError: (e: unknown) => toast.error(apiErrorMessage(e, "Não foi possível salvar a turma.")),
    };
    if (editing) updateClass.mutate(payload, handlers);
    else createClass.mutate(payload, handlers);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{editing ? "Editar turma" : "Nova turma"}</DialogTitle>
          <DialogDescription>
            Dados da turma, inscrições e o que a matrícula custa.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="class-name">Nome</Label>
            <Input
              id="class-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Turma A — Noturno"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Campus</Label>
            <Select value={campusId} onValueChange={setCampusId}>
              <SelectTrigger aria-label="Campus">
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {(campuses ?? []).map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Dia da semana</Label>
              <Select value={weekday} onValueChange={setWeekday}>
                <SelectTrigger aria-label="Dia da semana">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>Não definido</SelectItem>
                  {WEEKDAYS.map((d) => (
                    <SelectItem key={d} value={String(d)}>
                      {WEEKDAY_LABEL[d]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="class-time">Horário</Label>
              <Input
                id="class-time"
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Período (opcional)</Label>
            <div className="grid grid-cols-2 gap-3">
              <Input
                type="date"
                aria-label="Início"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
              <Input
                type="date"
                aria-label="Fim"
                value={endDate}
                min={startDate || undefined}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="class-desc">Descrição</Label>
            <Textarea
              id="class-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <Separator />

          <section className="space-y-4">
            <h3 className="text-sm font-semibold">Inscrições</h3>

            <div className="flex items-start justify-between gap-4 rounded-md border p-3">
              <div>
                <Label htmlFor="class-self-enrollment">Inscrições abertas aos membros</Label>
                <p className="text-xs text-muted-foreground">
                  A turma aparece em “Cursos abertos” e os membros se matriculam sozinhos.
                </p>
              </div>
              <Switch
                id="class-self-enrollment"
                checked={selfEnrollment}
                onCheckedChange={setSelfEnrollment}
              />
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="class-capacity">Vagas</Label>
                <Input
                  id="class-capacity"
                  type="number"
                  min={1}
                  value={capacity}
                  onChange={(e) => setCapacity(e.target.value)}
                  placeholder="Sem limite"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="class-deadline">Inscrições até</Label>
                <Input
                  id="class-deadline"
                  type="date"
                  value={deadline}
                  max={endDate || undefined}
                  onChange={(e) => setDeadline(e.target.value)}
                />
              </div>
            </div>
          </section>

          <Separator />

          <section className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-semibold">Taxas da matrícula</h3>
                <p className="text-xs text-muted-foreground">
                  Material, apostila, camiseta… Itens obrigatórios entram em toda matrícula; os
                  opcionais o aluno escolhe. Sem itens, a turma é gratuita.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  setItems((prev) => [
                    ...prev,
                    { key: nextKey(), name: "", price: "", required: true, options: "" },
                  ])
                }
              >
                <Plus className="mr-1 h-4 w-4" /> Item
              </Button>
            </div>

            {items.map((item, index) => {
              const error = itemErrors.get(item.key);
              return (
                <div
                  key={item.key}
                  className="space-y-2 rounded-md border p-3"
                  data-testid="fee-item"
                >
                  <div className="grid grid-cols-[1fr_7rem_auto] items-end gap-2">
                    <div className="space-y-1">
                      <Label htmlFor={`${item.key}-name`} className="text-xs">
                        Item {index + 1}
                      </Label>
                      <Input
                        id={`${item.key}-name`}
                        aria-label={`Nome do item ${index + 1}`}
                        value={item.name}
                        onChange={(e) => updateItem(item.key, { name: e.target.value })}
                        placeholder="Ex: Apostila"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor={`${item.key}-price`} className="text-xs">
                        Valor (R$)
                      </Label>
                      <Input
                        id={`${item.key}-price`}
                        aria-label={`Valor do item ${index + 1}`}
                        inputMode="decimal"
                        value={item.price}
                        onChange={(e) => updateItem(item.key, { price: e.target.value })}
                        placeholder="0,00"
                      />
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={`Remover item ${index + 1}`}
                      onClick={() => setItems((prev) => prev.filter((i) => i.key !== item.key))}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <label className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={item.required}
                        onCheckedChange={(v) => updateItem(item.key, { required: v === true })}
                        aria-label={`Item ${index + 1} obrigatório`}
                      />
                      Obrigatório
                    </label>
                    <Input
                      aria-label={`Opções do item ${index + 1}`}
                      className="sm:flex-1"
                      value={item.options}
                      onChange={(e) => updateItem(item.key, { options: e.target.value })}
                      placeholder="Opções separadas por vírgula (ex: P, M, G) — opcional"
                    />
                  </div>
                  {error && <p className="text-xs text-destructive">{error}</p>}
                </div>
              );
            })}

            {items.length > 0 && (
              <p className="text-sm">
                Valor base (obrigatórios):{" "}
                <strong data-testid="base-price">{formatBRL(basePrice)}</strong>
              </p>
            )}
            {priceError && <p className="text-sm text-destructive">{priceError}</p>}
            {editing && items.some((i) => i.id) && (
              <p className="text-xs text-muted-foreground">
                Mudar valores não altera matrículas já feitas — elas guardam o preço da época.
              </p>
            )}
          </section>

          {hasPaidItems && (
            <>
              <Separator />
              <section className="space-y-4">
                <h3 className="text-sm font-semibold">Pagamento</h3>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="class-reservation">Prazo para pagar (dias)</Label>
                    <Input
                      id="class-reservation"
                      type="number"
                      min={1}
                      max={30}
                      value={reservationDays}
                      onChange={(e) => setReservationDays(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      A vaga fica reservada por esse tempo; sem pagamento, ela é liberada.
                    </p>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Parcelamento máximo</Label>
                    <Select value={maxInstallments} onValueChange={setMaxInstallments}>
                      <SelectTrigger aria-label="Parcelamento máximo">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 12 }, (_, i) => i + 1).map((n) => (
                          <SelectItem key={n} value={String(n)}>
                            {n === 1 ? "À vista" : `Até ${n}x`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Cada parcela precisa ser de pelo menos {formatBRL(MIN_PAID_PRICE_CENTS)}.
                    </p>
                  </div>
                </div>
                <div className="flex items-start justify-between gap-4 rounded-md border p-3">
                  <div>
                    <Label htmlFor="class-refund">Reembolso até o início das aulas</Label>
                    <p className="text-xs text-muted-foreground">
                      Depois do início, só a coordenação pode reembolsar, como exceção.
                    </p>
                  </div>
                  <Switch
                    id="class-refund"
                    checked={refundBeforeStart}
                    onCheckedChange={setRefundBeforeStart}
                  />
                </div>
              </section>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={submit} disabled={!valid || saving}>
            {saving ? "Salvando…" : editing ? "Salvar" : "Criar turma"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
