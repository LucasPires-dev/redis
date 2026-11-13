// Notification center: a member is appointed teacher while the app is open; the
// bell counts it live (WebSocket), a toast shows it, and opening it leads to
// the class and marks it as read. Then "Marcar todas como lidas".
//
// Runs against the real backend seeded with `manage.py seed_initial_church`,
// with Redis up (live updates). Creates its own course and classes and removes
// them at the end.

const API = "http://127.0.0.1:8000";
const PASSWORD = "TrocarSenha123!";
const MANAGER = "gestor@ilan.church";
const COORDINATOR = "cursos.arena@ilan.church";
const MEMBER = "membro@ilan.church";

const STAMP = Date.now();
const COURSE = `Cypress Avisos ${STAMP}`;
const CLASS_A = `Turma A ${STAMP}`;
const CLASS_B = `Turma B ${STAMP}`;

const auth = (t: string) => ({ Authorization: `Bearer ${t}` });

function token(email: string) {
  return cy
    .request("POST", `${API}/api/auth/login/`, { email, password: PASSWORD })
    .its("body.access");
}

function me(t: string) {
  return cy.request({ url: `${API}/api/auth/me/`, headers: auth(t) }).its("body");
}

const bell = () => cy.get("[data-testid=notification-bell]");
const count = () => cy.get("[data-testid=notification-count]");

describe("Notification center", () => {
  let managerToken: string;
  let memberId: string;
  let courseId: string;
  const classIds: string[] = [];

  function appoint(classId: string, role: "teacher" | "assistant") {
    return cy.request({
      method: "POST",
      url: `${API}/api/course-classes/${classId}/teachers/`,
      headers: auth(managerToken),
      body: { person_id: memberId, role },
    });
  }

  before(() => {
    token(MEMBER).then((t: string) => {
      me(t).then((p) => (memberId = p.id));
      // Start from a clean bell.
      cy.request({ method: "POST", url: `${API}/api/notifications/read-all/`, headers: auth(t) });
    });
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
              [CLASS_A, CLASS_B].forEach((name) =>
                cy
                  .request({
                    method: "POST",
                    url: `${API}/api/course-classes/`,
                    headers: auth(mt),
                    body: { course_id: courseId, campus_id: coordinator.campus.id, name },
                  })
                  .then(({ body }) => classIds.push(body.id)),
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

  it("a new notification shows up live and leads to the class", () => {
    cy.login(MEMBER, PASSWORD);
    cy.visit("/app/cursos");
    bell().should("be.visible");
    count().should("not.exist");
    // Let the live connection open before anything happens.
    cy.wait(1500);

    cy.then(() => appoint(classIds[0], "teacher"));
    const title = `Você agora é professor(a) da turma ${CLASS_A} (${COURSE})`;
    count({ timeout: 15000 }).should("have.text", "1");
    cy.contains("[data-sonner-toast]", title).should("be.visible");

    bell().click();
    cy.location("pathname").should("eq", "/app/notificacoes");
    cy.contains("[data-testid=notification-item]", title)
      .should("have.attr", "data-unread", "true")
      .click();
    cy.location("pathname").should("eq", `/app/cursos/${courseId}/turma/${classIds[0]}`);
    count().should("not.exist");

    bell().click();
    cy.contains("[data-testid=notification-item]", title).should("not.have.attr", "data-unread");
  });

  it("marks every notification as read", () => {
    cy.then(() => appoint(classIds[1], "assistant"));
    cy.then(() =>
      cy.request({
        method: "DELETE",
        url: `${API}/api/course-classes/${classIds[0]}/teachers/${memberId}/`,
        headers: auth(managerToken),
      }),
    );
    cy.then(() => appoint(classIds[0], "assistant"));

    cy.login(MEMBER, PASSWORD);
    cy.visit("/app/notificacoes");
    count({ timeout: 15000 }).should("have.text", "2");
    cy.contains("[role=tab]", "Não lidas (2)").click();
    cy.get("[data-testid=notification-item]").should("have.length", 2);
    cy.contains("[data-testid=notification-item]", `auxiliar da turma ${CLASS_B}`);

    cy.contains("button", "Marcar todas como lidas").click();
    cy.get("[data-testid=notifications-empty]").should("contain", "Tudo em dia");
    count().should("not.exist");
  });
});
