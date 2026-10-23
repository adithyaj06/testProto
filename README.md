# Casework

A Vite, React, TypeScript, and Material UI test-case generator. Project context and the test case title are sent to OpenAI by a server-side API route; the API key is never bundled into the browser app.

## Deploy to Vercel

1. Push this project to a Git provider and import the repository in Vercel.
2. In the Vercel project, open **Settings → Environment Variables**.
3. Add `OPENAI_API_KEY` and paste your OpenAI API key into its **Value** field. Select the environments you use (Production, Preview, and/or Development), then save.
4. Optionally add `OPENAI_MODEL` with a model available to your OpenAI API account. The default is `gpt-4.1-mini`.
5. Redeploy after adding or changing environment variables.

Vercel uses `api/generate.ts` for the `/api/generate` endpoint. The Vite frontend is built from `npm run build` into `dist`. The key belongs in Vercel's server environment variables, not in a source file, `VITE_*` variable, or frontend setting. ChatGPT subscriptions and API billing are separate.

## Local setup

For local development, copy `.env.example` to a new file named `.env` in the project root and set the key there:

```env
OPENAI_API_KEY=paste_your_openai_api_key_here
OPENAI_MODEL=gpt-4.1-mini
API_PORT=3001
```

The exact local file is `.env` at the project root, alongside `package.json`. It is git-ignored. Do not put a real key in `.env.example` or commit `.env`.

Start the app and local API server together with:

```sh
npm run dev
```

Vite proxies `/api` requests to the local Node server. For deployment, Vercel runs the serverless function in `api/generate.ts` instead.
