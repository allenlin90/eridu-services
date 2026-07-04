/*
 * Assign LiteLLM budget tiers to known Open WebUI users (LiteLLM customers).
 *
 * NOT required for usage tracking. Open WebUI forwards each user's identity to
 * LiteLLM as `x-litellm-customer-id` via its global user-info header-forwarding
 * env vars, so LiteLLM records customer usage automatically as requests arrive
 * (see ai/litellm/README.md). No pre-provisioning step is needed to see who is
 * using what.
 *
 * This is a FUTURE budget-governance step: it attaches a budget/rate tier to
 * customers LiteLLM already knows about. It is a scaffold placeholder and
 * intentionally does not import app internals yet. Wire loadUsers() to the real
 * identity source, and verify the LiteLLM admin endpoint/payload against the
 * deployed version (LiteLLM 1.89.3) before running it for real.
 */

type AiUser = {
  id: string;
  email: string;
  role: string;
  active: boolean;
};

type BudgetTierConfig = {
  identity: {
    default_customer_id: "uuid" | "email";
    rollout_customer_id: "uuid" | "email";
  };
  roleToBudgetTier: Record<string, string>;
  skipRoles: string[];
  defaults: {
    unknownRole: string;
  };
};

const LITELLM_BASE_URL = process.env.LITELLM_BASE_URL;
const LITELLM_MASTER_KEY = process.env.LITELLM_MASTER_KEY;

function requireEnv(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function getCustomerId(user: AiUser, mode: "uuid" | "email"): string {
  return mode === "email" ? user.email : user.id;
}

// Returns null for users that should not receive a budget tier (inactive users
// and skipRoles such as pending). These are handled as a distinct skip path
// rather than a fake "blocked" tier that no budget definition would match.
function resolveBudgetTier(user: AiUser, config: BudgetTierConfig): string | null {
  if (!user.active) return null;
  if (config.skipRoles.includes(user.role)) return null;
  return config.roleToBudgetTier[user.role] ?? config.defaults.unknownRole;
}

async function assignBudgetTier(params: {
  customerId: string;
  email: string;
  budgetId: string;
}): Promise<void> {
  const baseUrl = requireEnv("LITELLM_BASE_URL", LITELLM_BASE_URL);
  const masterKey = requireEnv("LITELLM_MASTER_KEY", LITELLM_MASTER_KEY);

  const response = await fetch(`${baseUrl}/customer/update`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${masterKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      user_id: params.customerId,
      budget_id: params.budgetId,
      metadata: {
        email: params.email,
        source: "eridu-services/scripts/ai/assign-litellm-budget-tiers.ts",
      },
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`LiteLLM budget-tier assignment failed: ${response.status} ${body}`);
  }
}

async function loadUsers(): Promise<AiUser[]> {
  // TODO: Replace with real Better Auth / Open WebUI user query.
  // Keep this function as the only identity-source adapter.
  return [];
}

async function loadConfig(): Promise<BudgetTierConfig> {
  // TODO: Read ai/litellm/customer-sync.example.json or a production manifest.
  return {
    identity: {
      default_customer_id: "uuid",
      rollout_customer_id: "email",
    },
    roleToBudgetTier: {
      admin: "power-user",
      engineering: "power-user",
      manager: "standard-user",
      operations: "standard-user",
      fulfillment: "standard-user",
      livestream: "standard-user",
      staff: "light-user",
    },
    skipRoles: ["pending"],
    defaults: {
      unknownRole: "light-user",
    },
  };
}

async function main(): Promise<void> {
  const config = await loadConfig();
  const users = await loadUsers();

  let assigned = 0;
  let skipped = 0;

  for (const user of users) {
    const budgetId = resolveBudgetTier(user, config);
    const customerId = getCustomerId(user, config.identity.default_customer_id);

    if (budgetId === null) {
      skipped += 1;
      console.log(`Skipped LiteLLM customer ${customerId} (inactive or skipped role)`);
      continue;
    }

    await assignBudgetTier({
      customerId,
      email: user.email,
      budgetId,
    });

    assigned += 1;
    console.log(`Assigned LiteLLM customer ${customerId} -> ${budgetId}`);
  }

  console.log(`Completed budget-tier assignment: ${assigned} assigned, ${skipped} skipped.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
