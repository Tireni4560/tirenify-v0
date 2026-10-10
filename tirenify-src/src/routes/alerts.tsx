import { createFileRoute } from "@tanstack/react-router";
import { BellRing } from "lucide-react";
import { ComingSoon } from "@/components/AppShell";

export const Route = createFileRoute("/alerts")({
  head: () => ({
    meta: [
      { title: "Alerts & Monitoring — Tirenify" },
      { name: "description", content: "Continuous breach and dark-web monitoring, coming soon to Tirenify." },
      { property: "og:title", content: "Alerts & Monitoring — Tirenify" },
      { property: "og:description", content: "Breach and dark-web monitoring, coming soon." },
    ],
  }),
  component: () => (
    <ComingSoon icon={BellRing} title="Alerts & Monitoring" description="Get notified the moment your details appear in a new breach."
      features={["Continuous monitoring for multiple emails", "Instant alerts for new breaches", "Dark-web exposure scanning", "Weekly security summaries"]} />
  ),
});
