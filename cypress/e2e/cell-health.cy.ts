// Cell health and "Pessoas para cuidar": with 5 weekly meetings registered, a
// member who stopped coming 3 meetings ago and a visitor who came once, the
// cell page shows the indicator with its reasons and both people to call; the
// coordination tab filters by health; a plain member sees none of it.
//
// Runs against the real backend + local DB seeded with `manage.py seed_initial_church`.
// Creates its own season (when the church has none running today), cell,
// visitor and meetings, and removes them at the end.

const API_URL = "http://127.0.0.1:8000";
const PASSWORD = "TrocarSenha123!";
const MANAGER = "gestor@ilan.church";
const CAMPUS_LEADER = "lider.campus1@ilan.church";
const MEMBER_EMAIL = "membro@ilan.church";
// Joins the cell and stops coming.
const ABSENT_EMAIL = "colider.brave2@ilan.church";
const CAMPUS_NAME = "Arena ILAN";

const STAMP = Date.now();
const CELL_NAME = `Cypress Saúde ${STAMP}`;
const SEASON_NAME = `Cypress Temporada Saúde ${STAMP}`;
const VISITOR = `Visitante Sumido ${STAMP}`;

function iso(daysFromToday: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysFromToday);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// 1 = Monday … 7 = Sunday, like the backend.
const TODAY_WEEKDAY = ((new Date().getDay() + 6) % 7) + 1;
// Oldest first; the season starts on the first one.
const MEETING_DAYS = [-35, -28, -21, -14, -7];

describe("Cell health and people to care", () => {
  let token: string;
  let cellId: string;
  let createdSeasonId: string | undefined;
  const people: Record<string, { id: string; name: string }> = {};

  const headers = () => ({ Authorization: `Bearer ${token}` });
  const findPerson = (email: string) =>
    cy
      .request({
        url: `${API_URL}/api/cells/${cellId}/people-search/?q=${email}`,
        headers: headers(),
      })
      .then(({ body }) => {
        people[email] = body[0];
        return cy.request({
          method: "POST",
          url: `${API_URL}/api/cells/${cellId}/members/`,
          headers: headers(),
          body: { person_id: body[0].id },
        });
      });

  before(() => {
    cy.request("POST", `${API_URL}/api/auth/login/`, { email: MANAGER, password: PASSWORD })
      .its("body.access")
      .then((access: string) => {
        token = access;
        return cy.request({ url: `${API_URL}/api/campuses/`, headers: headers() });
      })
      .then(({ body }) => {
        const campus = body.results.find((c: { name: string }) => c.name === CAMPUS_NAME);
        return cy
          .request({
            url: `${API_URL}/api/seasons/current/?church=${campus.church.id}`,
            headers: headers(),
            failOnStatusCode: false,
          })
          .then((current) => {
            if (current.status === 200) return { campus, seasonId: current.body.id as string };
            return cy
              .request({
                method: "POST",
                url: `${API_URL}/api/seasons/`,
                headers: headers(),
                body: {
                  church_id: campus.church.id,
                  name: SEASON_NAME,
                  start_date: iso(MEETING_DAYS[0]),
                  end_date: iso(35),
                },
              })
              .then(({ body: season }) => {
                createdSeasonId = season.id;
                return { campus, seasonId: season.id as string };
              });
          });
      })
      .then(({ campus, seasonId }) =>
        cy.request({
          method: "POST",
          url: `${API_URL}/api/cells/`,
          headers: headers(),
          body: {
            campus_id: campus.id,
            season_id: seasonId,
            name: CELL_NAME,
            meeting_day: TODAY_WEEKDAY,
            meeting_time: "19:30",
            target_audience: "todos",
          },
        }),
      )
      .then(({ body: cell }) => {
        cellId = cell.id;
        findPerson(MEMBER_EMAIL);
        findPerson(ABSENT_EMAIL);
        return cy.request({
          method: "POST",
          url: `${API_URL}/api/cell-visitors/`,
          headers: headers(),
          body: { cell_id: cellId, name: VISITOR, phone: "(11) 98888-7777" },
        });
      })
      .then(({ body: visitor }) => {
        // The absent member came to the first 2; the visitor only to the first.
        MEETING_DAYS.forEach((day, i) =>
          cy.request({
            method: "POST",
            url: `${API_URL}/api/cell-meetings/`,
            headers: headers(),
            body: {
              cell_id: cellId,
              date: iso(day),
              held: true,
              attendee_ids: [people[MEMBER_EMAIL].id, ...(i < 2 ? [people[ABSENT_EMAIL].id] : [])],
              visitor_ids: i === 0 ? [visitor.id] : [],
            },
          }),
        );
      });
  });

  after(() => {
    if (cellId) {
      cy.request({
        method: "DELETE",
        url: `${API_URL}/api/cells/${cellId}/`,
        headers: headers(),
        failOnStatusCode: false,
      });
    }
    if (createdSeasonId) {
      cy.request({
        method: "DELETE",
        url: `${API_URL}/api/seasons/${createdSeasonId}/`,
        headers: headers(),
        failOnStatusCode: false,
      });
    }
  });

  it("shows the cell's health with its reasons and the people to care for", () => {
    cy.login(MANAGER, PASSWORD);
    cy.visit(`/app/celulas/${cellId}`);

    cy.contains("h2", /Saúde da célula/i, { timeout: 15000 })
      .closest("section")
      .within(() => {
        // Nobody leads it: red.
        cy.get("[data-testid=cell-health]").should("have.attr", "data-status", "critical");
        cy.get("[data-testid=cell-health-reasons]").should("contain", "Sem líder");
        cy.get("[data-testid=cell-health-summary]").should("contain", "Frequência");
      });

    cy.contains("[data-testid=care-absent]", people[ABSENT_EMAIL].name).should(
      "contain",
      "Faltou aos últimos 3 encontros",
    );
    cy.contains("[data-testid=care-absent]", people[MEMBER_EMAIL].name).should("not.exist");
    cy.contains("[data-testid=care-visitor]", VISITOR)
      .should("contain", "1 visita")
      .find("a[href^='https://wa.me/']")
      .should("have.attr", "href", "https://wa.me/5511988887777");
  });

  it("the coordination tab filters cells by health", () => {
    cy.login(CAMPUS_LEADER, PASSWORD);
    cy.visit("/app/celulas/coordenacao");
    cy.contains("a", CELL_NAME, { timeout: 15000 })
      .find("[data-testid=cell-health]")
      .should("contain", "Crítica");

    cy.get("[aria-label='Saúde']").click();
    cy.contains("[role=option]", "Saudável").click();
    cy.contains("a", CELL_NAME).should("not.exist");

    cy.get("[aria-label='Saúde']").click();
    cy.contains("[role=option]", "Crítica").click();
    cy.contains("a", CELL_NAME).should("be.visible");
  });

  it("a plain member of the cell sees no health nor people to care", () => {
    cy.login(MEMBER_EMAIL, PASSWORD);
    cy.visit(`/app/celulas/${cellId}`);
    cy.contains("h2", /Encontros/i, { timeout: 15000 }).should("be.visible");
    cy.contains("h2", /Saúde da célula/i).should("not.exist");
    cy.contains("h2", /Pessoas para cuidar/i).should("not.exist");
    cy.get("[data-testid=cell-health]").should("not.exist");
  });
});
