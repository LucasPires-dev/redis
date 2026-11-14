// Sign-up and campus linking: anyone creates an account, then either asks a
// campus to take them in (a campus leader approves) or uses the campus invite
// link (joins at once, as a member). Also covers a repeated e-mail and an
// invalid invite.
//
// Runs on a phone-sized viewport against the real backend seeded with
// `manage.py seed_initial_church`. Creates its own accounts and deletes them at
// the end; if the campus had no invite before, the one it creates is disabled.
//
// Each run makes 3 sign-up calls: the API allows 10 per hour per network
// (throttle scope "register"), so restart the API to run it more than 3 times
// in an hour.

const API = "http://127.0.0.1:8000";
const SEED_PASSWORD = "TrocarSenha123!";
const MANAGER = "gestor@ilan.church";
const CAMPUS_LEADER = "lider.campus1@ilan.church";

const STAMP = Date.now();
const PASSWORD = "Cypress!Vinculo1";
const REQUESTER = {
  name: `Cypress Pedido ${STAMP}`,
  email: `cypress.pedido.${STAMP}@example.com`,
};
const INVITED = {
  name: `Cypress Convite ${STAMP}`,
  email: `cypress.convite.${STAMP}@example.com`,
};

const auth = (t: string) => ({ Authorization: `Bearer ${t}` });
const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function token(email: string, password = SEED_PASSWORD) {
  return cy.request("POST", `${API}/api/auth/login/`, { email, password }).its("body.access");
}

function me(t: string) {
  return cy.request({ url: `${API}/api/auth/me/`, headers: auth(t) }).its("body");
}

function signUp(person: { name: string; email: string }) {
  // /cadastro is rendered on the server: typing before React hydrates the form
  // is lost. Hydrated elements carry React's internal fiber key.
  cy.get("#name").should(($el) =>
    expect(Object.keys($el[0]).some((k) => k.startsWith("__reactFiber"))).to.eq(true),
  );
  cy.get("#name").type(person.name);
  cy.get("#email").type(person.email);
  cy.get("#password").type(PASSWORD, { log: false });
  cy.contains("button", "Criar conta").click();
}

describe("Sign-up and campus linking", () => {
  let managerToken: string;
  let leaderToken: string;
  let campus: { id: string; name: string };
  let hadInvite = false;

  before(() => {
    token(MANAGER).then((t: string) => (managerToken = t));
    token(CAMPUS_LEADER).then((t: string) => {
      leaderToken = t;
      me(t).then((leader) => {
        campus = leader.led_campuses[0];
        cy.request({ url: `${API}/api/campuses/${campus.id}/invite/`, headers: auth(t) }).then(
          ({ body }) => (hadInvite = !!body.code),
        );
      });
    });
  });

  beforeEach(() => {
    cy.viewport(375, 812);
  });

  after(() => {
    // Accounts created by the spec: found by logging in as them, so a run that
    // failed halfway is cleaned too.
    [REQUESTER.email, INVITED.email].forEach((email) =>
      cy
        .request({
          method: "POST",
          url: `${API}/api/auth/login/`,
          body: { email, password: PASSWORD },
          failOnStatusCode: false,
        })
        .then(({ status, body }) => {
          if (status !== 200) return;
          me(body.access).then((person) =>
            cy.request({
              method: "DELETE",
              url: `${API}/api/people/${person.id}/`,
              headers: auth(managerToken),
            }),
          );
        }),
    );
    if (!hadInvite && campus) {
      cy.request({
        method: "DELETE",
        url: `${API}/api/campuses/${campus.id}/invite/`,
        headers: auth(leaderToken),
        failOnStatusCode: false,
      });
    }
  });

  it("signs up, asks to join a campus and gets in after the leader approves", () => {
    cy.visit("/cadastro");
    cy.contains("Depois você escolhe o seu campus.");
    signUp(REQUESTER);

    // No campus yet: the app is replaced by the campus picker.
    cy.location("pathname", { timeout: 15000 }).should("eq", "/app");
    cy.contains("h2", "Escolha seu campus");
    cy.contains("li button .font-medium", new RegExp(`^${escapeRegex(campus.name)}$`)).click();
    cy.contains("[role=alertdialog]", `Pedir para entrar em ${campus.name}?`)
      .contains("button", "Enviar pedido")
      .click();
    cy.contains("Pedido enviado");
    cy.contains(`A liderança do campus ${campus.name} vai confirmar sua entrada.`);

    // The campus leader sees the warning in the top bar and approves.
    cy.login(CAMPUS_LEADER, SEED_PASSWORD);
    cy.visit("/app");
    cy.get("a[aria-label$='de vínculo aguardando resposta']", { timeout: 15000 }).click();
    cy.location("pathname").should("eq", `/app/campus/${campus.id}`);
    cy.get("#pedidos")
      .contains("div", new RegExp(`^${escapeRegex(REQUESTER.email)}$`))
      .parent() // name, e-mail and date
      .parent() // the request card's content, with its buttons
      .contains("button", "Aprovar")
      .click();
    cy.contains(`${REQUESTER.name} agora é do campus`);
    cy.get("#pedidos").should("not.contain", REQUESTER.email);

    // Back as the new member: the app opens on the campus.
    cy.login(REQUESTER.email, PASSWORD);
    cy.visit("/app");
    cy.get("main", { timeout: 15000 }).should("exist");
    cy.contains("Escolha seu campus").should("not.exist");
    token(REQUESTER.email, PASSWORD).then((t: string) =>
      me(t).then((person) => {
        expect(person.campus.id).to.eq(campus.id);
        expect(person.is_manager).to.eq(false);
        expect(person.led_campuses).to.have.length(0);
      }),
    );
  });

  it("joins the campus at once through the invite link", () => {
    // The leader creates the invite on the campus page (or finds the current one).
    cy.login(CAMPUS_LEADER, SEED_PASSWORD);
    cy.visit(`/app/campus/${campus.id}`);
    cy.contains("Convite do campus", { timeout: 15000 });
    if (!hadInvite) {
      cy.contains("button", "Criar convite").click();
      cy.contains("Convite criado");
    }
    cy.get("[aria-label='Ampliar QR code do convite'] svg").should("be.visible");
    cy.contains("div", /^Código$/)
      .next()
      .invoke("text")
      .then((raw) => {
        const code = raw.trim();
        expect(code).to.match(/^[A-HJ-NP-Z2-9]{8}$/);

        // Someone without an account opens the link.
        cy.clearLocalStorage();
        cy.visit(`/convite/${code}`);
        cy.contains("Você foi convidado para");
        cy.contains("h1", campus.name);
        cy.contains("a", "Criar minha conta").click();
        cy.location("search").should("contain", `convite=${code}`);
        cy.contains("Convite para").parent().should("contain", campus.name);
        signUp(INVITED);

        // Straight into the app, already on the campus.
        cy.location("pathname", { timeout: 15000 }).should("eq", "/app");
        cy.get("main").should("exist");
        cy.contains("Escolha seu campus").should("not.exist");
        token(INVITED.email, PASSWORD).then((t: string) =>
          me(t).then((person) => {
            expect(person.campus.id).to.eq(campus.id);
            expect(person.is_manager).to.eq(false);
          }),
        );

        // Opening the link again just says they are already there.
        cy.visit(`/convite/${code}`);
        cy.contains("Você já faz parte deste campus.");
      });
  });

  it("refuses a repeated e-mail and shows an invalid invite", () => {
    cy.clearLocalStorage();
    cy.visit("/cadastro");
    // A seeded account's e-mail, in another case: still the same e-mail.
    signUp({ name: "Cypress Repetido", email: MANAGER.toUpperCase() });
    cy.contains("Já existe uma conta com este e-mail.");
    cy.location("pathname").should("eq", "/cadastro");

    cy.visit("/convite/ZZZZZZZZ");
    cy.contains("h1", "Convite inválido");
    cy.contains("a", "Criar conta").should("have.attr", "href", "/cadastro");
  });
});
