// Events + Payments flow: create event, configure ticket, register, cancel.
// Runs against the real backend seeded with `manage.py seed_initial_church`.

const API = "http://127.0.0.1:8000";
const PASSWORD = "TrocarSenha123!";

const MANAGER = "gestor@ilan.church";
const MEMBER = "lider.brave1@ilan.church";

function login(email: string) {
  return cy
    .request("POST", `${API}/api/auth/login/`, { email, password: PASSWORD })
    .its("body.access");
}

function authHeaders(token: string) {
  return { Authorization: `Bearer ${token}` };
}

describe("Events + Payments flow", () => {
  let managerToken: string;
  let eventId: string;
  let ticketConfigId: string;

  before(() => {
    login(MANAGER).then((token: string) => {
      managerToken = token;
    });
  });

  after(() => {
    if (ticketConfigId) {
      cy.request({
        method: "DELETE",
        url: `${API}/api/payments/ticket-configs/${ticketConfigId}/`,
        headers: authHeaders(managerToken),
        failOnStatusCode: false,
      });
    }
    if (eventId) {
      cy.request({
        method: "DELETE",
        url: `${API}/api/production-events/${eventId}/`,
        headers: authHeaders(managerToken),
        failOnStatusCode: false,
      });
    }
  });

  it("manager creates an event", () => {
    const startsAt = new Date(Date.now() + 7 * 86400000).toISOString();
    cy.request({
      method: "POST",
      url: `${API}/api/production-events/`,
      headers: authHeaders(managerToken),
      body: {
        title: "Cypress Conference Test",
        event_type: "conference",
        starts_at: startsAt,
      },
    }).then((res) => {
      expect(res.status).to.eq(201);
      expect(res.body.title).to.eq("Cypress Conference Test");
      expect(res.body.event_type).to.eq("conference");
      eventId = res.body.id;
    });
  });

  it("manager configures a ticket (free with capacity)", () => {
    cy.request({
      method: "POST",
      url: `${API}/api/payments/ticket-configs/`,
      headers: authHeaders(managerToken),
      body: {
        event_id: eventId,
        price_cents: 0,
        max_capacity: 50,
        description: "Free entry — limited spots",
      },
    }).then((res) => {
      expect(res.status).to.eq(201);
      expect(res.body.price_cents).to.eq(0);
      expect(res.body.max_capacity).to.eq(50);
      ticketConfigId = res.body.id;
    });
  });

  it("manager can update the ticket config", () => {
    cy.request({
      method: "PATCH",
      url: `${API}/api/payments/ticket-configs/${ticketConfigId}/`,
      headers: authHeaders(managerToken),
      body: { max_capacity: 100 },
    }).then((res) => {
      expect(res.status).to.eq(200);
      expect(res.body.max_capacity).to.eq(100);
    });
  });

  it("member registers for the event (free → auto-confirmed)", () => {
    login(MEMBER).then((token: string) => {
      cy.request({
        method: "POST",
        url: `${API}/api/payments/registrations/`,
        headers: authHeaders(token),
        body: { event_id: eventId },
      }).then((res) => {
        expect(res.status).to.eq(201);
        expect(res.body.payment_status).to.eq("confirmed");
      });
    });
  });

  it("member cannot register twice", () => {
    login(MEMBER).then((token: string) => {
      cy.request({
        method: "POST",
        url: `${API}/api/payments/registrations/`,
        headers: authHeaders(token),
        body: { event_id: eventId },
        failOnStatusCode: false,
      }).then((res) => {
        expect(res.status).to.eq(400);
      });
    });
  });

  it("registration stats reflect the registration", () => {
    cy.request({
      method: "GET",
      url: `${API}/api/payments/registrations/stats/?event=${eventId}`,
      headers: authHeaders(managerToken),
    }).then((res) => {
      expect(res.status).to.eq(200);
      expect(res.body.total).to.be.gte(1);
      expect(res.body.confirmed).to.be.gte(1);
      expect(res.body.capacity).to.eq(100);
    });
  });

  it("member cancels their registration", () => {
    login(MEMBER).then((token: string) => {
      cy.request({
        method: "GET",
        url: `${API}/api/payments/registrations/?event=${eventId}`,
        headers: authHeaders(token),
      }).then((listRes) => {
        const regId = listRes.body.results[0].id;
        cy.request({
          method: "POST",
          url: `${API}/api/payments/registrations/${regId}/cancel/`,
          headers: authHeaders(token),
        }).then((cancelRes) => {
          expect(cancelRes.status).to.eq(200);
          expect(cancelRes.body.payment_status).to.eq("cancelled");
        });
      });
    });
  });
});

describe("Delegation flow (event → production ministry)", () => {
  let managerToken: string;
  let eventId: string;

  before(() => {
    login(MANAGER).then((token: string) => {
      managerToken = token;
      const startsAt = new Date(Date.now() + 14 * 86400000).toISOString();
      cy.request({
        method: "POST",
        url: `${API}/api/production-events/`,
        headers: authHeaders(token),
        body: {
          title: "Cypress Delegation Test",
          event_type: "culto",
          starts_at: startsAt,
        },
      }).then((res) => {
        eventId = res.body.id;
      });
    });
  });

  after(() => {
    if (eventId) {
      cy.request({
        method: "DELETE",
        url: `${API}/api/production-events/${eventId}/`,
        headers: authHeaders(managerToken),
        failOnStatusCode: false,
      });
    }
  });

  it("creates a demand from event (null from_ministry_kind)", () => {
    cy.request({
      method: "POST",
      url: `${API}/api/production-demands/`,
      headers: authHeaders(managerToken),
      body: {
        from_ministry_kind: null,
        to_ministry_kind: "media",
        event_id: eventId,
        demand_type: "slide",
        priority: "normal",
        description: "Prepare slides for Cypress test event",
      },
    }).then((res) => {
      expect(res.status).to.eq(201);
      expect(res.body.from_ministry_kind).to.be.null;
      expect(res.body.to_ministry_kind).to.eq("media");
    });
  });

  it("lists demands for the event", () => {
    cy.request({
      method: "GET",
      url: `${API}/api/production-demands/?event=${eventId}`,
      headers: authHeaders(managerToken),
    }).then((res) => {
      expect(res.status).to.eq(200);
      const demands = res.body.results ?? res.body;
      expect(demands.length).to.be.gte(1);
      const d = demands.find((d: { from_ministry_kind: string | null }) => d.from_ministry_kind === null);
      expect(d).to.exist;
      expect(d.to_ministry_kind).to.eq("media");
    });
  });
});
