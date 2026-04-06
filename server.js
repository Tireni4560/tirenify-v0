const express = require("express");
const fetch = global.fetch; // Node v18+ has fetch built-in
const path = require("path");

const app = express();
const PORT = 3000;

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// Route to check breaches
app.post("/check-breach", async (req, res) => {
  const { email } = req.body;

  if (!email || typeof email !== "string") {
    return res.status(400).json({ message: "Invalid email provided." });
  }

  try {
    console.log("Checking email:", email);

    const apiUrl = `https://api.xposedornot.com/v1/check-email/${encodeURIComponent(email)}`;
    console.log("Calling API:", apiUrl);

    const response = await fetch(apiUrl);
    const data = await response.json();

    

    console.log("Response status:", response.status);
    console.log("API data received:", data);

    if (!response.ok) {
      return res.status(response.status).json({ message: data.message || "API error occurred." });
    }

    // Forward the API response to the frontend
    res.json(data);

  } catch (error) {
    console.error("Error contacting API:", error);
    res.status(500).json({ message: "Connection error. Could not reach breach API." });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
