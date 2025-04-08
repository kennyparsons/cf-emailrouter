import { applyDefaults } from "../schema.js";
import { isAuthorized } from "../auth.js";

export async function handleEmailList(request, env, ctx) {
  if (!(await isAuthorized(request, env))) {
    return new Response("Unauthorized", { status: 401 });
  }
  
  switch (request.method) {
    case "GET": {
      const list = await env.EMAIL_KV.list();
      const emails = await Promise.all(
        list.keys.map(async (entry) => {
          const val = await env.EMAIL_KV.get(entry.name);
          let config;
          try {
            config = JSON.parse(val);
            config = applyDefaults(config);
          } catch (e) {
            config = val;
          }
          return { email: entry.name, config };
        })
      );
      return new Response(JSON.stringify(emails), {
        headers: { "Content-Type": "application/json" }
      });
    }
    default:
      return new Response("Method Not Allowed", { status: 405 });
  }
}

export async function handleEmailConfig(request, env, ctx, emailKey) {
  if (!(await isAuthorized(request, env))) {
    return new Response("Unauthorized", { status: 401 });
  }
  switch (request.method) {
    case "GET": {
      const val = await env.EMAIL_KV.get(emailKey);
      if (val) {
        let config;
        try {
          config = JSON.parse(val);
          config = applyDefaults(config);
        } catch (e) {
          config = val;
        }
        return new Response(JSON.stringify(config), {
          headers: { "Content-Type": "application/json" }
        });
      } else {
        return new Response("Not found", { status: 404 });
      }
    }
    case "PUT": {
      try {
        const body = await request.json();
        await env.EMAIL_KV.put(emailKey, JSON.stringify(body));
        return new Response("Saved", { status: 200 });
      } catch (error) {
        return new Response("Invalid JSON", { status: 400 });
      }
    }
    case "DELETE": {
      await env.EMAIL_KV.delete(emailKey);
      return new Response("Deleted", { status: 200 });
    }
    default:
      return new Response("Method Not Allowed", { status: 405 });
  }
}
