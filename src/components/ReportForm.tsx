import { useState, type FormEvent } from "react";
import { site } from "../config/site";

type State = "idle" | "submitting" | "success" | "error";

interface ReportFormProps {
  formId?: string;
}

export default function ReportForm({ formId }: ReportFormProps) {
  const [state, setState] = useState<State>("idle");
  const [message, setMessage] = useState<string | null>(null);
  const endpoint = formId || site.formspree.report;

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const trail = String(data.get("trail") ?? "").trim();
    const issue = String(data.get("issue") ?? "").trim();
    const email = String(data.get("email") ?? "").trim();
    if (!trail) {
      setState("error");
      setMessage("Name the trail or the stretch of it.");
      return;
    }
    if (issue.length < 12) {
      setState("error");
      setMessage("Describe the issue in a sentence or two.");
      return;
    }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setState("error");
      setMessage("That email doesn't look usable. Leave it blank if you prefer.");
      return;
    }

    setState("submitting");
    setMessage(null);

    if (!endpoint) {
      setState("error");
      setMessage(`The report form is not connected yet. Email ${site.email} instead.`);
      return;
    }

    try {
      const response = await fetch(`https://formspree.io/f/${endpoint}`, {
        method: "POST",
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify(Object.fromEntries(data.entries())),
      });
      if (!response.ok) throw new Error("form");
      setState("success");
      setMessage("Issue received. In Phase 1 this is a mailbox, not a live work queue.");
    } catch {
      setState("error");
      setMessage("The report didn't send. Check your connection and try again.");
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
    <form className="grid gap-4" onSubmit={onSubmit} noValidate>
      <label className="flex flex-col gap-1 font-mono text-[11px] uppercase tracking-wider text-tide">
        Trail or location
        <input name="trail" className="border border-contour bg-sheet px-3 py-2 font-body text-sm" />
      </label>
      <label className="flex flex-col gap-1 font-mono text-[11px] uppercase tracking-wider text-tide">
        What you found
        <textarea name="issue" rows={5} className="border border-contour bg-sheet px-3 py-2 font-body text-sm" />
      </label>
      <label className="flex flex-col gap-1 font-mono text-[11px] uppercase tracking-wider text-tide">
        Email (optional)
        <input name="email" type="email" className="border border-contour bg-sheet px-3 py-2 font-body text-sm" />
      </label>
      <div className="flex flex-wrap items-center gap-4">
        <button
          type="submit"
          disabled={state === "submitting"}
          className="bg-ink px-5 py-2.5 font-display text-sm font-semibold text-sheet disabled:opacity-60"
        >
          {state === "submitting" ? "Sending…" : "Report an issue"}
        </button>
        {message && state === "error" ? (
          <p className="text-sm text-flagging" role="alert">
            {message}
          </p>
        ) : null}
      </div>
    </form>
  );
}
