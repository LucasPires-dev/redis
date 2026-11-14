// The Eventos area as one screen with tabs per capability. "Próximos" and
// "Minhas inscrições" are always there; "Produção" and "Demandas" are added for
// producers and ministry people — and a producer who registers for an event
// keeps the personal tabs too. The old /app/producao addresses redirect.
// Runs against the real backend seeded with `manage.py seed_initial_church`.

const API = "http://127.0.0.1:8000";
const PASSWORD = "TrocarSenha123!";
const MANAGER = "gestor@ilan.church";
const MEMBER = "membro@ilan.church";
// Campus (Arena) event producer.
const PRODUCER = "eventos.arena@ilan.church";
// Local leader of the Arena adolescentes ministry.
const MINISTRY_LEADER = "lider.brave1@ilan.church";

const STAMP = Date.now();
const EVENT = `Evento Abas ${STAMP}`;

function token(email: string) {
  return cy
    .request("POST", `${API}/api/auth/login/`, { email, password: PASSWORD })
    .its("body.access");
}

const auth = (t: string) => ({ Authorization: `Bearer ${t}` });

function register(email: string, eventId: string) {
  token(email).then((t: string) =>
    cy.request({
      method: "POST",
      url: `${API}/api/payments/registrations/`,
      headers: auth(t),
      body: { event_id: eventId },
    }),
  );
}

const tab = (label: string) => cy.get("nav[aria-label='Seções']").contains("a", label);
const noTab = (label: string) => cy.get("nav[aria-label='Seções']").should("not.contain", label);

/** Opens "Novo evento" and returns the labels offered in the Tipo select. */
function openTypeOptions() {
  cy.contains("button", "Novo evento").click();
  cy.get("[role=dialog]").find("[aria-label=Tipo]").click();
  return cy.get("[role=listbox]");
}

describe("Events — tabs per capability", () => {
  let managerToken: string;
  let eventId: string;

  before(() => {
    token(MANAGER).then((mt: string) => {
      managerToken = mt;
      token(MEMBER).then((memberToken: string) =>
        cy
          .request({ url: `${API}/api/auth/me/`, headers: auth(memberToken) })
          .its("body.campus.id")
          .then((campusId) =>
            cy
              .request({
                method: "POST",
                url: `${API}/api/production-events/`,
                headers: auth(mt),
                body: {
                  title: EVENT,
                  event_type: "conference",
                  campus_id: campusId,
                  starts_at: new Date(Date.now() + 20 * 86400000).toISOString(),
                  ticket: { price_cents: 0 },
                },
              })
              .then(({ body }) => {
                eventId = body.id;
                // Free registrations: confirmed right away, no charge.
                register(MEMBER, eventId);
                register(PRODUCER, eventId);
              }),
          ),
      );
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

  it("member: only the personal tabs, one menu entry, no create, old addresses redirect", () => {
    cy.login(MEMBER, PASSWORD);
    cy.visit("/app/eventos");
    tab("Próximos").should("have.attr", "aria-current", "page");
    noTab("Produção");
    noTab("Demandas");
    cy.contains("main a", EVENT, { timeout: 15000 }).should("be.visible");
    cy.contains("button", "Novo evento").should("not.exist");
    cy.get("[data-sidebar=sidebar]").should("not.contain", "Produção");

    tab("Minhas inscrições").click();
    cy.location("pathname").should("eq", "/app/eventos/inscricoes");
    cy.contains("[data-testid=my-registration]", EVENT, { timeout: 15000 })
      .should("contain", "Confirmado")
      .and("contain", "Gratuito");

    // Management tabs typed by hand (or the old address) send the member back.
    cy.visit("/app/eventos/demandas");
    cy.location("pathname").should("eq", "/app/eventos");
    cy.visit("/app/producao");
    cy.location("pathname").should("eq", "/app/eventos");
  });

  it("producer who is registered: keeps every tab, creates only producer events", () => {
    cy.login(PRODUCER, PASSWORD);
    cy.visit("/app/eventos/inscricoes");
    tab("Próximos").should("be.visible");
    tab("Minhas inscrições").should("have.attr", "aria-current", "page");
    tab("Produção").should("be.visible");
    tab("Demandas").should("be.visible");
    cy.contains("[data-testid=my-registration]", EVENT, { timeout: 15000 }).should("be.visible");

    tab("Produção").click();
    cy.location("pathname").should("eq", "/app/eventos/producao");
    cy.contains("main a", EVENT, { timeout: 15000 }).click();
    cy.location("pathname").should("eq", `/app/eventos/${eventId}/producao`);
    cy.contains("h1", EVENT).should("be.visible");
    // The producer manages this event: ticket settings can be edited.
    cy.contains("button", "Editar").should("be.visible");

    // The old production panel address lands on the new one.
    cy.visit(`/app/producao/eventos/${eventId}`);
    cy.location("pathname").should("eq", `/app/eventos/${eventId}/producao`);

    cy.visit("/app/eventos");
    openTypeOptions().within(() => {
      cy.contains("[role=option]", "Conferência").should("exist");
      cy.contains("[role=option]", "Treinamento").should("exist");
      cy.contains("[role=option]", "Culto Especial").should("exist");
      cy.contains("[role=option]", /^Culto$/).should("not.exist");
      cy.contains("[role=option]", "Evento de Ministério").should("not.exist");
    });
    cy.get("body").type("{esc}");
    // A campus producer creates at their campus only — no church-wide option.
    cy.get("[role=dialog]").find("[aria-label=Campus]").click();
    cy.get("[role=listbox]").should("not.contain", "Geral (todos os campi)");
  });

  it("ministry leader: gets Produção and Demandas, creates only ministry events", () => {
    cy.login(MINISTRY_LEADER, PASSWORD);
    cy.visit("/app/eventos/demandas");
    tab("Demandas").should("have.attr", "aria-current", "page");
    tab("Produção").should("be.visible");
    tab("Minhas inscrições").should("be.visible");

    // A ministry leader doesn't manage a conference: no production edits.
    cy.visit(`/app/eventos/${eventId}/producao`);
    cy.contains("h1", EVENT, { timeout: 15000 }).should("be.visible");
    cy.contains("button", "Editar").should("not.exist");

    cy.visit("/app/eventos");
    openTypeOptions().within(() => {
      cy.get("[role=option]").should("have.length", 1);
      cy.contains("[role=option]", "Evento de Ministério").should("exist");
    });
    cy.get("body").type("{esc}");
    cy.get("[role=dialog]").find("[aria-label=Ministério]").click();
    cy.get("[role=listbox] [role=option]").should("have.length", 1).and("contain", "Adolescentes");
  });
});
