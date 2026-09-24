const test = require("node:test");
const assert = require("node:assert/strict");

process.env.CORS_ORIGINS = "https://allowed.example";
process.env.NODE_ENV = "test";
process.env.DB_PASSWORD = "test-only-password";

const {
  app,
  corsOptions,
  createMailTransport,
  generateOtp,
} = require("../backend/server");
const {
  aiEnabled,
  evaluateItemMatch,
  numberInRange,
  parseJson,
  responseText,
} = require("../backend/services/aiMatcher");
const { validateEmail, validateItem } = require("../backend/validation");

const checkOrigin = (origin) => new Promise((resolve) => {
  corsOptions.origin(origin, (error, allowed) => resolve({ error, allowed }));
});

test("Express hides its version header", () => {
  assert.equal(app.get("x-powered-by"), false);
});

test("CORS accepts server-to-server, allowlisted, and local development origins", async () => {
  assert.deepEqual(await checkOrigin(undefined), { error: null, allowed: true });
  assert.deepEqual(await checkOrigin("https://allowed.example"), { error: null, allowed: true });
  assert.deepEqual(await checkOrigin("http://localhost:5173"), { error: null, allowed: true });
  assert.deepEqual(await checkOrigin("http://127.0.0.1:5173"), { error: null, allowed: true });
});

test("CORS rejects malformed and untrusted origins", async () => {
  const malformed = await checkOrigin("://invalid");
  const untrusted = await checkOrigin("https://untrusted.example");
  assert.match(malformed.error.message, /not allowed/i);
  assert.equal(malformed.allowed, undefined);
  assert.match(untrusted.error.message, /not allowed/i);
  assert.equal(untrusted.allowed, undefined);
});

test("mail transport requires credentials and enforces TLS", () => {
  const calls = [];
  const mailer = {
    createTransport(config) {
      calls.push(config);
      return { config };
    },
  };

  assert.equal(createMailTransport("", "", mailer), null);
  const transport = createMailTransport("sender@example.com", "secret", mailer);
  assert.equal(calls.length, 1);
  assert.equal(transport.config.host, "smtp.gmail.com");
  assert.equal(transport.config.port, 465);
  assert.equal(transport.config.secure, true);
  assert.deepEqual(transport.config.auth, { user: "sender@example.com", pass: "secret" });
});

test("OTP generator returns a cryptographically generated six-digit value", () => {
  for (let index = 0; index < 50; index += 1) {
    assert.match(generateOtp(), /^\d{6}$/);
  }
});

test("email validation rejects malformed input", () => {
  assert.equal(validateEmail("student@example.com"), true);
  assert.equal(validateEmail("  student@example.com  "), true);
  assert.equal(validateEmail("missing-at.example.com"), false);
  assert.equal(validateEmail("two@@example.com"), false);
  assert.equal(validateEmail("student@example"), false);
  assert.equal(validateEmail("student @example.com"), false);
  assert.equal(validateEmail(null), false);
});

test("item validation normalizes valid data and reports invalid fields", () => {
  const valid = validateItem({
    found_date: "2026-09-24",
    item_name: "  Wallet  ",
    category: "Other",
    item_color: "Black",
    found_location: "Library",
    description: "Leather wallet",
    deposit_location: "Security desk",
  }, "found_date", "found_location");
  assert.equal(valid.value.item_name, "Wallet");
  assert.equal(valid.value.found_date, "2026-09-24");

  assert.match(
    validateItem({ found_date: "2026-02-30", item_name: "Wallet" }, "found_date", "found_location").error,
    /valid date/
  );
  assert.match(
    validateItem({ found_date: "24-09-2026", item_name: "Wallet" }, "found_date", "found_location").error,
    /YYYY-MM-DD/
  );
  assert.match(
    validateItem({ found_date: "2026-09-24", item_name: "" }, "found_date", "found_location").error,
    /required/
  );
});

test("AI response helpers parse plain and fenced JSON safely", () => {
  assert.equal(responseText({ output_text: "direct" }), "direct");
  assert.equal(responseText({ output: [{ content: [{ text: "joined" }] }] }), "joined");
  assert.deepEqual(parseJson('{"score": 75}'), { score: 75 });
  assert.deepEqual(parseJson('```json\n{"score": 80}\n```'), { score: 80 });
  assert.deepEqual(parseJson('```\n{"score": 90}\n```'), { score: 90 });
  assert.throws(() => parseJson("no json here"), /did not contain JSON/);
});

test("AI score normalization and disabled mode are deterministic", async () => {
  assert.equal(numberInRange(-5), 0);
  assert.equal(numberInRange(50), 50);
  assert.equal(numberInRange(105), 100);
  assert.equal(numberInRange("invalid"), null);

  delete process.env.OPENAI_API_KEY;
  assert.equal(aiEnabled(), false);
  assert.equal(await evaluateItemMatch({}, {}, "lost"), null);
  process.env.OPENAI_API_KEY = "test-key";
  assert.equal(aiEnabled(), true);
  delete process.env.OPENAI_API_KEY;
});
