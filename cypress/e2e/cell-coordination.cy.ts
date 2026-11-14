describe("Cell Coordination Page", () => {
  beforeEach(() => {
    cy.login();
    cy.visit("/app/celulas/coordination");
    // Wait for the page to finish loading (the loading state shows "Carregando…")
    cy.contains("Coordenação de Células", { timeout: 15000 }).should(
      "be.visible",
    );
  });

  // ─── Page load & access ────────────────────────────────────────────

  it("renders the page header with campus subtitle", () => {
    cy.contains("Coordenação de Células").should("be.visible");
    cy.contains("Central").should("be.visible");
  });

  it("shows a back link to Células", () => {
    cy.contains("a", "Células")
      .should("have.attr", "href")
      .and("include", "/celulas");
  });

  it("shows Coord. Células in the sidebar", () => {
    cy.contains("Coord. Células").should("be.visible");
  });

  // ─── KPIs ──────────────────────────────────────────────────────────

  it("displays total cells = 5", () => {
    cy.contains(".text-xs", /C[ée]lulas/i)
      .parent()
      .find(".text-2xl")
      .should("have.text", "5");
  });

  it("displays total members = 20", () => {
    cy.contains(".text-xs", /Membros/i)
      .parent()
      .find(".text-2xl")
      .should("have.text", "20");
  });

  it("displays leaderless count = 2 with attention hint", () => {
    cy.contains(".text-xs", /SEM L[ÍI]DER/i)
      .parent()
      .find(".text-2xl")
      .should("have.text", "2");
    cy.contains("Atenção").should("be.visible");
  });

  // ─── Cell cards ────────────────────────────────────────────────────

  it("renders all 5 cell cards with names", () => {
    const cellNames = [
      "Célula Esperança",
      "Célula Fé",
      "Célula Graça",
      "Célula Amor",
      "Célula Luz",
    ];
    cellNames.forEach((name) => {
      cy.contains(name).should("be.visible");
    });
  });

  it("shows leader name on cells with a leader", () => {
    cy.contains("Célula Amor")
      .closest("a")
      .should("contain.text", "Lucas c. Pires");
  });

  it("shows 'Sem líder' badge on leaderless cells", () => {
    cy.contains("Célula Graça").closest("a").contains("Sem líder");
    cy.contains("Célula Luz").closest("a").contains("Sem líder");
  });

  it("does NOT show 'Sem líder' on cells with a leader", () => {
    cy.contains("Célula Amor")
      .closest("a")
      .should("not.contain.text", "Sem líder");
  });

  it("shows meeting day badge on cards", () => {
    cy.contains("Célula Amor").closest("a").contains("Sexta-feira");
    cy.contains("Célula Fé").closest("a").contains("Quarta-feira");
  });

  it("shows member count on cards", () => {
    cy.contains("Célula Amor").closest("a").contains("membros");
  });

  it("each card links to the cell detail page", () => {
    cy.contains("Célula Amor")
      .closest("a")
      .should("have.attr", "href")
      .and("match", /\/app\/celulas\/[a-f0-9-]+/);
  });

  // ─── Action buttons ────────────────────────────────────────────────

  it("shows all action buttons", () => {
    cy.contains("button", "Nova célula").should("be.visible");
    cy.contains("button", "Temporadas").should("be.visible");
    cy.contains("button", "Responsáveis").should("be.visible");
  });

  it("opens cell creation dialog", () => {
    cy.contains("button", "Nova célula").click();
    cy.get("[role='dialog']").should("be.visible");
  });

  it("opens seasons dialog", () => {
    cy.contains("button", "Temporadas").click();
    cy.get("[role='dialog']").should("be.visible");
  });

  it("opens leaders dialog", () => {
    cy.contains("button", "Responsáveis").click();
    cy.get("[role='dialog']").should("be.visible");
  });

  // ─── Filters ───────────────────────────────────────────────────────

  it("shows season and day filter dropdowns", () => {
    cy.contains("Temporada atual").should("be.visible");
    cy.contains("Todos os dias").should("be.visible");
  });

  it("displays current season info", () => {
    cy.contains("Temporada 2024.2").should("be.visible");
  });

  it("filters cells by meeting day", () => {
    cy.contains("button", "Todos os dias").click();
    cy.get("[role='option']").contains("Terça-feira").click();

    // Only Tuesday cell remains
    cy.contains("Célula Esperança").should("be.visible");
    cy.contains("Célula Fé").should("not.exist");
    cy.contains("Célula Graça").should("not.exist");
    cy.contains("Célula Amor").should("not.exist");
    cy.contains("Célula Luz").should("not.exist");
  });

  it("resets day filter back to all", () => {
    // Filter to Tuesday
    cy.contains("button", "Todos os dias").click();
    cy.get("[role='option']").contains("Terça-feira").click();
    cy.contains("Célula Fé").should("not.exist");

    // The trigger button now shows "Terça-feira" — click the button, not the inner span
    cy.contains("Terça-feira").closest("button").click();
    cy.get("[role='option']").contains("Todos os dias").click();

    // All cells visible again
    cy.contains("Célula Esperança").should("be.visible");
    cy.contains("Célula Fé").should("be.visible");
  });

  it("KPIs update when filtering by day", () => {
    cy.contains("button", "Todos os dias").click();
    cy.get("[role='option']").contains("Sexta-feira").click();

    // Only 1 cell on Friday (Célula Amor)
    cy.contains("Célula Amor").should("be.visible");
    cy.contains("Célula Esperança").should("not.exist");
  });

  // ─── Navigation ────────────────────────────────────────────────────

  it("navigates to cell detail when clicking a card", () => {
    cy.contains("Célula Amor").closest("a").click();
    cy.url().should("match", /\/app\/celulas\/[a-f0-9-]+/);
  });

  it("back link goes to cells list", () => {
    cy.contains("a", "Células").click();
    cy.url().should("include", "/app/celulas");
    cy.url().should("not.include", "coordination");
  });

  // ─── Edge cases & stress ───────────────────────────────────────────

  it("survives a page refresh", () => {
    cy.reload();
    cy.contains("Coordenação de Células", { timeout: 15000 }).should(
      "be.visible",
    );
    cy.contains("Célula Amor").should("be.visible");
  });

  it("filters persist after opening and closing a dialog", () => {
    // Filter to Friday
    cy.contains("button", "Todos os dias").click();
    cy.get("[role='option']").contains("Sexta-feira").click();
    cy.contains("Célula Amor").should("be.visible");
    cy.contains("Célula Fé").should("not.exist");

    // Open and close Temporadas dialog
    cy.contains("button", "Temporadas").click();
    cy.get("[role='dialog']").should("be.visible");
    cy.get("body").type("{esc}");
    cy.get("[role='dialog']").should("not.exist");

    // Filter is still applied
    cy.contains("Célula Amor").should("be.visible");
    cy.contains("Célula Fé").should("not.exist");
  });

  it("closing a dialog with Escape does not affect page state", () => {
    cy.contains("button", "Nova célula").click();
    cy.get("[role='dialog']").should("be.visible");
    cy.get("body").type("{esc}");
    cy.get("[role='dialog']").should("not.exist");

    // Page is intact
    cy.contains("Coordenação de Células").should("be.visible");
    cy.contains("Célula Amor").should("be.visible");
  });
});

describe("Cell Coordination — Access Control", () => {
  it("redirects unauthenticated users to login", () => {
    cy.visit("/app/celulas/coordination");
    cy.url().should("include", "/login");
  });
});
