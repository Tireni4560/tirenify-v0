import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/AppShell";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

export const Route = createFileRoute("/learn")({
  head: () => ({
    meta: [
      { title: "Security Center — Tirenify" },
      { name: "description", content: "Plain-language security guides and practical advice." },
      { property: "og:title", content: "Security Center — Tirenify" },
      { property: "og:description", content: "Security education and practical guides." },
    ],
  }),
  component: Learn,
});

const guides = [
  { cat: "Basics", t: "What is a data breach?", b: "A data breach happens when a company's systems are accessed and customer data — like emails or passwords — is stolen. Your info can leak even if you did nothing wrong." },
  { cat: "Passwords", t: "Why unique passwords matter", b: "If one site leaks your password, attackers try it everywhere. A unique password per site contains the damage. A password manager makes this easy." },
  { cat: "Accounts", t: "Setting up two-factor authentication", b: "2FA adds a second step at login, like a code from an app. Prefer authenticator apps over SMS. Start with your email account — it unlocks everything else." },
  { cat: "Scams", t: "Spotting phishing", b: "Check the sender's address, hover links before clicking, and be suspicious of urgency. Real companies rarely ask for passwords by email." },
  { cat: "Response", t: "I was in a breach — what now?", b: "Change the affected password, update it anywhere you reused it, enable 2FA, and watch your accounts and bank statements for unusual activity." },
];

function Learn() {
  return (
    <>
      <PageHeader eyebrow="Learn" title="Security Center" description="Clear, practical guidance — no jargon." />
      <div className="grid gap-4 md:grid-cols-3">
        {guides.slice(0, 3).map((g) => (
          <article key={g.t} className="surface bg-hero p-6">
            <p className="text-xs font-semibold uppercase tracking-widest text-primary">{g.cat}</p>
            <h2 className="mt-2 text-lg font-semibold">{g.t}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{g.b}</p>
          </article>
        ))}
      </div>
      <section className="surface mt-6 px-6">
        <Accordion type="single" collapsible>
          {guides.map((g) => (
            <AccordionItem key={g.t} value={g.t}>
              <AccordionTrigger>{g.t}</AccordionTrigger>
              <AccordionContent className="text-muted-foreground">{g.b}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>
    </>
  );
}
