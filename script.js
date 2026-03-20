const form = document.getElementById("breach-form");
const emailInput = document.getElementById("email");
const resultBox = document.getElementById("result");

form.addEventListener("submit", async function (event) {
  event.preventDefault();

  const email = emailInput.value.trim();

  if (!email) {
    resultBox.className = "result warning";
    resultBox.innerHTML = `
      <p><strong>Input required.</strong> Please enter an email address to continue.</p>
    `;
    return;
  }

  resultBox.className = "result loading";
  resultBox.innerHTML = `
    <div class="loading-wrap">
      <div class="spinner"></div>
      <p>Checking exposure...</p>
    </div>
  `;

  try {
    const response = await fetch("/check-breach", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ email })
    });

    const data = await response.json();

    if (!response.ok) {
      resultBox.className = "result warning";
      resultBox.innerHTML = `
        <p><strong>Check failed.</strong> ${data.message || "Something went wrong while checking this email."}</p>
      `;
      return;
    }

    if (data.found === false) {
      resultBox.className = "result success";
      resultBox.innerHTML = `
        <p><strong>No known exposure found.</strong> This email was not found in our current breach check.</p>
      `;
      return;
    }

    const breachItems = data.breaches
      .map(
        (breach) => `
          <div class="breach-item">
            <h3>${breach.Name}</h3>
            <p><strong>Domain:</strong> ${breach.Domain || "N/A"}</p>
            <p><strong>Breach date:</strong> ${breach.BreachDate || "N/A"}</p>
            <p><strong>Exposed data:</strong> ${breach.DataClasses?.join(", ") || "N/A"}</p>
          </div>
        `
      )
      .join("");

    resultBox.className = "result warning";
    resultBox.innerHTML = `
      <p><strong>Exposure detected.</strong> This email appeared in ${data.count} known breach${data.count > 1 ? "es" : ""}.</p>
      <p>Review the incidents below and take action on any affected accounts.</p>
      ${breachItems}
    `;
  } catch (error) {
    console.error(error);
    resultBox.className = "result warning";
    resultBox.innerHTML = `
      <p><strong>Connection error.</strong> We could not reach the server. Make sure your backend is running and try again.</p>
    `;
  }
});