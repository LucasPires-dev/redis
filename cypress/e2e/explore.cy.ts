// Explorar and the public pages: what churches opened to everyone, seen
// without logging in and by an account not linked to a church yet. A public
// cell shows only its church, weekday and time.
//
// Runs against the real backend seeded with `manage.py seed_initial_church`.
// Makes 1 sign-up call (throttle scope "register": 10 per hour per network).

const API = "http://127.0.0.1:8000";
const PASSWORD = "TrocarSenha123!";
const MANAGER = "gestor@ilan.church";
const STAMP = Date.now();
const EVENT = `Cypress Explorar ${STAMP}`;
const COURSE = `Cypress Explorar ${STAMP}`;
const CELL = "Célula Amor";
const OUTSIDER = {
  name: `Cypress Visitante ${STAMP}`,
  email: `cypress.visitante.${STAMP}@example.com`,
  password: "Cypress!Visita1",
};

const auth = (t: string) => ({ Authorization: `Bearer ${t}` });

function token(email: string, password = PASSWORD) {
  return cy.request("POST", `${API}/api/auth/login/`, { email, password }).its("body.access");
}

describe("Explorar", () => {
  let managerToken: string;
  let eventId: string;
  let courseId: string;
  let classId: string;
  let cellId: string;
  let churchName: string;
  let cellChurch: string;

  before(() => {
    token(MANAGER).then((mt: string) => {
      managerToken = mt;
      cy.request({ url: `${API}/api/auth/me/`, headers: auth(mt) }).then(({ body: me }) => {
        churchName = me.church.name;
        cy.request({
          method: "POST",
          url: `${API}/api/production-events/`,
          headers: auth(mt),
          body: {
            title: EVENT,
            event_type: "conference",
            campus_id: me.campus.id,
            visibility: "public",
            starts_at: new Date(Date.now() + 8 * 86400000).toISOString(),
            ticket: { price_cents: 0 },
          },
        }).then(({ body }) => (eventId = body.id));
        cy.request({
          method: "POST",
          url: `${API}/api/courses/`,
          headers: auth(mt),
          body: { name: COURSE, campus_id: me.campus.id },
        }).then(({ body: course }) => {
          courseId = course.id;
          cy.request({
            method: "POST",
            url: `${API}/api/course-classes/`,
            headers: auth(mt),
            body: {
              course_id: courseId,
              campus_id: me.campus.id,
              name: "Turma pública",
              end_date: new Date(Date.now() + 30 * 86400000).toLocaleDateString("en-CA"),
              self_enrollment: true,
              visibility: "public",
            },
          }).then(({ body: cls }) => (classId = cls.id));
        });
      });
      cy.request({ url: `${API}/api/cells/?page_size=200`, headers: auth(mt) }).then(({ body }) => {
        cellId = (body.results as { id: string; name: string }[]).find((c) => c.name === CELL)!.id;
        cy.request({
          method: "PATCH",
          url: `${API}/api/cells/${cellId}/`,
          headers: auth(mt),
          body: { visibility: "public" },
        });
        cy.request(`${API}/api/public/cells/${cellId}/`).then(
          ({ body: cell }) => (cellChurch = cell.church.name),
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
    if (courseId) {
      cy.request({
        method: "DELETE",
        url: `${API}/api/courses/${courseId}/`,
        headers: auth(managerToken),
        failOnStatusCode: false,
      });
    }
    if (cellId) {
      cy.request({
        method: "PATCH",
        url: `${API}/api/cells/${cellId}/`,
        headers: auth(managerToken),
        body: { visibility: "members" },
      });
    }
    cy.request({
      method: "POST",
      url: `${API}/api/auth/login/`,
      body: { email: OUTSIDER.email, password: OUTSIDER.password },
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

  it("anyone sees what is public, and a cell shows only church, day and time", () => {
    cy.visit("/explorar");
    cy.contains("[data-testid=explore-event]", EVENT, { timeout: 30000 });
    cy.contains("[data-testid=explore-class]", COURSE);
    cy.get(`a[href="/celula/${cellId}"]`)
      .invoke("text")
      .should("include", `Célula · ${cellChurch}`)
      .and("not.include", "Amor");
    cy.get(`a[href="/celula/${cellId}"]`).click();
    cy.get("[data-testid=public-cell]", { timeout: 30000 })
      .should("contain", cellChurch)
      .and("not.contain", "Amor");

    cy.visit(`/turma/${classId}`);
    cy.get("[data-testid=public-class]", { timeout: 30000 })
      .should("contain", COURSE)
      .and("contain", "Gratuito");
    cy.contains("a", "Criar conta e me inscrever")
      .should("have.attr", "href")
      .and("include", "turma=");
  });

  it("an account without a church explores and opens a public event", () => {
    cy.request("POST", `${API}/api/auth/register/`, {
      name: OUTSIDER.name,
      email: OUTSIDER.email,
      password: OUTSIDER.password,
    });
    cy.login(OUTSIDER.email, OUTSIDER.password);
    cy.visit("/app");
    cy.get("[data-testid=while-unlinked]", { timeout: 30000 }).contains("a", "Explorar").click();
    cy.get("[data-testid=unlinked-banner]").should("contain", "ainda não está ligada");
    cy.contains("[data-testid=explore-event]", EVENT, { timeout: 30000 }).click();
    cy.get("[data-testid=public-event]", { timeout: 30000 })
      .contains("a", "Fazer inscrição")
      .click();
    cy.contains("button", "Inscrever-se", { timeout: 30000 }).should("be.visible");
    cy.get("[data-testid=unlinked-banner]").should("exist");
  });
});
