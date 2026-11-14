// Days without serving: the volunteer marks them in "Minhas escalas"; the
// leadership sees it when inviting (a warning, not a block) and on the roster.
// Runs against the real backend seeded with `manage.py seed_initial_church`.

const API = "http://127.0.0.1:8000";
const PASSWORD = "TrocarSenha123!";
const MANAGER = "gestor@ilan.church";
const VOLUNTEER = "lider.brave1@ilan.church";
const TITLE = "Cypress Indisponível";

type Person = { id: string; name: string; campus: { id: string } | null };

function token(email: string) {
  return cy
    .request("POST", `${API}/api/auth/login/`, { email, password: PASSWORD })
    .its("body.access");
}
const auth = (t: string) => ({ Authorization: `Bearer ${t}` });
const pad = (n: number) => String(n).padStart(2, "0");
const dayKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

describe("Days without serving", () => {
  let managerToken: string;
  let volunteerToken: string;
  let eventId: string;
  let ministry: { id: string; name: string };
  let volunteer: Person;
  let added = false;
  const startsAt = new Date(Date.now() + 6 * 86400000);
  startsAt.setHours(19, 0, 0, 0);

  before(() => {
    token(MANAGER).then((mt: string) => {
      managerToken = mt;
      token(VOLUNTEER).then((vt: string) => {
        volunteerToken = vt;
        cy.request({ url: `${API}/api/auth/me/`, headers: auth(vt) }).then(
          ({ body }) => (volunteer = body),
        );
      });
      cy.then(() =>
        cy
          .request({ url: `${API}/api/ministries/?page_size=200`, headers: auth(mt) })
          .then(({ body }) => {
            ministry = body.results.find(
              (m: { campus: { id: string } }) => m.campus.id === volunteer.campus?.id,
            );
            return cy.request({
              url: `${API}/api/ministries/${ministry.id}/members/`,
              headers: auth(mt),
            });
          })
          .then(({ body: members }) => {
            if (!(members as Person[]).some((m) => m.id === volunteer.id)) {
              added = true;
              cy.request({
                method: "POST",
                url: `${API}/api/ministries/${ministry.id}/members/`,
                headers: auth(mt),
                body: { person_id: volunteer.id },
              });
            }
            cy.request({
              method: "POST",
              url: `${API}/api/production-events/`,
              headers: auth(mt),
              body: {
                title: TITLE,
                event_type: "culto",
                campus_id: volunteer.campus?.id,
                starts_at: startsAt.toISOString(),
              },
            }).then(({ body }) => (eventId = body.id));
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
    cy.request({
      url: `${API}/api/production-unavailability/`,
      headers: auth(volunteerToken),
    }).then(({ body }) =>
      (body as { id: string; reason: string }[])
        .filter((u) => u.reason === "Viagem Cypress")
        .forEach((u) =>
          cy.request({
            method: "DELETE",
            url: `${API}/api/production-unavailability/${u.id}/`,
            headers: auth(volunteerToken),
          }),
        ),
    );
    if (added) {
      cy.request({
        method: "DELETE",
        url: `${API}/api/ministries/${ministry.id}/members/${volunteer.id}/`,
        headers: auth(managerToken),
        failOnStatusCode: false,
      });
    }
  });

  it("the volunteer marks the days in Minhas escalas", () => {
    cy.viewport("iphone-x");
    cy.login(VOLUNTEER, PASSWORD);
    cy.visit("/app/eventos/escalas");
    cy.get("[data-testid=unavailability]", { timeout: 30000 }).scrollIntoView();
    cy.get("#away-start").type(dayKey(startsAt));
    cy.get("#away-reason").type("Viagem Cypress");
    cy.contains("[data-testid=unavailability] button", "Marcar").click();
    cy.contains("Dias marcados.");
    cy.contains("[data-testid=unavailable-day]", "Viagem Cypress").should(
      "contain",
      `${pad(startsAt.getDate())}/${pad(startsAt.getMonth() + 1)}`,
    );
  });

  it("the leadership sees it when inviting and on the roster", () => {
    cy.viewport("iphone-x");
    cy.login(MANAGER, PASSWORD);
    cy.visit(`/app/eventos/${eventId}/producao`);
    cy.contains("button", "Convidar", { timeout: 30000 }).first().click();
    cy.get("[role=dialog] button[role=combobox]").eq(0).click();
    cy.contains("[role=option]", ministry.name).click();
    cy.get("[role=dialog] button[role=combobox]").eq(1).click();
    cy.contains("[role=option]", volunteer.name).should("contain", "(indisponível)").click();
    cy.get("[data-testid=invite-unavailable]").should("contain", "Viagem Cypress");
    cy.contains("[role=dialog] button[type=submit]", "Convidar").click();
    cy.get("[role=dialog]").should("not.exist");
    cy.get("[data-testid=roster-unavailable]").should("contain", "Viagem Cypress");
  });
});
