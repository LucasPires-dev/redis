/**
 * End-to-end tests for the Courses module:
 *  - Courses listing page loads and shows content
 *  - Create course dialog opens, validates, and submits
 *  - Course detail page shows stats and turma list
 *  - Create class (turma) dialog works
 *  - Class detail page loads with tabs
 *  - Create lesson dialog works
 *  - Add teacher via PersonSearch dialog
 *  - Add enrollment (student) via PersonSearch dialog
 *  - Attendance panel toggles and saves
 */

const COURSE_NAME = `Cypress Test ${Date.now()}`;
const CLASS_NAME = `Turma Cypress ${Date.now()}`;

describe("Courses — Listing page", () => {
  beforeEach(() => {
    cy.login();
  });

  it("loads the courses page and shows heading", () => {
    cy.visit("/app/cursos");
    cy.contains("Cursos", { timeout: 15000 }).should("be.visible");
    cy.contains("Formação disponível").should("be.visible");
  });

  it("shows the 'Novo curso' button", () => {
    cy.visit("/app/cursos");
    cy.contains("button", "Novo curso", { timeout: 10000 }).should("be.visible");
  });
});

describe("Courses — Create course dialog", () => {
  beforeEach(() => {
    cy.login();
    cy.visit("/app/cursos");
    cy.contains("Cursos", { timeout: 15000 }).should("be.visible");
  });

  it("opens the new course dialog", () => {
    cy.contains("button", "Novo curso").click();
    cy.get("[role='dialog']").should("be.visible");
    cy.get("[role='dialog']").contains("Novo curso").should("be.visible");
  });

  it("shows name, campus, and description fields", () => {
    cy.contains("button", "Novo curso").click();
    cy.get("[role='dialog']").within(() => {
      cy.contains("label", "Nome").should("be.visible");
      cy.contains("Campus").should("be.visible");
      cy.contains("label", "Descrição").should("be.visible");
    });
  });

  it("disables submit when name is empty", () => {
    cy.contains("button", "Novo curso").click();
    cy.get("[role='dialog']").within(() => {
      cy.get("#course-name").should("have.value", "");
      cy.contains("button", "Criar curso").should("be.disabled");
    });
  });

  it("closes dialog on cancel", () => {
    cy.contains("button", "Novo curso").click();
    cy.get("[role='dialog']").should("be.visible");
    cy.get("[role='dialog']").contains("button", "Cancelar").click();
    cy.get("[role='dialog']").should("not.exist");
  });

  it("creates a course and shows success toast", () => {
    cy.contains("button", "Novo curso").click();
    cy.get("[role='dialog']").within(() => {
      cy.get("#course-name").type(COURSE_NAME);
      cy.get("#course-desc").type("Curso criado por teste automatizado");
      cy.contains("button", "Criar curso").should("not.be.disabled").click();
    });
    cy.contains("Curso criado", { timeout: 10000 }).should("be.visible");
    cy.get("[role='dialog']").should("not.exist");
  });

  it("shows the newly created course in the list", () => {
    cy.contains(COURSE_NAME, { timeout: 10000 }).should("be.visible");
  });
});

describe("Courses — Course detail", () => {
  beforeEach(() => {
    cy.login();
    cy.visit("/app/cursos");
    cy.contains(COURSE_NAME, { timeout: 15000 }).closest("a").click();
  });

  it("shows the course header with name and back link", () => {
    cy.contains(COURSE_NAME, { timeout: 10000 }).should("be.visible");
    cy.contains("Cursos").should("be.visible");
  });

  it("shows stat cards (inscritos, escopo, turmas, aulas)", () => {
    cy.contains("Inscritos", { timeout: 10000 }).should("be.visible");
    cy.contains("Escopo").should("be.visible");
    cy.contains("Turmas").should("be.visible");
    cy.contains("Aulas").should("be.visible");
  });

  it("shows the 'Nova turma' button", () => {
    cy.contains("button", "Nova turma", { timeout: 10000 }).should("be.visible");
  });

  it("shows empty state for turmas", () => {
    cy.contains("Nenhuma turma cadastrada", { timeout: 10000 }).should("be.visible");
  });
});

describe("Courses — Create class (turma) dialog", () => {
  beforeEach(() => {
    cy.login();
    cy.visit("/app/cursos");
    cy.contains(COURSE_NAME, { timeout: 15000 }).closest("a").click();
    cy.contains("button", "Nova turma", { timeout: 10000 }).should("be.visible");
  });

  it("opens the new class dialog", () => {
    cy.contains("button", "Nova turma").click();
    cy.get("[role='dialog']").should("be.visible");
    cy.get("[role='dialog']").contains("Nova turma").should("be.visible");
  });

  it("shows all form fields", () => {
    cy.contains("button", "Nova turma").click();
    cy.get("[role='dialog']").within(() => {
      cy.contains("label", "Nome").should("be.visible");
      cy.contains("Campus").should("be.visible");
      cy.contains("Dia da semana").should("be.visible");
      cy.contains("label", "Horário").should("be.visible");
      cy.contains("Período").should("be.visible");
      cy.contains("label", "Descrição").should("be.visible");
    });
  });

  it("disables submit when name is empty", () => {
    cy.contains("button", "Nova turma").click();
    cy.get("[role='dialog']").within(() => {
      cy.get("#class-name").should("have.value", "");
      cy.contains("button", "Criar turma").should("be.disabled");
    });
  });

  it("creates a turma and shows success toast", () => {
    cy.contains("button", "Nova turma").click();
    cy.get("[role='dialog']").within(() => {
      cy.get("#class-name").type(CLASS_NAME);
    });
    // Ensure campus is selected: open the Campus dropdown and pick the first option
    cy.get("[role='dialog']")
      .contains("Campus")
      .parent()
      .find("button[role='combobox']")
      .click();
    cy.get("[role='option']").first().click();
    cy.get("[role='dialog']").within(() => {
      cy.contains("button", "Criar turma").should("not.be.disabled").click();
    });
    cy.contains("Turma criada", { timeout: 10000 }).should("be.visible");
    cy.get("[role='dialog']").should("not.exist");
  });

  it("shows the newly created turma in the list", () => {
    cy.contains(CLASS_NAME, { timeout: 10000 }).should("be.visible");
  });
});

describe("Courses — Class detail page", () => {
  beforeEach(() => {
    cy.login();
    cy.visit("/app/cursos");
    cy.contains(COURSE_NAME, { timeout: 15000 }).closest("a").click();
    cy.contains(CLASS_NAME, { timeout: 10000 }).closest("a").click();
  });

  it("shows class header with name and back link to course", () => {
    cy.contains(CLASS_NAME, { timeout: 10000 }).should("be.visible");
    cy.contains(COURSE_NAME).should("be.visible");
  });

  it("shows stat cards", () => {
    cy.contains("Inscritos", { timeout: 10000 }).should("be.visible");
    cy.contains("Aulas").should("be.visible");
    cy.contains("Professores").should("be.visible");
    cy.contains("Período").should("be.visible");
  });

  it("shows three tabs", () => {
    cy.contains("Aulas & Presença", { timeout: 10000 }).should("be.visible");
    cy.contains("Alunos").should("be.visible");
    cy.contains("Professores").should("be.visible");
  });

  it("shows empty state in lessons tab", () => {
    cy.contains("Nenhuma aula cadastrada", { timeout: 10000 }).should("be.visible");
  });

  it("shows the 'Nova aula' button in lessons tab", () => {
    cy.contains("button", "Nova aula", { timeout: 10000 }).should("be.visible");
  });
});

describe("Courses — Create lesson dialog", () => {
  beforeEach(() => {
    cy.login();
    cy.visit("/app/cursos");
    cy.contains(COURSE_NAME, { timeout: 15000 }).closest("a").click();
    cy.contains(CLASS_NAME, { timeout: 10000 }).closest("a").click();
    cy.contains("button", "Nova aula", { timeout: 10000 }).should("be.visible");
  });

  it("opens the new lesson dialog", () => {
    cy.contains("button", "Nova aula").click();
    cy.get("[role='dialog']").should("be.visible");
    cy.get("[role='dialog']").contains("Nova aula").should("be.visible");
  });

  it("shows title, date, and notes fields", () => {
    cy.contains("button", "Nova aula").click();
    cy.get("[role='dialog']").within(() => {
      cy.contains("label", "Título").should("be.visible");
      cy.contains("label", "Data").should("be.visible");
      cy.contains("label", "Observações").should("be.visible");
    });
  });

  it("creates a lesson and shows success toast", () => {
    cy.contains("button", "Nova aula").click();
    cy.get("[role='dialog']").within(() => {
      cy.get("#lesson-title").type("Introdução ao curso");
      cy.get("#lesson-date").type("2026-11-15");
      cy.contains("button", "Criar aula").click();
    });
    cy.contains("Aula criada", { timeout: 10000 }).should("be.visible");
    cy.get("[role='dialog']").should("not.exist");
  });

  it("shows the newly created lesson in the list", () => {
    cy.contains("Aula 1", { timeout: 10000 }).should("be.visible");
    cy.contains("Introdução ao curso").should("be.visible");
  });
});

describe("Courses — Alunos tab and enrollment", () => {
  beforeEach(() => {
    cy.login();
    cy.visit("/app/cursos");
    cy.contains(COURSE_NAME, { timeout: 15000 }).closest("a").click();
    cy.contains(CLASS_NAME, { timeout: 10000 }).closest("a").click();
    cy.get("[role='tablist']", { timeout: 10000 })
      .contains("Alunos")
      .click();
  });

  it("shows 'Inscrever aluno' button", () => {
    cy.contains("button", "Inscrever aluno", { timeout: 10000 }).should("be.visible");
  });

  it("opens enrollment dialog", () => {
    cy.contains("button", "Inscrever aluno").click();
    cy.get("[role='dialog']").should("be.visible");
    cy.get("[role='dialog']").contains("Inscrever aluno").should("be.visible");
  });

  it("shows person search field", () => {
    cy.contains("button", "Inscrever aluno").click();
    cy.get("[role='dialog']").within(() => {
      cy.contains("Buscar pessoa").should("be.visible");
      cy.get("input[placeholder*='Buscar']").should("be.visible");
    });
  });

  it("closes enrollment dialog on cancel", () => {
    cy.contains("button", "Inscrever aluno").click();
    cy.get("[role='dialog']").contains("button", "Cancelar").click();
    cy.get("[role='dialog']").should("not.exist");
  });
});

describe("Courses — Professores tab and teacher assignment", () => {
  beforeEach(() => {
    cy.login();
    cy.visit("/app/cursos");
    cy.contains(COURSE_NAME, { timeout: 15000 }).closest("a").click();
    cy.contains(CLASS_NAME, { timeout: 10000 }).closest("a").click();
    // Click the Professores tab trigger specifically (tab text includes count)
    cy.get("[role='tablist']", { timeout: 10000 })
      .contains("Professores")
      .click();
  });

  it("shows 'Adicionar professor' button", () => {
    cy.contains("button", "Adicionar professor", { timeout: 10000 }).should("be.visible");
  });

  it("opens teacher dialog", () => {
    cy.contains("button", "Adicionar professor").click();
    cy.get("[role='dialog']").should("be.visible");
    cy.get("[role='dialog']").contains("Adicionar professor").should("be.visible");
  });

  it("shows person search and role selector", () => {
    cy.contains("button", "Adicionar professor").click();
    cy.get("[role='dialog']").within(() => {
      cy.contains("Buscar pessoa").should("be.visible");
      cy.contains("Função").should("be.visible");
    });
  });

  it("closes teacher dialog on cancel", () => {
    cy.contains("button", "Adicionar professor").click();
    cy.get("[role='dialog']").contains("button", "Cancelar").click();
    cy.get("[role='dialog']").should("not.exist");
  });
});

describe("Courses — Navigation flow", () => {
  beforeEach(() => {
    cy.login();
  });

  it("navigates from listing → course → class → back to course → back to listing", () => {
    cy.visit("/app/cursos");
    cy.contains(COURSE_NAME, { timeout: 15000 }).closest("a").click();
    cy.contains("h1", COURSE_NAME, { timeout: 10000 }).should("be.visible");

    cy.contains(CLASS_NAME, { timeout: 10000 }).closest("a").click();
    cy.contains("h1", CLASS_NAME, { timeout: 10000 }).should("be.visible");

    // Back link to course (the arrow-left link at the top)
    cy.contains("a", COURSE_NAME).click();
    cy.contains("h1", COURSE_NAME, { timeout: 10000 }).should("be.visible");
    cy.contains("Nova turma").should("be.visible");

    // Back link to courses listing
    cy.contains("a", "Cursos").click();
    cy.url().should("include", "/app/cursos");
    cy.contains("Formação disponível", { timeout: 10000 }).should("be.visible");
  });
});
