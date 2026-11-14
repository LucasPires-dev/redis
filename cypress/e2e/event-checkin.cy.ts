// Check-in at the door: the attendee sees their ticket (QR + code) and the
// organizer marks people present by typed code or by name, with a live count.
// Runs against the real backend seeded with `manage.py seed_initial_church`.

const API = "http://127.0.0.1:8000";
const PASSWORD = "TrocarSenha123!";
const MANAGER = "gestor@ilan.church";
const MEMBER = "lider.brave1@ilan.church";

function token(email: string) {
  return cy
    .request("POST", `${API}/api/auth/login/`, { email, password: PASSWORD })
    .its("body.access");
}
const auth = (t: string) => ({ Authorization: `Bearer ${t}` });

describe("Event check-in", () => {
  let managerToken: string;
  let eventId: string;
  let ticketCode: string;

  before(() => {
    token(MANAGER).then((t: string) => {
      managerToken = t;
      cy.request({
        method: "POST",
        url: `${API}/api/production-events/`,
        headers: auth(t),
        body: {
          title: "Cypress Check-in",
          event_type: "conference",
          starts_at: new Date(Date.now() + 3 * 86400000).toISOString(),
        },
      }).then((res) => {
        eventId = res.body.id;
        cy.request({
          method: "POST",
          url: `${API}/api/payments/ticket-configs/`,
          headers: auth(t),
          body: { event_id: eventId, price_cents: 0, max_capacity: 20 },
        });
        token(MEMBER).then((m: string) =>
          cy.request({
            method: "POST",
            url: `${API}/api/payments/registrations/`,
            headers: auth(m),
            body: { event_id: eventId },
          }),
        );
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

  it("the attendee sees their ticket and no check-in link", () => {
    cy.viewport("iphone-x");
    cy.login(MEMBER, PASSWORD);
    cy.visit("/app/eventos/inscricoes");
    cy.contains('[data-testid="my-registration"]', "Cypress Check-in", { timeout: 30000 })
      .contains("button", "Ver ingresso")
      .click();
    cy.get('[data-testid="ticket"] svg').should("be.visible");
    cy.get('[data-testid="ticket-code"]')
      .invoke("text")
      .should("match", /^[A-Z0-9]{5}-[A-Z0-9]{5}$/)
      .then((text) => {
        ticketCode = String(text);
      });

    cy.visit(`/app/eventos/${eventId}`);
    cy.contains("Sua inscrição", { timeout: 30000 });
    cy.contains("Fazer check-in na entrada").should("not.exist");
  });

  it("the organizer checks people in by code and by name", () => {
    cy.viewport("iphone-x");
    cy.login(MANAGER, PASSWORD);
    cy.visit(`/app/eventos/${eventId}`);
    cy.contains("a", "Fazer check-in na entrada", { timeout: 30000 }).click();
    cy.location("pathname").should("eq", `/app/eventos/${eventId}/checkin`);
    cy.get('[data-testid="checkin-count"]')
      .should("contain", "0")
      .and("contain", "de 1 confirmados");

    // Typed code (lowercase, as someone would at the door)
    cy.get('input[aria-label="Nome ou código do ingresso"]').type(ticketCode.toLowerCase());
    cy.contains("button", "Confirmar código").click();
    cy.get('[data-testid="checkin-feedback"]').should("contain", "check-in feito");
    cy.get('[data-testid="checkin-count"]')
      .should("contain", "1")
      .and("contain", "de 1 confirmados");
    cy.get('[data-testid="door-row"]').should("contain", "✓");

    // Same ticket again: warned, not counted twice
    cy.get('input[aria-label="Nome ou código do ingresso"]').type(`${ticketCode}{enter}`);
    cy.get('[data-testid="checkin-feedback"]').should("contain", "já tinha feito check-in");

    // Undo, then check in by name
    cy.get('[data-testid="door-row"]').contains("button", "Desfazer").click();
    cy.get('[data-testid="checkin-feedback"]').should("contain", "desfeito");
    cy.get('[data-testid="checkin-count"]').should("contain", "0");
    cy.get('[data-testid="door-row"]')
      .first()
      .find("p")
      .first()
      .invoke("text")
      .then((name) => {
        cy.get('input[aria-label="Nome ou código do ingresso"]').type(String(name).slice(0, 4));
      });
    cy.get('[data-testid="door-row"]')
      .should("have.length", 1)
      .contains("button", "Check-in")
      .click();
    cy.get('[data-testid="checkin-feedback"]').should("contain", "check-in feito");
    cy.get('[data-testid="checkin-count"]').should("contain", "1");
  });

  it("an unknown code is reported", () => {
    cy.login(MANAGER, PASSWORD);
    cy.visit(`/app/eventos/${eventId}/checkin`);
    cy.get('input[aria-label="Nome ou código do ingresso"]', { timeout: 30000 }).type(
      "ZZZZZ-ZZZZZ{enter}",
    );
    cy.get('[data-testid="checkin-feedback"]').should("contain", "Ingresso não encontrado");
  });
});
