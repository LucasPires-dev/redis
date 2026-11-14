// The Cursos area as one screen with tabs per capability. Personal tabs are
// always there; "Minhas turmas" (teachers) and "Gestão" (coordinators) are
// added — and a person with several roles keeps every tab.
// Runs against the real backend seeded with `manage.py seed_initial_church`.

const API = "http://127.0.0.1:8000";
const PASSWORD = "TrocarSenha123!";
const MANAGER = "gestor@ilan.church";
const MEMBER = "membro@ilan.church";
const TEACHER = "colider.brave1@ilan.church";
// Campus courses leader who, here, also takes a class and assists in it.
const COORDINATOR = "cursos.arena@ilan.church";

const STAMP = Date.now();
const COURSE = `Curso Abas ${STAMP}`;
const CLASS = `Turma Abas ${STAMP}`;

function token(email: string) {
  return cy
    .request("POST", `${API}/api/auth/login/`, { email, password: PASSWORD })
    .its("body.access");
}

const auth = (t: string) => ({ Authorization: `Bearer ${t}` });

function me(t: string) {
  return cy.request({ url: `${API}/api/auth/me/`, headers: auth(t) }).its("body");
}

const tab = (label: string) => cy.get("nav[aria-label='Seções']").contains("a", label);
const noTab = (label: string) =>
  cy.get("nav[aria-label='Seções']").should("not.contain", label);

describe("Courses — tabs per capability", () => {
  let managerToken: string;
  let courseId: string;
  let classId: string;

  before(() => {
    token(MANAGER).then((mt: string) => {
      managerToken = mt;
      token(COORDINATOR).then((ct: string) => {
        me(ct).then((coordinator) => {
          cy.request({
            method: "POST",
            url: `${API}/api/courses/`,
            headers: auth(mt),
            body: { name: COURSE, description: "Curso para testar as abas", campus_id: coordinator.campus.id },
          }).then(({ body: course }) => {
            courseId = course.id;
            cy.request({
              method: "POST",
              url: `${API}/api/course-classes/`,
              headers: auth(mt),
              body: {
                course_id: courseId,
                campus_id: coordinator.campus.id,
                name: CLASS,
                end_date: new Date(Date.now() + 30 * 86400000).toLocaleDateString("en-CA"),
                self_enrollment: true,
              },
            }).then(({ body: cls }) => {
              classId = cls.id;
              token(TEACHER).then((tt: string) =>
                me(tt).then((teacher) =>
                  cy.request({
                    method: "POST",
                    url: `${API}/api/course-classes/${classId}/teachers/`,
                    headers: auth(mt),
                    body: { person_id: teacher.id, role: "teacher" },
                  }),
                ),
              );
              // The coordinator also assists in the class and takes it as a student.
              cy.request({
                method: "POST",
                url: `${API}/api/course-classes/${classId}/teachers/`,
                headers: auth(mt),
                body: { person_id: coordinator.id, role: "assistant" },
              });
              cy.request({
                method: "POST",
                url: `${API}/api/course-classes/${classId}/enroll/`,
                headers: auth(ct),
                body: {},
              });
            });
          });
        });
      });
    });
  });

  after(() => {
    if (courseId) {
      cy.request({
        method: "DELETE",
        url: `${API}/api/courses/${courseId}/`,
        headers: auth(managerToken),
        failOnStatusCode: false,
      });
    }
  });

  it("member: only the personal tabs, one menu entry, old address redirects", () => {
    cy.login(MEMBER, PASSWORD);
    cy.visit("/app/cursos");
    tab("Disponíveis").should("have.attr", "aria-current", "page");
    tab("Minhas matrículas").should("be.visible");
    noTab("Minhas turmas");
    noTab("Gestão");
    cy.contains("[data-testid=open-class]", CLASS, { timeout: 15000 }).should("be.visible");
    cy.get("[data-sidebar=sidebar]").should("not.contain", "Meus cursos");

    // A management tab typed by hand sends the member back to the personal tabs.
    cy.visit("/app/cursos/gestao");
    cy.location("pathname").should("eq", "/app/cursos");
    cy.visit("/app/meus-cursos");
    cy.location("pathname").should("eq", "/app/cursos/matriculas");
  });

  it("teacher: gets Minhas turmas and opens the class from there", () => {
    cy.login(TEACHER, PASSWORD);
    cy.visit("/app/cursos/turmas");
    noTab("Gestão");
    cy.contains("[data-testid=taught-class]", CLASS, { timeout: 15000 })
      .should("contain", "Professor")
      .click();
    cy.contains("h1", CLASS, { timeout: 15000 }).should("be.visible");
    cy.contains("[role=tab]", "Aulas & Presença").should("be.visible");
    cy.contains("[role=tab]", "Financeiro").should("not.exist");

    // The campus course itself opens (it used to be a 404 for teachers), without "Nova turma".
    cy.visit(`/app/cursos/${courseId}`);
    cy.contains("h1", COURSE, { timeout: 15000 }).should("be.visible");
    cy.contains("button", "Nova turma").should("not.exist");
  });

  it("coordinator who also studies and assists: keeps every tab", () => {
    cy.login(COORDINATOR, PASSWORD);
    cy.visit("/app/cursos/matriculas");
    tab("Disponíveis").should("be.visible");
    tab("Minhas matrículas").should("have.attr", "aria-current", "page");
    tab("Minhas turmas").should("be.visible");
    tab("Gestão").should("be.visible");
    cy.contains("[data-testid=my-enrollment]", CLASS, { timeout: 15000 }).should("be.visible");

    tab("Minhas turmas").click();
    cy.contains("[data-testid=taught-class]", CLASS, { timeout: 15000 }).should("contain", "Auxiliar");

    tab("Gestão").click();
    cy.location("pathname").should("eq", "/app/cursos/gestao");
    cy.contains("a", COURSE, { timeout: 15000 }).should("be.visible");
    cy.contains("button", "Novo curso").click();
    // A campus coordinator can't create church-wide courses: no "Geral" option.
    cy.get("[role=dialog]").within(() => {
      cy.contains("button,[role=combobox]", /Arena/).click();
    });
    cy.get("[role=listbox]").should("not.contain", "Geral (toda a igreja)");
  });
});
