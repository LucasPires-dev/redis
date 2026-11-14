import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { usePeopleSearch } from "@/lib/api/cells";
import type { PersonMini } from "@/lib/api/people";

interface Props {
  // Search endpoint, e.g. `/api/cells/:id/people-search/?for=leaders`.
  endpoint: string;
  onSelect: (person: PersonMini) => void;
  // People already in the list, hidden from the results.
  excludeIds?: Set<string>;
  placeholder?: string;
  disabled?: boolean;
}

// Type-ahead people picker. Waits 300ms after typing stops before searching.
export function PersonSearch({ endpoint, onSelect, excludeIds, placeholder, disabled }: Props) {
  const [term, setTerm] = useState("");
  const [debounced, setDebounced] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setDebounced(term), 300);
    return () => clearTimeout(t);
  }, [term]);

  const { data, isFetching } = usePeopleSearch(endpoint, debounced);
  const results = (data ?? []).filter((p) => !excludeIds?.has(p.id));
  const searching = debounced.trim().length >= 2;

  return (
    <div className="space-y-1">
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="pl-8"
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          placeholder={placeholder ?? "Buscar por nome ou email"}
          disabled={disabled}
        />
      </div>
      {searching && (
        <div className="max-h-56 overflow-y-auto rounded-md border">
          {isFetching && results.length === 0 ? (
            <p className="p-3 text-sm text-muted-foreground">Buscando…</p>
          ) : results.length === 0 ? (
            <p className="p-3 text-sm text-muted-foreground">Ninguém encontrado.</p>
          ) : (
            results.map((p) => (
              <button
                key={p.id}
                type="button"
                disabled={disabled}
                onClick={() => {
                  onSelect(p);
                  setTerm("");
                  setDebounced("");
                }}
                className="flex w-full flex-col items-start px-3 py-2 text-left hover:bg-muted disabled:opacity-50"
              >
                <span className="text-sm font-medium">{p.name}</span>
                <span className="text-xs text-muted-foreground">{p.email}</span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
