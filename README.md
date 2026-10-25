# Casework

A Vite, React, TypeScript, and Material UI test-case generator. Project context and test prompts are sent to Google's Gemini API by server-side API routes; the API key is never bundled into the browser app. The app can generate steps for an individual test case or generate a selectable set of cases for a test section and export them as an Excel workbook.

## Deploy to Vercel

1. Push this project to a Git provider and import the repository in Vercel.
2. In the Vercel project, open **Settings → Environment Variables**.
3. Add `GEMINI_API_KEY` and paste your Google AI Studio API key into its **Value** field. Select the environments you use (Production, Preview, and/or Development), then save.
4. Optionally add `GEMINI_MODEL` with a model available to your Gemini API key. The default is `gemini-3.5-flash-lite`, selected for low latency and cost.
5. Redeploy after adding or changing environment variables.

Vercel uses `api/generate.ts` for the `/api/generate` endpoint. The Vite frontend is built from `npm run build` into `dist`. The key belongs in Vercel's server environment variables, not in a source file, `VITE_*` variable, or frontend setting. Gemini API quotas and billing are separate from other Google products.

The `/api/generate-cases` endpoint generates five cases for the selected test section and test type. Selected cases can be downloaded as `test-cases.xlsx`, with one row per test step and columns for test case title, test section, step, and expected result.

## Local setup

For local development, copy `.env.example` to a new file named `.env` in the project root and set the key there:

```env
GEMINI_API_KEY=paste_your_gemini_api_key_here
GEMINI_MODEL=gemini-3.5-flash-lite
API_PORT=3001
```

The exact local file is `.env` at the project root, alongside `package.json`. It is git-ignored. Do not put a real key in `.env.example` or commit `.env`.

Start the app and local API server together with:

```sh
npm run dev
```

Vite proxies `/api` requests to the local Node server. For deployment, Vercel runs the serverless function in `api/generate.ts` instead.
