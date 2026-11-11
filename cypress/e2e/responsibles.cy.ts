// Access hierarchy end to end: each level appoints the level below it.
// - manager (gestor) → chooses general responsibles of each area;
// - campus leader → appoints the campus's responsibles and ministry leaders;
// - ministry leader → cannot appoint anyone.
//
// Runs against the real backend + local DB seeded with `manage.py seed_initial_church`
// (church "Igreja Luz às Nações", campus "Arena ILAN"). Every test cleans up through
// the API, so it can run repeatedly.

const API_URL = "http://127.0.0.1:8000";
const SEED_PASSWORD = "TrocarSenha123!";

const MANAGER = "gestor@ilan.church";
const CAMPUS_LEADER = "lider.campus1@ilan.church";
const MINISTRY_LEADER = "lider.brave1@ilan.church";
// Person being appointed: belongs to Arena ILAN and leads nothing in these areas.
const TARGET_EMAIL = "lider.reconciliacao@ilan.church";
const TARGET_NAME = "Líder Reconciliação";

const CHURCH_NAME = "Igreja Luz às Nações";
const CAMPUS_NAME = "Arena ILAN";

interface Ids {
  token: string;
  churchId: string;
  campusId: string;
  braveId: string;
  targetId: string;
}

function apiToken(email: string) {
  return cy
    .request("POST", `${API_URL}/api/auth/login/`, { email, password: SEED_PASSWORD })
    .its("body.access");
}

// Resolves the seed's ids once per test through the API (as the manager).
function loadIds(): Cypress.Chainable<Ids> {
  return apiToken(MANAGER).then((token: string) => {
    const auth = { Authorization: `Bearer ${token}` };
    return cy.request({ url: `${API_URL}/api/churches/`, headers: auth }).then(({ body }) => {
      const church = body.results.find((c: { name: string }) => c.name === CHURCH_NAME);
      return cy
        .request({ url: `${API_URL}/api/ministries/?page_size=200`, headers: auth })
        .then(({ body: ministries }) => {
          const brave = ministries.results.find(
            (m: { name: string; campus: { name: string } }) =>
              m.name === "Brave" && m.campus.name === CAMPUS_NAME,
          );
          return cy
            .request({
              url: `${API_URL}/api/churches/${church.id}/people-search/?q=${TARGET_EMAIL}`,
              headers: auth,
            })
            .then(({ body: people }) => ({
              token,
              churchId: church.id,
              campusId: brave.campus.id,
              braveId: brave.id,
              targetId: people[0].id,
            }));
        });
    });
  });
}

// Removes the target from every role these tests hand out (404 = already clean).
function cleanUp(ids: Ids) {
  const headers = { Authorization: `Bearer ${ids.token}` };
  const paths = [
    `/api/churches/${ids.churchId}/courses-general-leaders/${ids.targetId}/`,
    `/api/ministry-general-leaderships/jovens/leaders/${ids.targetId}/`,
    `/api/campuses/${ids.campusId}/courses-leaderships/${ids.targetId}/`,
    `/api/campuses/${ids.campusId}/event-producers/${ids.targetId}/`,
    `/api/ministries/${ids.braveId}/leaderships/${ids.targetId}/`,
  ];
  paths.forEach((path) =>
    cy.request({ method: "DELETE", url: `${API_URL}${path}`, headers, failOnStatusCode: false }),
  );
}

// Radix Select renders options in a portal, so pick them from the document root.
function pickOption(trigger: string, option: string) {
  cy.get(`[aria-label="${trigger}"]`).click();
  cy.contains('[role="option"]', option).click();
  cy.get('[role="listbox"]').should("not.exist");
}

// Types in the card's person search and picks the first match.
function appoint(searchTerm: string, name: string) {
  cy.get('input[placeholder="Buscar por nome ou email"]').type(searchTerm);
  cy.contains("button", name).click();
}

describe("Responsáveis — access hierarchy", () => {
  let ids: Ids;

  beforeEach(() => {
    loadIds().then((loaded) => {
      ids = loaded;
      cleanUp(ids);
    });
  });

  afterEach(() => cleanUp(ids));

  // ─── Manager: general responsibles ────────────────────────────────

  describe("as the manager", () => {
    beforeEach(() => {
      cy.login(MANAGER, SEED_PASSWORD);
      cy.visit("/app/responsaveis");
      cy.contains("h1", "Responsáveis", { timeout: 15000 }).should("be.visible");
      pickOption("Igreja", CHURCH_NAME);
    });

    it("shows the Responsáveis entry in the sidebar", () => {
      cy.contains("a", "Responsáveis").should("have.attr", "href", "/app/responsaveis");
    });

    it("chooses and removes the general courses responsible", () => {
      cy.contains("section", "Responsáveis gerais").within(() => {
        cy.get('[data-testid="area-card-Cursos"]').within(() => {
          appoint(TARGET_EMAIL, TARGET_NAME);
          cy.contains(TARGET_NAME).should("be.visible");
          cy.get(`[aria-label="Remover ${TARGET_NAME}"]`).click();
          cy.contains(TARGET_NAME).should("not.exist");
        });
      });
    });

    it("chooses a general ministry leader per ministry kind", () => {
      pickOption("Ministério", "Jovens");
      cy.get('[data-testid="area-card-Líderes gerais de ministério"]').within(() => {
        appoint(TARGET_EMAIL, TARGET_NAME);
        cy.contains(TARGET_NAME).should("be.visible");
      });
      cy.contains("agora é líder geral de Jovens").should("be.visible");
    });
  });

  // ─── Campus leader: campus responsibles, read-only general section ──

  describe("as a campus leader", () => {
    beforeEach(() => {
      cy.login(CAMPUS_LEADER, SEED_PASSWORD);
      cy.visit("/app/responsaveis");
      cy.contains("h1", "Responsáveis", { timeout: 15000 }).should("be.visible");
    });

    it("sees the general responsibles but cannot change them", () => {
      cy.contains("Só os líderes da instituição escolhem os responsáveis gerais.").should(
        "be.visible",
      );
      cy.contains("section", "Responsáveis gerais").within(() => {
        cy.get('input[placeholder="Buscar por nome ou email"]').should("not.exist");
      });
    });

    it("appoints and removes the campus courses responsible", () => {
      cy.contains("section", "Responsáveis por campus").within(() => {
        cy.get('[aria-label="Campus"]').should("contain.text", CAMPUS_NAME);
        cy.get('[data-testid="area-card-Cursos"]').within(() => {
          appoint(TARGET_EMAIL, TARGET_NAME);
          cy.contains(TARGET_NAME).should("be.visible");
          cy.contains("Líder").should("be.visible"); // role badge
          cy.get(`[aria-label="Remover ${TARGET_NAME}"]`).click();
          cy.contains(TARGET_NAME).should("not.exist");
        });
      });
    });

    it("appoints a campus event producer", () => {
      cy.contains("section", "Responsáveis por campus").within(() => {
        cy.get('[data-testid="area-card-Produtores de eventos"]').within(() => {
          appoint(TARGET_EMAIL, TARGET_NAME);
          cy.contains(TARGET_NAME).should("be.visible");
        });
      });
      cy.contains("agora é produtor de eventos").should("be.visible");
    });

    it("appoints a co-leader of a ministry at their campus", () => {
      cy.visit(`/app/ministerios/adolescentes/${ids.campusId}`);
      cy.contains("button", "Gerenciar liderança", { timeout: 15000 }).click();
      cy.get('[role="dialog"]').within(() => {
        cy.get('[aria-label="Papel"]').click();
      });
      // The options render in a portal, outside the dialog's DOM subtree.
      cy.contains('[role="option"]', "Colíder").click();
      // Wait for the Select to close: while its listbox is open it keeps focus,
      // and typing in the search would go nowhere (flaky under load).
      cy.get('[role="listbox"]').should("not.exist");
      cy.get('[role="dialog"]').within(() => {
        appoint(TARGET_EMAIL, TARGET_NAME);
        cy.contains(TARGET_NAME).closest("div.rounded-md").should("contain.text", "Colíder");
      });
      // Closing the dialog, the leadership card on the page reflects the change.
      cy.get("body").type("{esc}");
      cy.contains("section", "Liderança").should("contain.text", TARGET_NAME);
    });
  });

  // ─── Ministry leader: same level can't appoint peers ─────────────────

  describe("as a ministry leader", () => {
    beforeEach(() => {
      cy.login(MINISTRY_LEADER, SEED_PASSWORD);
    });

    it("does not see Responsáveis in the sidebar", () => {
      cy.visit("/app/ministerios");
      cy.contains("Ministérios", { timeout: 15000 }).should("be.visible");
      cy.contains("a", "Responsáveis").should("not.exist");
    });

    it("is told they can't define responsibles when opening the page", () => {
      cy.visit("/app/responsaveis");
      cy.contains("Você não tem permissão para definir responsáveis.", { timeout: 15000 }).should(
        "be.visible",
      );
    });

    it("has no 'Gerenciar liderança' button on their own ministry", () => {
      cy.visit(`/app/ministerios/adolescentes/${ids.campusId}`);
      cy.contains("Liderança", { timeout: 15000 }).should("be.visible");
      cy.contains("button", "Gerenciar liderança").should("not.exist");
    });
  });
});
