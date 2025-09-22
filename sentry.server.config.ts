import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: "https://af8c3a17c501934a4b8f910fa6fc9922@o4510061874249728.ingest.us.sentry.io/4510061881458688",
  
  // Adjust this value in production, or use tracesSampler for greater control
  tracesSampleRate: 1,
  
  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: false,
  
  // Enable logging
  _experiments: {
    enableLogs: true,
  },
});
