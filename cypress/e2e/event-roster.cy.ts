// Serving roster: the volunteer answers the invitation in "Minhas escalas",
// asks someone of the same ministry to take their place, and the substitute
// accepts. Everyone involved is notified.
// Runs against the real backend seeded with `manage.py seed_initial_church`.

const API = "http://127.0.0.1:8000";
const PASSWORD = "TrocarSenha123!";
const MANAGER = "gestor@ilan.church";
const VOLUNTEER = "lider.brave1@ilan.church";
const SUBSTITUTE = "membro@ilan.church";
const TITLE = "Cypress Escala";

type Person = { id: string; name: string; campus: { id: string } | null };

function token(email: string) {
  return cy
    .request("POST", `${API}/api/auth/login/`, { email, password: PASSWORD })
    .its("body.access");
}
const auth = (t: string) => ({ Authorization: `Bearer ${t}` });
const me = (t: string) =>
  cy
    .request({ url: `${API}/api/auth/me/`, headers: auth(t) })
    .its("body") as Cypress.Chainable<Person>;

function kindsOf(email: string) {
  return token(email).then((t: string) =>
    cy
      .request({ url: `${API}/api/notifications/?page_size=50`, headers: auth(t) })
      .then(({ body }) =>
        (body.results as { kind: string; title: string }[])
          .filter((n) => n.title.includes(TITLE))
          .map((n) => n.kind),
      ),
  );
}

describe("Serving roster: answer and swap", () => {
  let managerToken: string;
  let eventId: string;
  let ministryId: string;
  const added: string[] = [];
  let volunteer: Person;
  let substitute: Person;

  before(() => {
    token(MANAGER).then((mt: string) => {
      managerToken = mt;
      token(VOLUNTEER).then((vt: string) => me(vt).then((p) => (volunteer = p)));
      token(SUBSTITUTE).then((st: string) => me(st).then((p) => (substitute = p)));
      cy.then(() =>
        cy
          .request({ url: `${API}/api/ministries/?page_size=200`, headers: auth(mt) })
          .then(({ body }) => {
            const campusId = volunteer.campus?.id;
            const ministry = body.results.find(
              (m: { campus: { id: string } }) => m.campus.id === campusId,
            );
            ministryId = ministry.id;
            return cy.request({
              url: `${API}/api/ministries/${ministryId}/members/`,
              headers: auth(mt),
            });
          })
          .then(({ body: members }) => {
            const ids = (members as Person[]).map((m) => m.id);
            [volunteer, substitute].forEach((p) => {
              if (ids.includes(p.id)) return;
              added.push(p.id);
              cy.request({
                method: "POST",
                url: `${API}/api/ministries/${ministryId}/members/`,
                headers: auth(mt),
                body: { person_id: p.id },
              });
            });
            cy.request({
              method: "POST",
              url: `${API}/api/production-events/`,
              headers: auth(mt),
              body: {
                title: TITLE,
                event_type: "culto",
                campus_id: volunteer.campus?.id,
                starts_at: new Date(Date.now() + 4 * 86400000).toISOString(),
              },
            }).then(({ body: event }) => {
              eventId = event.id;
              cy.request({
                method: "POST",
                url: `${API}/api/production-roster-entries/`,
                headers: auth(mt),
                body: {
                  event_id: eventId,
                  ministry_id: ministryId,
                  person_id: volunteer.id,
                  function: "Recepção",
                },
              });
            });
          }),
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
    added.forEach((id) =>
      cy.request({
        method: "DELETE",
        url: `${API}/api/ministries/${ministryId}/members/${id}/`,
        headers: auth(managerToken),
        failOnStatusCode: false,
      }),
    );
  });

  it("the volunteer is notified, confirms and asks for a swap", () => {
    kindsOf(VOLUNTEER).should("include", "roster_invite");

    cy.viewport("iphone-x");
    cy.login(VOLUNTEER, PASSWORD);
    cy.visit("/app/eventos/escalas");
    cy.contains('[data-testid="my-roster-entry"]', TITLE, { timeout: 30000 }).as("entry");
    cy.get("@entry").should("contain", "Aguardando sua resposta").and("contain", "Recepção");
    cy.get("@entry").contains("button", "Confirmar").click();
    cy.get("@entry").should("contain", "Confirmado");

    cy.get("@entry").contains("button", "Pedir troca").click();
    cy.get('[role="dialog"]').within(() => {
      cy.get('[aria-label="Quem vai no seu lugar"]').click();
    });
    cy.contains('[role="option"]', substitute.name).click();
    cy.get('[role="dialog"] textarea').type("Vou viajar");
    cy.contains('[role="dialog"] button', "Enviar pedido").click();
    cy.get("@entry").should("contain", `Aguardando ${substitute.name} aceitar a troca`);
  });

  it("the substitute accepts and takes the place", () => {
    kindsOf(SUBSTITUTE).should("include", "roster_swap");

    cy.viewport("iphone-x");
    cy.login(SUBSTITUTE, PASSWORD);
    cy.visit("/app/eventos/escalas");
    cy.contains('[data-testid="swap-request"]', TITLE, { timeout: 30000 })
      .should("contain", "Vou viajar")
      .contains("button", "Aceitar")
      .click();
    cy.get('[data-testid="swap-request"]').should("not.exist");
    cy.contains('[data-testid="my-roster-entry"]', TITLE).should("contain", "Confirmado");

    kindsOf(VOLUNTEER).should("include", "roster_swap_answered");
    token(VOLUNTEER).then((t: string) =>
      cy
        .request({ url: `${API}/api/production-roster-entries/mine/`, headers: auth(t) })
        .its("body")
        .then((rows: { event: { title: string } }[]) =>
          expect(rows.filter((r) => r.event.title === TITLE)).to.have.length(0),
        ),
    );
  });
});
