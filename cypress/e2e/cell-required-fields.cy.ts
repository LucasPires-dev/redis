// A cell can't be created without meeting day, time and audience.
// Runs against the real backend + local DB (default cy.login() user, a cells
// coordinator with a season running). Deletes the cell it creates.

const API_URL = "http://127.0.0.1:8000";
const CELL_NAME = `Cypress Obrigatórios ${Date.now()}`;

// Radix Select renders options in a portal; wait for it to close before moving on.
function pickOption(trigger: string, option: string) {
  cy.get(`[role="dialog"] [aria-label="${trigger}"]`).click();
  cy.contains('[role="option"]', option).click();
  cy.get('[role="listbox"]').should("not.exist");
}

describe("Cell required fields", () => {
  let createdId: string | undefined;

  beforeEach(() => {
    cy.login();
    cy.visit("/app/celulas/coordenacao");
    cy.contains("[aria-current=page]", "Coordenação", { timeout: 15000 }).should("be.visible");
    cy.contains("button", "Nova célula").click();
    cy.get('[role="dialog"]').should("be.visible");
  });

  after(() => {
    if (!createdId) return;
    // Same account as cy.login()'s default.
    cy.request("POST", `${API_URL}/api/auth/login/`, {
      email: "lcpires7.dev@gmail.com",
      password: "test1234",
    })
      .its("body.access")
      .then((access: string) =>
        cy.request({
          method: "DELETE",
          url: `${API_URL}/api/cells/${createdId}/`,
          headers: { Authorization: `Bearer ${access}` },
          failOnStatusCode: false,
        }),
      );
  });

  it("shows what is missing and doesn't submit", () => {
    cy.get('[role="dialog"]').within(() => {
      cy.get("#cell-name").type(CELL_NAME);
      cy.contains("button", "Criar célula").click();
      cy.contains("Defina o dia do encontro.").should("be.visible");
      cy.contains("Defina o horário do encontro.").should("be.visible");
      cy.contains("Defina o público-alvo.").should("be.visible");
      cy.contains("Falta definir dia do encontro, horário e público-alvo.").should("be.visible");
    });
    // Still open: nothing was sent.
    cy.get('[role="dialog"]').should("be.visible");
    cy.url().should("include", "/coordenacao");
  });

  it("clears each message as the field is filled", () => {
    cy.get('[role="dialog"]').within(() => {
      cy.contains("button", "Criar célula").click();
      cy.get("#cell-time").type("19:30");
      cy.contains("Defina o horário do encontro.").should("not.exist");
      cy.contains("Defina o dia do encontro.").should("be.visible");
    });
  });

  it("offers 'Todos' as an explicit audience and no empty day", () => {
    cy.get('[role="dialog"] [aria-label="Dia do encontro"]').click();
    cy.get('[role="option"]').should("have.length", 7);
    cy.contains('[role="option"]', "Não definido").should("not.exist");
    cy.get("body").type("{esc}");
    cy.get('[role="listbox"]').should("not.exist");

    cy.get('[role="dialog"] [aria-label="Público-alvo"]').click();
    cy.contains('[role="option"]', "Todos").should("be.visible");
    cy.contains('[role="option"]', "Som").should("not.exist");
  });

  it("creates the cell once day, time and audience are set", () => {
    cy.get('[role="dialog"]').within(() => cy.get("#cell-name").type(CELL_NAME));
    // Any campus the user coordinates; the season defaults to the current one.
    cy.get('[role="dialog"] [aria-label="Campus"]').click();
    cy.get('[role="option"]').first().click();
    cy.get('[role="listbox"]').should("not.exist");
    pickOption("Dia do encontro", "Quinta-feira");
    cy.get('[role="dialog"] #cell-time').type("20:00");
    pickOption("Público-alvo", "Jovens");
    cy.get('[role="dialog"]').contains("button", "Criar célula").click();

    cy.contains("Célula criada").should("be.visible");
    cy.url()
      .should("match", /\/app\/celulas\/[a-f0-9-]+$/)
      .then((url) => {
        createdId = url.split("/").pop();
      });
    cy.contains("h1", CELL_NAME).should("be.visible");
    cy.contains("Quinta-feira · 20:00").should("be.visible");
    cy.get('[data-testid="cell-incomplete"]').should("not.exist");
  });
});
