export const TANIT_AGENT_ID = "tanit";
export const INGESTION_WORKFLOW_ID = "ingestionWorkflow";

export function getMastraUrl() {
  return (
    process.env.MASTRA_URL ||
    process.env.MASTRA_API_URL ||
    "http://localhost:4111"
  ).replace(/\/$/, "");
}

function mastraHeaders(): HeadersInit {
  const headers: HeadersInit = {
    "Content-Type": "application/json",
  };

  if (process.env.MASTRA_API_KEY) {
    headers.Authorization = `Bearer ${process.env.MASTRA_API_KEY}`;
  }

  return headers;
}

export async function streamTanitAgent(messages: unknown[]) {
  return fetch(`${getMastraUrl()}/api/agents/${TANIT_AGENT_ID}/stream`, {
    method: "POST",
    headers: mastraHeaders(),
    body: JSON.stringify({ messages }),
  });
}

export async function callMastraWorkflow(
  workflowId: string,
  input: Record<string, unknown>,
) {
  const response = await fetch(
    `${getMastraUrl()}/api/workflows/${workflowId}/start-async`,
    {
      method: "POST",
      headers: mastraHeaders(),
      body: JSON.stringify({ inputData: input }),
    },
  );

  const json = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(
      typeof json?.message === "string"
        ? json.message
        : `Mastra workflow failed with ${response.status}`,
    );
  }

  return json;
}

export async function callIngestionWorkflow(input: Record<string, unknown>) {
  return callMastraWorkflow(INGESTION_WORKFLOW_ID, input);
}

export async function callMastraAgent(
  agentId: string,
  message: string,
  context?: Record<string, unknown>,
) {
  const response = await fetch(
    `${getMastraUrl()}/api/agents/${agentId}/generate`,
    {
      method: "POST",
      headers: mastraHeaders(),
      body: JSON.stringify({ message, context }),
    },
  );

  return response.json();
}
