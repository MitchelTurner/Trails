import { useState, type FormEvent } from "react";
import { site } from "../config/site";
import { formatCount } from "../lib/format";

interface SignOnFormProps {
  count: number;
  formId?: string;
}

type State = "idle" | "submitting" | "success" | "error";

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
  const [optimistic, setOptimistic] = useState(count);

  const endpoint = formId || site.formspree.signOn;

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
    setOptimistic(count + 1);

    if (!endpoint) {
      setState("error");
      setOptimistic(count);
      setMessage(`The list is not connected yet. Email ${site.email} to sign on.`);
      return;
    }

    try {
      const response = await fetch(`https://formspree.io/f/${endpoint}`, {
        method: "POST",
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, zip, _subject: "Revilla Trails sign-on" }),
      });
      if (!response.ok) throw new Error("form");
      setState("success");
      setMessage("You're on the list. We'll use this number in front of the Assembly and the Forest Service.");
    } catch {
      setOptimistic(count);
      setState("error");
      setMessage("The list didn't accept that. Check your connection and try again.");
    }
  }

  return (
    <section className="border border-contour/70 bg-sheet px-5 py-8 md:px-8">
      <p className="font-mono text-[11px] uppercase tracking-wider text-flagging">Sign on</p>
      <h2 className="font-display mt-2 text-3xl font-semibold tracking-tight md:text-4xl">
        {formatCount(optimistic)} people have signed on to connecting Revilla's trails.
      </h2>
      <p className="mt-3 max-w-xl text-sm leading-relaxed text-ink/85">
        An email list with a visible number is the thing we put in front of land managers. This is
        not a donation and it is not tax-deductible — we are not asking for money.
      </p>

      {state === "success" ? (
        <p className="mt-6 border border-ink/20 bg-ink/5 px-4 py-3 text-sm" role="status">
          {message}
        </p>
      ) : (
        <form className="mt-6 grid gap-3 md:grid-cols-3" onSubmit={onSubmit} noValidate>
          <label className="flex flex-col gap-1 font-mono text-[11px] uppercase tracking-wider text-tide">
            Name
            <input
              name="name"
              autoComplete="name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="border border-contour bg-sheet px-3 py-2 font-body text-sm text-ink"
            />
          </label>
          <label className="flex flex-col gap-1 font-mono text-[11px] uppercase tracking-wider text-tide">
            Email
            <input
              name="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="border border-contour bg-sheet px-3 py-2 font-body text-sm text-ink"
            />
          </label>
          <label className="flex flex-col gap-1 font-mono text-[11px] uppercase tracking-wider text-tide">
            ZIP
            <input
              name="zip"
              inputMode="numeric"
              autoComplete="postal-code"
              value={zip}
              onChange={(event) => setZip(event.target.value)}
              className="border border-contour bg-sheet px-3 py-2 font-body text-sm text-ink"
            />
          </label>
          <div className="md:col-span-3 flex flex-wrap items-center gap-4">
            <button
              type="submit"
              disabled={state === "submitting"}
              className="bg-flagging px-5 py-2.5 font-display text-sm font-semibold tracking-wide text-sheet disabled:opacity-60"
            >
              {state === "submitting" ? "Signing on…" : "Sign on"}
            </button>
            {message && state === "error" ? (
              <p className="text-sm text-flagging" role="alert">
                {message}
              </p>
            ) : (
              <p className="text-xs text-tide/80">ZIP is so we can tell the Assembly how many of you live in the borough.</p>
            )}
          </div>
        </form>
      )}
    </section>
  );
}
