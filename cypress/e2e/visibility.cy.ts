// "Quem pode ver": events, course classes and cells are for the church's
// members or for everyone. Runs against the real backend seeded with
// `manage.py seed_initial_church`; every test undoes what it changed.

const API = "http://127.0.0.1:8000";
const PASSWORD = "TrocarSenha123!";
const MANAGER = "gestor@ilan.church";
const STAMP = Date.now();
const EVENT = `Cypress Público ${STAMP}`;
const COURSE = `Cypress Público ${STAMP}`;

const auth = (t: string) => ({ Authorization: `Bearer ${t}` });

function token(email: string) {
  return cy
    .request("POST", `${API}/api/auth/login/`, { email, password: PASSWORD })
    .its("body.access");
}

function pick(trigger: string, option: string) {
  cy.get(trigger).click();
  cy.contains("[role=option]", option).click();
}

describe("Who may see it", () => {
  let managerToken: string;
  let courseId: string;
  let classId: string;

  before(() => {
    token(MANAGER).then((mt: string) => {
      managerToken = mt;
      cy.request({ url: `${API}/api/auth/me/`, headers: auth(mt) }).then(({ body: me }) =>
        cy
          .request({
            method: "POST",
            url: `${API}/api/courses/`,
            headers: auth(mt),
            body: { name: COURSE, campus_id: me.campus.id },
          })
          .then(({ body: course }) => {
            courseId = course.id;
            cy.request({
              method: "POST",
              url: `${API}/api/course-classes/`,
              headers: auth(mt),
              body: {
                course_id: courseId,
                campus_id: me.campus.id,
                name: "Turma aberta",
                end_date: new Date(Date.now() + 30 * 86400000).toLocaleDateString("en-CA"),
                self_enrollment: true,
              },
            }).then(({ body: cls }) => (classId = cls.id));
          }),
      );
    });
  });

  after(() => {
    cy.request({
      url: `${API}/api/production-events/?page_size=200`,
      headers: auth(managerToken),
    }).then(({ body }) =>
      (body.results as { id: string; title: string }[])
        .filter((e) => e.title === EVENT)
        .forEach((e) =>
          cy.request({
            method: "DELETE",
            url: `${API}/api/production-events/${e.id}/`,
            headers: auth(managerToken),
          }),
        ),
    );
    if (courseId) {
      cy.request({
        method: "DELETE",
        url: `${API}/api/courses/${courseId}/`,
        headers: auth(managerToken),
        failOnStatusCode: false,
      });
    }
  });

  it("an event is created for everyone and closed to members later", () => {
    cy.viewport("iphone-x");
    cy.login(MANAGER, PASSWORD);
    cy.visit("/app/eventos");
    cy.contains("button", "Novo evento", { timeout: 30000 }).click();
    cy.get("#event-title").type(EVENT);
    cy.get("#event-starts").type("2030-03-10T19:30");
    cy.get("[role=dialog] [data-testid=visibility-hint]").should("contain", "Só quem é da igreja");
    pick("#event-visibility", "Todos os públicos");
    cy.get("[role=dialog] [data-testid=visibility-hint]").should("contain", "Qualquer pessoa");
    cy.contains("button", "Criar evento").click();
    cy.contains("Evento criado.");

    cy.request({
      url: `${API}/api/production-events/?page_size=200`,
      headers: auth(managerToken),
    }).then(({ body }) => {
      const event = (body.results as { id: string; title: string; visibility: string }[]).find(
        (e) => e.title === EVENT,
      )!;
      expect(event.visibility).to.eq("public");
      cy.visit(`/app/eventos/${event.id}/producao`);
    });
    cy.get("[data-testid=public-badge]", { timeout: 30000 }).should("be.visible");
    cy.get("[data-testid=event-visibility]").scrollIntoView();
    pick("#event-visibility-edit", "Membros da igreja");
    cy.contains("Evento só para os membros da igreja.");
    cy.get("[data-testid=public-badge]").should("not.exist");
  });

  it("a course class is opened to everyone", () => {
    cy.login(MANAGER, PASSWORD);
    cy.visit(`/app/cursos/${courseId}/turma/${classId}`);
    cy.contains("button", "Editar turma", { timeout: 30000 }).click();
    cy.get("#class-visibility").scrollIntoView();
    pick("#class-visibility", "Todos os públicos");
    cy.contains("[role=dialog] button", "Salvar").click();
    cy.get("[role=dialog]").should("not.exist");
    cy.request({ url: `${API}/api/course-classes/${classId}/`, headers: auth(managerToken) })
      .its("body.visibility")
      .should("eq", "public");
  });

  it("a cell is opened to everyone, showing it on its page", () => {
    cy.login(MANAGER, PASSWORD);
    cy.visit("/app/celulas/coordenacao");
    cy.contains("Célula Amor", { timeout: 30000 }).closest("a").click();
    cy.contains("Quem pode ver", { timeout: 30000 })
      .parent()
      .should("contain", "Membros da igreja");
    cy.contains("button", "Editar").click();
    pick("#cell-visibility", "Todos os públicos");
    cy.get("[role=dialog] [data-testid=visibility-hint]").should(
      "contain",
      "Endereço e líderes ficam reservados",
    );
    cy.get("[role=dialog]").contains("button", "Salvar").click();
    cy.contains("Célula atualizada");
    cy.contains("Quem pode ver").parent().should("contain", "Todos os públicos");

    // Back to members.
    cy.contains("button", "Editar").click();
    pick("#cell-visibility", "Membros da igreja");
    cy.get("[role=dialog]").contains("button", "Salvar").click();
    cy.contains("Quem pode ver").parent().should("contain", "Membros da igreja");
  });
});
