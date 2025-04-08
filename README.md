# Email Router

A Cloudflare Worker for routing emails based on dynamic configurations stored in KV.

## Features

- **Email Routing:** Processes incoming emails and forwards them based on configuration.
- **Configuration Management:** Manage email routing settings via API endpoints.
- **API Endpoints:**
  - **GET /api/email/{email}**: Retrieve configuration data.
  - **PUT /api/email/{email}**: Update configuration.
  - **DELETE /api/email/{email}**: Delete configuration.
  - **GET /api/email/list**: List all configurations.
- **Filtering & Logging:** Supports filtering on email subjects and detailed logging for debugging.

## Setup

1. **[Install Wrangler](https://developers.cloudflare.com/workers/wrangler/install-and-update/)**

2. **Configuration:**
   - Ensure `wrangler.toml` is configured with the correct project details and KV namespaces. Use wrangler-example.toml as a reference.
   - This project requires 2 KV namespaces. The wrangler-example.toml has the bindings, which are:
     - `EMAIL-KV`: For storing email routing configurations.
     - `API-AUTH`: API key management for authentication. 
       - This KV is a personal decision, where all workers requiring auth have a KV of wokername:APIKEY
       - As such, this is a single user worker, as it assumes 1 key per worker.

3. **Deploy:**
```sh
npx wrangler deploy
```

## Project Structure

- **src/index.js:** Main entry point handling HTTP routes and email events.
- **src/schema.js:** Contains default configuration and helper utilities.
- **wrangler.toml:** Configuration for Cloudflare Worker and KV namespaces.

## Sample Configuration Using Schema

Below is an example configuration object that follows the schema defined in `src/schema.js`.

```javascript
// Sample configuration using the schema from src/schema.js

const sampleConfig = {
  name: "Example Email Route",
  created: "2025-04-08T12:00:00Z", // ISO timestamp format
  enabled: true,
  site_origin: "https://example.com",
  forward_to: ["user@example.com"],
  allow: {
    domains: ["example.com"],
    emails: ["admin@example.com"]
  },
  deny: {
    domains: ["spam.com"],
    emails: ["spam@spam.com"]
  },
  filtering: [
    {
      subjectContains: "Important",
      action: "mark-important"
    }
  ],
  junk: false,
  mailing_list: true,
  logging: {
    log_sender_domain: true,
    log_subject: false,
    log_body: false
  }
};

export default sampleConfig;
```

Note: At this time, the only features of the schema in use are:
- `enabled`
- `forward_to`
- `allow`
- `deny`

The other features will be implemented later. 

## API Docs
TBD

## To Do
- [ ] Add API documentation.
- [ ] Implement filtering and logging features.
- [ ] Switch if else to case statements for better readability.
- [ ] Add UI for configuration management.