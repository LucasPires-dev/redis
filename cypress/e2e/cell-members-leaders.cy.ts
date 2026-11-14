/**
 * Tests for cell leaders, co-leaders and members — exercising both the
 * coordination page (cards) and the cell detail page (roster, leadership cards).
 *
 * Expected test data (seeded beforehand):
 *   Célula Amor:      6 members, leader=Lucas c. Pires, co_leader=Ana Silva
 *   Célula Esperança: 5 members, leader=Lucas c. Pires, co_leader=Felipe Lima
 *   Célula Fé:        4 members, leader=Lucas c. Pires, co_leaders=[]
 *   Célula Graça:     3 members, leaders=[], co_leaders=[]
 *   Célula Luz:       2 members, leaders=[], co_leaders=[]
 */

describe("Coordination page — member counts & leaders on cards", () => {
  beforeEach(() => {
    cy.login();
    cy.visit("/app/celulas/coordenacao");
    cy.contains("[aria-current=page]", "Coordenação", { timeout: 15000 }).should("be.visible");
  });

  it("KPI total members reflects all members across cells", () => {
    // 6 + 5 + 4 + 3 + 2 = 20
    cy.contains(".text-xs", /Membros/i)
      .parent()
      .find(".text-2xl")
      .should("have.text", "20");
  });

  it("each card shows the correct member count", () => {
    cy.contains("Célula Amor").closest("a").contains("6");
    cy.contains("Célula Esperança").closest("a").contains("5");
    cy.contains("Célula Fé").closest("a").contains("4");
    cy.contains("Célula Graça").closest("a").contains("3");
    cy.contains("Célula Luz").closest("a").contains("2");
  });

  it("cards show leader names (not co-leaders)", () => {
    // Cards only show leaders, not co-leaders
    cy.contains("Célula Amor").closest("a").should("contain.text", "Lucas c. Pires");

    cy.contains("Célula Esperança").closest("a").should("contain.text", "Lucas c. Pires");

    cy.contains("Célula Fé").closest("a").should("contain.text", "Lucas c. Pires");
  });

  it("leaderless cells show 'Sem líder' badge", () => {
    cy.contains("Célula Graça").closest("a").contains("Sem líder");
    cy.contains("Célula Luz").closest("a").contains("Sem líder");
  });

  it("leaderless KPI count is 2", () => {
    cy.contains(".text-xs", /Sem l[íi]der/i)
      .parent()
      .find(".text-2xl")
      .should("have.text", "2");
  });

  it("cells with leader do NOT show 'Sem líder'", () => {
    ["Célula Amor", "Célula Esperança", "Célula Fé"].forEach((name) => {
      cy.contains(name).closest("a").should("not.contain.text", "Sem líder");
    });
  });
});

describe("Cell detail page — leadership section", () => {
  beforeEach(() => {
    cy.login();
  });

  it("shows leader and co-leader for Célula Amor", () => {
    cy.visit("/app/celulas/coordenacao");
    cy.contains("[aria-current=page]", "Coordenação", { timeout: 15000 }).should("be.visible");
    cy.contains("Célula Amor").closest("a").click();
    cy.url().should("match", /\/app\/celulas\/[a-f0-9-]+/);

    // Leadership section
    cy.contains("Liderança").should("be.visible");

    // Leaders card
    cy.contains(".text-xs", /L[íi]deres/i)
      .parent()
      .should("contain.text", "Lucas c. Pires");

    // Co-leaders card
    cy.contains(".text-xs", /Col[íi]deres/i)
      .parent()
      .should("contain.text", "Ana Silva");
  });

  it("shows leader and co-leader for Célula Esperança", () => {
    cy.visit("/app/celulas/coordenacao");
    cy.contains("[aria-current=page]", "Coordenação", { timeout: 15000 }).should("be.visible");
    cy.contains("Célula Esperança").closest("a").click();

    cy.contains(".text-xs", /L[íi]deres/i)
      .parent()
      .should("contain.text", "Lucas c. Pires");

    cy.contains(".text-xs", /Col[íi]deres/i)
      .parent()
      .should("contain.text", "Felipe Lima");
  });

  it("shows leader but no co-leader for Célula Fé", () => {
    cy.visit("/app/celulas/coordenacao");
    cy.contains("[aria-current=page]", "Coordenação", { timeout: 15000 }).should("be.visible");
    cy.contains("Célula Fé").closest("a").click();

    cy.contains(".text-xs", /L[íi]deres/i)
      .parent()
      .should("contain.text", "Lucas c. Pires");

    cy.contains(".text-xs", /Col[íi]deres/i)
      .parent()
      .should("contain.text", "Nenhum definido");
  });

  it("shows no leader and no co-leader for Célula Graça", () => {
    cy.visit("/app/celulas/coordenacao");
    cy.contains("[aria-current=page]", "Coordenação", { timeout: 15000 }).should("be.visible");
    cy.contains("Célula Graça").closest("a").click();

    cy.contains(".text-xs", /L[íi]deres/i)
      .parent()
      .should("contain.text", "Nenhum definido");

    cy.contains(".text-xs", /Col[íi]deres/i)
      .parent()
      .should("contain.text", "Nenhum definido");
  });
});

describe("Cell detail page — members roster", () => {
  beforeEach(() => {
    cy.login();
  });

  it("Célula Amor shows all members with correct role badges", () => {
    cy.visit("/app/celulas/coordenacao");
    cy.contains("[aria-current=page]", "Coordenação", { timeout: 15000 }).should("be.visible");
    cy.contains("Célula Amor").closest("a").click();

    // Members section header
    cy.contains("Membros").should("be.visible");

    // Scope to the Membros section (DetailSection renders as <section> with <h2>)
    cy.contains("h2", /membros/i)
      .closest("section")
      .as("membrosSection");

    // Leader gets "Líder" badge — find the Card that contains the name
    cy.get("@membrosSection")
      .contains(".text-sm", "Lucas c. Pires")
      .closest("a")
      .parent()
      .contains("Líder");

    // Co-leader gets "Colíder" badge
    cy.get("@membrosSection")
      .contains(".text-sm", "Ana Silva")
      .closest("a")
      .parent()
      .contains("Colíder");

    // Regular members should be visible (no role badge)
    ["Bruno Costa", "Carla Mendes", "Daniel Souza", "Elena Rocha"].forEach((name) => {
      cy.get("@membrosSection").contains(name).should("be.visible");
    });
  });

  it("Célula Graça shows 3 members, none with leader badges", () => {
    cy.visit("/app/celulas/coordenacao");
    cy.contains("[aria-current=page]", "Coordenação", { timeout: 15000 }).should("be.visible");
    cy.contains("Célula Graça").closest("a").click();

    cy.contains("Ana Silva").should("be.visible");
    cy.contains("Bruno Costa").should("be.visible");
    cy.contains("Carla Mendes").should("be.visible");

    // No "Líder" badge anywhere in the members section
    cy.contains("Membros").closest("section, div").should("not.contain.text", "Líder");
  });

  it("Célula Luz shows 2 members only", () => {
    cy.visit("/app/celulas/coordenacao");
    cy.contains("[aria-current=page]", "Coordenação", { timeout: 15000 }).should("be.visible");
    cy.contains("Célula Luz").closest("a").click();

    cy.contains("Daniel Souza").should("be.visible");
    cy.contains("Elena Rocha").should("be.visible");

    // No other members
    cy.contains("Ana Silva").should("not.exist");
    cy.contains("Bruno Costa").should("not.exist");
  });

  it("member cards show email addresses", () => {
    cy.visit("/app/celulas/coordenacao");
    cy.contains("[aria-current=page]", "Coordenação", { timeout: 15000 }).should("be.visible");
    cy.contains("Célula Amor").closest("a").click();

    cy.contains("ana@test.com").should("be.visible");
    cy.contains("bruno@test.com").should("be.visible");
  });

  it("member cards link to person detail", () => {
    cy.visit("/app/celulas/coordenacao");
    cy.contains("[aria-current=page]", "Coordenação", { timeout: 15000 }).should("be.visible");
    cy.contains("Célula Amor").closest("a").click();

    cy.contains("a", "Ana Silva")
      .should("have.attr", "href")
      .and("match", /\/app\/pessoas\/[a-f0-9-]+/);
  });
});

describe("Cell detail page — management buttons", () => {
  beforeEach(() => {
    cy.login();
  });

  it("shows Editar and Renovar buttons for a cell the user can manage", () => {
    cy.visit("/app/celulas/coordenacao");
    cy.contains("[aria-current=page]", "Coordenação", { timeout: 15000 }).should("be.visible");
    cy.contains("Célula Amor").closest("a").click();

    cy.contains("button", "Editar").should("be.visible");
    cy.contains("button", "Renovar").should("be.visible");
  });

  it("shows add member search for a managed cell", () => {
    cy.visit("/app/celulas/coordenacao");
    cy.contains("[aria-current=page]", "Coordenação", { timeout: 15000 }).should("be.visible");
    cy.contains("Célula Amor").closest("a").click();

    // The PersonSearch input for adding members
    cy.get("input[placeholder*='Buscar']").should("exist");
  });
});
