/*
 * Verify AI workspace integration points.
 *
 * This script is intentionally lightweight. It can be expanded into a CI or scheduled
 * check after the deployment contracts are finalized.
 *
 * Set the *_BASE_URL env vars to whatever the runner can actually reach. Railway
 * private URLs (http://<service>.railway.internal:4000) only resolve from inside
 * the Railway project network; from a laptop or external CI, point these at the
 * public LiteLLM / Open WebUI / MCP URLs instead.
 */

type CheckResult = {
  name: string;
  ok: boolean;
  detail?: string;
};

const OPENWEBUI_BASE_URL = process.env.OPENWEBUI_BASE_URL;
const LITELLM_BASE_URL = process.env.LITELLM_BASE_URL;
const LITELLM_MASTER_KEY = process.env.LITELLM_MASTER_KEY;
const MCP_BASE_URL = process.env.MCP_BASE_URL;

async function checkUrl(name: string, url: string | undefined): Promise<CheckResult> {
  if (!url) {
    return { name, ok: false, detail: "Environment variable is not set." };
  }

  try {
    const response = await fetch(url, { method: "GET" });
    return {
      name,
      ok: response.ok,
      detail: `${response.status} ${response.statusText}`,
    };
  } catch (error) {
    return {
      name,
      ok: false,
      detail: error instanceof Error ? error.message : String(error),
    };
  }
}

async function checkLiteLLMModels(): Promise<CheckResult> {
  if (!LITELLM_BASE_URL || !LITELLM_MASTER_KEY) {
    return {
      name: "LiteLLM model info",
      ok: false,
      detail: "LITELLM_BASE_URL or LITELLM_MASTER_KEY is not set.",
    };
  }

  try {
    const response = await fetch(`${LITELLM_BASE_URL}/model/info`, {
      headers: {
        Authorization: `Bearer ${LITELLM_MASTER_KEY}`,
      },
    });

    const body = await response.text();
    return {
      name: "LiteLLM model info",
      ok: response.ok,
      detail: response.ok ? "Model info endpoint is reachable." : body,
    };
  } catch (error) {
    return {
      name: "LiteLLM model info",
      ok: false,
      detail: error instanceof Error ? error.message : String(error),
    };
  }
}

async function main(): Promise<void> {
  const checks: CheckResult[] = [
    await checkUrl("Open WebUI", OPENWEBUI_BASE_URL),
    await checkUrl("LiteLLM", LITELLM_BASE_URL),
    await checkLiteLLMModels(),
    await checkUrl("MCP service", MCP_BASE_URL),
  ];

  for (const check of checks) {
    const status = check.ok ? "PASS" : "FAIL";
    console.log(`[${status}] ${check.name}${check.detail ? ` - ${check.detail}` : ""}`);
  }

  const failed = checks.filter((check) => !check.ok);
  if (failed.length > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
