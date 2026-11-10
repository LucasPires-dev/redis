// Campus list → campus detail, against the real backend + local DB seeded with
// `manage.py seed_initial_church` (campus "Arena ILAN" with the Brave and
// Reconciliação ministries). Read-only: creates nothing, so no cleanup.

const SEED_PASSWORD = "TrocarSenha123!";
const CAMPUS_NAME = "Arena ILAN";

describe("Campus pages", () => {
  beforeEach(() => {
    cy.login("gestor@ilan.church", SEED_PASSWORD);
  });

  it("opens a campus from the list and shows its real data", () => {
    cy.visit("/app/campus");
    cy.contains(CAMPUS_NAME, { timeout: 15000 }).click();

    cy.location("pathname").should("match", /^\/app\/campus\/[0-9a-f-]{36}$/);
    cy.contains("h1, h2", CAMPUS_NAME).should("be.visible");

    // Sections come from the API (ministries, cells, events), not mock data.
    cy.contains("Ministérios").should("be.visible");
    // Ministries are listed by kind: "Brave" is the Adolescentes ministry.
    cy.contains("Adolescentes").should("be.visible");
    cy.contains("Reconciliação").should("be.visible");
    cy.contains("Células").should("be.visible");
    cy.contains("Próximos eventos").should("be.visible");
  });

  it("shows the not-found page for an unknown campus", () => {
    cy.visit("/app/campus/00000000-0000-0000-0000-000000000000", { failOnStatusCode: false });

    cy.contains(CAMPUS_NAME).should("not.exist");
  });
});
