// Aniversariantes: a member fills in the (optional) birth date in "Meu perfil";
// the cell's leadership sees the day and month on the cell page.
//
// Runs against the real backend seeded with `manage.py seed_initial_church`.
// The member is added to a cell the manager leads and removed afterwards.

const API = "http://127.0.0.1:8000";
const PASSWORD = "TrocarSenha123!";
const MANAGER = "gestor@ilan.church";
const MEMBER = "membro@ilan.church";

const auth = (t: string) => ({ Authorization: `Bearer ${t}` });
const pad = (n: number) => String(n).padStart(2, "0");
const today = new Date();
const BIRTH = `1990-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;
const SHOWN = `${pad(today.getDate())}/${pad(today.getMonth() + 1)}`;

describe("Aniversariantes", () => {
  let managerToken: string;
  let memberToken: string;
  let member: { id: string; name: string };
  let cellId: string;

  before(() => {
    cy.request("POST", `${API}/api/auth/login/`, { email: MEMBER, password: PASSWORD })
      .its("body.access")
      .then((t: string) => {
        memberToken = t;
        cy.request({ url: `${API}/api/auth/me/`, headers: auth(t) }).then(({ body }) => {
          member = { id: body.id, name: body.name };
        });
      });
    cy.request("POST", `${API}/api/auth/login/`, { email: MANAGER, password: PASSWORD })
      .its("body.access")
      .then((t: string) => {
        managerToken = t;
        cy.request({ url: `${API}/api/cells/?page_size=200`, headers: auth(t) }).then(
          ({ body }) => {
            const cell = (body.results as { id: string; name: string; can_manage: boolean }[]).find(
              (c) => c.can_manage && c.name !== "Célula Amor",
            )!;
            cellId = cell.id;
          },
        );
      });
    cy.then(() =>
      cy.request({
        method: "POST",
        url: `${API}/api/cells/${cellId}/members/`,
        headers: auth(managerToken),
        body: { person_id: member.id },
      }),
    );
  });

  after(() => {
    cy.request({
      method: "PATCH",
      url: `${API}/api/auth/me/`,
      headers: auth(memberToken),
      body: { birth_date: null },
    });
    cy.request({
      method: "DELETE",
      url: `${API}/api/cells/${cellId}/members/${member.id}/`,
      headers: auth(managerToken),
    });
  });

  beforeEach(() => cy.viewport(1280, 800));

  it("the member fills in the birth date in Meu perfil", () => {
    cy.login(MEMBER, PASSWORD);
    cy.visit("/app");
    cy.contains("button", member.name, { timeout: 30000 }).click();
    cy.contains("[role=menuitem]", "Meu perfil").click();
    cy.contains("Data de nascimento (opcional)");
    cy.get("#profile-birth").type(BIRTH);
    cy.contains("button", "Salvar").click();
    cy.contains("Perfil atualizado.");
  });

  it("the leadership sees it on the cell page, day and month only", () => {
    cy.login(MANAGER, PASSWORD);
    cy.visit(`/app/celulas/${cellId}`);
    cy.contains("[data-testid=birthday]", member.name, { timeout: 30000 })
      .should("contain", SHOWN)
      .and("not.contain", "1990");
  });
});
