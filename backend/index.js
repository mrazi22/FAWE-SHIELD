require("dotenv").config();

const express = require("express");
const cors = require("cors");

const authRoutes = require("./routes/auth.routes");
const userRoutes = require("./routes/user.routes");
const claimsRoutes = require("./routes/claims.routes");
const dashboardRoutes = require("./routes/dashboard.routes");
const smartIntegrationRoutes = require("./routes/smartIntegration.routes");
const communicationRoutes = require("./routes/communication.routes");

const app = express();

app.use(cors({
  origin: [
    "http://localhost:3000",
    "http://localhost:5173",
    "https://yourdomain.com"
  ],
  credentials: true,
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "x-api-key",
    "x-fawe-api-key"
  ],
}));

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true }));

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/claims", claimsRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/integrations/smart", smartIntegrationRoutes);
app.use("/api/communications", communicationRoutes);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`FAWE Shield API running on port ${PORT}`);
});