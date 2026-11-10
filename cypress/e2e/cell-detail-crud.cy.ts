/**
 * Stress tests for cell detail CRUD operations:
 *  - Edit cell dialog (name, day, time, address, description)
 *  - Assign leader / co-leader via PersonSearch
 *  - Remove leader / co-leader
 *  - Add member via PersonSearch
 *  - Remove member
 *  - Renew cell dialog
 */

function visitCellAmor() {
  cy.visit("/app/celulas/coordination");
  cy.contains("Coordenação de Células", { timeout: 15000 }).should(
    "be.visible",
  );
  cy.contains("Célula Amor").closest("a").click();
  cy.contains("Liderança", { timeout: 10000 }).should("be.visible");
}

describe("Cell detail — Edit dialog", () => {
  beforeEach(() => {
    cy.login();
    visitCellAmor();
  });

  it("opens edit dialog with pre-filled cell name", () => {
    cy.contains("button", "Editar").click();
    cy.get("[role='dialog']").should("be.visible");
    cy.get("[role='dialog']")
      .contains("Editar célula")
      .should("be.visible");
    cy.get("#cell-name").should("have.value", "Célula Amor");
  });

  it("shows all form fields in the edit dialog", () => {
    cy.contains("button", "Editar").click();
    cy.get("[role='dialog']").within(() => {
      cy.contains("label", "Nome").should("be.visible");
      cy.contains("Campus").should("be.visible");
      cy.contains("Temporada").should("be.visible");
      cy.contains("Dia do encontro").should("be.visible");
      cy.contains("Horário").should("be.visible");
      cy.contains("Público-alvo").should("be.visible");
      cy.contains("Endereço").should("be.visible");
      cy.contains("Descrição").should("be.visible");
    });
  });

  it("can edit the cell name and save", () => {
    cy.contains("button", "Editar").click();
    cy.get("#cell-name").clear().type("Célula Amor Editada");
    cy.get("[role='dialog']").contains("button", "Salvar").click();

    // Toast appears and dialog closes
    cy.contains("Célula atualizada").should("be.visible");
    cy.get("[role='dialog']").should("not.exist");

    // Page header updated
    cy.contains("Célula Amor Editada").should("be.visible");

    // Revert the name back
    cy.contains("button", "Editar").click();
    cy.get("#cell-name").clear().type("Célula Amor");
    cy.get("[role='dialog']").contains("button", "Salvar").click();
    cy.contains("Célula atualizada").should("be.visible");
  });

  it("can edit address and description", () => {
    cy.contains("button", "Editar").click();
    cy.get("#cell-address").clear().type("Rua Teste 123");
    cy.get("#cell-description").clear().type("Uma descrição de teste");
    cy.get("[role='dialog']").contains("button", "Salvar").click();
    cy.contains("Célula atualizada").should("be.visible");

    // Verify the changes appear on the page
    cy.contains("Rua Teste 123").should("be.visible");
    cy.contains("Uma descrição de teste").should("be.visible");

    // Revert
    cy.contains("button", "Editar").click();
    cy.get("#cell-address").clear();
    cy.get("#cell-description").clear();
    cy.get("[role='dialog']").contains("button", "Salvar").click();
    cy.contains("Célula atualizada").should("be.visible");
  });

  it("cancel closes dialog without saving", () => {
    cy.contains("button", "Editar").click();
    cy.get("#cell-name").clear().type("Should not save");
    cy.get("[role='dialog']").contains("button", "Cancelar").click();
    cy.get("[role='dialog']").should("not.exist");

    // Original name unchanged
    cy.contains("Célula Amor").should("be.visible");
    cy.contains("Should not save").should("not.exist");
  });

  it("Escape closes the edit dialog", () => {
    cy.contains("button", "Editar").click();
    cy.get("[role='dialog']").should("be.visible");
    cy.get("body").type("{esc}");
    cy.get("[role='dialog']").should("not.exist");
  });
});

describe("Cell detail — Assign leader/co-leader", () => {
  beforeEach(() => {
    cy.login();
    visitCellAmor();
  });

  it("shows the 'Adicionar liderança' section with role selector", () => {
    cy.contains("Adicionar liderança").should("be.visible");
    // Default role is "Líder"
    cy.contains("Adicionar liderança")
      .closest("[class*='p-4']")
      .contains("Líder");
  });

  it("can switch role to Colíder in the selector", () => {
    cy.contains("Adicionar liderança")
      .closest("[class*='p-4']")
      .find("button[role='combobox']")
      .click();
    cy.get("[role='option']").contains("Colíder").click();
    cy.contains("Adicionar liderança")
      .closest("[class*='p-4']")
      .contains("Colíder");
  });

  it("PersonSearch shows results when typing 2+ chars", () => {
    // Type in the leadership search input
    cy.contains("Adicionar liderança")
      .closest("[class*='p-4']")
      .find("input")
      .type("Kar");

    // Should show results after debounce
    cy.contains("Karen Oliveira", { timeout: 5000 }).should("be.visible");
  });

  it("PersonSearch shows 'Ninguém encontrado' for no match", () => {
    cy.contains("Adicionar liderança")
      .closest("[class*='p-4']")
      .find("input")
      .type("zzzzz");

    cy.contains("Ninguém encontrado", { timeout: 5000 }).should("be.visible");
  });

  it("can assign a new leader and then remove them", () => {
    cy.on("window:confirm", () => true);

    // Search for Karen and assign as leader
    cy.contains("Adicionar liderança")
      .closest("[class*='p-4']")
      .find("input")
      .type("Karen");

    cy.contains("button", "Karen Oliveira").click();
    cy.contains(/agora é líder/i, { timeout: 5000 }).should("be.visible");

    // Verify Karen appears in the Líderes card
    cy.contains("h2", /Liderança/i)
      .closest("section")
      .within(() => {
        cy.contains(".text-xs", /L[íi]deres/i)
          .closest("[class*='p-4']")
          .should("contain.text", "Karen Oliveira");
      });

    // Remove Karen from leadership
    cy.get("button[aria-label='Remover Karen Oliveira da liderança']").click();
    cy.contains("Liderança removida", { timeout: 5000 }).should("be.visible");
  });

  it("can assign a co-leader", () => {
    cy.on("window:confirm", () => true);

    // Switch to Colíder role
    cy.contains("Adicionar liderança")
      .closest("[class*='p-4']")
      .find("button[role='combobox']")
      .click();
    cy.get("[role='option']").contains("Colíder").click();

    // Search and assign — use Isabela who is not a leader anywhere
    cy.contains("Adicionar liderança")
      .closest("[class*='p-4']")
      .find("input")
      .type("Isabela");

    cy.contains("button", "Isabela Santos", { timeout: 5000 }).click();
    cy.contains(/agora é colíder/i, { timeout: 5000 }).should("be.visible");

    // Verify Isabela appears in Colíderes
    cy.contains(".text-xs", /Col[íi]deres/i)
      .closest("[class*='p-4']")
      .should("contain.text", "Isabela Santos");

    // Remove Isabela
    cy.get(
      "button[aria-label='Remover Isabela Santos da liderança']",
    ).click();
    cy.contains("Liderança removida", { timeout: 5000 }).should("be.visible");
  });
});

describe("Cell detail — Add/Remove members", () => {
  beforeEach(() => {
    cy.login();
    visitCellAmor();
  });

  it("shows member search input", () => {
    cy.get("input[placeholder*='Adicionar membro']").should("be.visible");
  });

  it("can search for a person by name", () => {
    cy.get("input[placeholder*='Adicionar membro']").type("Joao");
    cy.contains("Joao Ferreira", { timeout: 5000 }).should("be.visible");
  });

  it("can search for a person by email", () => {
    cy.get("input[placeholder*='Adicionar membro']").type("joao@test");
    cy.contains("Joao Ferreira", { timeout: 5000 }).should("be.visible");
  });

  it("can add a member and see them in the roster, then clean up", () => {
    cy.on("window:confirm", () => true);

    // Use Gabriela who is not a member of Célula Amor
    cy.get("input[placeholder*='Adicionar membro']").type("Gabriela");
    cy.contains("button", "Gabriela Pinto", { timeout: 5000 }).click();
    cy.contains(/adicionado.*à célula/i, { timeout: 5000 }).should(
      "be.visible",
    );

    // Verify Gabriela appears in the members section
    cy.contains("h2", /Membros/i)
      .closest("section")
      .contains("Gabriela Pinto")
      .should("be.visible");

    // Clean up: remove Gabriela so other specs aren't affected
    cy.get("button[aria-label='Remover Gabriela Pinto']").click();
    cy.contains("Membro removido", { timeout: 5000 }).should("be.visible");
  });

  it("can add and then remove a member", () => {
    cy.on("window:confirm", () => true);

    // Add Leonardo (not currently a member of Célula Amor)
    cy.get("input[placeholder*='Adicionar membro']").type("Leonardo");
    cy.contains("button", "Leonardo Dias", { timeout: 5000 }).click();
    cy.contains(/adicionado.*à célula/i, { timeout: 5000 }).should(
      "be.visible",
    );

    // Verify Leonardo appears
    cy.contains("h2", /Membros/i)
      .closest("section")
      .contains("Leonardo Dias")
      .should("be.visible");

    // Remove Leonardo
    cy.get("button[aria-label='Remover Leonardo Dias']").click();
    cy.contains("Membro removido", { timeout: 5000 }).should("be.visible");

    // Leonardo should be gone
    cy.contains("h2", /Membros/i)
      .closest("section")
      .should("not.contain.text", "Leonardo Dias");
  });

  it("hides already-added members from search results", () => {
    // Ana Silva is already a member — should not appear in search
    cy.get("input[placeholder*='Adicionar membro']").type("Ana Silva");
    cy.wait(1500);

    // Should either show "Ninguém encontrado" or not show Ana
    cy.get("body").then(($body) => {
      const results = $body.find("button:contains('Ana Silva')");
      expect(results.length).to.equal(0);
    });
  });

  it("remove button shows for regular members", () => {
    // Bruno Costa is a regular member — should have remove button
    cy.contains("h2", /Membros/i)
      .closest("section")
      .within(() => {
        cy.get("button[aria-label='Remover Bruno Costa']").should("exist");
      });
  });
});

describe("Cell detail — Renew dialog", () => {
  beforeEach(() => {
    cy.login();
    visitCellAmor();
  });

  it("opens renew dialog", () => {
    cy.contains("button", "Renovar").click();
    cy.get("[role='dialog']").should("be.visible");
    cy.contains("Renovar para outra temporada").should("be.visible");
  });

  it("shows the explanatory text with cell name", () => {
    cy.contains("button", "Renovar").click();
    cy.get("[role='dialog']").contains("Célula Amor").should("be.visible");
  });

  it("shows copy members checkbox or no-season message", () => {
    cy.contains("button", "Renovar").click();
    cy.get("[role='dialog']").then(($dialog) => {
      if ($dialog.text().includes("Não há temporada posterior")) {
        // No future season available — expected message shown
        cy.wrap($dialog)
          .contains("Não há temporada posterior")
          .should("be.visible");
      } else {
        // Future season available — checkbox shown
        cy.wrap($dialog).contains(/Levar os \d+ membros atuais/).should(
          "be.visible",
        );
      }
    });
  });

  it("cancel closes renew dialog", () => {
    cy.contains("button", "Renovar").click();
    cy.get("[role='dialog']").contains("button", "Cancelar").click();
    cy.get("[role='dialog']").should("not.exist");
  });

  it("Escape closes renew dialog", () => {
    cy.contains("button", "Renovar").click();
    cy.get("[role='dialog']").should("be.visible");
    cy.get("body").type("{esc}");
    cy.get("[role='dialog']").should("not.exist");
  });
});

describe("Cell detail — About section", () => {
  beforeEach(() => {
    cy.login();
    visitCellAmor();
  });

  it("shows the Sobre section with cell info", () => {
    cy.contains("h2", /Sobre/i).should("be.visible");
    cy.contains("Temporada").should("be.visible");
    cy.contains("Dia").should("be.visible");
    cy.contains("Campus").should("be.visible");
  });

  it("shows meeting day from the cell data", () => {
    cy.contains("Sexta-feira").should("be.visible");
  });

  it("campus name links to campus detail", () => {
    cy.contains("a", "Central")
      .should("have.attr", "href")
      .and("match", /\/app\/campus\/[a-f0-9-]+/);
  });

  it("shows current season badge", () => {
    cy.contains("Atual").should("be.visible");
  });
});

describe("Cell detail — Remove leader X button", () => {
  beforeEach(() => {
    cy.login();
    visitCellAmor();
  });

  it("shows X button next to leader name for coordinator", () => {
    cy.contains("h2", /Liderança/i)
      .closest("section")
      .within(() => {
        cy.get("button[aria-label*='Remover'][aria-label*='liderança']").should(
          "have.length.at.least",
          1,
        );
      });
  });

  it("shows X button next to co-leader Ana Silva", () => {
    cy.get("button[aria-label='Remover Ana Silva da liderança']").should(
      "exist",
    );
  });
});
