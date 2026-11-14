// Complete registrations: the public link, ticket types (a closed batch is
// hidden), companions with their own tickets, and the waitlist of a sold-out
// event handing the freed place to the first in line.
// Runs against the real backend seeded with `manage.py seed_initial_church`.

const API = "http://127.0.0.1:8000";
const PASSWORD = "TrocarSenha123!";
const MANAGER = "gestor@ilan.church";
const MEMBER = "membro@ilan.church";
const OTHER = "lider.brave1@ilan.church";
const WAITING = "cursos.arena@ilan.church";
const TITLE = "Cypress Inscrições Completas";

function token(email: string) {
  return cy
    .request("POST", `${API}/api/auth/login/`, { email, password: PASSWORD })
    .its("body.access");
}
const auth = (t: string) => ({ Authorization: `Bearer ${t}` });

describe("Complete registrations", () => {
  let managerToken: string;
  let eventId: string;

  before(() => {
    token(MANAGER).then((t: string) => {
      managerToken = t;
      cy.request({
        method: "POST",
        url: `${API}/api/production-events/`,
        headers: auth(t),
        body: {
          title: TITLE,
          event_type: "conference",
          starts_at: new Date(Date.now() + 10 * 86400000).toISOString(),
          ticket: { price_cents: 0, max_capacity: 3, max_companions: 1, is_public: true },
        },
      }).then(({ body: event }) => {
        eventId = event.id;
        cy.request({
          url: `${API}/api/payments/ticket-configs/?event=${eventId}`,
          headers: auth(t),
        }).then(({ body }) => {
          const configId = body.results[0].id;
          const type = (name: string, extra = {}) =>
            cy.request({
              method: "POST",
              url: `${API}/api/payments/ticket-types/`,
              headers: auth(t),
              body: { config_id: configId, name, price_cents: 0, ...extra },
            });
          type("Inteira");
          type("Lote encerrado", { sales_end: new Date(Date.now() - 86400000).toISOString() });
        });
      });
    });
  });

  after(() => {
    if (eventId) {
      cy.request({
        method: "DELETE",
        url: `${API}/api/production-events/${eventId}/`,
        headers: auth(managerToken),
        failOnStatusCode: false,
      });
    }
  });

  it("the public link shows the event to anyone", () => {
    cy.viewport("iphone-x");
    cy.clearLocalStorage();
    cy.visit(`/evento/${eventId}`);
    cy.get("[data-testid=public-event]", { timeout: 30000 }).should("contain", TITLE);
    cy.get("[data-testid=public-event]")
      .should("contain", "Inteira")
      .and("not.contain", "Lote encerrado")
      .and("contain", "até 1 acompanhante");
    cy.contains("a", "Criar conta e me inscrever")
      .should("have.attr", "href")
      .and("include", `evento=${eventId}`);
    cy.contains("a", "Já tenho conta").click();
    cy.location("pathname").should("eq", "/login");
    cy.location("search").should("include", encodeURIComponent(`/app/eventos/${eventId}`));
  });

  it("registers with a companion, each with their own ticket", () => {
    cy.viewport("iphone-x");
    cy.login(MEMBER, PASSWORD);
    cy.visit(`/app/eventos/${eventId}`);
    cy.get("[data-testid=signup-panel]", { timeout: 30000 });
    cy.get("[data-testid=ticket-type]").should("have.length", 1).and("contain", "Inteira");
    cy.contains("button", "Adicionar acompanhante").click();
    cy.get("[aria-label='Nome do acompanhante 1']").type("Ana Acompanhante");
    cy.contains("button", "Inscrever-se (2 pessoas)").click();
    cy.contains("Sua inscrição").parent().should("contain", "2 pessoas");
    cy.contains("button", "Ver ingressos (2)").click();
    cy.get("[role=tab]").contains("Ana Acompanhante").click();
    cy.get("[data-testid=ticket-code]")
      .invoke("text")
      .should("match", /^[A-Z0-9]{5}-[A-Z0-9]{5}$/);
  });

  it("joins the waitlist when sold out and gets the freed place", () => {
    // The last place goes to someone else.
    token(OTHER).then((t: string) =>
      cy
        .request({ url: `${API}/api/payments/ticket-configs/?event=${eventId}`, headers: auth(t) })
        .then(({ body }) => {
          const inteira = body.results[0].types.find((x: { name: string }) => x.name === "Inteira");
          cy.request({
            method: "POST",
            url: `${API}/api/payments/registrations/`,
            headers: auth(t),
            body: { event_id: eventId, ticket_type_id: inteira.id },
          });
        }),
    );

    cy.viewport("iphone-x");
    cy.login(WAITING, PASSWORD);
    cy.visit(`/app/eventos/${eventId}`);
    cy.contains("Vagas esgotadas.", { timeout: 30000 });
    cy.contains("button", "Entrar na lista de espera").click();
    cy.get("[data-testid=waitlist-status]").should("contain", "1º");

    // Someone cancels: the place is held for the first in line.
    token(OTHER).then((t: string) =>
      cy
        .request({
          url: `${API}/api/payments/registrations/?event=${eventId}&mine=1`,
          headers: auth(t),
        })
        .then(({ body }) =>
          cy.request({
            method: "POST",
            url: `${API}/api/payments/registrations/${body.results[0].id}/cancel/`,
            headers: auth(t),
          }),
        ),
    );
    cy.reload();
    cy.get("[data-testid=waitlist-offer]", { timeout: 30000 }).should("contain", "uma vaga");
    cy.contains("button", "Inscrever-se").click();
    cy.contains("Sua inscrição").parent().should("contain", "Confirmado");
  });

  it("the organizers see the public link, the tickets and the places", () => {
    cy.login(MANAGER, PASSWORD);
    cy.visit(`/app/eventos/${eventId}/producao`);
    cy.get("[data-testid=public-link]", { timeout: 30000 })
      .invoke("val")
      .should("include", `/evento/${eventId}`);
    cy.get("[data-testid=ticket-types]")
      .should("contain", "Inteira")
      .and("contain", "Lote encerrado")
      .and("contain", "Fora de venda");
    cy.contains("3 de 3 vagas preenchidas");
  });
});
