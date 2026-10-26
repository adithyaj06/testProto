# Tech stack

## Product

Casework (branded as TestProto in the interface) is a browser-based tool for drafting software test procedures from project context and a test case title. It sends those inputs to Groq and displays a structured list of generated steps that can be copied or cleared.

## Frontend

- **React 19** for the component-based user interface.
- **TypeScript 6** for typed application code.
- **Vite 8** for local development and frontend production builds.
- **Material UI 9** (`@mui/material`, `@mui/icons-material`) with Emotion for components, icons, and styling.
- **Browser Fetch API** for calling the generation endpoint; Clipboard API for copying generated steps.

## Backend and AI

- **Node.js HTTP server** with TypeScript, run locally through `tsx`; it exposes `POST /api/generate`.
- **Vercel Functions** for the deployed generation endpoint in `api/generate.ts`.
- **Groq API**, called through its OpenAI-compatible chat completions endpoint. The model is selected with `GROQ_MODEL` and defaults to `openai/gpt-oss-20b`.
- Groq requests use low reasoning effort and JSON object output. The server validates and normalizes the model response; batch test cases have exactly three concise steps each to limit output size and latency.
- Generated responses are validated on the server before returning them to the browser.
- **dotenv** loads local environment variables. `GROQ_API_KEY` stays on the server and must not be exposed in frontend variables.

## Build, development, and deployment

- `npm run dev` starts the local API server and Vite together using **concurrently**. Vite proxies `/api` to the local server.
- `npm run build` runs TypeScript project checks and builds static frontend assets to `dist`.
- **oxlint** is available as the project linter (`npm run lint`).
- **Vercel** is the documented deployment target: it serves the Vite build and the serverless function.

## Main request flow

1. The React UI collects project context and a test case title.
2. The browser posts both values to `/api/generate`.
3. The local Node server or Vercel function validates the request and calls Groq using the server-side API key.
4. The API returns a JSON array of test steps for display in the UI.

## Not currently present

The repository does not include a database, authentication layer, or test framework. Drafts are held in React state for the current browser session.
