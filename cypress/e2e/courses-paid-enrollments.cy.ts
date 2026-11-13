// Paid course enrollments: class fees, the member's tabs of the Cursos area and the
// coordinators' "Financeiro" tab (scholarship, in-person payment, expenses,
// material, cancellation with refund).
// Runs against the real backend seeded with `manage.py seed_initial_church`.
// The online charge itself is stubbed (Asaas is covered by the API tests and the
// sandbox check), so the member never gets a CPF saved and the run repeats.

const API = "http://127.0.0.1:8000";
const PASSWORD = "TrocarSenha123!";
const MANAGER = "gestor@ilan.church";
const MEMBER = "lider.brave1@ilan.church";

// Intl formats BRL with a non-breaking space: "R$ 30,00".
const R = "R$ ";

const STAMP = Date.now();
const COURSE = `Curso Pago ${STAMP}`;
const PAID_CLASS = `Turma Paga ${STAMP}`;
const FREE_CLASS = `Turma Livre ${STAMP}`;

function token(email: string) {
  return cy
    .request("POST", `${API}/api/auth/login/`, { email, password: PASSWORD })
    .its("body.access");
}

const auth = (t: string) => ({ Authorization: `Bearer ${t}` });

function inDays(n: number) {
  return new Date(Date.now() + n * 86400000).toLocaleDateString("en-CA");
}

// Radix Select: open, pick, wait for the listbox to close.
function pick(trigger: string, option: string) {
  cy.get(`[aria-label="${trigger}"]`).click();
  cy.contains("[role=option]", option).click();
  cy.get("[role=listbox]").should("not.exist");
}

describe("Courses — paid enrollments", () => {
  let managerToken: string;
  let memberToken: string;
  let memberId: string;
  let memberName: string;
  let courseId: string;
  let paidClassId: string;

  before(() => {
    token(MANAGER).then((t: string) => (managerToken = t));
    token(MEMBER).then((t: string) => {
      memberToken = t;
      cy.request({ url: `${API}/api/auth/me/`, headers: auth(t) }).then(({ body }) => {
        memberId = body.id;
        memberName = body.name;
        const campusId = body.campus.id;
        cy.request({
          method: "POST",
          url: `${API}/api/courses/`,
          headers: auth(managerToken),
          body: { name: COURSE, description: "Curso de teste com taxas" },
        }).then(({ body: course }) => {
          courseId = course.id;
          cy.request({
            method: "POST",
            url: `${API}/api/course-classes/`,
            headers: auth(managerToken),
            body: {
              course_id: courseId,
              campus_id: campusId,
              name: PAID_CLASS,
              start_date: inDays(10),
              end_date: inDays(90),
              self_enrollment: true,
              max_capacity: 10,
              max_installments: 3,
              fee_items: [
                { name: "Apostila", price_cents: 3000, required: true },
                { name: "Camiseta", price_cents: 3500, required: false, options: ["P", "M", "G"] },
              ],
            },
          }).then(({ body: cls }) => (paidClassId = cls.id));
          cy.request({
            method: "POST",
            url: `${API}/api/course-classes/`,
            headers: auth(managerToken),
            body: {
              course_id: courseId,
              campus_id: campusId,
              name: FREE_CLASS,
              end_date: inDays(30),
              self_enrollment: true,
            },
          });
        });
      });
    });
  });

  after(() => {
    // Cancel the member's enrollments (frees their seat history) and drop the course.
    if (memberToken) {
      cy.request({
        url: `${API}/api/course-enrollments/?mine=1`,
        headers: auth(memberToken),
        failOnStatusCode: false,
      }).then(({ body }) => {
        for (const e of body?.results ?? []) {
          if (!e.course_class?.course_name?.includes(String(STAMP))) continue;
          cy.request({
            method: "POST",
            url: `${API}/api/course-enrollments/${e.id}/cancel/`,
            headers: auth(managerToken),
            body: { force: true },
            failOnStatusCode: false,
          });
        }
      });
    }
    if (courseId) {
      cy.request({
        method: "DELETE",
        url: `${API}/api/courses/${courseId}/`,
        headers: auth(managerToken),
        failOnStatusCode: false,
      });
    }
  });

  it("coordinator sees the fees in the class form", () => {
    cy.login(MANAGER, PASSWORD);
    cy.visit(`/app/cursos/${courseId}/turma/${paidClassId}`);
    cy.contains("button", "Editar turma", { timeout: 15000 }).click();
    cy.get("[role=dialog]").within(() => {
      cy.get("[data-testid=fee-item]").should("have.length", 2);
      cy.get("[data-testid=base-price]").should("contain", `${R}30,00`);
      cy.get('[aria-label="Valor do item 1"]').clear().type("3");
      cy.contains("mínimo do Asaas").should("be.visible");
      cy.contains("button", "Salvar").should("be.disabled");
      cy.get('[aria-label="Valor do item 1"]').clear().type("30,00");
      cy.contains("button", "Salvar").should("be.enabled");
      cy.contains("button", "Cancelar").click();
    });
  });

  it("member enrolls in a free class by themselves", () => {
    cy.login(MEMBER, PASSWORD);
    cy.visit("/app/cursos");
    cy.contains("[data-testid=open-class]", FREE_CLASS, { timeout: 15000 })
      .should("contain", "Gratuito")
      .contains("button", "Inscrever-me")
      .click();
    cy.get("[role=dialog]").contains("button", "Confirmar inscrição").click();
    cy.contains("Matrícula feita!").should("be.visible");
    cy.contains("[data-testid=my-enrollment]", FREE_CLASS).should("contain", "Gratuita");
  });

  it("member picks paid items and gives the CPF; a failed charge keeps nothing", () => {
    cy.login(MEMBER, PASSWORD);
    cy.visit("/app/cursos");
    cy.contains("[data-testid=open-class]", PAID_CLASS, { timeout: 15000 })
      .should("contain", `a partir de ${R}30,00`)
      .contains("button", "Inscrever-me")
      .click();
    cy.get("[role=dialog]").within(() => {
      cy.get("[data-testid=enroll-total]").should("contain", `${R}30,00`);
      cy.get('[aria-label="Camiseta"]').click();
      cy.get("[data-testid=enroll-total]").should("contain", `${R}65,00`);
      // An item with options needs one picked.
      cy.contains("button", "Inscrever e pagar").should("be.disabled");
    });
    pick("Opção de Camiseta", "M");
    pick("Parcelas", "3x");
    // Asaas needs a CPF: asked because the member has none on file.
    cy.get("[role=dialog]").within(() => {
      cy.get("#cpf").type("11144477700");
      cy.contains("CPF inválido").should("be.visible");
      cy.contains("button", "Inscrever e pagar").should("be.disabled");
      cy.get("#cpf").clear().type("11144477735").should("have.value", "111.444.777-35");
    });
    cy.intercept("POST", "**/api/course-classes/*/enroll/", {
      statusCode: 503,
      body: {
        detail: "Não foi possível gerar a cobrança agora. Tente novamente em alguns minutos.",
      },
    }).as("enroll");
    cy.get("[role=dialog]").contains("button", "Inscrever e pagar R$ 65,00").click();
    cy.wait("@enroll")
      .its("request.body")
      .should("deep.include", { installments: 3, cpf: "11144477735" });
    cy.contains("Não foi possível gerar a cobrança").should("be.visible");
    cy.request({
      url: `${API}/api/course-enrollments/?mine=1`,
      headers: auth(memberToken),
    }).then(({ body }) => {
      const names = body.results.map(
        (e: { course_class: { name: string } }) => e.course_class.name,
      );
      expect(names).not.to.include(PAID_CLASS);
    });
  });

  it("coordinator handles scholarship, in-person payment, material and expenses", () => {
    // Enrolled by the coordinator without an online link (pays at the office).
    cy.request({
      method: "POST",
      url: `${API}/api/course-classes/${paidClassId}/enrollments/`,
      headers: auth(managerToken),
      body: { person_id: memberId },
    })
      .its("status")
      .should("eq", 201);

    cy.login(MANAGER, PASSWORD);
    cy.visit(`/app/cursos/${courseId}/turma/${paidClassId}`);
    cy.contains("[role=tab]", "Alunos", { timeout: 15000 }).click();
    cy.contains("[data-testid=student-row]", memberName).should("contain", "Aguardando pagamento");

    cy.contains("[role=tab]", "Financeiro").click();
    cy.contains("[data-testid=finance-enrollment]", memberName, { timeout: 15000 }).should(
      "contain",
      "Aguardando pagamento",
    );

    // Partial scholarship: R$ 10,00 off.
    cy.get(`[aria-label="Ações de ${memberName}"]`).click();
    cy.contains("[role=menuitem]", "Conceder bolsa").click();
    cy.get("[role=dialog]").within(() => {
      cy.get("#scholarship-amount").type("10");
      cy.get("#scholarship-reason").type("Teste de bolsa");
      cy.contains("A pagar").should("contain", `${R}20,00`);
      cy.contains("button", "Conceder bolsa").click();
    });
    cy.contains("Bolsa parcial concedida").should("be.visible");
    cy.contains("[data-testid=finance-enrollment]", memberName).should(
      "contain",
      `bolsa ${R}10,00`,
    );

    // Paid at the office: R$ 5,00 first, then the rest.
    cy.get(`[aria-label="Ações de ${memberName}"]`).click();
    cy.contains("[role=menuitem]", "Registrar pagamento presencial").click();
    cy.get("#manual-amount").should("have.value", "20,00").clear().type("5");
    cy.get("#manual-note").type("Dinheiro");
    cy.get("[role=dialog]").contains("button", "Registrar pagamento").click();
    cy.contains("[data-testid=finance-enrollment]", memberName)
      .should("contain", "Pago em parte")
      .and("contain", `Falta ${R}15,00`);
    cy.get(`[aria-label="Ações de ${memberName}"]`).click();
    cy.contains("[role=menuitem]", "Registrar pagamento presencial").click();
    cy.get("#manual-amount").should("have.value", "15,00");
    cy.get("[role=dialog]").contains("button", "Registrar pagamento").click();
    cy.contains("[data-testid=finance-enrollment]", memberName).should("contain", "Paga");
    cy.get("[data-testid=finance-received]").should("contain", `${R}20,00`);

    cy.get(`[aria-label="Material entregue para ${memberName}"]`).click();
    cy.contains("Material entregue").parent().should("contain", "1 de 1");

    cy.get('[aria-label="Descrição da despesa"]').type("Impressão");
    cy.get('[aria-label="Valor da despesa"]').type("7,50");
    cy.contains("button", "Adicionar").click();
    cy.contains("[data-testid=expense]", "Impressão").should("contain", `${R}7,50`);
    cy.get("[data-testid=finance-balance]").should("contain", `${R}12,50`);
  });

  it("member sees the paid enrollment and can't cancel it alone", () => {
    cy.login(MEMBER, PASSWORD);
    cy.visit("/app/cursos/matriculas");
    cy.contains("[data-testid=my-enrollment]", PAID_CLASS)
      .should("contain", "Paga")
      .and("contain", "Bolsa")
      .and("contain", `${R}20,00`)
      .and("contain", "fale com a coordenação")
      .within(() => cy.contains("button", "Cancelar inscrição").should("not.exist"));
  });

  it("coordinator cancels and refunds the in-person payments", () => {
    cy.login(MANAGER, PASSWORD);
    cy.visit(`/app/cursos/${courseId}/turma/${paidClassId}`);
    cy.contains("[role=tab]", "Financeiro", { timeout: 15000 }).click();
    cy.get(`[aria-label="Ações de ${memberName}"]`).click();
    cy.contains("[role=menuitem]", "Cancelar e reembolsar").click();
    // First answer stubbed as Asaas refusing a boleto refund: the coordinator
    // confirms the money was returned by hand, and the retry goes through.
    cy.intercept(
      { method: "POST", url: "**/api/course-enrollments/*/cancel/", times: 1 },
      {
        statusCode: 400,
        body: {
          detail:
            "O Asaas não estorna este pagamento (só cartão e Pix são estornados; boleto não).",
          code: "manual_refund_required",
        },
      },
    ).as("refused");
    cy.get("[role=dialog]").within(() => {
      cy.contains("R$ 20,00 pagos presencialmente").should("be.visible");
      cy.get("#cancel-note").type("Devolvido em dinheiro");
      cy.contains("button", "Cancelar e reembolsar").click();
    });
    cy.wait("@refused");
    cy.get("[data-testid=manual-refund]").should("contain", "boleto não");
    cy.get("[role=dialog]").contains("button", "Cancelar e reembolsar").should("be.disabled");
    cy.intercept("POST", "**/api/course-enrollments/*/cancel/").as("cancel");
    cy.get('[aria-label="Já devolvi o valor por fora"]').click();
    cy.get("[role=dialog]").contains("button", "Cancelar e reembolsar").click();
    cy.wait("@cancel").its("request.body.manual_refund").should("eq", true);
    cy.contains("Matrícula cancelada e reembolsada").should("be.visible");
    cy.contains("Mostrar canceladas").click();
    cy.contains("[data-testid=finance-enrollment]", memberName).should("contain", "Reembolsada");
    cy.get("[data-testid=finance-received]").should("contain", `${R}0,00`);
  });
});
