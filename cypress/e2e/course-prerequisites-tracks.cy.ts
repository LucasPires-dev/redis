// Prerequisites and tracks: the general coordination says a course requires
// another and builds a track with both; a member sees the class blocked and
// their progress in the track; the local coordination may enroll someone
// anyway after a warning.
//
// Runs against the real backend seeded with `manage.py seed_initial_church`.
// Creates its own courses, class and track, and removes them at the end.

const API = "http://127.0.0.1:8000";
const PASSWORD = "TrocarSenha123!";
const MANAGER = "gestor@ilan.church";
const COORDINATOR = "cursos.arena@ilan.church";
const MEMBER = "membro@ilan.church";

const STAMP = Date.now();
const BASE = `Cypress Base ${STAMP}`;
const ADVANCED = `Cypress Avançado ${STAMP}`;
const CLASS = `Turma Avançado ${STAMP}`;
const TRACK = `Trilha Cypress ${STAMP}`;

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

describe("Course prerequisites and tracks", () => {
  let managerToken: string;
  let memberName: string;
  const courseIds: string[] = [];
  let advancedId: string;
  let classId: string;

  before(() => {
    token(MEMBER).then((t: string) => me(t).then((p) => (memberName = p.name)));
    token(MANAGER).then((mt: string) => {
      managerToken = mt;
      token(COORDINATOR).then((ct: string) =>
        me(ct).then((coordinator) => {
          cy.request({
            method: "POST",
            url: `${API}/api/courses/`,
            headers: auth(mt),
            body: { name: BASE },
          }).then(({ body }) => courseIds.push(body.id));
          cy.request({
            method: "POST",
            url: `${API}/api/courses/`,
            headers: auth(mt),
            body: { name: ADVANCED, campus_id: coordinator.campus.id },
          })
            .then(({ body }) => {
              advancedId = body.id;
              courseIds.push(body.id);
              return cy.request({
                method: "POST",
                url: `${API}/api/course-classes/`,
                headers: auth(mt),
                body: {
                  course_id: advancedId,
                  campus_id: coordinator.campus.id,
                  name: CLASS,
                  start_date: day(7),
                  end_date: day(60),
                  self_enrollment: true,
                },
              });
            })
            .then(({ body }) => (classId = body.id));
        }),
      );
    });
  });

  after(() => {
    if (!managerToken) return;
    cy.request({ url: `${API}/api/course-tracks/`, headers: auth(managerToken) }).then(
      ({ body }) => {
        const rows = (body.results ?? body) as { id: string; name: string }[];
        rows
          .filter((t) => t.name === TRACK)
          .forEach((t) =>
            cy.request({
              method: "DELETE",
              url: `${API}/api/course-tracks/${t.id}/`,
              headers: auth(managerToken),
              failOnStatusCode: false,
            }),
          );
      },
    );
    cy.wrap(null).then(() =>
      courseIds.forEach((id) =>
        cy.request({
          method: "DELETE",
          url: `${API}/api/courses/${id}/`,
          headers: auth(managerToken),
          failOnStatusCode: false,
        }),
      ),
    );
  });

  it("general coordination sets the prerequisite and builds a track", () => {
    cy.login(MANAGER, PASSWORD);
    cy.visit(`/app/cursos/${advancedId}`);
    cy.contains("h2", "Pré-requisitos", { timeout: 15000 })
      .parent()
      .contains("button", "Editar")
      .click();
    cy.get("[role=dialog]").within(() => {
      cy.get(`[aria-label='${BASE}']`).click();
      cy.contains("button", "Salvar").click();
    });
    cy.get("[data-testid=course-prerequisites]").should("contain", BASE);

    cy.visit("/app/cursos/gestao");
    cy.contains("button", "Nova trilha", { timeout: 15000 }).click();
    cy.get("[role=dialog]").within(() => {
      cy.get("#track-name").type(TRACK);
      cy.get("[aria-label='Adicionar curso']").click();
    });
    cy.contains("[role=option]", ADVANCED).click();
    cy.get("[role=dialog] [aria-label='Adicionar curso']").click();
    cy.contains("[role=option]", BASE).click();
    // Base comes first: move it up.
    cy.get(`[role=dialog] [aria-label='Subir ${BASE}']`).click();
    cy.get("[data-testid=track-form-step]").first().should("contain", BASE);
    cy.get("[role=dialog]").contains("button", "Salvar").click();

    cy.contains("[data-testid=managed-track]", TRACK)
      .invoke("text")
      .should("match", new RegExp(`${BASE}→${ADVANCED}`));
  });

  it("a member sees the class blocked and where they stand in the track", () => {
    cy.login(MEMBER, PASSWORD);
    cy.visit("/app/cursos");
    cy.contains("[data-testid=open-class]", CLASS, { timeout: 15000 }).within(() => {
      cy.get("[data-testid=open-class-prerequisites]").should("contain", `Conclua antes: ${BASE}`);
      cy.contains("button", "Pré-requisito pendente").should("be.disabled");
    });

    tab("Minhas matrículas").click();
    cy.contains("[data-testid=my-track]", TRACK, { timeout: 15000 })
      .should("contain", "0 de 2")
      .and("contain", `Próximo passo: ${BASE}`)
      .find("[data-testid=track-step]")
      .should("have.length", 2)
      .first()
      .should("contain", BASE)
      .and("contain", "Não iniciado");
  });

  it("local coordination is warned and may enroll anyway", () => {
    cy.login(COORDINATOR, PASSWORD);
    cy.visit(`/app/cursos/${advancedId}/turma/${classId}`);
    cy.contains("[role=tab]", "Alunos", { timeout: 15000 }).click();
    cy.contains("button", "Inscrever aluno").click();
    cy.get("[role=dialog]").within(() => {
      cy.get("input[placeholder*='Buscar']").type(memberName.slice(0, 6));
      cy.contains("button", memberName, { timeout: 10000 }).click();
      cy.contains("button", /^Inscrever$/).click();
      cy.get("[data-testid=missing-prerequisites]").should("contain", BASE);
      cy.contains("button", "Inscrever mesmo assim").click();
    });
    cy.contains(`${memberName} inscrito na turma`);
    cy.get("[role=dialog]").should("not.exist");

    // In the track, the member is now taking the second step.
    token(MEMBER).then((t: string) =>
      cy.request({ url: `${API}/api/course-tracks/`, headers: auth(t) }).then(({ body }) => {
        const rows = (body.results ?? body) as {
          name: string;
          my_progress: { steps: { state: string }[] };
        }[];
        const track = rows.find((r) => r.name === TRACK)!;
        expect(track.my_progress.steps.map((s) => s.state)).to.deep.equal([
          "not_started",
          "in_progress",
        ]);
      }),
    );
  });
});
