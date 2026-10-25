import {activeOwnerScopeKey} from '../../appSessionState.js';
import {desktopMakerLogger} from '../../maker-host/logger-adapter.js';
import {ownerScopedImUserDataPath} from '../ownerScopedStorage.js';
import {createBotImConnectionStore} from '@cindy/app-runtime/botImConnectionStore';
export {isBotImChannel,isBotImConnectionId,secretKeyPrefixFor} from '@cindy/app-runtime/botImConnectionStore';
export const {listBotImConnections,readBotImConnection,listBotImConnectionsForBot,addBotImConnectionRecord,updateBotImConnectionRecord,setBotImConnectionGroupActivation,removeBotImConnectionRecord}=createBotImConnectionStore({filePath:()=>ownerScopedImUserDataPath('bot-im-connections.json'),scopeKey:activeOwnerScopeKey,log:desktopMakerLogger.child('bot-im-connection-store')});
