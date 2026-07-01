
/**
 * Minimal Binary Serializer for FightFuckFeed.me
 * ~500 lines, zero dependencies
 * Preencode/encode/decode/state pattern (inspired by compact-encoding)
 */
(function() {
  'use strict';

  const Binary = (function() {
    const state = (start = 0, end = 0, buffer = null) => ({ start, end, buffer });

    const uint8 = {
      preencode(s, n) { s.end += 1; },
      encode(s, n) { s.buffer[s.start++] = n & 0xff; },
      decode(s) { return s.buffer[s.start++]; }
    };

    const uint16 = {
      preencode(s, n) { s.end += 2; },
      encode(s, n) { s.buffer[s.start++] = n & 0xff; s.buffer[s.start++] = (n >> 8) & 0xff; },
      decode(s) { return s.buffer[s.start++] + (s.buffer[s.start++] << 8); }
    };

    const uint32 = {
      preencode(s, n) { s.end += 4; },
      encode(s, n) { s.buffer[s.start++] = n & 0xff; s.buffer[s.start++] = (n >> 8) & 0xff; s.buffer[s.start++] = (n >> 16) & 0xff; s.buffer[s.start++] = (n >> 24) & 0xff; },
      decode(s) { return s.buffer[s.start++] + (s.buffer[s.start++] << 8) + (s.buffer[s.start++] << 16) + (s.buffer[s.start++] << 24); }
    };

    const int8 = {
      preencode(s, n) { s.end += 1; },
      encode(s, n) { s.buffer[s.start++] = (n < 0 ? 256 + n : n) & 0xff; },
      decode(s) { const n = s.buffer[s.start++]; return n > 127 ? n - 256 : n; }
    };

    const int16 = {
      preencode(s, n) { s.end += 2; },
      encode(s, n) { uint16.encode(s, n < 0 ? n + 65536 : n); },
      decode(s) { const n = uint16.decode(s); return n > 32767 ? n - 65536 : n; }
    };

    const int32 = {
      preencode(s, n) { s.end += 4; },
      encode(s, n) { uint32.encode(s, n < 0 ? n + 4294967296 : n); },
      decode(s) { const n = uint32.decode(s); return n > 2147483647 ? n - 4294967296 : n; }
    };

    // Variable-length unsigned int
    const vuint = {
      preencode(s, n) { s.end += n <= 0xfc ? 1 : n <= 0xffff ? 3 : n <= 0xffffffff ? 5 : 9; },
      encode(s, n) {
        if (n <= 0xfc) uint8.encode(s, n);
        else if (n <= 0xffff) { uint8.encode(s, 0xfd); uint16.encode(s, n); }
        else if (n <= 0xffffffff) { uint8.encode(s, 0xfe); uint32.encode(s, n); }
        else { uint8.encode(s, 0xff); uint32.encode(s, n); uint32.encode(s, 0); }
      },
      decode(s) {
        const a = uint8.decode(s);
        if (a <= 0xfc) return a;
        if (a === 0xfd) return uint16.decode(s);
        if (a === 0xfe) return uint32.decode(s);
        return uint32.decode(s); // truncated 64-bit
      }
    };

    const bool = {
      preencode(s, n) { s.end += 1; },
      encode(s, n) { s.buffer[s.start++] = n ? 1 : 0; },
      decode(s) { return s.buffer[s.start++] === 1; }
    };

    const string = {
      preencode(s, str) { const bytes = new TextEncoder().encode(str); vuint.preencode(s, bytes.length); s.end += bytes.length; },
      encode(s, str) { const bytes = new TextEncoder().encode(str); vuint.encode(s, bytes.length); s.buffer.set(bytes, s.start); s.start += bytes.length; },
      decode(s) { const len = vuint.decode(s); const bytes = s.buffer.subarray(s.start, s.start + len); s.start += len; return new TextDecoder().decode(bytes); }
    };

    const array = (enc) => ({
      preencode(s, arr) { vuint.preencode(s, arr.length); for (const item of arr) enc.preencode(s, item); },
      encode(s, arr) { vuint.encode(s, arr.length); for (const item of arr) enc.encode(s, item); },
      decode(s) { const len = vuint.decode(s); const arr = []; for (let i = 0; i < len; i++) arr.push(enc.decode(s)); return arr; }
    });

    const optional = (enc) => ({
      preencode(s, val) { if (val !== null && val !== undefined) { bool.preencode(s, true); enc.preencode(s, val); } else bool.preencode(s, false); },
      encode(s, val) { if (val !== null && val !== undefined) { bool.encode(s, true); enc.encode(s, val); } else bool.encode(s, false); },
      decode(s) { return bool.decode(s) ? enc.decode(s) : null; }
    });

    const json = {
      preencode(s, val) { string.preencode(s, JSON.stringify(val)); },
      encode(s, val) { string.encode(s, JSON.stringify(val)); },
      decode(s) { return JSON.parse(string.decode(s)); }
    };

    const encode = (codec, val) => { const s = state(); codec.preencode(s, val); s.buffer = new Uint8Array(s.end); s.start = 0; codec.encode(s, val); return s.buffer; };
    const decode = (codec, buffer) => codec.decode(state(0, buffer.length, buffer));

    return { state, uint8, uint16, uint32, int8, int16, int32, vuint, bool, string, array, optional, json, encode, decode };
  })();

  // Save codecs
  Binary.codecs = {
    // Unit stats
    stats: {
      preencode(s, obj) {
        Binary.vuint.preencode(s, obj.str); Binary.vuint.preencode(s, obj.con);
        Binary.vuint.preencode(s, obj.spd); Binary.vuint.preencode(s, obj.int);
        Binary.vuint.preencode(s, obj.wis); Binary.vuint.preencode(s, obj.cha);
      },
      encode(s, obj) {
        Binary.vuint.encode(s, obj.str); Binary.vuint.encode(s, obj.con);
        Binary.vuint.encode(s, obj.spd); Binary.vuint.encode(s, obj.int);
        Binary.vuint.encode(s, obj.wis); Binary.vuint.encode(s, obj.cha);
      },
      decode(s) {
        return { str: Binary.vuint.decode(s), con: Binary.vuint.decode(s), spd: Binary.vuint.decode(s), int: Binary.vuint.decode(s), wis: Binary.vuint.decode(s), cha: Binary.vuint.decode(s) };
      }
    },
    // Unit (player/ally/enemy)
    unit: {
      preencode(s, obj) {
        Binary.string.preencode(s, obj.name); Binary.string.preencode(s, obj.species);
        Binary.string.preencode(s, obj.icon); Binary.string.preencode(s, obj.gender || 'female');
        Binary.string.preencode(s, obj.disposition || 'party');
        Binary.vuint.preencode(s, obj.level); Binary.vuint.preencode(s, obj.CPun || obj.hp || 100);
        Binary.vuint.preencode(s, obj.MPun || obj.maxHp || 100); Binary.vuint.preencode(s, obj.CPle || 0);
        Binary.vuint.preencode(s, obj.MPle || 100); Binary.codecs.stats.preencode(s, obj.stats || obj);
        Binary.array(Binary.string).preencode(s, obj.tags || []);
        Binary.array(Binary.string).preencode(s, obj.bodyParts || []);
        Binary.json.preencode(s, obj.stomach || []); Binary.json.preencode(s, obj.womb || []);
        Binary.json.preencode(s, obj.balls || []); Binary.vuint.preencode(s, obj.cum || 0);
      },
      encode(s, obj) {
        Binary.string.encode(s, obj.name); Binary.string.encode(s, obj.species);
        Binary.string.encode(s, obj.icon); Binary.string.encode(s, obj.gender || 'female');
        Binary.string.encode(s, obj.disposition || 'party');
        Binary.vuint.encode(s, obj.level); Binary.vuint.encode(s, obj.CPun || obj.hp || 100);
        Binary.vuint.encode(s, obj.MPun || obj.maxHp || 100); Binary.vuint.encode(s, obj.CPle || 0);
        Binary.vuint.encode(s, obj.MPle || 100); Binary.codecs.stats.encode(s, obj.stats || obj);
        Binary.array(Binary.string).encode(s, obj.tags || []);
        Binary.array(Binary.string).encode(s, obj.bodyParts || []);
        Binary.json.encode(s, obj.stomach || []); Binary.json.encode(s, obj.womb || []);
        Binary.json.encode(s, obj.balls || []); Binary.vuint.encode(s, obj.cum || 0);
      },
      decode(s) {
        return { name: Binary.string.decode(s), species: Binary.string.decode(s), icon: Binary.string.decode(s), gender: Binary.string.decode(s), disposition: Binary.string.decode(s), level: Binary.vuint.decode(s), CPun: Binary.vuint.decode(s), MPun: Binary.vuint.decode(s), CPle: Binary.vuint.decode(s), MPle: Binary.vuint.decode(s), stats: Binary.codecs.stats.decode(s), tags: Binary.array(Binary.string).decode(s), bodyParts: Binary.array(Binary.string).decode(s), stomach: Binary.json.decode(s), womb: Binary.json.decode(s), balls: Binary.json.decode(s), cum: Binary.vuint.decode(s) };
      }
    },
    // Full save
    save: {
      preencode(s, obj) {
        Binary.vuint.preencode(s, obj.version); Binary.string.preencode(s, obj.playerName);
        Binary.string.preencode(s, obj.playerSpecies); Binary.int32.preencode(s, obj.locationX);
        Binary.int32.preencode(s, obj.locationY); Binary.vuint.preencode(s, obj.playerHp);
        Binary.vuint.preencode(s, obj.playerMaxHp); Binary.codecs.stats.preencode(s, obj.playerStats);
        Binary.vuint.preencode(s, obj.playerLevel); Binary.array(Binary.codecs.unit).preencode(s, obj.party || []);
        Binary.array(Binary.string).preencode(s, obj.log || []); Binary.string.preencode(s, obj.currentBiome || 'forest');
        Binary.json.preencode(s, obj.worldMap || {}); Binary.json.preencode(s, obj.exploredTiles || []);
        Binary.json.preencode(s, obj.inventory || []);
        Binary.vuint.preencode(s, obj.timeHour || 0);
        Binary.json.preencode(s, obj.questState || {});
      },
      encode(s, obj) {
        Binary.vuint.encode(s, obj.version); Binary.string.encode(s, obj.playerName);
        Binary.string.encode(s, obj.playerSpecies); Binary.int32.encode(s, obj.locationX);
        Binary.int32.encode(s, obj.locationY); Binary.vuint.encode(s, obj.playerHp);
        Binary.vuint.encode(s, obj.playerMaxHp); Binary.codecs.stats.encode(s, obj.playerStats);
        Binary.vuint.encode(s, obj.playerLevel); Binary.array(Binary.codecs.unit).encode(s, obj.party || []);
        Binary.array(Binary.string).encode(s, obj.log || []); Binary.string.encode(s, obj.currentBiome || 'forest');
        Binary.json.encode(s, obj.worldMap || {}); Binary.json.encode(s, obj.exploredTiles || []);
        Binary.json.encode(s, obj.inventory || []);
        Binary.vuint.encode(s, obj.timeHour || 0);
        Binary.json.encode(s, obj.questState || {});
      },
      decode(s) {
        const version = Binary.vuint.decode(s);
        const result = {
          version: version,
          playerName: Binary.string.decode(s),
          playerSpecies: Binary.string.decode(s),
          locationX: Binary.int32.decode(s),
          locationY: Binary.int32.decode(s),
          playerHp: Binary.vuint.decode(s),
          playerMaxHp: Binary.vuint.decode(s),
          playerStats: Binary.codecs.stats.decode(s),
          playerLevel: Binary.vuint.decode(s),
          party: Binary.array(Binary.codecs.unit).decode(s),
          log: Binary.array(Binary.string).decode(s),
          currentBiome: Binary.string.decode(s),
          worldMap: {},
          exploredTiles: []
        };
        if (s.start < s.end) {
          try { result.worldMap = Binary.json.decode(s); } catch(e) { result.worldMap = {}; }
        }
        if (s.start < s.end) {
          try { result.exploredTiles = Binary.json.decode(s); } catch(e) { result.exploredTiles = []; }
        }
        if (version >= 3 && s.start < s.end) {
          try { result.inventory = Binary.json.decode(s); } catch(e) { result.inventory = []; }
        } else {
          result.inventory = [];
        }
        if (version >= 5 && s.start < s.end) {
          try { result.timeHour = Binary.vuint.decode(s); } catch(e) { result.timeHour = 8; }
        } else {
          result.timeHour = 8;
        }
        if (version >= 6 && s.start < s.end) {
          try { result.questState = Binary.json.decode(s); } catch(e) { result.questState = {}; }
        } else {
          result.questState = {};
        }
        return result;
      }
    }
  };

  // Save/load helpers
  Binary.saveGame = (appState) => {
    // Convert Map/Set to plain objects for serialization
    const worldMapObj = {};
    if (appState.worldMap) {
        for (const [key, tile] of appState.worldMap.entries()) {
            worldMapObj[key] = tile;
        }
    }
    const exploredArray = appState.exploredTiles ? Array.from(appState.exploredTiles) : [];

    const saveData = {
      version: 7,
      playerName: appState.player?.name || 'You',
      playerSpecies: appState.player?.species || 'human',
      locationX: appState.location?.x || 0,
      locationY: appState.location?.y || 0,
      playerHp: appState.player?.CPun || 100,
      playerMaxHp: appState.player?.MPun || 100,
      playerStats: appState.player?.stats || { str: 10, con: 10, spd: 10, int: 10, wis: 10, cha: 10 },
      playerLevel: appState.player?.level || 1,
      party: appState.party || [],
      log: appState.log?.map(e => e.text) || [],
      currentBiome: appState.currentBiome || 'forest',
      worldMap: worldMapObj,
      exploredTiles: exploredArray,
      inventory: appState.inventory || [],
      timeHour: appState.timeHour || 0,
      questState: {
        quests: appState.quests || [],
        playerGold: appState.player?.gold || 0,
        dayCount: appState.dayCount || 0
      }
    };
    return Binary.encode(Binary.codecs.save, saveData);
  };

  Binary.loadGame = (buffer) => {
    return Binary.decode(Binary.codecs.save, new Uint8Array(buffer));
  };

  window.Binary = Binary;
})();
