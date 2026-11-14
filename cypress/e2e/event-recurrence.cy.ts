// Duplicating an event, making it recurring, the monthly calendar and
// "Adicionar à agenda".
// Runs against the real backend seeded with `manage.py seed_initial_church`.

const API = "http://127.0.0.1:8000";
const PASSWORD = "TrocarSenha123!";
const MANAGER = "gestor@ilan.church";
const TITLE = "Cypress Culto Recorrente";

function token(email: string) {
  return cy
    .request("POST", `${API}/api/auth/login/`, { email, password: PASSWORD })
    .its("body.access");
}
const auth = (t: string) => ({ Authorization: `Bearer ${t}` });
const pad = (n: number) => String(n).padStart(2, "0");
const dayKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

describe("Recurring events and calendar", () => {
  let managerToken: string;
  let eventId: string;
  const created: string[] = [];
  const start = new Date();
  start.setDate(start.getDate() + 2);
  start.setHours(19, 0, 0, 0);

  before(() => {
    token(MANAGER).then((t: string) => {
      managerToken = t;
      cy.request({
        method: "POST",
        url: `${API}/api/production-events/`,
        headers: auth(t),
        body: { title: TITLE, event_type: "culto", starts_at: start.toISOString() },
      }).then(({ body }) => {
        eventId = body.id;
        created.push(eventId);
        cy.request({
          method: "POST",
          url: `${API}/api/production-rundown-items/`,
          headers: auth(t),
          body: {
            event_id: eventId,
            order: 1,
            title: "Louvor de abertura",
            ministry_kind: "som",
          },
        });
      });
    });
  });

  after(() => {
    cy.request({ url: `${API}/api/production-series/`, headers: auth(managerToken) }).then(
      ({ body }) =>
        body.results
          .filter((s: { title: string }) => s.title === TITLE)
          .forEach((s: { id: string }) =>
            cy.request({
              method: "DELETE",
              url: `${API}/api/production-series/${s.id}/`,
              headers: auth(managerToken),
            }),
          ),
    );
    cy.then(() =>
      created.forEach((id) =>
        cy.request({
          method: "DELETE",
          url: `${API}/api/production-events/${id}/`,
          headers: auth(managerToken),
          failOnStatusCode: false,
        }),
      ),
    );
  });

  it("duplicates the event with its rundown", () => {
    cy.viewport("iphone-x");
    cy.login(MANAGER, PASSWORD);
    cy.visit(`/app/eventos/${eventId}/producao`);
    cy.contains("button", "Duplicar", { timeout: 30000 }).click();
    cy.get("#dup-title").clear().type(`${TITLE} (cópia)`);
    cy.contains("[role=dialog] button", "Duplicar").click();
    cy.contains("Evento duplicado.");
    cy.location("pathname")
      .should("not.include", eventId)
      .and("match", /\/producao$/);
    cy.location("pathname").then((path) => created.push(path.split("/")[3]));
    cy.contains(`${TITLE} (cópia)`);
    cy.contains("Louvor de abertura");
  });

  it("makes it recurring and lists it in Produção", () => {
    cy.login(MANAGER, PASSWORD);
    cy.visit(`/app/eventos/${eventId}/producao`);
    cy.contains("button", "Repetir", { timeout: 30000 }).click();
    cy.get("#rep-time").should("have.value", "19:00");
    cy.contains("[role=dialog] button", "Criar repetição").click();
    cy.contains("Evento recorrente criado");

    cy.visit("/app/eventos/producao");
    cy.contains("[data-testid=series]", TITLE, { timeout: 30000 })
      .should("contain", "às 19:00")
      .and("contain", "Próximas:");
  });

  it("shows the events in the monthly calendar", () => {
    cy.viewport("iphone-x");
    cy.login(MANAGER, PASSWORD);
    cy.visit("/app/eventos/calendario");
    cy.get("[data-testid=calendar-month]", { timeout: 30000 });
    if (start.getMonth() !== new Date().getMonth()) {
      cy.get("[aria-label='Próximo mês']").click();
    }
    cy.get(`[data-testid=calendar-day][data-date=${dayKey(start)}]`).click();
    cy.contains("[data-testid=calendar-event]", TITLE).should("contain", "19:00").click();
    cy.location("pathname").should("eq", `/app/eventos/${eventId}`);
  });

  it("offers to add the event to the calendar", () => {
    cy.login(MANAGER, PASSWORD);
    cy.visit(`/app/eventos/${eventId}`);
    cy.contains("button", "Adicionar à agenda", { timeout: 30000 }).click();
    cy.contains("a", "Google Agenda")
      .should("have.attr", "href")
      .and("include", "calendar.google.com")
      .and("include", encodeURIComponent(TITLE).replace(/%20/g, "+"));
    cy.contains("iPhone, Outlook e outros (.ics)").should("be.visible");
  });
});
