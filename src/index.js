import { applyDefaults } from "./schema.js";

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const pathname = url.pathname;

    // Handle API routes under /api/email
    if (pathname.startsWith("/api/email")) {
      return handleApiRequest(request, env);
    }

    // Fallback: serve UI or return 404 if no matching route
    return new Response("Not found", { status: 404 });
  },

  async email(message, env, ctx) {
    await handleEmail(message, env, ctx);
  }
};

async function handleEmail(message, env, ctx) {
  // Retrieve configuration for the recipient email address from KV.
  const configStr = await env.EMAIL_KV.get(message.to);
  if (!configStr) {
    console.warn(`No configuration for recipient ${message.to}`);
    message.setReject("No route defined");
    return;
  }
  
  let config;
  try {
    config = JSON.parse(configStr);
    // Apply default values for any missing configuration fields
    config = applyDefaults(config);
  } catch (e) {
    console.error("Invalid JSON configuration:", e);
    message.setReject("Invalid routing config");
    return;
  }
  
  // Defensive check for new field 'site_origin'
  const siteOrigin = config.site_origin || "";
  if (siteOrigin) {
    // Ensure the 'allow' object exists and has a 'domains' array
    if (!config.allow) {
      config.allow = { domains: [], emails: [] };
    } else if (!config.allow.domains) {
      config.allow.domains = [];
    }
    // Add site_origin to allowed domains if not already present
    if (!config.allow.domains.includes(siteOrigin)) {
      console.log(`Adding site_origin '${siteOrigin}' to allowed domains for ${message.to}`);
      config.allow.domains.push(siteOrigin);
    }
  }
  
  // Check if the configuration is enabled.
  if (!config.enabled) {
    console.log(`Configuration for ${message.to} is disabled.`);
    message.setReject("Service disabled");
    return;
  }
  
  // Extract sender details.
  const sender = message.from;
  const senderDomain = sender.split("@")[1].toLowerCase();
  
  // Allow list: if defined, the sender must match an allowed domain or email.
  if (config.allow) {
    let allowed = false;
    if (config.allow.domains && config.allow.domains.includes(senderDomain)) {
      allowed = true;
    }
    if (config.allow.emails && config.allow.emails.includes(sender)) {
      allowed = true;
    }
    if (!allowed) {
      if (config.logging && config.logging.log_sender_domain) {
        console.warn(`Sender domain ${senderDomain} not allowed for ${message.to}`);
      }
      message.setReject("Sender not allowed");
      return;
    }
  }
  
  // Deny list: if defined, immediately reject if the sender is explicitly denied.
  if (config.deny) {
    if (
      (config.deny.domains && config.deny.domains.includes(senderDomain)) ||
      (config.deny.emails && config.deny.emails.includes(sender))
    ) {
      console.warn(`Sender ${sender} is explicitly denied for ${message.to}`);
      message.setReject("Sender denied");
      return;
    }
  }
  
  // Filtering: iterate through any filtering rules (e.g., reject if subject matches a pattern).
  if (config.filtering && Array.isArray(config.filtering)) {
    for (const rule of config.filtering) {
      const subject = message.subject || "";
      if (subject.toLowerCase().includes(rule.pattern.toLowerCase())) {
        if (rule.action === "reject") {
          console.warn(`Email subject matches filter rule "${rule.pattern}". Rejecting email.`);
          message.setReject("Filtered email");
          return;
        }
        // Additional filtering actions can be added here as needed.
      }
    }
  }
  
  // Forward the email to the destination(s) defined in the configuration.
  if (config.forward_to) {
    const forwardingAddresses = Array.isArray(config.forward_to)
      ? config.forward_to
      : [config.forward_to];
    
    for (const addr of forwardingAddresses) {
      await message.forward(addr);
    }
  } else {
    console.warn(`No forwarding address configured for ${message.to}`);
    message.setReject("No forwarding address configured");
  }
}

async function handleApiRequest(request, env) {
  // Ensure API requests are authorized via our central API_AUTH KV store
  if (!(await isAuthorized(request, env))) {
    console.log("Authorization failed");
    return new Response("Unauthorized", { status: 401 });
  }
  
  const url = new URL(request.url);
  const parts = url.pathname.split("/").filter(Boolean); // e.g., ["api", "email", "list"] or ["api", "email", "<email>"]
  
  // Validate that the URL follows our expected pattern: /api/email/...
  if (parts.length < 2 || parts[0] !== "api" || parts[1] !== "email") {
    return new Response("Bad request", { status: 400 });
  }
  
  // Route: /api/email/list
  if (parts[2] === "list") {
    if (request.method === "GET") {
      const list = await env.EMAIL_KV.list();
      const emails = await Promise.all(
        list.keys.map(async (entry) => {
          const val = await env.EMAIL_KV.get(entry.name);
          let config;
          try {
            config = JSON.parse(val);
            config = applyDefaults(config);
          } catch (e) {
            // In case the stored value isn't valid JSON, return it as-is.
            config = val;
          }
          return { email: entry.name, config };
        })
      );
      return new Response(JSON.stringify(emails), {
        headers: { "Content-Type": "application/json" }
      });
    } else {
      return new Response("Method Not Allowed", { status: 405 });
    }
  }
  
  // Route: /api/email/:email
  const emailKey = decodeURIComponent(parts[2]);
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
    default: {
      return new Response("Bad request", { status: 400 });
    }
  }
}

async function isAuthorized(request, env) {
  const auth = request.headers.get("Authorization") || "";
  console.log("Authorization header received:", auth);
  
  const expected = await env.API_AUTH.get(env.WORKER_NAME);
  // console.log("Expected API key from KV for worker", env.WORKER_NAME, ":", expected);
  
  if (!expected) {
    console.warn("No API key set for worker " + env.WORKER_NAME);
    return false;
  }
  
  const isValid = auth === `Bearer ${expected}`;
  // console.log("Authorization", isValid);
  return isValid;
}