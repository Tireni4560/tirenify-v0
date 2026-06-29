document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("breachForm");
  const emailInput = document.getElementById("email");
  const resultBox = document.getElementById("result");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = emailInput.value.trim();

    // Show loading message + spinner
    resultBox.className = "result loading";
    resultBox.innerHTML = `
      <div class="loading-container">
        <span>Checking exposure…</span>
        <div class="spinner"></div>
      </div>
    `;

    try {
      const response = await fetch("/check-breach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();
      console.log("Frontend received:", data);

      await new Promise(resolve => setTimeout(resolve, 1200)); // small delay

      if (data.status === "success" && data.breaches && data.breaches.length > 0) {
        resultBox.className = "result warning";

        // Flatten nested array if needed
        const flattenedBreaches = Array.isArray(data.breaches[0])
          ? data.breaches[0]
          : data.breaches;

        // Sort breaches alphabetically
        const sortedBreaches = [...flattenedBreaches].sort((a, b) => a.localeCompare(b));

        const breachCount = sortedBreaches.length;
        let headerText;

        if (breachCount === 1) {
          headerText = `This email appeared in the following breach:`;
        } else {
          headerText = `This email appeared in the following breaches:`;
        }

        const initialBreaches = sortedBreaches.slice(0, 20);
        let breachHTML = `
          <p class="breach-header"><strong>${headerText}</strong></p>
          <div class="breach-list-inline">
            ${initialBreaches.map(breach => `<span class="breach-inline">${breach}</span>`).join("")}
          </div>
          <div class="toggle-container">
            ${breachCount > 20 ? `<button id="toggleBtn">Show More</button>` : ""}
          </div>
          <div class="what-now">
            <p class="what-now-title">What now?</p>
            <p class="what-now-intro">Your email was found in known data breaches. Here is what to do right now.</p>

            <div class="action-step">
              <span class="step-num">1</span>
              <div>
                <strong>Change your password on every affected site</strong>
                <p>Go to each site listed above and change your password immediately. Use a different password for each — never reuse the same one.</p>
              </div>
            </div>

            <div class="action-step">
              <span class="step-num">2</span>
              <div>
                <strong>Enable two-factor authentication (2FA)</strong>
                <p>Even if an attacker has your password, 2FA stops them from accessing your account without your second factor. Turn it on everywhere you can.</p>
              </div>
            </div>

            <div class="action-step">
              <span class="step-num">3</span>
              <div>
                <strong>Check every account linked to this email</strong>
                <p>Any account that uses this email as login is at risk. Check your bank, social media, and shopping accounts — anywhere this email is registered.</p>
              </div>
            </div>

            <div class="action-step">
              <span class="step-num">4</span>
              <div>
                <strong>Watch for suspicious activity</strong>
                <p>Monitor your inbox for unexpected password reset requests or login alerts. If you receive one you did not request, act immediately.</p>
              </div>
            </div>

            <div class="action-step">
              <span class="step-num">5</span>
              <div>
                <strong>Check your other email addresses too</strong>
                <p>Most people have more than one email. Each one may have different exposure — run a check on every address you use.</p>
              </div>
            </div>
          </div>
          <div class="tirenify-cta">
            <p>Need help understanding your exposure or what to do next? Reach out to Tirenify directly.</p>
            <a href="https://x.com/tirenify" target="_blank" rel="noopener noreferrer">
              <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.253 5.622 5.911-5.622Zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
              </svg>
              Reach out on X @tirenify
            </a>
          </div>
        `;

        resultBox.innerHTML = breachHTML;

        const toggleBtn = document.getElementById("toggleBtn");
        if (toggleBtn) {
          toggleBtn.addEventListener("click", () => {
            const breachList = document.querySelector(".breach-list-inline");

            if (toggleBtn.textContent === "Show More") {
              const remainingBreaches = sortedBreaches.slice(20);
              const moreHTML = remainingBreaches.map(breach => `<span class="breach-inline">${breach}</span>`).join("");
              breachList.innerHTML += moreHTML;
              toggleBtn.textContent = "Show Less";
            } else {
              breachList.innerHTML = initialBreaches.map(breach => `<span class="breach-inline">${breach}</span>`).join("");
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
          <p class="no-breach-body">
            Your email does not appear in any known public breach records we checked.
            That is a good result. But staying safe means staying aware.
          </p>
          <div class="what-now">
            <p class="what-now-title">Keep it that way — do this now</p>

            <div class="action-step">
              <span class="step-num">1</span>
              <div>
                <strong>Enable two-factor authentication (2FA)</strong>
                <p>Even without a breach, 2FA is the single most effective step you can take. Enable it on every account — especially email, banking, and social media.</p>
              </div>
            </div>

            <div class="action-step">
              <span class="step-num">2</span>
              <div>
                <strong>Use a unique password for every account</strong>
                <p>If you reuse the same password across multiple sites, one breach anywhere puts all your accounts at risk. A password manager makes this easy.</p>
              </div>
            </div>

            <div class="action-step">
              <span class="step-num">3</span>
              <div>
                <strong>Check your other email addresses</strong>
                <p>A clean result for one address does not mean all your emails are safe. Run a check on every address you use regularly.</p>
              </div>
            </div>

            <div class="action-step">
              <span class="step-num">4</span>
              <div>
                <strong>Stay aware</strong>
                <p>New breaches are discovered constantly. Check back regularly — especially after hearing about a major data breach in the news.</p>
              </div>
            </div>
          </div>
        `;
      } else if (data.message) {
        resultBox.className = "result error";
        resultBox.innerHTML = `<p><strong>Error:</strong> ${data.message}</p>`;
      } else {
        resultBox.className = "result error";
        resultBox.innerHTML = `
          <p><strong>Unexpected response.</strong> The server returned data in an unrecognized format.</p>
        `;
      }

    } catch (error) {
      console.error("Frontend error:", error);
      resultBox.className = "result error";
      resultBox.innerHTML = `
        <p><strong>Connection error.</strong> Could not reach the server.</p>
      `;
    }
  });
});
