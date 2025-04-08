// Default configuration values for an email route.
export const DEFAULT_CONFIG = {
    name: "",
    created: new Date().toISOString(), // Default to current time (can be overridden)
    enabled: true,
    site_origin: "",
    forward_to: [],
    allow: {
      domains: [],
      emails: []
    },
    deny: {
      domains: [],
      emails: []
    },
    filtering: [],
    junk: false,
    mailing_list: false,
    logging: {
      log_sender_domain: true,
      log_subject: true,
      log_body: false
    },
  };
  
  // Apply defaults to a configuration object, ensuring that missing fields
  // are filled in with the default values.
  export function applyDefaults(config) {
    return {
      ...DEFAULT_CONFIG,
      ...config,
      allow: {
        domains: config.allow && Array.isArray(config.allow.domains) ? config.allow.domains : DEFAULT_CONFIG.allow.domains,
        emails: config.allow && Array.isArray(config.allow.emails) ? config.allow.emails : DEFAULT_CONFIG.allow.emails,
      },
      deny: {
        domains: config.deny && Array.isArray(config.deny.domains) ? config.deny.domains : DEFAULT_CONFIG.deny.domains,
        emails: config.deny && Array.isArray(config.deny.emails) ? config.deny.emails : DEFAULT_CONFIG.deny.emails,
      },
      filtering: Array.isArray(config.filtering) ? config.filtering : DEFAULT_CONFIG.filtering,
      logging: {
        log_sender_domain: config.logging && config.logging.log_sender_domain !== undefined ? config.logging.log_sender_domain : DEFAULT_CONFIG.logging.log_sender_domain,
        log_subject: config.logging && config.logging.log_subject !== undefined ? config.logging.log_subject : DEFAULT_CONFIG.logging.log_subject,
        log_body: config.logging && config.logging.log_body !== undefined ? config.logging.log_body : DEFAULT_CONFIG.logging.log_body,
      },
      site_origin: config.site_origin !== undefined ? config.site_origin : DEFAULT_CONFIG.site_origin,
      forward_to: Array.isArray(config.forward_to) ? config.forward_to : DEFAULT_CONFIG.forward_to,
    };
  }