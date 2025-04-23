import { applyDefaults } from "../schema.js";

// Global logging level: set to 4 (debug) to log everything.
// Logging level definitions:
// 0: No logging, 1: error, 2: info, 3: warn, 4: debug.
const currentLoggingLevel = 4;
const loggingLevels = {
    error: 1,
    info: 2,
    warn: 3,
    debug: 4,
};

function log(level, message, ...optionalParams) {
    if (loggingLevels[level] <= currentLoggingLevel && currentLoggingLevel > 0) {
        switch (level) {
            case 'debug':
                console.debug(message, ...optionalParams);
                break;
            case 'info':
                console.info(message, ...optionalParams);
                break;
            case 'warn':
                console.warn(message, ...optionalParams);
                break;
            case 'error':
                console.error(message, ...optionalParams);
                break;
            default:
                console.log(message, ...optionalParams);
        }
    }
}

export async function handleEmail(message, env, ctx) {
    // Log initial message details.
    log('debug', `Received email: from=${message.from}, to=${message.to}, subject=${message.subject}`);

    // Retrieve configuration for the recipient email address from KV.
    log('debug', `Fetching configuration for recipient: ${message.to}`);
    const configStr = await env.EMAIL_KV.get(message.to);
    if (!configStr) {
        log('warn', `No configuration found for recipient ${message.to}`);
        message.setReject("No route defined");
        return;
    }
    
    let config;
    try {
        config = JSON.parse(configStr);
        // Apply default values for any missing configuration fields
        config = applyDefaults(config);
        log('debug', `Configuration for ${message.to} after applying defaults:`, config);
    } catch (e) {
        log('error', "Invalid JSON configuration:", e);
        message.setReject("Invalid routing config");
        return;
    }
    
    // Check if the configuration is enabled.
    if (!config.enabled) {
        log('info', `Configuration for ${message.to} is disabled.`);
        message.setReject("Service disabled");
        return;
    }
    
    // Extract sender details.
    const sender = message.from;
    const senderDomain = sender.split("@")[1].toLowerCase();
    log('debug', `Parsed sender details: sender=${sender}, domain=${senderDomain}`);
    
    // Allow list: if defined, the sender must match an allowed domain or email.
    if (config.allow) {
        let allowed = false;

        // Check allowed domains.
        if (config.allow.domains) {
            for (const allowedDomain of config.allow.domains) {
                // If the allowed domain contains a wildcard.
                if (allowedDomain.includes('*')) {
                    // Convert wildcard to regex: escape non-wildcard parts then replace '*' with '.*'
                    const regexStr = '^' + allowedDomain.split('*')
                        .map(part => part.replace(/[-/\\^$+?.()|[\]{}]/g, '\\$&'))
                        .join('.*') + '$';
                    const regex = new RegExp(regexStr, 'i');
                    if (regex.test(senderDomain)) {
                        allowed = true;
                        log('debug', `Sender domain ${senderDomain} is allowed by wildcard ${allowedDomain}.`);
                        break;
                    }
                } else if (allowedDomain.toLowerCase() === senderDomain) {
                    allowed = true;
                    log('debug', `Sender domain ${senderDomain} is allowed.`);
                    break;
                }
            }
        }

        // Check allowed emails if not already allowed.
        if (!allowed && config.allow.emails && config.allow.emails.includes(sender)) {
            allowed = true;
            log('debug', `Sender email ${sender} is allowed.`);
        }

        if (!allowed) {
            log('warn', `Sender ${sender} is not allowed for ${message.to}`);
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
            log('warn', `Sender ${sender} is explicitly denied for ${message.to}`);
            message.setReject("Sender denied");
            return;
        }
    }
    
    // Filtering: iterate through any filtering rules.
    if (config.filtering && Array.isArray(config.filtering)) {
        for (const rule of config.filtering) {
            const subject = message.subject || "";
            if (subject.toLowerCase().includes(rule.pattern.toLowerCase())) {
                log('info', `Email subject matches filter rule "${rule.pattern}"`);
                if (rule.action === "reject") {
                    log('warn', `Filter action 'reject' triggered by pattern "${rule.pattern}". Rejecting email.`);
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
        
        log('debug', `Forwarding email for ${message.to} to: ${forwardingAddresses.join(", ")}`);
        for (const addr of forwardingAddresses) {
            await message.forward(addr);
            log('debug', `Email forwarded to ${addr}`);
        }
    } else {
        log('warn', `No forwarding address configured for ${message.to}`);
        message.setReject("No forwarding address configured");
    }
}