interface Props {
  current: "en" | "ml";
}

const COOKIE_NAME = "kmc_lang";

function setLangCookie(value: "en" | "ml") {
  document.cookie = `${COOKIE_NAME}=${value}; path=/; max-age=${
    60 * 60 * 24 * 365
  }; SameSite=Lax`;
}

export default function LangToggle({ current }: Props) {
  function set(next: "en" | "ml") {
    if (next === current) return;
    setLangCookie(next);
    globalThis.location.reload();
  }

  return (
    <div
      role="group"
      aria-label="Language"
      class="join border border-base-300 rounded-lg overflow-hidden"
    >
      <button
        type="button"
        class={`join-item btn btn-sm btn-ghost ${
          current === "en" ? "btn-active bg-base-200" : ""
        }`}
        aria-pressed={current === "en"}
        onClick={() => set("en")}
      >
        EN
      </button>
      <button
        type="button"
        class={`join-item btn btn-sm btn-ghost ml ${
          current === "ml" ? "btn-active bg-base-200" : ""
        }`}
        aria-pressed={current === "ml"}
        onClick={() => set("ml")}
      >
        മല
      </button>
    </div>
  );
}
