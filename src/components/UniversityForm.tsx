import { useState, type FormEvent } from "react";
import { site } from "../config/site";

type State = "idle" | "submitting" | "success" | "error";

const OFFERS = [
  { id: "conversation", label: "A conversation" },
  { id: "scholarship", label: "A scholarship for the student" },
  { id: "certificate", label: "A certificate from the campus" },
  { id: "both", label: "Both" },
] as const;

export default function UniversityForm({ formId }: { formId?: string }) {
  const [state, setState] = useState<State>("idle");
  const [message, setMessage] = useState<string | null>(null);
  const endpoint = formId || site.formspree.signOn;

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const name = String(data.get("name") ?? "").trim();
    const email = String(data.get("email") ?? "").trim();
    const campus = String(data.get("campus") ?? "").trim();
    if (!name || !campus || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setState("error");
      setMessage("Name, campus, and a real email are required.");
      return;
    }
    setState("submitting");
    if (!endpoint) {
      setState("error");
      setMessage(`Email ${site.email} and name the campus.`);
      return;
    }
    try {
      const response = await fetch(`https://formspree.io/f/${endpoint}`, {
        method: "POST",
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify({
          ...Object.fromEntries(data.entries()),
          _subject: "SEAtrails — university",
        }),
      });
      if (!response.ok) throw new Error("form");
      setState("success");
      setMessage("We'll write back. Nothing is agreed until the campus says so in its own words.");
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
    <form className="grid gap-3" onSubmit={onSubmit} noValidate>
      <label className="flex flex-col gap-1 font-mono text-[11px] uppercase tracking-wider text-tide">
        Name
        <input name="name" className="w-full border border-contour bg-sheet px-3 py-2 font-body text-sm normal-case tracking-normal" />
      </label>
      <label className="flex flex-col gap-1 font-mono text-[11px] uppercase tracking-wider text-tide">
        Email
        <input
          name="email"
          type="email"
          className="w-full border border-contour bg-sheet px-3 py-2 font-body text-sm normal-case tracking-normal"
        />
      </label>
      <label className="flex flex-col gap-1 font-mono text-[11px] uppercase tracking-wider text-tide">
        Campus
        <input
          name="campus"
          className="w-full border border-contour bg-sheet px-3 py-2 font-body text-sm normal-case tracking-normal"
        />
      </label>
      <label className="flex flex-col gap-1 font-mono text-[11px] uppercase tracking-wider text-tide">
        Your role there
        <input
          name="campus_role"
          className="w-full border border-contour bg-sheet px-3 py-2 font-body text-sm normal-case tracking-normal"
        />
      </label>
      <label className="flex flex-col gap-1 font-mono text-[11px] uppercase tracking-wider text-tide">
        What you can talk about
        <select
          name="offer"
          defaultValue="conversation"
          className="min-h-11 w-full border border-contour bg-sheet px-3 py-2 font-body text-sm normal-case tracking-normal"
        >
          {OFFERS.map((item) => (
            <option key={item.id} value={item.id}>
              {item.label}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 font-mono text-[11px] uppercase tracking-wider text-tide">
        Note
        <textarea
          name="note"
          rows={4}
          className="w-full border border-contour bg-sheet px-3 py-2 font-body text-sm normal-case tracking-normal"
        />
      </label>
      <div>
        <button
          type="submit"
          disabled={state === "submitting"}
          className="bg-ink px-5 py-2.5 font-display text-sm font-semibold text-sheet disabled:opacity-60"
        >
          {state === "submitting" ? "Sending…" : "Write to the group"}
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
