// Cell visitors by name: the leader registers a meeting with its topic,
// decisions and a new visitor, follows the visitor on the cell page, forwards
// one to Reconciliação and turns another into a member. A plain member of the
// cell doesn't get the visitors' list (it has contact data).
//
// Runs against the real backend + local DB seeded with `manage.py seed_initial_church`.
// Creates its own season (when the church has none running today), cell and
// visitors, and removes them at the end (the Reconciliação lead is discarded).

const API_URL = "http://127.0.0.1:8000";
const PASSWORD = "TrocarSenha123!";
const MANAGER = "gestor@ilan.church";
const MEMBER_EMAIL = "membro@ilan.church";
// An existing person who joins the cell from a visitor.
const JOINER_EMAIL = "colider.brave2@ilan.church";
const CAMPUS_NAME = "Arena ILAN";

const STAMP = Date.now();
const CELL_NAME = `Cypress Visitantes ${STAMP}`;
const SEASON_NAME = `Cypress Temporada Visitantes ${STAMP}`;
const NEW_VISITOR = `Visitante Novo ${STAMP}`;
const SECOND_VISITOR = `Visitante Membro ${STAMP}`;

function iso(daysFromToday: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysFromToday);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// 1 = Monday … 7 = Sunday, like the backend.
const TODAY_WEEKDAY = ((new Date().getDay() + 6) % 7) + 1;

const visitorCard = (name: string, options?: { timeout: number }) =>
  cy.contains("[data-testid=cell-visitor]", name, options);

describe("Cell visitors", () => {
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
      .then(({ body: people }) =>
        cy.request({
          method: "POST",
          url: `${API_URL}/api/cells/${cellId}/members/`,
          headers: headers(),
          body: { person_id: people[0].id },
        }),
      )
      .then(() =>
        cy.request({
          method: "POST",
          url: `${API_URL}/api/cell-visitors/`,
          headers: headers(),
          body: { cell_id: cellId, name: SECOND_VISITOR, phone: "11911112222" },
        }),
      );
  });

  after(() => {
    // The forwarded visitor's lead stays in Reconciliação's queue: discard it.
    cy.request({ url: `${API_URL}/api/reconciliation-leads/`, headers: headers() }).then(
      ({ body }) => {
        const leads: { id: string; name: string }[] = body.results ?? body;
        leads
          .filter((lead) => lead.name === NEW_VISITOR)
          .forEach((lead) =>
            cy.request({
              method: "POST",
              url: `${API_URL}/api/reconciliation-leads/${lead.id}/discard/`,
              headers: headers(),
              failOnStatusCode: false,
            }),
          );
      },
    );
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

  it("leader registers a meeting with topic, decisions and a new visitor", () => {
    cy.login(MANAGER, PASSWORD);
    cy.visit(`/app/celulas/${cellId}`);
    cy.get(`[data-testid="meeting-${iso(-7)}"]`, { timeout: 15000 })
      .contains("button", "Registrar presença")
      .click();

    cy.get("[role=dialog]").within(() => {
      cy.get("#meeting-topic").type("Parábola do semeador");
      cy.get("#meeting-decisions").type("1");
      cy.contains("label", "Membro").click();
      // The visitor registered earlier is in the list; a new one is added here.
      cy.contains("[data-testid=meeting-visitors-list] label", SECOND_VISITOR).click();
      cy.get("[aria-label='Nome do novo visitante']").type(NEW_VISITOR);
      cy.get("[aria-label='Telefone do novo visitante']").type("11933334444");
      cy.get("[aria-label='Adicionar visitante']").click();
      cy.contains("Visitantes (2)").should("be.visible");
      cy.contains("button", "Salvar").click();
    });

    cy.get(`[data-testid="meeting-${iso(-7)}"]`)
      .should("contain", "Tema: Parábola do semeador")
      .and("contain", "1 decisão")
      .and("contain", NEW_VISITOR)
      .and("contain", "2 visitantes");

    visitorCard(NEW_VISITOR).should("contain", "1 visita").and("contain", "Visitante");
  });

  it("forwards a visitor to Reconciliação", () => {
    cy.login(MANAGER, PASSWORD);
    cy.visit(`/app/celulas/${cellId}`);
    cy.on("window:confirm", () => true);
    visitorCard(NEW_VISITOR, { timeout: 15000 })
      .contains("button", "Encaminhar à Reconciliação")
      .click();
    visitorCard(NEW_VISITOR).should("contain", "Na Reconciliação");
    visitorCard(NEW_VISITOR).contains("button", "Encaminhar").should("not.exist");

    // It's in the Reconciliação triage queue as a pending lead of the campus.
    cy.request({ url: `${API_URL}/api/reconciliation-leads/`, headers: headers() })
      .its("body")
      .then((body) => {
        const leads: { name: string; status: string; raw_campus_label: string }[] =
          body.results ?? body;
        const lead = leads.find((l) => l.name === NEW_VISITOR);
        expect(lead?.status).to.eq("pending");
        expect(lead?.raw_campus_label).to.contain(CELL_NAME);
      });
  });

  it("turns a visitor into a member with an existing person", () => {
    cy.login(MANAGER, PASSWORD);
    cy.visit(`/app/celulas/${cellId}`);
    visitorCard(SECOND_VISITOR, { timeout: 15000 }).contains("button", "Tornar membro").click();
    cy.get("[role=dialog]").within(() => {
      cy.get("input[placeholder='Buscar por nome ou e-mail']").type(JOINER_EMAIL);
      cy.contains("button", JOINER_EMAIL, { timeout: 10000 }).click();
    });
    cy.contains("agora é membro da célula").should("be.visible");
    visitorCard(SECOND_VISITOR).should("contain", "Virou membro").and("contain", "Ver cadastro");
    cy.contains("h2", /Membros/i)
      .closest("section")
      .should("contain", JOINER_EMAIL);
  });

  it("a plain member of the cell doesn't get the visitors' list", () => {
    cy.login(MEMBER_EMAIL, PASSWORD);
    cy.visit(`/app/celulas/${cellId}`);
    cy.contains("h2", /Encontros/i, { timeout: 15000 }).should("be.visible");
    cy.contains("h2", /Visitantes/i).should("not.exist");
    cy.contains("button", "Novo visitante").should("not.exist");
  });
});
