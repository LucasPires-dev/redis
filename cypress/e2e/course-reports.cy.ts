// Course reports: coordination sees each class's attendance, completion,
// dropouts and who needs care, filters by situation, and opens the class to
// find the students to care for. Members don't get the tab.
//
// Runs against the real backend seeded with `manage.py seed_initial_church`.
// Creates its own course, class and lessons, and removes them at the end.

const API = "http://127.0.0.1:8000";
const PASSWORD = "TrocarSenha123!";
const MANAGER = "gestor@ilan.church";
const COORDINATOR = "cursos.arena@ilan.church";
// 3 of 3 lessons.
const STEADY = "membro@ilan.church";
// Came to the first lesson only: two absences in a row → to care for.
const MISSING = "lider.brave1@ilan.church";
// Enrolls and cancels: a dropout.
const LEAVER = "colider.brave2@ilan.church";

const STAMP = Date.now();
const COURSE = `Cypress Relatórios ${STAMP}`;
const CLASS = `Turma Relatórios ${STAMP}`;

const auth = (t: string) => ({ Authorization: `Bearer ${t}` });
const day = (offset: number) =>
  new Date(Date.now() + offset * 86400000).toLocaleDateString("en-CA");

function token(email: string) {
  return cy
    .request("POST", `${API}/api/auth/login/`, { email, password: PASSWORD })
    .its("body.access");
}

function me(t: string) {
  return cy.request({ url: `${API}/api/auth/me/`, headers: auth(t) }).its("body");
}

const tab = (label: string) => cy.get("nav[aria-label='Seções']").contains("a", label);

describe("Course reports", () => {
  let managerToken: string;
  let courseId: string;
  let classId: string;
  let missingName: string;
  const ids: Record<string, string> = {};

  before(() => {
    token(MANAGER).then((mt: string) => {
      managerToken = mt;
      token(COORDINATOR).then((ct: string) =>
        me(ct).then((coordinator) =>
          cy
            .request({
              method: "POST",
              url: `${API}/api/courses/`,
              headers: auth(mt),
              body: { name: COURSE, campus_id: coordinator.campus.id },
            })
            .then(({ body: course }) => {
              courseId = course.id;
              return cy.request({
                method: "POST",
                url: `${API}/api/course-classes/`,
                headers: auth(mt),
                body: {
                  course_id: courseId,
                  campus_id: coordinator.campus.id,
                  name: CLASS,
                  start_date: day(-30),
                  end_date: day(30),
                  self_enrollment: true,
                },
              });
            })
            .then(({ body: cls }) => {
              classId = cls.id;
              [STEADY, MISSING, LEAVER].forEach((email) =>
                token(email).then((st: string) => {
                  me(st).then((person) => {
                    ids[email] = person.id;
                    if (email === MISSING) missingName = person.name;
                  });
                  cy.request({
                    method: "POST",
                    url: `${API}/api/course-classes/${classId}/enroll/`,
                    headers: auth(st),
                    body: {},
                  }).then(({ body: enrollment }) => {
                    if (email === LEAVER) {
                      cy.request({
                        method: "POST",
                        url: `${API}/api/course-enrollments/${enrollment.id}/cancel/`,
                        headers: auth(st),
                        body: {},
                      });
                    }
                  });
                }),
              );
              cy.wrap([1, 2, 3]).each((order: number) =>
                cy
                  .request({
                    method: "POST",
                    url: `${API}/api/lessons/`,
                    headers: auth(mt),
                    body: { course_class_id: classId, order, date: day(-21 + order * 7) },
                  })
                  .then(({ body: lesson }) =>
                    cy.request({
                      method: "POST",
                      url: `${API}/api/lessons/${lesson.id}/attendance/`,
                      headers: auth(mt),
                      body: {
                        attendances: [
                          { person_id: ids[STEADY], present: true },
                          { person_id: ids[MISSING], present: order === 1 },
                        ],
                      },
                    }),
                  ),
              );
            }),
        ),
      );
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

  it("coordination follows the class and finds who to care for", () => {
    cy.login(COORDINATOR, PASSWORD);
    cy.visit("/app/cursos");
    tab("Relatórios").click();
    cy.location("pathname").should("eq", "/app/cursos/relatorios");
    cy.get("[data-testid=course-report-totals]", { timeout: 15000 }).should(
      "contain",
      "Para cuidar",
    );

    cy.contains("[data-testid=course-report-class]", CLASS)
      .should("contain", "Em andamento")
      .and("contain", "67%") // 4 of 6 attendances
      .and("contain", "33%") // 1 of 3 who started left
      .and("contain", "1 saiu")
      .and("contain", "3/3"); // lessons with attendance / lessons
    // The wide table scrolls inside its card, not the page.
    cy.window().then((w) =>
      expect(w.document.documentElement.scrollWidth).to.be.at.most(w.innerWidth),
    );

    // Filtering by situation is done by the API.
    cy.get("[aria-label=Situação]").click();
    cy.contains("[role=option]", "Encerradas").click();
    cy.contains("[data-testid=course-report-class]", CLASS).should("not.exist");
    cy.get("[aria-label=Situação]").click();
    cy.contains("[role=option]", "Em andamento").click();
    cy.contains("[data-testid=course-report-class]", CLASS).should("exist");

    // The row opens the class, where the students to care for are listed.
    cy.contains("[data-testid=course-report-class] a", CLASS).click();
    cy.contains("[role=tab]", "Alunos", { timeout: 15000 }).click();
    cy.get("[data-testid=class-care]")
      .should("contain", "Alunos para cuidar (1)")
      .find("[data-testid=care-student]")
      .should("have.length", 1)
      .and("contain", missingName)
      .and("contain", "2 faltas seguidas")
      .and("contain", "Abaixo do mínimo (33%)");
  });

  it("members don't see the reports", () => {
    cy.login(STEADY, PASSWORD);
    cy.visit("/app/cursos");
    cy.get("nav[aria-label='Seções']", { timeout: 15000 }).should("not.contain", "Relatórios");
    cy.visit("/app/cursos/relatorios");
    cy.location("pathname").should("eq", "/app/cursos");
  });
});
