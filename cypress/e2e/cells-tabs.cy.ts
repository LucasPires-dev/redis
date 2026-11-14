// The Células area as one screen with tabs per capability. "Minhas células"
// (cells the person leads or belongs to) is always there; "Coordenação" is
// added for who coordinates — a cell leader who coordinates keeps both, and a
// ministry leader no longer loses the Células entry.
// Runs against the real backend seeded with `manage.py seed_initial_church`.

const API = "http://127.0.0.1:8000";
const PASSWORD = "TrocarSenha123!";
const MANAGER = "gestor@ilan.church";
const MEMBER = "membro@ilan.church";
// Arena campus leader (coordinates the campus cells) who, here, also leads a cell.
const LEADER_COORDINATOR = "lider.campus1@ilan.church";
// Leads the Arena adolescentes ministry; not in any cell.
const MINISTRY_LEADER = "lider.brave1@ilan.church";

const STAMP = Date.now();
const MY_CELL = `Célula Abas ${STAMP}`;
const OTHER_CELL = `Célula Outra ${STAMP}`;

function token(email: string) {
  return cy
    .request("POST", `${API}/api/auth/login/`, { email, password: PASSWORD })
    .its("body.access");
}

const auth = (t: string) => ({ Authorization: `Bearer ${t}` });

function me(email: string) {
  return token(email).then((t: string) =>
    cy.request({ url: `${API}/api/auth/me/`, headers: auth(t) }).its("body"),
  );
}

const tabs = () => cy.get("nav[aria-label='Seções']");

describe("Cells — tabs per capability", () => {
  let managerToken: string;
  let seasonId: string;
  let createdSeasonId: string | undefined;
  const cellIds: string[] = [];

  function createCell(name: string, campusId: string) {
    return cy
      .request({
        method: "POST",
        url: `${API}/api/cells/`,
        headers: auth(managerToken),
        body: {
          name,
          campus_id: campusId,
          season_id: seasonId,
          meeting_day: 3,
          meeting_time: "19:30",
          target_audience: "todos",
        },
      })
      .its("body.id")
      .then((id: string) => {
        cellIds.push(id);
        return id;
      });
  }

  before(() => {
    token(MANAGER).then((mt: string) => {
      managerToken = mt;
      me(LEADER_COORDINATOR).then((leader) => {
        // Cells need a season of the campus's church: a short one around today,
        // removed in after() (fails harmlessly if the church already has one).
        const day = (offset: number) =>
          new Date(Date.now() + offset * 86400000).toLocaleDateString("en-CA");
        cy.request({
          method: "POST",
          url: `${API}/api/seasons/`,
          headers: auth(mt),
          body: {
            church_id: leader.church.id,
            name: `Temporada Abas ${STAMP}`,
            start_date: day(-1),
            end_date: day(30),
          },
          failOnStatusCode: false,
        }).then(({ status, body }) => {
          if (status === 201) createdSeasonId = body.id;
        });
        cy.request({ url: `${API}/api/seasons/`, headers: auth(mt) }).then(({ body }) => {
          const list: { id: string; church: string; is_current: boolean }[] = body.results ?? body;
          seasonId = list.find((x) => x.church === leader.church.id && x.is_current)!.id;
        });
        me(MEMBER).then((member) => {
          createCell(MY_CELL, leader.campus.id).then((cellId) => {
            cy.request({
              method: "POST",
              url: `${API}/api/cells/${cellId}/leaderships/`,
              headers: auth(mt),
              body: { person_id: leader.id, role: "leader" },
            });
            cy.request({
              method: "POST",
              url: `${API}/api/cells/${cellId}/members/`,
              headers: auth(mt),
              body: { person_id: member.id },
            });
          });
          // Same campus, but the leader isn't in it: coordination only.
          createCell(OTHER_CELL, leader.campus.id);
        });
      });
    });
  });

  after(() => {
    cellIds.forEach((id) =>
      cy.request({
        method: "DELETE",
        url: `${API}/api/cells/${id}/`,
        headers: auth(managerToken),
        failOnStatusCode: false,
      }),
    );
    cy.then(() => {
      if (createdSeasonId) {
        cy.request({
          method: "DELETE",
          url: `${API}/api/seasons/${createdSeasonId}/`,
          headers: auth(managerToken),
          failOnStatusCode: false,
        });
      }
    });
  });

  it("member: only their own cell, no coordination", () => {
    cy.login(MEMBER, PASSWORD);
    cy.visit("/app/celulas");
    cy.contains("[data-testid=my-cell]", MY_CELL, { timeout: 15000 }).should("contain", "Membro");
    cy.contains("[data-testid=my-cell]", OTHER_CELL).should("not.exist");
    // A single tab: no tab bar at all.
    cy.get("nav[aria-label='Seções']").should("not.exist");

    cy.visit("/app/celulas/coordenacao");
    cy.location("pathname").should("eq", "/app/celulas");
  });

  it("cell leader who coordinates: keeps Minhas células and gets Coordenação", () => {
    cy.login(LEADER_COORDINATOR, PASSWORD);
    cy.visit("/app/celulas");
    tabs().contains("a", "Minhas células").should("have.attr", "aria-current", "page");
    cy.contains("[data-testid=my-cell]", MY_CELL, { timeout: 15000 }).should("contain", "Líder");
    // The campus-wide list stays in Coordenação, not in the personal tab.
    cy.contains("[data-testid=my-cell]", OTHER_CELL).should("not.exist");
    cy.get("[data-sidebar=sidebar]").should("not.contain", "Coord. Células");

    tabs().contains("a", "Coordenação").click();
    cy.location("pathname").should("eq", "/app/celulas/coordenacao");
    cy.contains("main a", MY_CELL, { timeout: 15000 }).should("be.visible");
    cy.contains("main a", OTHER_CELL).should("be.visible");
    cy.contains("button", "Nova célula").should("be.visible");

    // The old address lands on the tab.
    cy.visit("/app/celulas/coordination");
    cy.location("pathname").should("eq", "/app/celulas/coordenacao");
  });

  it("ministry leader: the Células entry is no longer hidden", () => {
    cy.login(MINISTRY_LEADER, PASSWORD);
    cy.visit("/app/ministerios");
    cy.get("[data-sidebar=sidebar]").contains("a", "Células").click();
    cy.location("pathname").should("eq", "/app/celulas");
    cy.contains("h1", "Células").should("be.visible");
  });
});
