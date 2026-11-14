// "Quero participar": an account without a church asks to join a public cell
// from its public page; the cell's leadership accepts on the cell page; the
// person then sees the address and the leaders.
//
// Runs against the real backend seeded with `manage.py seed_initial_church`.
// Makes 1 sign-up call (throttle scope "register": 10 per hour per network).

const API = "http://127.0.0.1:8000";
const PASSWORD = "TrocarSenha123!";
const MANAGER = "gestor@ilan.church";
const CELL = "Célula Amor";
const STAMP = Date.now();
const PERSON = {
  name: `Cypress Participar ${STAMP}`,
  email: `cypress.participar.${STAMP}@example.com`,
  password: "Sol!Nascente-2030",
};

const auth = (t: string) => ({ Authorization: `Bearer ${t}` });

describe("Quero participar", () => {
  let managerToken: string;
  let cellId: string;

  before(() => {
    cy.request("POST", `${API}/api/auth/login/`, { email: MANAGER, password: PASSWORD })
      .its("body.access")
      .then((mt: string) => {
        managerToken = mt;
        cy.request({ url: `${API}/api/cells/?page_size=200`, headers: auth(mt) }).then(
          ({ body }) => {
            cellId = (body.results as { id: string; name: string }[]).find(
              (c) => c.name === CELL,
            )!.id;
            cy.request({
              method: "PATCH",
              url: `${API}/api/cells/${cellId}/`,
              headers: auth(mt),
              body: { visibility: "public" },
            });
          },
        );
      });
    cy.request("POST", `${API}/api/auth/register/`, PERSON);
  });

  after(() => {
    cy.request({
      url: `${API}/api/cell-visitors/?cell=${cellId}&page_size=200`,
      headers: auth(managerToken),
    }).then(({ body }) =>
      ((body.results ?? body) as { id: string; name: string }[])
        .filter((v) => v.name === PERSON.name)
        .forEach((v) =>
          cy.request({
            method: "DELETE",
            url: `${API}/api/cell-visitors/${v.id}/`,
            headers: auth(managerToken),
          }),
        ),
    );
    cy.request({
      method: "PATCH",
      url: `${API}/api/cells/${cellId}/`,
      headers: auth(managerToken),
      body: { visibility: "members" },
    });
    cy.request({
      method: "POST",
      url: `${API}/api/auth/login/`,
      body: { email: PERSON.email, password: PERSON.password },
      failOnStatusCode: false,
    }).then(({ status, body }) => {
      if (status !== 200) return;
      cy.request({ url: `${API}/api/auth/me/`, headers: auth(body.access) }).then(({ body: me }) =>
        cy.request({
          method: "DELETE",
          url: `${API}/api/people/${me.id}/`,
          headers: auth(managerToken),
        }),
      );
    });
  });

  beforeEach(() => cy.viewport("iphone-x"));

  it("the person asks from the public page", () => {
    cy.login(PERSON.email, PERSON.password);
    cy.visit(`/celula/${cellId}`);
    cy.get("#join-message", { timeout: 30000 }).type("Moro perto e quero conhecer");
    cy.contains("button", "Quero participar").click();
    cy.contains("Pedido enviado à liderança da célula.");
    cy.get("[data-testid=cell-request-pending]").should("be.visible");
  });

  it("the leadership accepts on the cell page", () => {
    cy.login(MANAGER, PASSWORD);
    cy.visit(`/app/celulas/${cellId}`);
    cy.contains("[data-testid=cell-join-request]", PERSON.name, { timeout: 30000 })
      .should("contain", "Moro perto e quero conhecer")
      .within(() => cy.contains("button", "Aceitar").click());
    cy.contains("Pedido aceito");
    cy.get("[data-testid=cell-join-requests]").should("not.exist");
  });

  it("the person sees where and with whom", () => {
    cy.login(PERSON.email, PERSON.password);
    cy.visit(`/celula/${cellId}`);
    cy.get("[data-testid=cell-accepted]", { timeout: 30000 })
      .should("contain", "Você foi aceito")
      .and("contain", CELL);
  });
});
