// Loading messages for the breach check — ported VERBATIM from the live site
// (public/script.js). Do not reword these strings.
export const loadingMessagesGeneral = [
  "Verifying your email address…",
  "Searching known breach databases…",
  "Cross-checking exposure records…",
  "Scanning credential leak sources…",
  "Checking compromised account lists…",
  "Analyzing security breach data…",
  "Reviewing publicly disclosed leaks…",
  "Matching email against breach records…",
  "Consulting breach intelligence sources…",
  "Checking data exposure history…",
  "Scanning known credential dumps…",
  "Verifying account exposure status…",
  "Reviewing breach incident records…",
  "Cross-referencing security alerts…",
  "Analyzing known exposure patterns…",
];

export const loadingMessagesCompletion = [
  "Finalizing your security report…",
  "Preparing your results…",
  "Almost there…",
  "Compiling your findings…",
  "Getting your results ready…",
];

function pick(list, exclude) {
  let msg = list[Math.floor(Math.random() * list.length)];
  while (exclude && msg === exclude) {
    msg = list[Math.floor(Math.random() * list.length)];
  }
  return msg;
}

/** Same selection as the live site: 2 distinct general messages + 1 completion. */
export function pickLoadingSequence() {
  const msg1 = pick(loadingMessagesGeneral);
  const msg2 = pick(loadingMessagesGeneral, msg1);
  const msg3 = pick(loadingMessagesCompletion);
  return [msg1, msg2, msg3];
}

export function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Same validator as the live site's isValidEmail. */
export function isValidEmail(email) {
  return (
    email === email.trim() &&
    !email.includes("..") &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  );
}
