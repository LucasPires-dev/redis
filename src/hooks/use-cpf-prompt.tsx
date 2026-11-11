import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CpfInput } from "@/components/CpfInput";
import { apiErrorMessage } from "@/lib/api/client";
import { cpfDigits, isValidCpf, needsCpf } from "@/lib/cpf";

type Retry = (cpf: string) => void;

/**
 * Handles "CPF required" answers from payment endpoints: asks for the CPF in a
 * dialog and retries the action with it. Any other error becomes a toast.
 *
 *   const cpf = useCpfPrompt();
 *   mutate(vars, { onError: (e) => cpf.handleError(e, "Falhou.", (c) => mutate({ ...vars, cpf: c })) });
 *   return <>{...}{cpf.dialog}</>;
 */
export function useCpfPrompt(whose?: string): {
  handleError: (error: unknown, fallback: string, retry: Retry) => void;
  dialog: ReactNode;
} {
  const [retry, setRetry] = useState<{ fn: Retry } | null>(null);
  const [value, setValue] = useState("");

  const handleError = (error: unknown, fallback: string, fn: Retry) => {
    if (needsCpf(error)) {
      setValue("");
      setRetry({ fn });
    } else {
      toast.error(apiErrorMessage(error, fallback));
    }
  };

  const valid = isValidCpf(value);
  const submit = () => {
    if (!retry || !valid) return;
    retry.fn(cpfDigits(value));
    setRetry(null);
  };

  const dialog = (
    <Dialog open={!!retry} onOpenChange={(open) => !open && setRetry(null)}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Informe o CPF</DialogTitle>
          <DialogDescription>
            {whose
              ? `Para gerar a cobrança online, o Asaas precisa do CPF de ${whose}.`
              : "Para gerar a cobrança online, o Asaas precisa do seu CPF."}
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <CpfInput id="cpf-prompt" value={value} onChange={setValue} />
          <DialogFooter className="mt-4">
            <Button type="button" variant="outline" onClick={() => setRetry(null)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={!valid}>
              Continuar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );

  return { handleError, dialog };
}
