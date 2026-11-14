// Event reports: the organizers cancel a registration from the attendee list,
// count the room, launch an expense, export the finance CSV and compare events
// in the "Relatórios" tab.
// Runs against the real backend seeded with `manage.py seed_initial_church`.

const API = "http://127.0.0.1:8000";
const PASSWORD = "TrocarSenha123!";
const MANAGER = "gestor@ilan.church";
const MEMBER = "membro@ilan.church";
const TITLE = "Cypress Relatorio Evento";

function token(email: string) {
  return cy
    .request("POST", `${API}/api/auth/login/`, { email, password: PASSWORD })
    .its("body.access");
}
const auth = (t: string) => ({ Authorization: `Bearer ${t}` });

describe("Event reports", () => {
  let managerToken: string;
  let eventId: string;
  const startsAt = new Date(Date.now() - 86400000);
  startsAt.setHours(19, 0, 0, 0);

  before(() => {
    token(MANAGER).then((t: string) => {
      managerToken = t;
      // Registration needs an upcoming event: create it ahead, register, then
      // move it to yesterday.
      cy.request({
        method: "POST",
        url: `${API}/api/production-events/`,
        headers: auth(t),
        body: {
          title: TITLE,
          event_type: "conference",
          starts_at: new Date(Date.now() + 5 * 86400000).toISOString(),
          ticket: { price_cents: 0 },
        },
      }).then(({ body: event }) => {
        eventId = event.id;
        token(MEMBER).then((m: string) =>
          cy.request({
            method: "POST",
            url: `${API}/api/payments/registrations/`,
            headers: auth(m),
            body: { event_id: eventId },
          }),
        );
        cy.request({
          method: "PATCH",
          url: `${API}/api/production-events/${eventId}/`,
          headers: auth(t),
          body: { starts_at: startsAt.toISOString() },
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

  it("the organizers cancel a registration from the attendee list", () => {
    cy.viewport("iphone-x");
    cy.login(MANAGER, PASSWORD);
    cy.visit(`/app/eventos/${eventId}/producao`);
    cy.get("[data-testid=attendee]", { timeout: 30000 })
      .first()
      .within(() => {
        cy.contains("Confirmado");
        cy.get("[aria-label='Ações da inscrição']").click();
      });
    cy.contains("[role=menuitem]", "Cancelar inscrição").click();
    cy.contains("[role=dialog] button", "Cancelar inscrição").click();
    cy.contains("Inscrição cancelada.");
    cy.get("[data-testid=attendee]").first().should("contain", "Cancelado");
  });

  it("counts the room, launches an expense and exports the finance CSV", () => {
    cy.viewport("iphone-x");
    cy.login(MANAGER, PASSWORD);
    cy.visit(`/app/eventos/${eventId}/producao`);
    cy.contains("a", "Relatório", { timeout: 30000 }).click();
    cy.location("pathname").should("eq", `/app/eventos/${eventId}/relatorio`);

    cy.get("#headcount", { timeout: 30000 }).clear().type("42");
    cy.contains("button", "Salvar").click();
    cy.contains("Contagem salva.");
    cy.get("[data-testid=report-tiles]").should("contain", "42").and("contain", "contagem no salão");

    cy.contains("button", "Adicionar").click();
    cy.get("#exp-description").type("Lanche da equipe");
    cy.get("#exp-amount").type("150,50");
    cy.contains("[role=dialog] button", "Salvar").click();
    cy.contains("Despesa lançada.");
    cy.get("[data-testid=expense]").should("contain", "Lanche da equipe").and("contain", "150,50");
    cy.get("[data-testid=report-finance]").should("contain", "150,50");

    cy.contains("button", "Exportar CSV").click();
    cy.contains("[role=menuitem]", "Financeiro").click();
    const day = startsAt.toISOString().slice(0, 10);
    cy.readFile(`cypress/downloads/cypress-relatorio-evento-${day}-financeiro.csv`, {
      timeout: 15000,
    })
      .should("contain", "Despesa;Outros;Lanche da equipe;-150,50")
      .and("contain", ";Total;;Saldo;-150,50");
  });

  it("compares the events in the Relatórios tab", () => {
    cy.login(MANAGER, PASSWORD);
    cy.visit("/app/eventos/relatorios");
    cy.get("[data-testid=comparison]", { timeout: 30000 }).should("be.visible");
    cy.contains("[data-testid=report-row]", TITLE)
      .should("contain", "42")
      .and("contain", "150,50");
    cy.contains("[data-testid=comparison] button", "Saldo").click();
    cy.contains("[data-testid=report-row] a", TITLE).click();
    cy.location("pathname").should("eq", `/app/eventos/${eventId}/relatorio`);
  });
});
