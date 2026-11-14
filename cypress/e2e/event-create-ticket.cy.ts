// Creating an event with registration (ticket) from the "Novo evento" dialog,
// against the real backend + local DB seeded with `manage.py seed_initial_church`.
// Every test removes the events it created through the API.

const API_URL = "http://127.0.0.1:8000";
const MANAGER = "gestor@ilan.church";
const SEED_PASSWORD = "TrocarSenha123!";
const TITLE_PREFIX = "Cypress Ingresso";

interface ApiEvent {
  id: string;
  title: string;
  ticket_config: { price_cents: number; max_capacity: number | null } | null;
}

function apiToken() {
  return cy
    .request("POST", `${API_URL}/api/auth/login/`, { email: MANAGER, password: SEED_PASSWORD })
    .its("body.access");
}

function eventsByTitle(token: string, title: string) {
  return cy
    .request({
      url: `${API_URL}/api/production-events/`,
      headers: { Authorization: `Bearer ${token}` },
    })
    .then((res) => {
      const list: ApiEvent[] = res.body.results ?? res.body;
      return list.filter((e) => e.title === title);
    });
}

function cleanup() {
  apiToken().then((token) => {
    cy.request({
      url: `${API_URL}/api/production-events/`,
      headers: { Authorization: `Bearer ${token}` },
    }).then((res) => {
      const list: ApiEvent[] = res.body.results ?? res.body;
      list
        .filter((e) => e.title.startsWith(TITLE_PREFIX))
        .forEach((e) =>
          cy.request({
            method: "DELETE",
            url: `${API_URL}/api/production-events/${e.id}/`,
            headers: { Authorization: `Bearer ${token}` },
          }),
        );
    });
  });
}

function openDialog(title: string) {
  cy.visit("/app/eventos");
  cy.contains("button", "Novo evento", { timeout: 15000 }).click();
  cy.get("#event-title").type(title);
  cy.get("#event-starts").type("2030-03-10T19:30");
}

describe("Create event with registration", () => {
  beforeEach(() => {
    cleanup();
    cy.login(MANAGER, SEED_PASSWORD);
  });
  after(cleanup);

  it("creates a paid event with capacity in one step", () => {
    const title = `${TITLE_PREFIX} Pago`;
    openDialog(title);

    cy.get("#event-registration").click();
    cy.contains("button", "Pago").click();
    // Masked input: digits fill from the cents up ("15000" → "150,00").
    cy.get("#new-event-ticket-price").type("15000").should("have.value", "150,00");
    cy.get("#new-event-ticket-capacity").type("80");
    cy.get("#new-event-ticket-description").type("Hospedagem e alimentação");
    cy.contains("button", "Criar evento").click();

    cy.contains(/Evento criado com inscrições abertas \(R\$\s150,00\)/).should("be.visible");
    // The card shows the price straight away.
    cy.contains(title).closest("a").should("contain.text", "150,00").and("contain.text", "80 vagas");

    apiToken().then((token) =>
      eventsByTitle(token, title).then((found) => {
        expect(found).to.have.length(1);
        expect(found[0].ticket_config).to.deep.include({ price_cents: 15000, max_capacity: 80 });
      }),
    );
  });

  it("creates a free event with registration", () => {
    const title = `${TITLE_PREFIX} Gratuito`;
    openDialog(title);

    cy.get("#event-registration").click();
    cy.contains("button", "Criar evento").click();

    cy.contains(/Evento criado com inscrições abertas \(Gratuito\)/).should("be.visible");
    cy.contains(title).closest("a").should("contain.text", "Gratuito");
  });

  it("blocks a paid ticket below R$ 5,00 and creates nothing", () => {
    const title = `${TITLE_PREFIX} Barato`;
    openDialog(title);

    cy.get("#event-registration").click();
    cy.contains("button", "Pago").click();
    cy.get("#new-event-ticket-price").type("300");
    cy.contains("button", "Criar evento").click();

    cy.contains("O valor mínimo de um ingresso pago é").should("be.visible");
    cy.get("[role='dialog']").should("be.visible");
    apiToken().then((token) => eventsByTitle(token, title).should("have.length", 0));
  });

  it("creates an event without registration when the switch is off", () => {
    const title = `${TITLE_PREFIX} Sem Inscrição`;
    openDialog(title);

    cy.contains("button", "Criar evento").click();

    cy.contains("Evento criado.").should("be.visible");
    apiToken().then((token) =>
      eventsByTitle(token, title).then((found) => {
        expect(found).to.have.length(1);
        expect(found[0].ticket_config).to.equal(null);
      }),
    );
  });
});
