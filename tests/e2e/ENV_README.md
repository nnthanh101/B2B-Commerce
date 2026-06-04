# Playwright Test Environment

Create a `.env.test` file in this directory with the following variables:

```
MEDUSA_BACKEND_URL=http://medusa:9000
STOREFRONT_URL=http://localhost:8000
TEST_REGION_COUNTRY=dk
PLAYWRIGHT_HTML_REPORT=tmp/Digital-Commerce/test-results/playwright-report
PLAYWRIGHT_SCREENSHOTS=tmp/Digital-Commerce/screenshots
```

These variables are used by:
- `playwright.config.ts` — configures baseURL and output paths
- `tests/e2e/fixtures/auth.ts` — admin and buyer authentication
- `tests/e2e/fixtures/seed.ts` — API endpoints for test data seeding
- `tests/e2e/b2b-smoke.spec.ts` — golden path test suite
