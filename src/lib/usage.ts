// src/lib/usage.ts
import type { LanguageModelUsage } from 'ai';
import type { TokenCosts } from 'tokenlens/helpers';

export type TokenUsage = {
    usage: LanguageModelUsage,
    costs?: TokenCosts,
    modelName?: string,
}