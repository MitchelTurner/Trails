import { useState, type FormEvent } from "react";
import { site } from "../config/site";

type State = "idle" | "submitting" | "success" | "error";

export default function VolunteerForm({ formId }: { formId?: string }) {
  const [state, setState] = useState<State>("idle");
  const [message, setMessage] = useState<string | null>(null);
  const endpoint = formId || site.formspree.signOn;

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const name = String(data.get("name") ?? "").trim();
    const email = String(data.get("email") ?? "").trim();
    if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setState("error");
      setMessage("Name and a real email are required.");
      return;
    }
    setState("submitting");
    if (!endpoint) {
      setState("error");
      setMessage(`Email ${site.email} to join a work party.`);
      return;
    }
    try {
      const response = await fetch(`https://formspree.io/f/${endpoint}`, {
        method: "POST",
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify({ ...Object.fromEntries(data.entries()), _subject: "Work party volunteer" }),
      });
      if (!response.ok) throw new Error("form");
      setState("success");
      setMessage("We'll write when the next work party is set.");
    } catch {
      setState("error");
      setMessage("That didn't send. Try again, or email us.");
    }
  }

  if (state === "success") {
    return (
      <p className="border border-ink/20 bg-ink/5 px-4 py-3 text-sm" role="status">
        {message}
      </p>
    );
  }

  return (
    <form className="grid gap-3 md:grid-cols-2" onSubmit={onSubmit} noValidate>
      <label className="flex flex-col gap-1 font-mono text-[11px] uppercase tracking-wider text-tide">
        Name
        <input name="name" className="border border-contour bg-sheet px-3 py-2 font-body text-sm" />
      </label>
      <label className="flex flex-col gap-1 font-mono text-[11px] uppercase tracking-wider text-tide">
        Email
        <input name="email" type="email" className="border border-contour bg-sheet px-3 py-2 font-body text-sm" />
      </label>
      <label className="md:col-span-2 flex flex-col gap-1 font-mono text-[11px] uppercase tracking-wider text-tide">
        Skills you can bring
        <input name="skills" className="border border-contour bg-sheet px-3 py-2 font-body text-sm" />
      </label>
      <div className="md:col-span-2">
        <button
          type="submit"
          disabled={state === "submitting"}
          className="bg-ink px-5 py-2.5 font-display text-sm font-semibold text-sheet disabled:opacity-60"
        >
          {state === "submitting" ? "Sending…" : "Join the work party"}
        </button>
        {message && state === "error" ? (
          <p className="mt-2 text-sm text-ink" role="alert">
            {message}
          </p>
        ) : null}
      </div>
    </form>
  );
}
