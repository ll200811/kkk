import { createConfiguredContextWindowResolver } from '@cindy/app-runtime/modelContextSettings';
import { isCodexGatewayWireModel, type AgentKind, type Catalog, type Effort } from '@cindy/model-providers';

import { desktopCodexAuthAdapter, readClaudeApiKey } from './auth-adapters.js';
import { hasClaudeNativeLogin } from './claude-native-auth.js';
import { gatewayDefaultRouteDecision } from './provider-route.js';
import { resolveModelContextProviderId, resolveVerifiedContextWindow } from './catalog-to-descriptors.js';
import { readModelContextLimit } from './model-context-limit-store.js';

/** Shared settings identity for startup, refresh and history protection of implicit routes. */
export function resolveDesktopModelContextProviderId(
  catalog: Pick<Catalog, 'providers'>,
  agent: AgentKind,
  providerId: string | null | undefined,
  modelId: string,
): string | null {
  const source = resolveModelContextProviderId(catalog, agent, providerId, modelId);
  if (source || providerId) return source;
  // Implicit Claude sessions use the gateway whenever a gateway key exists; only without one
  // do they fall back to the local Claude Code login (same order as the Claude auth adapter).
  // Codex's ordinary implicit models instead inherit subscription-first spawn credentials.
  const defaultSource = agent === 'claude-code'
    ? gatewayDefaultRouteDecision(agent, readClaudeApiKey()) ? 'xd'
      : hasClaudeNativeLogin() ? 'anthropic' : null
    : agent === 'codex'
      ? isCodexGatewayWireModel(modelId) ? 'xd'
        : desktopCodexAuthAdapter.hasCodexOAuthLoginReadOnly() ? 'openai' : 'xd'
      : null;
  return resolveModelContextProviderId(catalog, agent, providerId, modelId, defaultSource);
}

/**
 * Efforts declared by the route this session actually uses. Same-ID models from different
 * providers can declare different efforts; null means the route is unknown or ambiguous.
 */
export function resolveDesktopModelEfforts(
  catalog: Pick<Catalog, 'providers'>,
  agent: AgentKind,
  providerId: string | null | undefined,
  modelId: string,
): readonly Effort[] | null {
  const source = resolveDesktopModelContextProviderId(catalog, agent, providerId, modelId);
  if (!source) return null;
  return catalog.providers.find((provider) => provider.id === source)
    ?.models[agent]?.find((model) => model.id === modelId)?.efforts ?? null;
}

/** Working budgets can tighten history protection, but never raise its verified ceiling. */
export const resolveConfiguredContextWindow = createConfiguredContextWindowResolver({resolveDesktopModelContextProviderId, readModelContextLimit});
