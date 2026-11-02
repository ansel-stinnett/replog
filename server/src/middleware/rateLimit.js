// Security control for Milestone 2: throttles credential-guessing against the
// authentication endpoints (OWASP A07, Identification and Authentication
// Failures).
//
// Milestone 1 already made each individual guess expensive and uninformative
// -- bcrypt hashing, a constant-time-ish dummy compare for unknown emails, and
// one generic error message. What it did not do was limit how many guesses an
// attacker could make. A script could try thousands of passwords against a
// known email address as fast as the server would answer.
//
// Two limiters are applied to /api/auth:
//
//   loginLimiter     per IP + email, counting only FAILED attempts, so a
//                    person signing in correctly is never blocked and an
//                    attacker cannot lock a victim out by deliberately
//                    failing (that would turn this control into a
//                    denial-of-service against the real user)
//   authBurstLimiter per IP across all auth routes, to slow an attacker
//                    spreading guesses across many email addresses
//
// Counters are in memory. That is the right scope for this project: it
// resets on deploy and is per-process, which is a documented limitation in
// docs/milestone-2/threat-model.md rather than a hidden one.
const { rateLimit, ipKeyGenerator } = require('express-rate-limit');

const FIFTEEN_MINUTES = 15 * 60 * 1000;

const TOO_MANY = {
  error: 'Too many attempts. Wait a few minutes and try again.',
};

// Defaults are deliberately generous enough that a person who genuinely
// forgot their password is not locked out, and tight enough that automated
// guessing becomes impractical.
const DEFAULTS = {
  windowMs: FIFTEEN_MINUTES,
  loginLimit: 5, // failed logins per IP + email
  burstLimit: 60, // all auth requests per IP
};

function buildLimiters(options = {}) {
  const { windowMs, loginLimit, burstLimit } = { ...DEFAULTS, ...options };

  const loginLimiter = rateLimit({
    windowMs,
    limit: loginLimit,
    // Only failures count toward the limit.
    skipSuccessfulRequests: true,
    standardHeaders: 'draft-7', // RateLimit-* headers so the client can back off
    legacyHeaders: false,
    // Key on IP *and* the submitted email. Keying on email alone would let
    // anyone lock out any account they knew the address of.
    keyGenerator: (req) => {
      const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
      return `${ipKeyGenerator(req.ip)}:${email}`;
    },
    handler: (req, res) => res.status(429).json(TOO_MANY),
  });

  const authBurstLimiter = rateLimit({
    windowMs,
    limit: burstLimit,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    keyGenerator: (req) => ipKeyGenerator(req.ip),
    handler: (req, res) => res.status(429).json(TOO_MANY),
  });

  return { loginLimiter, authBurstLimiter };
}

module.exports = { buildLimiters, DEFAULTS };
