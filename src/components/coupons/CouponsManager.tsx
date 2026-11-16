// Coupons of a paid event or course class, for whoever manages its money:
// create, pause/resume and delete (a used coupon can only be paused).
import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DetailSection, EmptyState } from "@/components/detail/DetailSection";
import { apiErrorMessage } from "@/lib/api/client";
import {
  useCoupons,
  useDeleteCoupon,
  useSaveCoupon,
  type CouponKind,
  type CouponTarget,
} from "@/lib/api/coupons";
import { parseCents } from "@/lib/money";

const EMPTY = { code: "", kind: "percent" as CouponKind, value: "", maxUses: "", validUntil: "" };

export function CouponsManager({ target }: { target: CouponTarget }) {
  const { data: coupons } = useCoupons(target);
  const save = useSaveCoupon(target);
  const remove = useDeleteCoupon(target);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const set = (patch: Partial<typeof EMPTY>) => setForm((f) => ({ ...f, ...patch }));

  const create = () => {
    const value = form.value.trim();
    save.mutate(
      {
        code: form.code.trim(),
        kind: form.kind,
        percent: form.kind === "percent" ? Number(value) : null,
        amount_cents: form.kind === "fixed" ? parseCents(value) : null,
        max_uses: form.maxUses ? Number(form.maxUses) : null,
        // End of the chosen day, local time.
        valid_until: form.validUntil ? new Date(`${form.validUntil}T23:59:59`).toISOString() : null,
      },
      {
        onSuccess: () => {
          toast.success("Cupom criado.");
          setOpen(false);
          setForm(EMPTY);
        },
        onError: (e) => toast.error(apiErrorMessage(e, "Não foi possível criar o cupom.")),
      },
    );
  };

  return (
    <DetailSection
      title="Cupons de desconto"
      count={coupons?.length}
      action={
        <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4" /> Novo cupom
        </Button>
      }
    >
      <div className="space-y-2" data-testid="coupons-manager">
        {coupons?.length === 0 && <EmptyState>Nenhum cupom criado.</EmptyState>}
        {coupons?.map((c) => (
          <Card
            key={c.id}
            data-testid="coupon-row"
            className={c.is_active ? undefined : "opacity-60"}
          >
            <CardContent className="flex flex-wrap items-center justify-between gap-3 p-3">
              <div className="min-w-0">
                <div className="font-mono text-sm font-semibold">{c.code}</div>
                <div className="text-xs text-muted-foreground">
                  {c.label} · {c.uses}
                  {c.max_uses != null ? `/${c.max_uses}` : ""} uso(s)
                  {c.valid_until && ` · até ${new Date(c.valid_until).toLocaleDateString("pt-BR")}`}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-1.5 text-xs">
                  <Switch
                    checked={c.is_active}
                    aria-label={`Cupom ${c.code} ativo`}
                    onCheckedChange={(v) =>
                      save.mutate(
                        { id: c.id, is_active: v },
                        {
                          onError: (e) =>
                            toast.error(apiErrorMessage(e, "Não foi possível salvar.")),
                        },
                      )
                    }
                  />
                  {c.is_active ? "Ativo" : "Pausado"}
                </label>
                {c.uses === 0 && (
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label={`Excluir cupom ${c.code}`}
                    disabled={remove.isPending}
                    onClick={() =>
                      remove.mutate(c.id, {
                        onSuccess: () => toast.success("Cupom excluído."),
                        onError: (e) =>
                          toast.error(apiErrorMessage(e, "Não foi possível excluir.")),
                      })
                    }
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo cupom</DialogTitle>
            <DialogDescription>
              A pessoa digita o código ao se inscrever. O valor com desconto precisa ficar zerado ou
              em pelo menos R$ 5,00.
            </DialogDescription>
          </DialogHeader>
          <form
            id="coupon-form"
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              create();
            }}
          >
            <div className="space-y-1.5">
              <Label htmlFor="new-coupon-code">Código</Label>
              <Input
                id="new-coupon-code"
                value={form.code}
                onChange={(e) => set({ code: e.target.value.toUpperCase().replace(/\s/g, "") })}
                placeholder="EX: JOVEM20"
                maxLength={30}
                className="font-mono"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="new-coupon-kind">Tipo</Label>
                <Select value={form.kind} onValueChange={(v) => set({ kind: v as CouponKind })}>
                  <SelectTrigger id="new-coupon-kind">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percent">Percentual (%)</SelectItem>
                    <SelectItem value="fixed">Valor fixo (R$)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="new-coupon-value">
                  {form.kind === "percent" ? "Desconto (%)" : "Desconto (R$)"}
                </Label>
                <Input
                  id="new-coupon-value"
                  inputMode="decimal"
                  value={form.value}
                  onChange={(e) => set({ value: e.target.value })}
                  placeholder={form.kind === "percent" ? "20" : "10,00"}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="new-coupon-uses">Limite de usos (opcional)</Label>
                <Input
                  id="new-coupon-uses"
                  type="number"
                  min={1}
                  value={form.maxUses}
                  onChange={(e) => set({ maxUses: e.target.value })}
                  placeholder="Sem limite"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="new-coupon-until">Válido até (opcional)</Label>
                <Input
                  id="new-coupon-until"
                  type="date"
                  value={form.validUntil}
                  onChange={(e) => set({ validUntil: e.target.value })}
                />
              </div>
            </div>
          </form>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button
              type="submit"
              form="coupon-form"
              disabled={save.isPending || form.code.length < 3 || !form.value}
            >
              Criar cupom
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DetailSection>
  );
}
