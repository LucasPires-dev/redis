// Completing a class: each student's attendance against the class's minimum
// (adjustable per class), "Concluir turma" with who reached it pre-selected,
// and the student following their own attendance in "Minhas matrículas".
//
// Runs against the real backend seeded with `manage.py seed_initial_church`.
// Creates its own course, class and lessons, and removes them at the end.

const API = "http://127.0.0.1:8000";
const PASSWORD = "TrocarSenha123!";
const MANAGER = "gestor@ilan.church";
const COORDINATOR = "cursos.arena@ilan.church";
// 3 of 4 lessons: reaches 75%.
const GOOD_STUDENT = "membro@ilan.church";
// 1 of 4 lessons: below the minimum.
const LOW_STUDENT = "lider.brave1@ilan.church";

const STAMP = Date.now();
const COURSE = `Cypress Conclusão ${STAMP}`;
const CLASS = `Turma Conclusão ${STAMP}`;

const auth = (t: string) => ({ Authorization: `Bearer ${t}` });

function token(email: string) {
  return cy
    .request("POST", `${API}/api/auth/login/`, { email, password: PASSWORD })
    .its("body.access");
}

function me(t: string) {
  return cy.request({ url: `${API}/api/auth/me/`, headers: auth(t) }).its("body");
}

describe("Course completion", () => {
  let managerToken: string;
  let courseId: string;
  let classId: string;
  let goodName: string;
  let lowName: string;

  before(() => {
    token(MANAGER).then((mt: string) => {
      managerToken = mt;
      token(COORDINATOR).then((ct: string) =>
        me(ct).then((coordinator) => {
          cy.request({
            method: "POST",
            url: `${API}/api/courses/`,
            headers: auth(mt),
            body: { name: COURSE, campus_id: coordinator.campus.id },
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
              // Both students enroll themselves (free class).
              const students: { id: string }[] = [];
              [GOOD_STUDENT, LOW_STUDENT].forEach((email) =>
                token(email).then((st: string) => {
                  cy.request({
                    method: "POST",
                    url: `${API}/api/course-classes/${classId}/enroll/`,
                    headers: auth(st),
                    body: {},
                  });
                  me(st).then((person) => {
                    students.push(person);
                    if (email === GOOD_STUDENT) goodName = person.name;
                    else lowName = person.name;
                  });
                }),
              );
              // Four lessons; the good student misses the 2nd, the other only comes to the 1st.
              cy.wrap([1, 2, 3, 4]).each((order: number) =>
                cy
                  .request({
                    method: "POST",
                    url: `${API}/api/lessons/`,
                    headers: auth(mt),
                    body: { course_class_id: classId, order, title: `Tema ${order}` },
                  })
                  .then(({ body: lesson }) => {
                    const [good, low] = students;
                    cy.request({
                      method: "POST",
                      url: `${API}/api/lessons/${lesson.id}/attendance/`,
                      headers: auth(mt),
                      body: {
                        attendances: [
                          { person_id: good.id, present: order !== 2 },
                          { person_id: low.id, present: order === 1 },
                        ],
                      },
                    });
                  }),
              );
            });
          });
        }),
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

  it("the coordination sees attendance, adjusts the minimum and closes the class", () => {
    cy.login(COORDINATOR, PASSWORD);
    cy.visit(`/app/cursos/${courseId}/turma/${classId}`);
    cy.contains("[role=tab]", "Alunos", { timeout: 15000 }).click();
    cy.get("[data-testid=completion-summary]").should(
      "contain",
      "Frequência mínima para concluir: 75%",
    );
    cy.contains("[data-testid=student-row]", goodName).should(
      "contain",
      "Presença: 75% (3 de 4 aulas)",
    );
    cy.contains("[data-testid=student-row]", lowName).should(
      "contain",
      "Presença: 25% (1 de 4 aulas)",
    );

    // The minimum is set per class.
    cy.contains("button", "Editar turma").click();
    cy.get("#class-min-attendance").clear().type("70");
    cy.contains("[role=dialog] button", "Salvar").click();
    cy.get("[data-testid=completion-summary]").should(
      "contain",
      "Frequência mínima para concluir: 70%",
    );

    // Who reached it comes pre-selected; the rest is the coordination's call.
    cy.contains("button", "Concluir turma").click();
    cy.get("[role=dialog]").within(() => {
      cy.contains("Atingiram a frequência (1)");
      cy.contains("Abaixo do mínimo (1)");
      cy.get(`[aria-label="Concluir ${goodName}"]`).should("have.attr", "data-state", "checked");
      cy.get(`[aria-label="Concluir ${lowName}"]`).should("have.attr", "data-state", "unchecked");
      cy.contains("button", "Concluir 1 aluno").click();
    });
    cy.contains("[data-testid=student-row]", goodName)
      .should("contain", "Concluído")
      .and("contain", "concluiu em");
    cy.contains("[data-testid=student-row]", lowName).should("contain", "Ativo");
    cy.get("[data-testid=completion-summary]").should("contain", "1 concluiu");
  });

  it("the student follows their attendance and sees the completion", () => {
    cy.login(GOOD_STUDENT, PASSWORD);
    cy.visit("/app/cursos/matriculas");
    cy.contains("[data-testid=my-enrollment]", CLASS, { timeout: 15000 }).within(() => {
      cy.contains("Concluído");
      cy.get("[data-testid=my-attendance]")
        .should("contain", "75% (3 de 4 aulas)")
        .and("contain", "Mínimo para concluir: 70%");
      cy.get("[data-testid=my-attendance] li").should("have.length", 4);
      cy.get("[aria-label^='Aula 2 — Tema 2']").should("have.attr", "aria-label").and("contain", "falta");
    });
  });

  it("a student below the minimum is warned", () => {
    cy.login(LOW_STUDENT, PASSWORD);
    cy.visit("/app/cursos/matriculas");
    cy.contains("[data-testid=my-enrollment]", CLASS, { timeout: 15000 })
      .find("[data-testid=my-attendance]")
      .should("contain", "25% (1 de 4 aulas)")
      .and("contain", "Sua presença está abaixo do mínimo");
  });
});
