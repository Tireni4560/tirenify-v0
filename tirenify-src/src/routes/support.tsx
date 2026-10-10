import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Mail, Globe, ShieldCheck } from "lucide-react";
import { PageHeader } from "@/components/AppShell";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

export const Route = createFileRoute("/support")({
  head: () => ({
    meta: [
      { title: "Help & Support — Tirenify" },
      { name: "description", content: "Get help with Tirenify and Breach Guard, or contact our team." },
      { property: "og:title", content: "Help & Support — Tirenify" },
      { property: "og:description", content: "Support resources and contact for Tirenify." },
    ],
  }),
  component: Support,
});

const faqs = [
  { q: "Is Breach Guard free?", a: "Yes. Checking an email against known breaches is free." },
  { q: "Do you store my email?", a: "No. Your email is only used to run the check. Results are kept on your device." },
  { q: "Where does the breach data come from?", a: "From publicly known data breaches, aggregated by trusted breach intelligence sources." },
  { q: "I was found in a breach. Am I hacked?", a: "Not necessarily. It means your data was exposed. Follow the steps in your Security Report to stay safe." },
];

function Support() {
  const [form, setForm] = useState({ name: "", email: "", message: "" });
  const mailto = `mailto:support@tirenify.app?subject=${encodeURIComponent(`Support request from ${form.name}`)}&body=${encodeURIComponent(`${form.message}\n\nReply to: ${form.email}`)}`;
  return (
    <>
      <PageHeader eyebrow="Help" title="Help & Support" description="We're here to help you feel safe online." />
      <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <section className="surface px-6 py-2">
          <h2 className="pt-4 text-lg font-semibold">Frequently asked</h2>
          <Accordion type="single" collapsible>
            {faqs.map((f) => (
              <AccordionItem key={f.q} value={f.q}><AccordionTrigger>{f.q}</AccordionTrigger><AccordionContent className="text-muted-foreground">{f.a}</AccordionContent></AccordionItem>
            ))}
          </Accordion>
        </section>
        <section className="surface bg-hero p-6">
          <h2 className="text-lg font-semibold">Contact us</h2>
          <form className="mt-4 space-y-3" onSubmit={(e) => { e.preventDefault(); window.location.href = mailto; }}>
            <input required maxLength={100} placeholder="Your name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="h-11 w-full rounded-lg border border-input bg-background/60 px-4 outline-none focus:ring-2 focus:ring-ring" />
            <input required type="email" maxLength={255} placeholder="Your email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="h-11 w-full rounded-lg border border-input bg-background/60 px-4 outline-none focus:ring-2 focus:ring-ring" />
            <textarea required maxLength={2000} rows={4} placeholder="How can we help?" value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} className="w-full rounded-lg border border-input bg-background/60 p-4 outline-none focus:ring-2 focus:ring-ring" />
            <button className="w-full rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-primary-foreground">Send message</button>
          </form>
          <div className="mt-6 space-y-2 text-sm">
            <a href="mailto:support@tirenify.app" className="flex items-center gap-2 text-muted-foreground hover:text-foreground"><Mail className="h-4 w-4" /> support@tirenify.app</a>
            <a href="https://tirenify.app/" target="_blank" rel="noreferrer" className="flex items-center gap-2 text-muted-foreground hover:text-foreground"><Globe className="h-4 w-4" /> tirenify.app</a>
            <a href="https://check.tirenify.app/" target="_blank" rel="noreferrer" className="flex items-center gap-2 text-muted-foreground hover:text-foreground"><ShieldCheck className="h-4 w-4" /> check.tirenify.app</a>
          </div>
        </section>
      </div>
    </>
  );
}
