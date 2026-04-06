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
          <p><strong>No known exposure found.</strong> This email was not found in our breach database.</p>
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
