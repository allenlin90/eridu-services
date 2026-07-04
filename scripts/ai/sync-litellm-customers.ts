/*
 * Sync Better Auth / Open WebUI users into LiteLLM customers.
 *
 * This is a scaffold placeholder. It intentionally does not import app internals yet.
 * Wire it to the real Better Auth user source after the identity contract is finalized.
 */

type AiUser = {
  id: string;
  email: string;
  role: string;
  active: boolean;
};

type CustomerSyncConfig = {
  identity: {
    pilot_customer_id: "email" | "better_auth_user_id";
    production_customer_id: "email" | "better_auth_user_id";
  };
  roleToBudgetTier: Record<string, string>;
  defaults: {
    unknownRole: string;
    inactiveUser: string;
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

function getCustomerId(user: AiUser, mode: "email" | "better_auth_user_id"): string {
  return mode === "email" ? user.email : user.id;
}

function resolveBudgetTier(user: AiUser, config: CustomerSyncConfig): string {
  if (!user.active) return config.defaults.inactiveUser;
  return config.roleToBudgetTier[user.role] ?? config.defaults.unknownRole;
}

async function upsertLiteLLMCustomer(params: {
  userId: string;
  email: string;
  budgetId: string;
}): Promise<void> {
  const baseUrl = requireEnv("LITELLM_BASE_URL", LITELLM_BASE_URL);
  const masterKey = requireEnv("LITELLM_MASTER_KEY", LITELLM_MASTER_KEY);

  const response = await fetch(`${baseUrl}/customer/new`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${masterKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      user_id: params.userId,
      budget_id: params.budgetId,
      metadata: {
        email: params.email,
        source: "eridu-services/scripts/ai/sync-litellm-customers.ts",
      },
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`LiteLLM customer sync failed: ${response.status} ${body}`);
  }
}

async function loadUsers(): Promise<AiUser[]> {
  // TODO: Replace with real Better Auth / internal user query.
  // Keep this function as the only identity-source adapter.
  return [];
}

async function loadConfig(): Promise<CustomerSyncConfig> {
  // TODO: Read ai/litellm/customer-sync.example.json or a production manifest.
  return {
    identity: {
      pilot_customer_id: "email",
      production_customer_id: "better_auth_user_id",
    },
    roleToBudgetTier: {
      admin: "power-user",
      engineering: "power-user",
      manager: "standard-user",
      operations: "standard-user",
      fulfillment: "standard-user",
      livestream: "standard-user",
      staff: "light-user",
      pending: "blocked",
    },
    defaults: {
      unknownRole: "light-user",
      inactiveUser: "blocked",
    },
  };
}

async function main(): Promise<void> {
  const config = await loadConfig();
  const users = await loadUsers();

  for (const user of users) {
    const budgetId = resolveBudgetTier(user, config);
    const userId = getCustomerId(user, config.identity.pilot_customer_id);

    await upsertLiteLLMCustomer({
      userId,
      email: user.email,
      budgetId,
    });

    console.log(`Synced LiteLLM customer ${userId} -> ${budgetId}`);
  }

  console.log(`Completed LiteLLM customer sync for ${users.length} users.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
