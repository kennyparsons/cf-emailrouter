# Email Router

A Cloudflare Worker for dynamic email routing with on-the-fly alias creation.

## What is this?

Email Router is a Cloudflare Worker that lets you create and manage email aliases dynamically without having to update your worker code each time. Think of it like DuckDuckGo's email alias service, but with more powerful routing logic and customization options.

Under the hood, it's just a worker that accepts incoming emails from your Cloudflare zone. When configured with a catch-all rule in your zone, you can route any email address on your domain to this single worker, which then determines how to handle it based on configurations stored in KV.

## Core Features

- **Dynamic Email Aliases**: Create unlimited email aliases on your domain without modifying the worker code
- **Granular Sender Control**: Allow or block specific domains and email addresses
- **Smart Routing**: Forward emails to one or more recipients based on custom rules
- **API Management**: RESTful API for creating, updating, and managing aliases
- **Configuration in KV**: All alias settings stored in Cloudflare KV for easy management

## How It Works

1. An email comes in to `purple.taco.engineer@yourdomain.com`
2. The worker looks up the configuration for this alias from KV storage
3. It checks if the sender is allowed based on the configuration rules
4. If allowed, it forwards the email to the designated recipient(s)
5. If denied, it rejects the email with an appropriate message

## Sample Configuration

Each alias is defined by a KV entry where the key is the email alias and the value is a JSON configuration object:

```javascript
{
  "name": "Some Obscure Shopping Site",
  "created": "2025-04-08T12:00:00Z",
  "enabled": true,
  "site_origin": "totallylegitshopping.domain",
  "forward_to": ["user@example.com"],
  "allow": {
    "domains": ["totallylegitshopping.domain"],
    "emails": ["admin@totallylegitshopping.domain"]
  },
  "deny": {
    "domains": ["spam.com"],
    "emails": ["spam@spam.com"]
  },
  "filtering": [
    {
      "subjectContains": "Important",
      "action": "mark-important"
    }
  ],
  "junk": false,
  "mailing_list": true,
  "logging": {
    "log_sender_domain": true,
    "log_subject": false,
    "log_body": false
  }
}
```

Note: Currently, only the `enabled`, `forward_to`, `allow`, and `deny` fields are implemented. Other features will be added in future updates.

## API Endpoints

The worker exposes several API endpoints for managing configurations:

- **GET /api/email/{email}**: Retrieve configuration data for an alias
- **PUT /api/email/{email}**: Update configuration for an alias
- **DELETE /api/email/{email}**: Delete an alias configuration
- **GET /api/email/list**: List all configured aliases

All API endpoints are protected by an API key stored in a separate KV namespace.

## Setup

1. **[Install Wrangler](https://developers.cloudflare.com/workers/wrangler/install-and-update/)**

2. **Configuration:**
   - Ensure `wrangler.toml` is configured with the correct project details and KV namespaces. Use wrangler-example.toml as a reference.
   - This project requires 2 KV namespaces:
     - `EMAIL-KV`: For storing email routing configurations
     - `API-AUTH`: API key management for authentication

3. **Deploy:**
```sh
npx wrangler deploy
```

4. **Configure Email Routing in Cloudflare:**
   - Set up a catch-all rule in your Cloudflare zone to direct all emails to this worker

## Project Structure

- **src/index.js:** Main entry point handling HTTP routes and email events
- **src/schema.js:** Contains default configuration and helper utilities
- **src/auth.js:** API key management and authentication
- **src/routes/email.js:** Handles email routing logic
- **src/routes/api.js:** API endpoints for managing configurations
- **wrangler.toml:** Configuration for Cloudflare Worker and KV namespaces

## Future Plans

- Web UI with authentication/SSO for managing aliases and configurations
- Browser extension to detect the current website and create/retrieve aliases
- Advanced filtering options for incoming emails
- More comprehensive logging and analytics

## To Do

- [ ] Add comprehensive API documentation
- [ ] Implement filtering and logging features
- [ ] Switch if-else to case statements for better readability
- [ ] Add UI for configuration management
- [ ] Create browser extension for quick alias creation

## Contributing

PRs and suggestions are welcome! This project is in beta, so feedback is greatly appreciated.