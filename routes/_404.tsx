import { define } from "../utils.ts";
import { Header } from "../components/Header.tsx";
import { Footer } from "../components/Footer.tsx";

export default define.page(function NotFound({ state }) {
  return (
    <>
      <Header lang={state.lang} />
      <main class="max-w-3xl mx-auto px-4 py-20 text-center">
        <p class="text-sm uppercase tracking-wider text-base-content/60">404</p>
        <h1 class="text-3xl font-bold mt-2">Not built yet</h1>
        <p class="mt-3 text-base-content/70">
          This dashboard is on the roadmap. Head back to{" "}
          <a href="/" class="link link-primary">Kerala Today</a>{" "}
          for what's live now.
        </p>
      </main>
      <Footer lang={state.lang} />
    </>
  );
});
