/** Who may find a cell, a course class or an event (same choices as the API). */
export type Visibility = "members" | "public";

export const VISIBILITY_LABEL: Record<Visibility, string> = {
  members: "Membros da igreja",
  public: "Todos os públicos",
};

export const EVENT_VISIBILITY_HINTS: Record<Visibility, string> = {
  members: "Só quem é da igreja encontra o evento e se inscreve.",
  public: "Qualquer pessoa encontra o evento; com inscrições, ganha um link público para divulgar.",
};
