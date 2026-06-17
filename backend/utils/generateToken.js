const jwt = require("jsonwebtoken");

function generateToken(user) {
  return jwt.sign(
    {
      userId: user.id,
      role: user.role,
      tokenVersion: user.token_version || 0,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRES_IN || "1h",
      issuer: process.env.JWT_ISSUER || "fawe-shield-api",
      audience: process.env.JWT_AUDIENCE || "fawe-shield-client",
    }
  );
}

module.exports = generateToken;