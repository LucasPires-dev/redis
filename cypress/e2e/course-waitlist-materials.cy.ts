// Waitlist and lesson materials: a member joins the line of a full class; the
// coordination sees the line and adds a link to a lesson; when the seat opens
// it is held for the member, who enrolls and finds the material.
//
// Runs against the real backend seeded with `manage.py seed_initial_church`.
// Creates its own course, class and lesson, and removes them at the end.

const API = "http://127.0.0.1:8000";
const PASSWORD = "TrocarSenha123!";
const MANAGER = "gestor@ilan.church";
const COORDINATOR = "cursos.arena@ilan.church";
// Takes the only seat, then gives it up.
const HOLDER = "membro@ilan.church";
// Waits in line.
const WAITER = "lider.brave1@ilan.church";

const STAMP = Date.now();
const COURSE = `Cypress Espera ${STAMP}`;
const CLASS = `Turma Espera ${STAMP}`;
const MATERIAL = "Slides da aula 1";
const MATERIAL_URL = "https://example.com/slides-aula-1";

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
const card = () => cy.contains("[data-testid=open-class]", CLASS, { timeout: 15000 });

describe("Course waitlist and lesson materials", () => {
  let managerToken: string;
  let courseId: string;
  let classId: string;
  let holderEnrollment: string;
  let waiterName: string;

  before(() => {
    token(WAITER).then((t: string) => me(t).then((p) => (waiterName = p.name)));
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
                  start_date: day(7),
                  end_date: day(60),
                  self_enrollment: true,
                  max_capacity: 1,
                },
              });
            })
            .then(({ body: cls }) => {
              classId = cls.id;
              cy.request({
                method: "POST",
                url: `${API}/api/lessons/`,
                headers: auth(mt),
                body: { course_class_id: classId, order: 1, title: "Abertura", date: day(7) },
              });
              token(HOLDER).then((ht: string) =>
                cy
                  .request({
                    method: "POST",
                    url: `${API}/api/course-classes/${classId}/enroll/`,
                    headers: auth(ht),
                    body: {},
                  })
                  .then(({ body }) => (holderEnrollment = body.id)),
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

  it("a member joins the line of a full class", () => {
    cy.login(WAITER, PASSWORD);
    cy.visit("/app/cursos");
    card().contains("button", "Entrar na lista de espera").click();
    card()
      .find("[data-testid=waitlist-status]")
      .should("contain", "1º da fila")
      .and("contain", "Sair da lista");
  });

  it("the coordination sees the line and hands out a material", () => {
    cy.login(COORDINATOR, PASSWORD);
    cy.visit(`/app/cursos/${courseId}/turma/${classId}`);
    cy.contains("[role=tab]", "Alunos", { timeout: 15000 }).click();
    cy.get("[data-testid=class-waitlist]")
      .find("[data-testid=waitlist-entry]")
      .should("have.length", 1)
      .and("contain", waiterName)
      .and("contain", "Aguardando");

    cy.contains("[role=tab]", "Aulas").click();
    cy.contains("h4", "Aula 1").click();
    cy.get("[data-testid=lesson-materials]").within(() => {
      cy.get("[aria-label='Nome do material']").type(MATERIAL);
      cy.get("[aria-label='Link do material']").type(MATERIAL_URL);
      cy.contains("button", "Adicionar").click();
      cy.contains("[data-testid=material-link]", MATERIAL).should(
        "have.attr",
        "href",
        MATERIAL_URL,
      );
    });
    cy.contains("h4", "Aula 1").parent().parent().should("contain", "1 material");
  });

  it("the freed seat is held for the member, who enrolls and finds the material", () => {
    token(HOLDER).then((ht: string) =>
      cy.request({
        method: "POST",
        url: `${API}/api/course-enrollments/${holderEnrollment}/cancel/`,
        headers: auth(ht),
        body: {},
      }),
    );

    cy.login(WAITER, PASSWORD);
    cy.visit("/app/cursos");
    card().find("[data-testid=waitlist-offer]").should("contain", "Abriu uma vaga para você");
    card().contains("button", "Inscrever-me").click();
    cy.get("[role=dialog]").contains("button", "Confirmar inscrição").click();

    cy.location("pathname", { timeout: 15000 }).should("eq", "/app/cursos/matriculas");
    cy.contains("[data-testid=my-enrollment]", CLASS, { timeout: 15000 })
      .find("[data-testid=my-materials]")
      .contains("[data-testid=material-link]", MATERIAL)
      .should("have.attr", "href", MATERIAL_URL);

    // The person left the line when they enrolled.
    tab("Disponíveis").click();
    card().find("[data-testid=waitlist-status]").should("not.exist");
  });
});
