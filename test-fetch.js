(async () => {
  try {
    const res = await fetch("https://api.xposedornot.com/v1/check-email/test@example.com");
    console.log("Status:", res.status);
    const data = await res.json();
    console.log("Data:", data);
  } catch (err) {
    console.error("Fetch failed:", err);
  }
})();
