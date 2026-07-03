const loadingMessagesGeneral = [
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
  "Analyzing known exposure patterns…"
];

const loadingMessagesCompletion = [
  "Finalizing your security report…",
  "Preparing your results…",
  "Almost there…",
  "Compiling your findings…",
  "Getting your results ready…"
];

function getRandomMessage(list) {
  return list[Math.floor(Math.random() * list.length)];
}

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function renderBreachResults(data, email, resultBox) {
  if (data.status === "success" && data.breaches && data.breaches.length > 0) {
    resultBox.className = "result warning";

    const flattenedBreaches = Array.isArray(data.breaches[0])
      ? data.breaches[0]
      : data.breaches;

    const sortedBreaches = [...flattenedBreaches].sort((a, b) => a.localeCompare(b));
    const breachCount = sortedBreaches.length;

    const headerText = breachCount === 1
      ? "This email appeared in the following breach:"
      : `This email appeared in ${breachCount} known breaches:`;

    const initialBreaches = sortedBreaches.slice(0, 20);

    resultBox.innerHTML = `
      <p class="breach-header"><strong>${headerText}</strong></p>
      <div class="breach-list-inline">
        ${initialBreaches.map(b => `<span class="breach-inline">${b}</span>`).join("")}
      </div>
      <div class="toggle-container">
        ${breachCount > 20 ? `<button id="toggleBtn">Show More</button>` : ""}
      </div>
      <div class="what-now-collapsible">
        <button class="what-now-toggle" id="whatNowToggle">
          <span class="toggle-text">What Now? Next Steps to Stay Safe</span>
          <span class="toggle-icon">▼</span>
        </button>
        <div class="what-now-content" id="whatNowContent">
          <div class="action-step"><span class="step-num">1</span><div><strong>Change your password on every affected site</strong><p>Go to each site listed above and change your password immediately. Use a different password for each — never reuse the same one.</p></div></div>
          <div class="action-step"><span class="step-num">2</span><div><strong>Enable two-factor authentication (2FA)</strong><p>Even if an attacker has your password, 2FA stops them from accessing your account without your second factor.</p></div></div>
          <div class="action-step"><span class="step-num">3</span><div><strong>Check every account linked to this email</strong><p>Any account that uses this email as login is at risk. Check your bank, social media, and shopping accounts.</p></div></div>
          <div class="action-step"><span class="step-num">4</span><div><strong>Watch for suspicious activity</strong><p>Monitor your inbox for unexpected password reset requests. If you receive one you did not request, act immediately.</p></div></div>
          <div class="action-step"><span class="step-num">5</span><div><strong>Check your other email addresses too</strong><p>Most people have more than one email. Each one may have different exposure — run a check on every address you use.</p></div></div>
        </div>
      </div>
      <div class="tirenify-cta">
        <p>Need help understanding your exposure or what to do next? Reach out to Tirenify directly.</p>
        <a href="https://x.com/tirenify" target="_blank" rel="noopener noreferrer">
          <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.253 5.622 5.911-5.622Zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
          Reach out on X @tirenify
        </a>
      </div>
    `;

    // Reattach toggle logic
    const toggleBtn = document.getElementById("toggleBtn");
    if (toggleBtn) {
      toggleBtn.addEventListener("click", () => {
        const breachList = document.querySelector(".breach-list-inline");
        if (toggleBtn.textContent === "Show More") {
          breachList.innerHTML += sortedBreaches.slice(20).map(b => `<span class="breach-inline">${b}</span>`).join("");
          toggleBtn.textContent = "Show Less";
        } else {
          breachList.innerHTML = initialBreaches.map(b => `<span class="breach-inline">${b}</span>`).join("");
          toggleBtn.textContent = "Show More";
        }
      });
    }

  } else if (data.Error === "Not found") {
    resultBox.className = "result success";
    resultBox.innerHTML = `
      <div class="no-breach-header">
        <span class="no-breach-icon">✓</span>
        <strong>Good news — no breaches found</strong>
      </div>
      <p class="no-breach-body">Your email does not appear in any known public breach records. That is a good result. But staying safe means staying aware.</p>
      <div class="what-now-collapsible">
        <button class="what-now-toggle" id="whatNowToggle">
          <span class="toggle-text">Keep It That Way — Next Steps</span>
          <span class="toggle-icon">▼</span>
        </button>
        <div class="what-now-content" id="whatNowContent">
          <div class="action-step"><span class="step-num">1</span><div><strong>Enable two-factor authentication (2FA)</strong><p>Even without a breach, 2FA is the single most effective step you can take. Enable it on every account — especially email, banking, and social media.</p></div></div>
          <div class="action-step"><span class="step-num">2</span><div><strong>Use a unique password for every account</strong><p>If you reuse the same password across multiple sites, one breach anywhere puts all your accounts at risk.</p></div></div>
          <div class="action-step"><span class="step-num">3</span><div><strong>Check your other email addresses</strong><p>A clean result for one address does not mean all your emails are safe. Run a check on every address you use regularly.</p></div></div>
          <div class="action-step"><span class="step-num">4</span><div><strong>Stay aware</strong><p>New breaches are discovered constantly. Check back regularly — especially after hearing about a major breach in the news.</p></div></div>
        </div>
      </div>
    `;

  } else if (data.message) {
    resultBox.className = "result error";
    resultBox.innerHTML = `<p><strong>Error:</strong> ${data.message}</p>`;
  } else {
    resultBox.className = "result error";
    resultBox.innerHTML = `<p><strong>Unexpected response.</strong> The server returned data in an unrecognized format.</p>`;
  }

  // Show email opt-in after results
  showEmailOptIn(email, resultBox);
}

function showEmailOptIn(checkedEmail, resultBox) {
  // Always show a fresh subscription form for each new breach result.
  const optIn = document.createElement("div");
  optIn.id = "emailOptIn";
  optIn.className = "email-opt-in";
  optIn.innerHTML = `
    <div class="opt-in-inner">
      <p class="opt-in-title">Stay informed about your security</p>
      <p class="opt-in-body">Get a welcome email with your results and security tips. No spam. Unsubscribe anytime.</p>
      <form id="optInForm">
        <input
          type="email"
          id="optInEmail"
          placeholder="Your email address"
          value="${checkedEmail}"
          required
        />
        <div class="opt-in-actions">
          <button type="button" id="optInSkip">No thanks</button>
          <button type="submit" id="optInSubmit">Send me the results</button>
        </div>
        <p class="opt-in-disclaimer">We respect your privacy. One email to start, unsubscribe anytime.</p>
      </form>
      <div id="optInMessage" style="display:none;"></div>
    </div>
  `;

  resultBox.insertAdjacentElement("afterend", optIn);

  document.getElementById("optInSkip").addEventListener("click", () => {
    optIn.remove();
  });

  document.getElementById("optInForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const submitBtn = document.getElementById("optInSubmit");
    const msgDiv = document.getElementById("optInMessage");
    const emailVal = document.getElementById("optInEmail").value.trim();

    submitBtn.textContent = "Sending…";
    submitBtn.disabled = true;

    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: emailVal }),
      });
      const result = await res.json();

      document.getElementById("optInForm").style.display = "none";
      msgDiv.style.display = "block";

      if (res.ok) {
        msgDiv.className = "opt-in-success";
        if (result.message === "You're already subscribed.") {
          msgDiv.innerHTML = `
            <p>✅ You're already subscribed.</p>
            <p>Thanks for being part of the Tirenify community. We'll notify you once our email updates become available.</p>
          `;
        } else {
          msgDiv.innerHTML = `
            <p>🎉 You're on the list!</p>
            <p>Your subscription has been saved successfully.</p>
            <p>We're still setting up our email infrastructure, so you won't receive a welcome email just yet. Once it's ready, you'll be among the first to receive security updates and product announcements.</p>
            <p>Thanks for joining Tirenify early.</p>
          `;
        }
      } else {
        msgDiv.className = "opt-in-error";
        msgDiv.textContent = result.message || "Something went wrong. Please try again.";
      }
    } catch (err) {
      document.getElementById("optInForm").style.display = "none";
      msgDiv.style.display = "block";
      msgDiv.className = "opt-in-error";
      msgDiv.textContent = "Could not connect. Please try again.";
    }
  });
}

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("breachForm");
  const emailInput = document.getElementById("email");
  const resultBox = document.getElementById("result");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = emailInput.value.trim();

    // Reset the search page state for every fresh breach check.
    const existingOptIn = document.getElementById("emailOptIn");
    if (existingOptIn) existingOptIn.remove();
    emailInput.value = "";

    // Pick 2 random messages from list 1, 1 from list 2
    const msg1 = getRandomMessage(loadingMessagesGeneral);
    let msg2 = getRandomMessage(loadingMessagesGeneral);
    while (msg2 === msg1) {
      msg2 = getRandomMessage(loadingMessagesGeneral);
    }
    const msg3 = getRandomMessage(loadingMessagesCompletion);
    const messages = [msg1, msg2, msg3];

    // Start loading UI immediately
    resultBox.className = "result loading";
    resultBox.innerHTML = `
      <div class="loading-container">
        <div class="spinner"></div>
        <span id="loadingMessage">${messages[0]}</span>
      </div>
    `;

    // Fire API call immediately — don't await yet
    const breachPromise = fetch("/check-breach", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    }).then(r => r.json());

    // Cycle through messages — ~2.5s each = ~9-10s total
    const loadingMsg = document.getElementById("loadingMessage");
    for (let i = 1; i < messages.length; i++) {
      await wait(2500);
      if (loadingMsg) loadingMsg.textContent = messages[i];
    }

    // Wait for API if not done yet, then wait remaining time
    const [data] = await Promise.all([breachPromise, wait(2500)]);

    // Render results
    renderBreachResults(data, email, resultBox);

    // Attach toggle to what-now button
    const toggleBtn = document.getElementById("whatNowToggle");
    const toggleContent = document.getElementById("whatNowContent");

    if (toggleBtn && toggleContent) {
      toggleBtn.addEventListener("click", () => {
        const isOpen = toggleContent.classList.contains("open");
        toggleContent.classList.toggle("open");
        toggleBtn.classList.toggle("open");
      });
    }
  });
});
