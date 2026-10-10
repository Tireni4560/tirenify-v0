// Data-type severity map — ONE file, unit-tested in tests/severity.test.js.
// Severity drives chip colours, risk scoring and the "what to do" text.
// Matching is case-insensitive on substrings of the API's xposed_data labels.

export const SEVERITY = {
  critical: {
    label: "Critical",
    chip: "bg-destructive/15 text-destructive border-destructive/30",
    types: [
      {
        match: /password/i,
        name: "Passwords",
        explain: "Attackers can try these passwords on your other accounts.",
        action: "Change the password everywhere you reused it, and use a unique password per site.",
      },
      {
        match: /credit card|debit card|card details|bank account|bank details|routing|sort code|iban/i,
        name: "Bank card or bank details",
        explain: "Card numbers or bank account details enable fraud and unauthorized transfers.",
        action: "Call your bank, freeze the card, and review recent statements for unknown transactions.",
      },
      {
        match: /government id|national id|social security|bvn|nin\b|passport|licence plate|driver/i,
        name: "Government IDs",
        explain: "ID numbers can be used for identity theft and fraudulent sign-ups.",
        action: "Monitor services that use your ID, and report misuse to the issuing authority.",
      },
      {
        match: /security question|mother.?maiden|first pet|answer/i,
        name: "Security questions",
        explain: "Answers to security questions can unlock account recovery on other sites.",
        action: "Change security questions or answers wherever you used real answers.",
      },
      {
        match: /auth token|session|cookie|access token|jwt/i,
        name: "Auth tokens or sessions",
        explain: "Live tokens can let attackers impersonate you without a password.",
        action: "Log out all sessions and change your password on the affected service.",
      },
    ],
  },
  high: {
    label: "High",
    chip: "bg-warning/15 text-warning border-warning/30",
    types: [
      {
        match: /phone number|mobile number|msisdn/i,
        name: "Phone numbers",
        explain: "Exposed numbers attract SMS phishing and SIM-swap attempts.",
        action: "Be suspicious of unexpected texts with links, and protect your SIM with your provider.",
      },
      {
        match: /physical address|postal address|home address|street/i,
        name: "Physical addresses",
        explain: "Home addresses enable stalking, parcel scams and targeted social engineering.",
        action: "Be cautious of anyone who contacts you claiming to already know where you live.",
      },
      {
        match: /dates? of birth|birthday|dob\b/i,
        name: "Dates of birth",
        explain: "Birth dates are commonly used to answer identity-verification questions.",
        action: "Treat your date of birth as public — never rely on it as a secret.",
      },
      {
        match: /health|medical|insurance claim/i,
        name: "Health information",
        explain: "Health data is sensitive and can be used for blackmail or fake insurance scams.",
        action: "Be wary of unsolicited health-related offers quoting your details.",
      },
      {
        match: /income|salary|employment record|financial/i,
        name: "Financial information",
        explain: "Income data helps scammers tailor fake loan and investment offers.",
        action: "Treat unsolicited loan or investment offers with extra suspicion.",
      },
    ],
  },
  medium: {
    label: "Medium",
    chip: "bg-accent/50 text-accent-foreground border-accent",
    types: [
      {
        match: /\bnames?\b|first name|last name|full name/i,
        name: "Names",
        explain: "Names make phishing messages look more convincing.",
        action: "Expect scam messages that address you by name — verify before acting.",
      },
      {
        match: /usernames?|handle/i,
        name: "Usernames",
        explain: "Usernames can be reused to find your accounts elsewhere.",
        action: "Use different usernames on different services where possible.",
      },
      {
        match: /ip address/i,
        name: "IP addresses",
        explain: "IP logs can reveal approximate location and internet provider.",
        action: "Keep your devices updated; consider a reputable VPN on public networks.",
      },
      {
        match: /social media|social profile|profile/i,
        name: "Social profiles",
        explain: "Profile details help attackers build believable pretexts.",
        action: "Review what is public on your social profiles.",
      },
      {
        match: /gender|occupation|job title|employer|company/i,
        name: "Demographics",
        explain: "Basic demographics are usually low-risk on their own but add context for scams.",
        action: "No immediate action; stay alert for targeted scam attempts.",
      },
    ],
  },
  low: {
    label: "Low",
    chip: "bg-secondary text-muted-foreground border-border",
    types: [
      {
        match: /email address/i,
        name: "Email addresses",
        explain: "Email addresses alone are low risk, but they are what scammers use to target you.",
        action: "Be suspicious of unexpected messages claiming to know you.",
      },
    ],
  },
};

/**
 * Classify a raw data-type label into { severity, name, explain, action }.
 * Recognised labels match the maps above. Anything unrecognised goes to the
 * "unknown" bucket shown as "Other" — we surface it rather than downplay it.
 */
export function classifyDataType(rawLabel) {
  const label = String(rawLabel || "").trim();
  for (const severity of ["critical", "high", "medium"]) {
    for (const t of SEVERITY[severity].types) {
      if (t.match.test(label)) return { severity, name: t.name, explain: t.explain, action: t.action };
    }
  }
  if (/email address/i.test(label)) {
    const t = SEVERITY.low.types[0];
    return { severity: "low", name: t.name, explain: t.explain, action: t.action };
  }
  return {
    severity: "unknown",
    name: "Other",
    explain: "We don't have a plain-language explanation for this data type yet.",
    action: "If this data is sensitive to you, treat the accounts using this email as at risk.",
  };
}

export const SEVERITY_ORDER = ["critical", "high", "medium", "low", "unknown"];
export const SEVERITY_RANK = { critical: 3, high: 2, medium: 1, low: 0, unknown: 0 };
