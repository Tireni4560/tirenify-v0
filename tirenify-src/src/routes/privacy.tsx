import { createFileRoute } from "@tanstack/react-router";
import { Fingerprint } from "lucide-react";
import { ComingSoon } from "@/components/AppShell";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Check — Tirenify" },
      { name: "description", content: "Assess your digital privacy and online footprint. Coming soon." },
      { property: "og:title", content: "Privacy Check — Tirenify" },
      { property: "og:description", content: "Digital footprint assessment, coming soon." },
    ],
  }),
  component: () => (
    <ComingSoon icon={Fingerprint} title="Privacy Check" description="Understand how much of you is out there — and how to reduce it."
      features={["Digital footprint assessment", "Data broker exposure", "Social account privacy review", "Personalised privacy score"]} />
  ),
});
