import { createBotImLaneRuntime } from '@cindy/app-runtime/botImLaneRuntime';
import { getDbClient } from '../../localDb/client/current';
import { createLogger } from '../../logger';
import { readBotImConnection } from './botImConnectionStore';
export type { BotImLaneRuntimeDeps, BotImLaneLink, BotImLaneActivity, BotImLaneStore, BotImLaneListOptions } from '@cindy/app-runtime/botImLaneRuntime';
export const { configureBotImLaneRuntime, parseLaneRouteKey, listBotImConnectionLanes, resetBotImConnectionLane, __testing }=createBotImLaneRuntime({getDbClient,readBotImConnection,log:createLogger('im:bot-lanes')});
