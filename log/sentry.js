const Sentry = require('@sentry/node');

module.exports = {
    init: () => {
        Sentry.init({
            dsn: process.env.SENTRY_DSN,
            tracesSampleRate: 1.0,
            environment: process.env.NODE_ENV,
        });
    },
};
