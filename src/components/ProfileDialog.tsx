import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { apiFetch, apiErrorMessage } from "@/lib/api/client";
import type { Me } from "@/lib/api/auth";

/** "Meu perfil": name, phone and the (always optional) birth date. */
export function ProfileDialog({
  me,
  open,
  onOpenChange,
}: {
  me: Me;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const qc = useQueryClient();
  const [name, setName] = useState(me.name);
  const [phone, setPhone] = useState(me.phone);
  const [birthDate, setBirthDate] = useState(me.birth_date ?? "");

  useEffect(() => {
    if (!open) return;
    setName(me.name);
    setPhone(me.phone);
    setBirthDate(me.birth_date ?? "");
  }, [open, me]);

  const save = useMutation({
    mutationFn: () =>
      apiFetch<Me>("/api/auth/me/", {
        method: "PATCH",
        body: JSON.stringify({
          name: name.trim(),
          phone: phone.trim(),
          birth_date: birthDate || null,
        }),
      }),
    onSuccess: (data) => {
      qc.setQueryData(["me"], data);
      toast.success("Perfil atualizado.");
      onOpenChange(false);
    },
    onError: (e) => toast.error(apiErrorMessage(e, "Não foi possível salvar.")),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Meu perfil</DialogTitle>
          <DialogDescription>{me.email}</DialogDescription>
        </DialogHeader>
        <form
          id="profile-form"
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            save.mutate();
          }}
        >
          <div className="space-y-1.5">
            <Label htmlFor="profile-name">Nome</Label>
            <Input id="profile-name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="profile-phone">Celular (opcional)</Label>
            <Input
              id="profile-phone"
              type="tel"
              inputMode="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="profile-birth">Data de nascimento (opcional)</Label>
            <Input
              id="profile-birth"
              type="date"
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              A liderança da sua célula vê só o dia e o mês, para lembrar do seu aniversário.
            </p>
          </div>
        </form>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button type="submit" form="profile-form" disabled={save.isPending || !name.trim()}>
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
