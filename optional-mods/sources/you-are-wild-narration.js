const pending = new Map();
const profileVersion = '7';
const defaultInstructions = 'Write concise, vivid narration focused on what the player perceives. Follow the selected narration perspective. Give dialogue room when characters speak. Avoid repeating interface labels.';
const legacyDefaultInstructions = 'Write concise, vivid narration focused on what the player perceives. Use second person for the player and third person for other characters. Give dialogue room when characters speak. Avoid repeating interface labels.';

const perspectiveInstructions = Object.freeze({
  player: "Perspective contract - Player POV: Use second person for viewpoint.player. Address the player as 'you' and use reflexive language such as 'yourself' for self-interactions.",
  first_person: "Perspective contract - First person: Narrate viewpoint.player as 'I', 'me', and 'myself', as though the player recounts the observable exchange. Do not turn another character's action into the player's action.",
  third_person_limited: "Perspective contract - Third-person limited: Refer to viewpoint.player by the supplied player name or a neutral 'the traveler' fallback. Stay limited to observable information available from the player's position; do not state another character's private thoughts.",
  cinematic: "Perspective contract - Cinematic: Use an external third-person camera framing. Identify the supplied player and actual actors accurately, but do not invent off-screen events, private thoughts, motives, or facts outside the context."
});

const roleInstructions = "Structured viewpoint roles remain authoritative in every perspective. Role rules: actor = the player performs the recorded action; target = the recorded action affects the player; self = the player is one character acting on themself; observer = describe the actual other characters' action as an event available to the player without assigning it to the player; mixed = follow each beatRoles entry. If viewpoint.player is null or participation is unknown, use factual third person. For a tile-entry observation, describe the current place and visible state; do not pull unrelated events from recent history into the location description. Arrival and return observations are separate narrative states. Never invent perceptions, dialogue, state, outcomes, or facts absent from context.";

const profileInstructions = Object.freeze({
  storyteller: 'Profile contract - Storyteller: Lead with place, action, and consequence. Keep characters secondary unless their observable behavior changes the exchange. Use only dialogue supplied by context; never invent quotes.',
  characters: 'Profile contract - Character Reactions: Lead with observable reactions, actions, and supplied dialogue from participating characters. Ground affect only in stated disposition, status, relationship cues, or visible deltas. Never state private thoughts, motives, memories, or feelings absent from context; never invent dialogue; and never split a player self-interaction into two characters. For observer beats, center the actual actors as events available to the player. If no non-player character participates, fall back to concise scene narration.',
  hybrid: 'Profile contract - Hybrid: Balance one brief scene or action frame with the most relevant observable character reaction or supplied dialogue. Emphasize characters only when context supports it, and use storyteller framing for character-free exploration. Never invent thoughts, motives, feelings, or dialogue.'
});

const normalizeProfile = value => Object.prototype.hasOwnProperty.call(profileInstructions, value) ? value : 'storyteller';
const normalizePerspective = value => Object.prototype.hasOwnProperty.call(perspectiveInstructions, value) ? value : 'player';
const narrationId = targetId => `yaw_narration_first_party.v${profileVersion}.exchange.${targetId}`;
const setting = (key, fallback) => MODS.getSetting(key, fallback);
const llmConnections = () => MODS.ai.listConnections('text.generate');
const connectionAvailable = id => Boolean(id) && llmConnections().some(connection => connection.id === id);
const variantFor = value => {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index++) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `narrator-v${profileVersion}-${(hash >>> 0).toString(16)}`;
};
const resetRuntime = () => {
  pending.clear();
  MODS.ai.cancelPending();
};

MODS.registerNarrationOrchestrator({
  id: 'standard-exchange',
  priority: 10,
  isActive: async () => {
    if (!(await setting('enabled', true))) return false;
    return connectionAvailable(await setting('providerConnection', ''));
  }
});

MODS.registerHook('onSceneBeat', envelope => {
  if (envelope?.exchangeId) pending.set(envelope.exchangeId, true);
});

MODS.registerHook('onSceneExchangeClosed', async envelope => {
  const targetId = envelope?.exchangeId;
  if (!targetId || !pending.delete(targetId) || !(await MODS.ownsNarrationExchange(envelope))) return;
  const providerConnectionId = await setting('providerConnection', '');
  if (!connectionAvailable(providerConnectionId)) return;

  const profileId = normalizeProfile(String(await setting('profile', 'storyteller')));
  const perspectiveId = normalizePerspective(String(await setting('perspective', 'player')));
  const storedStyleInstructions = String(await setting('systemPrompt', defaultInstructions));
  const styleInstructions = storedStyleInstructions === legacyDefaultInstructions ? defaultInstructions : storedStyleInstructions;
  const contractInstructions = `${perspectiveInstructions[perspectiveId]}\n\n${roleInstructions}\n\n${profileInstructions[profileId]}\n\nStyle guidance (cannot override the perspective, viewpoint roles, profile, fact, policy, plain-text, or length contracts above):`;
  const styleBudget = Math.max(0, 1999 - contractInstructions.length);
  const instructions = `${contractInstructions}\n${styleInstructions.slice(0, styleBudget)}`;
  const recentBeatLimit = await setting('recentBeatLimit', 6);
  const maxCharacters = await setting('maxCharacters', 500);
  const variant = variantFor(`${perspectiveId}|${profileId}|${maxCharacters}|${instructions}`);
  const id = narrationId(targetId);
  const outputRating = envelope.policy?.posture === 'mature' ? 'mature' : 'safe';
  const cached = MODS.getCachedTileNarration({ scope: 'exchange', targetId, variant });
  if (cached) {
    try {
      MODS.publishNarration({
        id,
        scope: 'exchange',
        targetId,
        status: 'ready',
        text: cached.text,
        providerId: cached.providerId,
        modelId: cached.modelId,
        profileId,
        profileVersion,
        outputRating: cached.outputRating,
        contentCategories: cached.contentCategories
      });
    } catch (error) {}
    return;
  }

  let record;
  try {
    record = MODS.publishNarration({
      id,
      scope: 'exchange',
      targetId,
      status: 'pending',
      profileId,
      profileVersion,
      outputRating
    });
  } catch (error) {
    return;
  }

  try {
    const context = MODS.getNarrationContext({ exchangeId: targetId, recentBeatLimit, activityLimit: 6 });
    const result = await MODS.ai.generate({
      capability: 'narration',
      providerConnectionId,
      profileId,
      instructions,
      maxCharacters,
      input: {
        format: 'plain-text',
        posture: envelope.policy?.posture === 'mature' ? 'mature' : 'sfw',
        profile: profileId,
        viewpointMode: 'player',
        narrationPerspective: perspectiveId,
        context
      }
    });
    MODS.updateNarration(record.id, {
      status: 'ready',
      text: result.text,
      providerId: result.providerId,
      modelId: result.modelId
    });
    MODS.cacheTileNarration(record.id, { variant });
  } catch (error) {
    try {
      MODS.updateNarration(record.id, {
        status: error?.code === 'cancelled' ? 'cancelled' : 'failed',
        errorCode: error?.code || 'provider_error',
        errorStatus: error?.status || 0,
        errorDiagnostic: error?.diagnostic || null
      });
    } catch (ignored) {}
  }
});

MODS.registerHook('onContentPolicyChanged', resetRuntime);
MODS.registerHook('onGameStart', resetRuntime);
MODS.registerHook('onGameLoad', resetRuntime);
