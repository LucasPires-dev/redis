// Paid event registration asks for the CPF when the member has none on file
// (Asaas needs it to charge). The registration itself is stubbed, so no CPF
// gets saved and the run repeats.
// Runs against the real backend seeded with `manage.py seed_initial_church`.

const API = "http://127.0.0.1:8000";
const PASSWORD = "TrocarSenha123!";
const MANAGER = "gestor@ilan.church";
const MEMBER = "lider.brave1@ilan.church";

function token(email: string) {
  return cy
    .request("POST", `${API}/api/auth/login/`, { email, password: PASSWORD })
    .its("body.access");
}

const auth = (t: string) => ({ Authorization: `Bearer ${t}` });

describe("Payments — CPF", () => {
  let managerToken: string;
  let eventId: string;

  before(() => {
    token(MANAGER).then((t: string) => {
      managerToken = t;
      cy.request({
        method: "POST",
        url: `${API}/api/production-events/`,
        headers: auth(t),
        body: {
          title: `Evento Pago ${Date.now()}`,
          event_type: "conference",
          starts_at: new Date(Date.now() + 7 * 86400000).toISOString(),
        },
      }).then(({ body }) => {
        eventId = body.id;
        cy.request({
          method: "POST",
          url: `${API}/api/payments/ticket-configs/`,
          headers: auth(t),
          body: { event_id: eventId, price_cents: 2000 },
        });
      });
    });
  });

  after(() => {
    if (eventId) {
      cy.request({
        method: "DELETE",
        url: `${API}/api/production-events/${eventId}/`,
        headers: auth(managerToken),
        failOnStatusCode: false,
      });
    }
  });

  it("member without CPF is asked for it before paying", () => {
    token(MEMBER).then((t: string) => {
      cy.request({ url: `${API}/api/auth/me/`, headers: auth(t) })
        .its("body.has_cpf")
        .should("eq", false);
    });
    cy.login(MEMBER, PASSWORD);
    cy.visit(`/app/eventos/${eventId}`);
    cy.contains("button", "Inscrever-se", { timeout: 15000 }).click();

    cy.contains("[role=dialog]", "Informe o CPF").within(() => {
      cy.get("#cpf-prompt").type("11144477700");
      cy.contains("CPF inválido").should("be.visible");
      cy.contains("button", "Continuar").should("be.disabled");
      cy.get("#cpf-prompt").clear().type("11144477735");
      cy.contains("button", "Continuar").should("be.enabled");
    });

    cy.intercept("POST", "**/api/payments/registrations/", {
      statusCode: 503,
      body: {
        detail: "Não foi possível gerar a cobrança agora. Tente novamente em alguns minutos.",
      },
    }).as("register");
    cy.contains("[role=dialog]", "Informe o CPF").contains("button", "Continuar").click();
    cy.wait("@register")
      .its("request.body")
      .should("deep.equal", { event_id: eventId, cpf: "11144477735" });
    cy.contains("Não foi possível gerar a cobrança").should("be.visible");
    cy.contains("[role=dialog]", "Informe o CPF").should("not.exist");
  });
});
