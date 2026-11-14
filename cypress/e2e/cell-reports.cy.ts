// Cells "Relatórios" tab: a coordinator sees the season's totals, the weekly
// charts and the comparison table, filters by cell and exports a CSV; a plain
// member doesn't get the tab.
//
// Runs against the real backend + local DB seeded with `manage.py seed_initial_church`.
// Creates its own season (when the church has none running today), cell and
// meetings, and removes them at the end.

const API_URL = "http://127.0.0.1:8000";
const PASSWORD = "TrocarSenha123!";
const MANAGER = "gestor@ilan.church";
const CAMPUS_LEADER = "lider.campus1@ilan.church";
const MEMBER_EMAIL = "membro@ilan.church";
const CAMPUS_NAME = "Arena ILAN";

const STAMP = Date.now();
const CELL_NAME = `Cypress Relatório ${STAMP}`;
const SEASON_NAME = `Cypress Temporada Relatório ${STAMP}`;

function iso(daysFromToday: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysFromToday);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// 1 = Monday … 7 = Sunday, like the backend.
const TODAY_WEEKDAY = ((new Date().getDay() + 6) % 7) + 1;

describe("Cell reports", () => {
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
                  start_date: iso(-21),
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
        return cy.request({
          url: `${API_URL}/api/cells/${cellId}/people-search/?q=${MEMBER_EMAIL}`,
          headers: headers(),
        });
      })
      .then(({ body: people }) => {
        const member = people[0].id;
        cy.request({
          method: "POST",
          url: `${API_URL}/api/cells/${cellId}/members/`,
          headers: headers(),
          body: { person_id: member },
        });
        // Two meetings: 1 present + 3 visitors + 2 decisions, then 1 present + 1 visitor.
        [
          { date: iso(-14), visitors_count: 3, decisions_count: 2 },
          { date: iso(-7), visitors_count: 1, decisions_count: 0 },
        ].forEach((meeting) =>
          cy.request({
            method: "POST",
            url: `${API_URL}/api/cell-meetings/`,
            headers: headers(),
            body: { cell_id: cellId, held: true, attendee_ids: [member], ...meeting },
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

  it("campus leader sees totals, weekly charts and the cell in the comparison", () => {
    cy.login(CAMPUS_LEADER, PASSWORD);
    cy.visit("/app/celulas");
    cy.get("nav[aria-label='Seções']", { timeout: 15000 }).contains("a", "Relatórios").click();
    cy.location("pathname").should("eq", "/app/celulas/relatorios");

    cy.contains("[data-testid=report-cell]", CELL_NAME, { timeout: 15000 }).within(() => {
      cy.get("td").eq(3).should("contain", "2"); // meetings held
      cy.get("td").eq(6).should("contain", "4"); // visitors
      cy.get("td").eq(7).should("contain", "2"); // decisions
    });
    cy.get("[data-testid='weekly-Presença'] svg").should("exist");
    cy.get("[data-testid='weekly-Visitantes'] svg").should("exist");
    cy.get("[data-testid=report-totals]").should("contain", "Em células");
    // The comparison table scrolls inside its card; the page never scrolls sideways.
    cy.document().then((doc) => {
      expect(doc.documentElement.scrollWidth).to.be.at.most(doc.documentElement.clientWidth);
    });
    cy.screenshot("cell-reports-overview", { capture: "fullPage" });

    // Only this cell: the totals and charts follow it.
    cy.get("[aria-label='Célula']").click();
    cy.contains("[role=option]", CELL_NAME).click();
    cy.get("[data-testid=report-totals]")
      .should("contain", "Encontros realizados")
      .and("contain", "2");
    cy.get("[data-testid='weekly-Decisões']").should("contain", "2");
    cy.get("[data-testid=report-cells]").should("not.exist");
  });

  it("exports the comparison as CSV", () => {
    cy.login(CAMPUS_LEADER, PASSWORD);
    cy.visit("/app/celulas/relatorios");
    cy.contains("[data-testid=report-cell]", CELL_NAME, { timeout: 15000 });
    // Catch the file's content instead of a real download.
    cy.window().then((win) => {
      cy.stub(win.URL, "createObjectURL").as("csv").returns("data:text/csv,");
      cy.stub(win.URL, "revokeObjectURL");
    });
    cy.contains("button", "Exportar CSV").click();
    cy.get("@csv")
      .its("firstCall.args.0")
      .then((blob) => (blob as Blob).text())
      .then((csv) => {
        expect(csv).to.contain('"Célula";"Campus"');
        expect(csv).to.contain(`"${CELL_NAME}";"${CAMPUS_NAME}"`);
      });
  });

  it("a plain member doesn't get the Relatórios tab", () => {
    cy.login(MEMBER_EMAIL, PASSWORD);
    cy.visit("/app/celulas");
    cy.contains("h1", "Células", { timeout: 15000 }).should("be.visible");
    cy.contains("a", "Relatórios").should("not.exist");
    cy.visit("/app/celulas/relatorios");
    cy.location("pathname", { timeout: 15000 }).should("eq", "/app/celulas");
  });
});
