// Loaded before every spec file.

const API_URL = "http://127.0.0.1:8000";
const TOKEN_KEY = "redis-auth-v1";

declare global {
  namespace Cypress {
    interface Chainable {
      /** Authenticate via the backend JWT endpoint and store tokens in localStorage. */
      login(email?: string, password?: string): Chainable<void>;
    }
  }
}

Cypress.Commands.add(
  "login",
  (email = "lcpires7.dev@gmail.com", password = "test1234") => {
    cy.request({
      method: "POST",
      url: `${API_URL}/api/auth/login/`,
      body: { email, password },
    }).then(({ body }) => {
      window.localStorage.setItem(TOKEN_KEY, JSON.stringify(body));
    });
  },
);

export {};
