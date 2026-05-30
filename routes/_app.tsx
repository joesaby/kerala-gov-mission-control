import { define } from "../utils.ts";

export default define.page(function App({ Component, state }) {
  const lang = state.lang ?? "en";
  return (
    <html lang={lang} data-theme="kerala">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Kerala Mission Control</title>
        <meta
          name="description"
          content="Real-time view of Kerala's promises, money, services and outcomes."
        />
        <meta name="theme-color" content="#0f7a52" />
        <link
          rel="preconnect"
          href="https://fonts.googleapis.com"
          crossorigin="anonymous"
        />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossorigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Baloo+2:wght@600;700&family=Baloo+Chettan+2:wght@600;700&family=Inter:wght@400;500;600;700&family=Noto+Sans+Malayalam:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
        <link rel="stylesheet" href="/styles.css" />
      </head>
      <body class="min-h-screen bg-base-200 text-base-content antialiased">
        <Component />
      </body>
    </html>
  );
});
