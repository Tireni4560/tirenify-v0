const express = require("express");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname)));

app.post("/check-breach", async (req, res) => {
  const { email } = req.body;

  if (!email || typeof email !== "string") {
    return res.status(400).json({
      message: "Please provide a valid email address."
    });
  }

  console.log("Mock check for:", email);

  const isBreached =
    email.toLowerCase().includes("test") ||
    email.toLowerCase().includes("hack");

  if (!isBreached) {
    return res.json({
      found: false,
      count: 0,
      breaches: []
    });
  }

  const mockBreaches = [
    {
      Name: "LinkedIn",
      Domain: "linkedin.com",
      BreachDate: "2012-05-05",
      DataClasses: ["Email addresses", "Passwords"]
    },
    {
      Name: "Adobe",
      Domain: "adobe.com",
      BreachDate: "2013-10-04",
      DataClasses: ["Email addresses", "Passwords", "Usernames"]
    }
  ];

  return res.json({
    found: true,
    count: mockBreaches.length,
    breaches: mockBreaches
  });
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});