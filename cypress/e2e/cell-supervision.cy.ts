// Supervisão: coordination names the cell's supervisor; the supervisor gets
// the "Supervisão" tab, registers a visit and names a co-leader; the cell's
// leader sees who supervises them but not the visits.
//
// Runs against the real backend + local DB seeded with `manage.py seed_initial_church`.
// Creates its own season (when the church has none running today) and cell,
// and removes them at the end.

const API_URL = "http://127.0.0.1:8000";
const PASSWORD = "TrocarSenha123!";
const MANAGER = "gestor@ilan.church";
const COORDINATOR = "celulas.arena@ilan.church";
const SUPERVISOR = "lider.brave2@ilan.church";
const SUPERVISOR_NAME = "Líder Brave 2";
const CELL_LEADER = "lider.brave1@ilan.church";
const NEW_CO_LEADER_NAME = "Co-líder Brave 2";
const CAMPUS_NAME = "Arena ILAN";

const STAMP = Date.now();
const CELL_NAME = `Cypress Supervisão ${STAMP}`;
const SEASON_NAME = `Cypress Temporada Supervisão ${STAMP}`;
const NOTES = `Conversa boa com a liderança ${STAMP}`;

function iso(daysFromToday: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysFromToday);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

describe("Cell supervision", () => {
  let token: string;
  let cellId: string;
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
            return cy
              .request({
                method: "POST",
                url: `${API_URL}/api/seasons/`,
                headers: headers(),
                body: {
                  church_id: campus.church.id,
                  name: SEASON_NAME,
                  start_date: iso(-14),
                  end_date: iso(90),
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
            meeting_day: 4,
            meeting_time: "20:00",
            target_audience: "todos",
          },
        }),
      )
      .then(({ body: cell }) => {
        cellId = cell.id;
        return cy.request({
          url: `${API_URL}/api/cells/${cellId}/people-search/?q=${CELL_LEADER}`,
          headers: headers(),
        });
      })
      .then(({ body: people }) => {
        const leader = (people as { id: string; email: string }[]).find(
          (p) => p.email === CELL_LEADER,
        );
        return cy.request({
          method: "POST",
          url: `${API_URL}/api/cells/${cellId}/leaderships/`,
          headers: headers(),
          body: { person_id: leader!.id, role: "leader" },
        });
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

  it("coordination names the cell's supervisor", () => {
    cy.login(COORDINATOR, PASSWORD);
    cy.visit(`/app/celulas/${cellId}`);
    cy.get("[data-testid=cell-supervisor]", { timeout: 15000 }).within(() => {
      cy.contains("Sem supervisor definido");
      cy.get("input").type("Brave 2");
      cy.contains("button", SUPERVISOR_NAME, { timeout: 10000 }).click();
    });
    cy.get("[data-testid=cell-supervisor]").should(
      "contain",
      `Supervisionada por ${SUPERVISOR_NAME}`,
    );
  });

  it("the supervisor follows the cell, registers a visit and names a co-leader", () => {
    cy.login(SUPERVISOR, PASSWORD);
    cy.visit("/app/celulas");
    cy.get("nav[aria-label='Seções']", { timeout: 15000 }).contains("a", "Supervisão").click();
    cy.contains("[data-testid=supervised-cell]", CELL_NAME, { timeout: 15000 })
      .should("contain", "Nenhuma visita ainda")
      .click();

    cy.contains("button", "Registrar visita", { timeout: 15000 }).click();
    cy.get("[role=dialog]").within(() => {
      cy.get("#visit-kind").click();
    });
    cy.contains("[role=option]", "Conversa com a liderança").click();
    cy.get("[role=dialog]").within(() => {
      cy.get("#visit-notes").type(NOTES);
      cy.contains("button", "Salvar").click();
    });
    cy.contains("[data-testid=supervision-visit]", NOTES)
      .should("contain", "Conversa com a liderança")
      .and("contain", SUPERVISOR_NAME);
    cy.get("[data-testid=cell-supervisor]").should("contain", "Última visita em");

    // Names a co-leader (the level above the cell's leaders).
    cy.get("[aria-label=Papel]").click();
    cy.contains("[role=option]", "Colíder").click();
    cy.contains("Adicionar liderança")
      .closest("[class*=card]")
      .within(() => {
        cy.get("input").type("Brave 2");
        cy.contains("button", NEW_CO_LEADER_NAME, { timeout: 10000 }).click();
      });
    cy.contains(".text-xs", /^Colíderes$/)
      .parent()
      .should("contain", NEW_CO_LEADER_NAME);
  });

  it("the cell's leader sees the supervisor but not the visits", () => {
    cy.login(CELL_LEADER, PASSWORD);
    cy.visit(`/app/celulas/${cellId}`);
    cy.get("[data-testid=cell-supervisor]", { timeout: 15000 }).should(
      "contain",
      `Supervisionada por ${SUPERVISOR_NAME}`,
    );
    cy.contains(NOTES).should("not.exist");
    cy.contains("button", "Registrar visita").should("not.exist");
    // Only "Minhas células" (the tab bar isn't even shown with a single tab).
    cy.contains("a", "Supervisão").should("not.exist");
  });
});
