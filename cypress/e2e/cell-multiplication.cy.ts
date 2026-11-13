// Multiplication: the cell's leader names a leader in training and plans the
// multiplication; coordination multiplies the cell (the trainee leads the new
// one and the chosen member moves with them); the lineage shows on both cells
// and the generations tree in Relatórios.
//
// Runs against the real backend + local DB seeded with `manage.py seed_initial_church`.
// Creates its own season (when the church has none running today) and cells,
// and removes them at the end.

const API_URL = "http://127.0.0.1:8000";
const PASSWORD = "TrocarSenha123!";
const MANAGER = "gestor@ilan.church";
const CELL_LEADER = "lider.brave1@ilan.church";
const TRAINEE = "colider.brave1@ilan.church";
const TRAINEE_NAME = "Co-líder Brave 1";
const MOVING = "membro@ilan.church";
const MOVING_NAME = "Membro ILAN";
const STAYING = "colider.brave2@ilan.church";
const COORDINATOR = "celulas.arena@ilan.church";
const CAMPUS_NAME = "Arena ILAN";

const STAMP = Date.now();
const MOTHER = `Cypress Mãe ${STAMP}`;
const DAUGHTER = `Cypress Filha ${STAMP}`;
const SEASON_NAME = `Cypress Temporada Multiplicação ${STAMP}`;

function iso(daysFromToday: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysFromToday);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

describe("Cell multiplication", () => {
  let token: string;
  let motherId: string;
  let createdSeasonId: string | undefined;

  const headers = () => ({ Authorization: `Bearer ${token}` });
  // Exact match: "lider.brave1@…" is also found inside "colider.brave1@…".
  const findPerson = (email: string) =>
    cy
      .request({
        url: `${API_URL}/api/cells/${motherId}/people-search/?q=${email}`,
        headers: headers(),
      })
      .then(({ body }) => {
        const person = (body as { id: string; email: string }[]).find((p) => p.email === email);
        expect(person, email).to.exist;
        return person!.id;
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
            name: MOTHER,
            meeting_day: 3,
            meeting_time: "20:00",
            target_audience: "todos",
          },
        }),
      )
      .then(({ body: cell }) => {
        motherId = cell.id;
        findPerson(CELL_LEADER).then((id) =>
          cy.request({
            method: "POST",
            url: `${API_URL}/api/cells/${motherId}/leaderships/`,
            headers: headers(),
            body: { person_id: id, role: "leader" },
          }),
        );
        [TRAINEE, MOVING, STAYING].forEach((email) =>
          findPerson(email).then((id) =>
            cy.request({
              method: "POST",
              url: `${API_URL}/api/cells/${motherId}/members/`,
              headers: headers(),
              body: { person_id: id },
            }),
          ),
        );
      });
  });

  after(() => {
    // The daughter first (it points at the mother), then the mother and season.
    cy.request({ url: `${API_URL}/api/cells/?season=current`, headers: headers() }).then(
      ({ body }) => {
        const cells: { id: string; name: string }[] = body.results ?? body;
        cells
          .filter((c) => c.name === DAUGHTER)
          .forEach((c) =>
            cy.request({
              method: "DELETE",
              url: `${API_URL}/api/cells/${c.id}/`,
              headers: headers(),
              failOnStatusCode: false,
            }),
          );
      },
    );
    if (motherId) {
      cy.request({
        method: "DELETE",
        url: `${API_URL}/api/cells/${motherId}/`,
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

  it("the cell's leader names a leader in training and plans the multiplication", () => {
    cy.login(CELL_LEADER, PASSWORD);
    cy.visit(`/app/celulas/${motherId}`);

    cy.contains("Adicionar líder em treinamento", { timeout: 15000 })
      .closest("div.rounded-lg, [class*=card]")
      .within(() => {
        cy.get("input").type(TRAINEE);
        cy.contains("button", TRAINEE, { timeout: 10000 }).click();
      });
    cy.contains(".text-xs", "Líderes em treinamento").parent().should("contain", TRAINEE_NAME);

    // A cell leader plans but doesn't multiply.
    cy.contains("button", "Multiplicar").should("not.exist");
    cy.get("[data-testid=multiplication-plan]").contains("button", "Planejar").click();
    cy.get("[role=dialog]").within(() => {
      cy.get("#plan-date").type(iso(30));
      cy.get("#plan-leader").click();
    });
    cy.contains("[role=option]", `${TRAINEE_NAME} (em treinamento)`).click();
    cy.get("[role=dialog]").contains("button", "Salvar").click();

    cy.get("[data-testid=multiplication-plan]")
      .should("contain", "Prevista para")
      .and("contain", TRAINEE_NAME);
    cy.get("[data-testid=cell-lineage]").should("contain", "1ª geração");
  });

  it("coordination multiplies the cell: the trainee leads the new one", () => {
    cy.login(COORDINATOR, PASSWORD);
    cy.visit(`/app/celulas/${motherId}`);
    cy.contains("button", "Multiplicar", { timeout: 15000 }).click();

    cy.get("[role=dialog]").within(() => {
      cy.get("#multiply-name").type(DAUGHTER);
      // The planned leader comes selected.
      cy.get("#multiply-leader").should("contain", TRAINEE_NAME);
      cy.get("[data-testid=multiply-people]").contains("label", MOVING_NAME).click();
      cy.contains("Quem vai para a nova célula (1)").should("be.visible");
      cy.contains("button", /^Multiplicar$/).click();
    });

    // Lands on the new cell.
    cy.contains("h1", DAUGHTER, { timeout: 15000 }).should("be.visible");
    cy.get("[data-testid=cell-lineage]")
      .should("contain", "2ª geração")
      .and("contain", `Nasceu da célula ${MOTHER}`);
    cy.contains(".text-xs", /^Líderes$/)
      .parent()
      .should("contain", TRAINEE_NAME);
    cy.contains("h2", /Membros/i)
      .closest("section")
      .should("contain", MOVING);

    // The mother lists the daughter; who moved left it; the plan is done.
    cy.get("[data-testid=cell-lineage]").contains("a", MOTHER).click();
    cy.contains("[data-testid=cell-daughter]", DAUGHTER, { timeout: 15000 }).should(
      "contain",
      TRAINEE_NAME,
    );
    cy.contains("h2", /Membros/i)
      .closest("section")
      .should("contain", STAYING)
      .and("not.contain", MOVING);
    cy.get("[data-testid=multiplication-plan]").should("contain", "Sem data definida");
    cy.contains("h2", /Multiplicação/i).scrollIntoView();
    cy.screenshot("cell-multiplication-mother");
  });

  it("Relatórios shows the multiplication and the generations tree", () => {
    cy.login(COORDINATOR, PASSWORD);
    cy.visit("/app/celulas/relatorios");
    cy.get("[data-testid=generations-tree]", { timeout: 15000 })
      .contains("li", MOTHER)
      .find("ul")
      .should("contain", DAUGHTER);
    cy.contains("[data-testid=report-cell]", MOTHER).should("exist");
    cy.get("[data-testid=report-totals]").should("contain", "Multiplicações");
  });
});
