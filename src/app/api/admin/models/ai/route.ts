import { NextResponse } from "next/server";
import { gateway } from "@ai-sdk/gateway";

type GatewayModel = {
  id: string;
  name: string;
  description?: string | null;
};

export async function GET() {
  try {
    const availableModels = await gateway.getAvailableModels();

    const models = availableModels.models.map((m: GatewayModel) => {
      const [provider] = m.id.includes("/") ? m.id.split("/", 2) : ["unknown"];
      const providerName =
        provider.charAt(0).toUpperCase() + provider.slice(1).toLowerCase();

      return {
        id: m.id,
        name: m.name,
        provider: providerName,
        description: m.description ?? null,
      } satisfies {
        id: string;
        name: string;
        provider: string;
        description: string | null;
      };
    });

    return NextResponse.json({ models });
  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error(String(error));
    console.error("Failed to fetch models:", err);
    return NextResponse.json(
      { error: "Failed to fetch models" },
      { status: 500 }
    );
  }
}
