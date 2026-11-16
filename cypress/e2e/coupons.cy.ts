// Discount coupons: the organizers create one on the event's production page;
// a member applies it when registering (a wrong code is refused) and, with a
// 100% coupon, is confirmed without any charge. Same on a paid course class.
// Runs against the real backend seeded with `manage.py seed_initial_church`.
// Only 100% coupons are used, so no Asaas charge is ever created.

const API = "http://127.0.0.1:8000";
const PASSWORD = "TrocarSenha123!";
const MANAGER = "gestor@ilan.church";
const MEMBER = "lider.brave1@ilan.church";
const STAMP = Date.now();
const EVENT = `Cypress Cupom ${STAMP}`;
const COURSE = `Curso Cupom ${STAMP}`;
const CLASS = `Turma Cupom ${STAMP}`;

const auth = (t: string) => ({ Authorization: `Bearer ${t}` });
const token = (email: string) =>
  cy.request("POST", `${API}/api/auth/login/`, { email, password: PASSWORD }).its("body.access");
const inDays = (n: number) => new Date(Date.now() + n * 86400000).toLocaleDateString("en-CA");

describe("Cupons de desconto", () => {
  let managerToken: string;
  let memberToken: string;
  let eventId: string;
  let courseId: string;
  let classId: string;

  before(() => {
    token(MANAGER).then((t: string) => {
      managerToken = t;
      cy.request({
        method: "POST",
        url: `${API}/api/production-events/`,
        headers: auth(t),
        body: {
          title: EVENT,
          event_type: "conference",
          starts_at: new Date(Date.now() + 10 * 86400000).toISOString(),
          ticket: { price_cents: 5000, max_capacity: 20 },
        },
      }).then(({ body }) => (eventId = body.id));
    });
    token(MEMBER).then((t: string) => {
      memberToken = t;
      cy.request({ url: `${API}/api/auth/me/`, headers: auth(t) }).then(({ body: me }) =>
        cy
          .request({
            method: "POST",
            url: `${API}/api/courses/`,
            headers: auth(managerToken),
            body: { name: COURSE },
          })
          .then(({ body: course }) => {
            courseId = course.id;
            cy.request({
              method: "POST",
              url: `${API}/api/course-classes/`,
              headers: auth(managerToken),
              body: {
                course_id: courseId,
                campus_id: me.campus.id,
                name: CLASS,
                start_date: inDays(10),
                end_date: inDays(60),
                self_enrollment: true,
                fee_items: [{ name: "Apostila", price_cents: 3000, required: true }],
              },
            }).then(({ body: cls }) => {
              classId = cls.id;
              cy.request({
                method: "POST",
                url: `${API}/api/payments/coupons/`,
                headers: auth(managerToken),
                body: { course_class_id: classId, code: "BOLSA100", kind: "percent", percent: 100 },
              });
            });
          }),
      );
    });
  });

  after(() => {
    cy.request({
      url: `${API}/api/payments/registrations/?event=${eventId}&mine=1`,
      headers: auth(memberToken),
      failOnStatusCode: false,
    }).then(({ body }) =>
      (body?.results ?? []).forEach((r: { id: string }) =>
        cy.request({
          method: "POST",
          url: `${API}/api/payments/registrations/${r.id}/cancel/`,
          headers: auth(managerToken),
          failOnStatusCode: false,
        }),
      ),
    );
    cy.request({
      method: "DELETE",
      url: `${API}/api/production-events/${eventId}/`,
      headers: auth(managerToken),
      failOnStatusCode: false,
    });
    cy.request({
      url: `${API}/api/course-enrollments/?mine=1`,
      headers: auth(memberToken),
      failOnStatusCode: false,
    }).then(({ body }) =>
      (body?.results ?? [])
        .filter((e: { course_class?: { course_name?: string } }) =>
          e.course_class?.course_name?.includes(String(STAMP)),
        )
        .forEach((e: { id: string }) =>
          cy.request({
            method: "POST",
            url: `${API}/api/course-enrollments/${e.id}/cancel/`,
            headers: auth(managerToken),
            body: { force: true },
            failOnStatusCode: false,
          }),
        ),
    );
    cy.request({
      method: "DELETE",
      url: `${API}/api/courses/${courseId}/`,
      headers: auth(managerToken),
      failOnStatusCode: false,
    });
  });

  beforeEach(() => cy.viewport("iphone-x"));

  it("the organizers create a coupon on the production page", () => {
    cy.login(MANAGER, PASSWORD);
    cy.visit(`/app/eventos/${eventId}/producao`);
    cy.get("[data-testid=coupons-manager]", { timeout: 30000 }).scrollIntoView();
    cy.contains("button", "Novo cupom").click();
    cy.get("[role=dialog]").within(() => {
      cy.get("#new-coupon-code").type("cortesia");
      cy.get("#new-coupon-value").type("100");
      cy.get("#new-coupon-uses").type("5");
      cy.contains("button", "Criar cupom").click();
    });
    cy.contains("Cupom criado.");
    cy.contains("[data-testid=coupon-row]", "CORTESIA")
      .should("contain", "100% de desconto")
      .and("contain", "0/5 uso(s)");
  });

  it("a member applies it and is confirmed without paying", () => {
    cy.login(MEMBER, PASSWORD);
    cy.visit(`/app/eventos/${eventId}`);
    cy.get("[data-testid=signup-panel]", { timeout: 30000 });
    cy.contains("button", "Tenho um cupom de desconto").click();
    cy.get("#coupon-code").type("errado");
    cy.contains("button", "Aplicar").click();
    cy.get("[data-testid=coupon-error]").should("contain", "Cupom inválido.");
    cy.get("#coupon-code").clear().type("cortesia");
    cy.contains("button", "Aplicar").click();
    cy.get("[data-testid=coupon-applied]").should("contain", "CORTESIA");
    cy.contains("button", "Inscrever-se · Grátis com cupom").click();
    cy.contains("Inscrição confirmada!");
  });

  it("the used coupon counts the use and can only be paused", () => {
    cy.login(MANAGER, PASSWORD);
    cy.visit(`/app/eventos/${eventId}/producao`);
    cy.contains("[data-testid=coupon-row]", "CORTESIA", { timeout: 30000 })
      .should("contain", "1/5 uso(s)")
      .find("[aria-label='Excluir cupom CORTESIA']")
      .should("not.exist");
  });

  it("a member enrolls in a paid class with a coupon", () => {
    cy.login(MEMBER, PASSWORD);
    cy.visit("/app/cursos");
    cy.contains("[data-testid=open-class]", CLASS, { timeout: 30000 })
      .contains("button", "Inscrever-me")
      .click();
    cy.get("[role=dialog]").within(() => {
      cy.contains("button", "Tenho um cupom de desconto").click();
      cy.get("#coupon-code").type("bolsa100");
      cy.contains("button", "Aplicar").click();
      cy.get("[data-testid=coupon-applied]").should("contain", "BOLSA100");
      cy.contains("button", "Confirmar inscrição (grátis com cupom)").click();
    });
    cy.contains("Matrícula feita!");
  });
});
