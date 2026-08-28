import { useState, type FormEvent } from "react";
import { site } from "../config/site";
import { formatCount } from "../lib/format";

interface SignOnFormProps {
  /** null until the group has counted a real list. */
  count: number | null;
  formId?: string;
}

type State = "idle" | "submitting" | "success" | "error";

const LABEL =
  "flex flex-col gap-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-sheet/70";
const FIELD =
  "min-h-12 border border-sheet/25 bg-ink px-3 font-body text-base text-sheet placeholder:text-sheet/40 focus:border-flagging";

function fieldError(name: string, zip: string, email: string): string | null {
  if (!name.trim()) return "Add your name.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "Use a real email address.";
  if (!/^\d{5}(-\d{4})?$/.test(zip.trim())) return "Use a 5-digit ZIP so we can count borough supporters.";
  return null;
}

export default function SignOnForm({ count, formId }: SignOnFormProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [zip, setZip] = useState("");
  const [state, setState] = useState<State>("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [signed, setSigned] = useState(false);

  const endpoint = formId || site.formspree.signOn;
  const shown = count == null ? null : count + (signed ? 1 : 0);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const error = fieldError(name, zip, email);
    if (error) {
      setState("error");
      setMessage(error);
      return;
    }
    setState("submitting");
    setMessage(null);

    if (!endpoint) {
      setState("error");
      setMessage(`The list is not connected yet. Email ${site.email} to sign on.`);
      return;
    }

    setSigned(true);
    try {
      const response = await fetch(`https://formspree.io/f/${endpoint}`, {
        method: "POST",
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, zip, _subject: "Revilla Trails sign-on" }),
      });
      if (!response.ok) throw new Error("form");
      setState("success");
      setMessage(
        "You're on the list. We'll use this number in front of the Assembly and the Forest Service.",
      );
    } catch {
      setSigned(false);
      setState("error");
      setMessage("The list didn't accept that. Check your connection and try again.");
    }
  }

  return (
    <section className="border border-sheet/20 bg-sheet/5 p-6 md:p-8">
      <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-sheet/70">
        Add your name
      </p>
      <p className="mt-2 font-display text-2xl font-bold tracking-tight text-sheet">
        {shown == null ? "Sign on" : `${formatCount(shown)} and counting`}
      </p>

      {state === "success" ? (
        <p
          className="mt-6 border border-sheet/25 bg-sheet/10 px-4 py-3 text-sm text-sheet"
          role="status"
        >
          {message}
        </p>
      ) : (
        <form className="mt-6 grid gap-4" onSubmit={onSubmit} noValidate>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className={LABEL}>
              Name
              <input
                name="name"
                autoComplete="name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                className={FIELD}
              />
            </label>
            <label className={LABEL}>
              ZIP
              <input
                name="zip"
                inputMode="numeric"
                autoComplete="postal-code"
                value={zip}
                onChange={(event) => setZip(event.target.value)}
                className={FIELD}
              />
            </label>
          </div>
          <label className={LABEL}>
            Email
            <input
              name="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className={FIELD}
            />
          </label>
          <div className="flex flex-wrap items-center gap-4">
            <button type="submit" disabled={state === "submitting"} className="btn btn-primary">
              {state === "submitting" ? "Signing on…" : "Sign on"}
            </button>
            {message && state === "error" ? (
              <p className="text-sm text-sheet" role="alert">
                {message}
              </p>
            ) : (
              <p className="text-xs text-sheet/70">
                ZIP tells the Assembly how many supporters live in the borough.
              </p>
            )}
          </div>
        </form>
      )}
    </section>
  );
}
