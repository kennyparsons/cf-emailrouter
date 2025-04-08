import * as API from "./routes/api.js";
import { handleEmail } from "./email/main.js";

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;

    // Visually define our expected routes using a switch on conditions
    switch (true) {
      // API route for listing all email configurations
      case path === "/api/email/list":
        return API.handleEmailList(request, env, ctx);

      // API route for handling a specific email configuration
      case /^\/api\/email\/([^\/]+)\/?$/.test(path): {
        const match = path.match(/^\/api\/email\/([^\/]+)\/?$/);
        const emailParam = decodeURIComponent(match[1]);
        return API.handleEmailConfig(request, env, ctx, emailParam);
      }

      // Default: no matching route, return 404
      default:
        return new Response("Not found", { status: 404 });
    }
  },

  async email(message, env, ctx) {
    return handleEmail(message, env, ctx);
  }
};