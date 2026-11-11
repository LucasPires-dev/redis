// Cell meeting calendar: every scheduled date of the season, with its status,
// and the leader just registers how each one went.
//
// Runs against the real backend + local DB seeded with `manage.py seed_initial_church`.
// Creates its own season (when the church has none running today) and cell, meeting on
// today's weekday, and deletes them at the end.

const API_URL = "http://127.0.0.1:8000";
const PASSWORD = "TrocarSenha123!";
const MANAGER = "gestor@ilan.church";
const MEMBER_EMAIL = "membro@ilan.church";
const CAMPUS_NAME = "Arena ILAN";
const CELL_NAME = "Cypress Calendário";
const SEASON_NAME = "Cypress Temporada";

function iso(daysFromToday: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysFromToday);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// 1 = Monday … 7 = Sunday, like the backend.
const TODAY_WEEKDAY = ((new Date().getDay() + 6) % 7) + 1;

const entry = (daysFromToday: number) => cy.get(`[data-testid="meeting-${iso(daysFromToday)}"]`);

describe("Cell meeting calendar", () => {
  let token: string;
  let cellId: string;
  let pendingAtStart: number;
  let createdSeasonId: string | undefined;

  const headers = () => ({ Authorization: `Bearer ${token}` });

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
            // No season running: create one five weeks before and after today, so
            // today's weekday gives 5 past dates, today and 5 upcoming ones.
            return cy
              .request({
                method: "POST",
                url: `${API_URL}/api/seasons/`,
                headers: headers(),
                body: {
                  church_id: campus.church.id,
                  name: SEASON_NAME,
                  start_date: iso(-35),
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
          },
        }),
      )
      .then(({ body: cell }) => {
        cellId = cell.id;
        pendingAtStart = cell.pending_meetings;
        return cy.request({
          url: `${API_URL}/api/cells/${cellId}/people-search/?q=${MEMBER_EMAIL}`,
          headers: headers(),
        });
      })
      .then(({ body: people }) =>
        cy.request({
          method: "POST",
          url: `${API_URL}/api/cells/${cellId}/members/`,
          headers: headers(),
          body: { person_id: people[0].id },
        }),
      );
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

  beforeEach(() => {
    cy.login(MANAGER, PASSWORD);
    cy.visit(`/app/celulas/${cellId}`);
    cy.contains("h2", "Encontros", { timeout: 15000 }).should("be.visible");
  });

  it("lists the season's dates with their status", () => {
    entry(0).should("have.attr", "data-status", "today");
    entry(-7).should("have.attr", "data-status", "pending").and("contain.text", "Sem registro");
    // Only the nearest upcoming date shows until expanded.
    entry(7).should("have.attr", "data-status", "upcoming");
    entry(14).should("not.exist");
    cy.contains("button", "Mostrar próximas datas").click();
    entry(14).should("exist");
    cy.get('[data-testid="meetings-summary"]').should("contain.text", "sem registro");
  });

  it("registers attendance on a pending date", () => {
    entry(-7).within(() => cy.contains("button", "Registrar presença").click());
    cy.get('[role="dialog"]').within(() => {
      cy.get("#meeting-date").should("have.value", iso(-7));
      cy.contains("label", "Membro ILAN").find('[role="checkbox"]').click();
      cy.get("#meeting-visitors").clear().type("2");
      cy.contains("button", "Salvar").click();
    });
    cy.contains("Presença registrada").should("be.visible");
    entry(-7)
      .should("have.attr", "data-status", "registered")
      .and("contain.text", "3 presentes")
      .and("contain.text", "2 visitantes");
  });

  it("marks an upcoming date as not happening, with a reason", () => {
    entry(7).within(() => cy.contains("button", "Não vai acontecer").click());
    cy.get('[role="dialog"]').within(() => {
      // Attendance can't be registered ahead of time.
      cy.get('[aria-label="Aconteceu"]').should("be.disabled");
      cy.contains("button", "Salvar").should("be.disabled");
      cy.contains("button", "Feriado").click();
      cy.get("#meeting-reason").should("have.value", "Feriado");
      cy.contains("button", "Salvar").click();
    });
    cy.contains("Encontro marcado como não realizado").should("be.visible");
    entry(7).should("have.attr", "data-status", "not_held").and("contain.text", "Feriado");
  });

  it("marks a past date as not held", () => {
    entry(-14).within(() => cy.contains("button", "Registrar presença").click());
    cy.get('[role="dialog"]').within(() => {
      cy.get('[aria-label="Não aconteceu"]').click();
      cy.get("#meeting-reason").type("Culto especial no templo");
      cy.contains("button", "Salvar").click();
    });
    entry(-14).should("have.attr", "data-status", "not_held");
  });

  it("registers an extra meeting in a week that already had one", () => {
    // A day in the same Monday–Sunday week as the date registered above.
    const slot = new Date();
    slot.setDate(slot.getDate() - 7);
    const extraOffset = slot.getDay() === 1 ? -6 : -8;

    cy.contains("button", "Encontro extra").click();
    cy.get('[role="dialog"]').within(() => {
      cy.get("#meeting-date").clear().type(iso(extraOffset));
      cy.get("#meeting-notes").type("Vigília");
      cy.contains("button", "Salvar").click();
    });
    entry(extraOffset)
      .should("have.attr", "data-status", "registered")
      .and("contain.text", "Extra")
      .and("contain.text", "Vigília");
  });

  it("counts what is still pending for the coordination", () => {
    // Two past dates were dealt with: one registered, one not held.
    const pending = pendingAtStart - 2;
    cy.request({ url: `${API_URL}/api/cells/${cellId}/`, headers: headers() })
      .its("body.pending_meetings")
      .should("eq", pending);
    cy.get('[data-testid="meetings-summary"]').should("contain.text", `${pending} sem registro`);
  });
});
