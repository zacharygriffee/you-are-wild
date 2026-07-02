
/**
 * CONTENT TEMPLATE SYSTEM
 * Preference-gated content with template literal rendering
 */

const CONTENT_SYSTEM = {
    STORAGE_KEY: 'yaw-content-prefs',
    LEGACY_STORAGE_KEY: 'fff-content-prefs',

    // Content rating tiers
    TIERS: {
        SAFE: 0,      // Combat, exploration, no suggestive content
        MATURE: 1,    // Violence, suggestive themes, implied content
        ADULT: 2      // Explicit content (user must opt in)
    },
    
    // Default preferences - ADULT by default
    preferences: {
        maxTier: 2,           // Default: ADULT (show all content)
        voreEnabled: true,    // Vore enabled by default (core mechanic)
        explicitDescriptions: true,  // Explicit by default
        filterTags: [],       // User can block specific tags if desired
        language: 'en'
    },

    locales: {
        en: {
            'settings.language': 'Language',
            'settings.language.en': 'English',
            'settings.language.es': 'Spanish',
            'action.fight': 'Fight',
            'action.flirt': 'Flirt',
            'action.fuck': 'Fuck',
            'action.fuck.sfw': 'Seduce',
            'action.feast': 'Feast',
            'action.feast.sfw': 'Consume',
            'action.feed': 'Feed',
            'action.flee': 'Flee',
            'action.moveRow': 'Move Row',
            'action.sync': 'Sync',
            'action.skip': 'Skip',
            'action.search': 'Search',
            'action.rest': 'Rest',
            'action.inventory': 'Items',
            'action.stats': 'Stats',
            'action.quests': 'Quests',
            'action.acceptQuest': 'Accept Quest',
            'action.viewQuest': 'View Quest',
            'action.trade': 'Trade',
            'action.acceptQuestFrom': 'Accept quest from {name}',
            'action.viewQuestFrom': 'View quest from {name}',
            'action.tradeWith': 'Trade with {name}',
            'action.loot': 'Loot',
            'action.scavenge': 'Scavenge',
            'action.interact': 'Interact',
            'action.inspect': 'Inspect',
            'action.recruit': 'Recruit',
            'action.enter': 'Enter',
            'action.exit': 'Exit',
            'action.map': 'Map',
            'action.party': 'Party',
            'action.enemies': 'Enemies',
            'inventory.use': 'Use',
            'inventory.equip': 'Equip',
            'inventory.drop': 'Drop',
            'inventory.unequip': 'Unequip',
            'inventory.back': 'Back',
            'inventory.useItem': 'Use {name}',
            'inventory.equipItem': 'Equip {name}',
            'inventory.dropItem': 'Drop {name}',
            'inventory.unequipSlot': 'Unequip {slot}',
            'trade.buy': 'Buy',
            'trade.sell': 'Sell',
            'trade.buyItem': 'Buy {name}',
            'trade.sellItem': 'Sell {name}',
            'quest.title': 'Quests',
            'quest.status': 'Status',
            'quest.sort': 'Sort',
            'quest.filter.all': 'All',
            'quest.filter.active': 'Active',
            'quest.filter.turnIn': 'Turn In',
            'quest.filter.completed': 'Completed',
            'quest.sort.status': 'Status',
            'quest.sort.title': 'Title',
            'quest.showOnMap': 'Show On Map',
            'quest.showTurnIn': 'Show Turn-In',
            'quest.turnIn': 'Turn In',
            'quest.showOnMapFor': 'Show {name} on map',
            'quest.showTurnInFor': 'Show turn-in for {name}',
            'quest.turnInQuest': 'Turn in {name}',
            'perk.choose': 'Choose Perk',
            'perk.chooseCount': 'Choose Perk ({count})',
            'perk.pending': 'Pending choices: {count}',
            'perk.trees': 'Perk trees',
            'perk.filter.all': 'All',
            'perk.chooseNamed': 'Choose {name}',
            'perk.back': 'Back',
            'perk.respec': 'Respec Perks',
            'perk.debugGrant': 'Debug +1 Perk Choice',
            'perk.closeStats': 'Close',
            'ui.close': 'Close',
            'ui.cancel': 'Cancel',
            'ui.creatureActions': 'Creature actions',
            'ui.partyActions': 'Party actions',
            'ui.exploration': 'Exploration',
            'ui.chooseAction': 'Choose your next action.',
            'ui.area': 'Area',
            'ui.enemies': 'Enemies',
            'ui.creatures': 'Creatures',
            'ui.noCreaturesPresent': 'No creatures present',
            'ui.noCreaturesHere': 'No creatures here',
            'target.chooseFromPanel': 'Select a target from the creature panel.',
            'target.cancelAction': 'Cancel {action}',
            'log.movedTo': 'Moved to {x}, {y} ({biome})',
            'log.inCombatCannotMove': 'You are in combat! Use Flee to escape.',
            'log.discoveredLandmark': 'Discovered {name}!',
            'log.restUnavailable': 'There is no safe place to rest here.',
            'log.rested': 'Rested and recovered.',
            'recruit.partyFull': 'Party is full! Cannot recruit {name}',
            'recruit.notReady': '{name} is not ready to join the party.',
            'recruit.joined': '{name} joins your party!',
            'feed.optionsTitle': 'Feed Options',
            'feed.noOptions': 'No feed options available right now.',
            'feed.noWoundedAllies': 'No wounded allies to feed.',
            'feed.noWillingLivestock': 'No willing livestock to sacrifice.',
            'feed.noForceFeedEnemies': 'No enemies to force-feed.',
            'feed.noValidTarget': 'No valid target for this feed action.',
            'disposition.hostile': 'Hostile',
            'disposition.friendly': 'Friendly',
            'disposition.neutral': 'Neutral',
            'disposition.quest': 'Quest',
            'disposition.merchant': 'Merchant',
            'disposition.remains': 'Remains',
            'combat.row': 'Row',
            'combat.row.front': 'Front',
            'combat.row.back': 'Back',
            'combat.moveRowLog': '{name} moves to the {row} row.',
            'combat.cannotReachTarget': '{actor} cannot reach {target} from here.',
            'combat.flee.noEnemies': 'No enemies to flee from!',
            'combat.flee.success': 'You flee successfully!',
            'combat.flee.failed': 'Flee failed! {name} intercepts you!',
            'combat.sync.chooseAction': 'Choose Sync Action',
            'combat.sync.noAllies': 'No allies available for sync.',
            'combat.sync.action.fuck': 'Group Seduce',
            'combat.sync.action.flirt': 'Group Flirt',
            'combat.sync.action.fight': 'Group Fight',
            'combat.sync.action.feed': 'Group Feed',
            'combat.sync.selectParticipants': 'Select participants for sync',
            'combat.sync.selectParticipantFor': 'Select {name} for sync',
            'combat.sync.confirmParticipants': 'Confirm Participants',
            'combat.sync.needParticipants': 'Need at least 2 participants for a sync action.',
            'combat.sync.selectTarget': 'Select sync target',
            'combat.sync.selectTargetFor': 'Select {name} as sync target',
            'capacity.stomach': 'Stomach',
            'capacity.womb': 'Womb',
            'capacity.balls': 'Balls',
            'party.stats': 'Stats',
            'party.you': 'You',
            'party.ally': 'Ally',
            'party.leader': 'Leader',
            'party.levelSpecies': 'Level {level} {species}',
            'party.punishment': 'Punishment',
            'party.pleasure': 'Pleasure',
            'party.combat': 'Combat',
            'party.attributes': 'Attributes',
            'party.capacity': 'Capacity',
            'party.equipment': 'Equipment',
            'party.perks': 'Perks',
            'party.none': 'None',
            'character.xp': 'XP: {xp}/{xpToNext}',
            'character.combatStats': 'Combat Stats',
            'character.body': 'Body',
            'character.size': 'Size',
            'character.appetite': 'Appetite',
            'character.parts': 'Parts',
            'character.chest': 'Chest',
            'character.bodyParts': 'Body',
            'character.perkTools': 'Perk Tools',
            'character.perkToolsHelp': 'Balance/debug controls.',
            'party.makeLeader': 'Make Leader',
            'party.role': 'Role',
            'party.aiOrder': 'AI Order',
            'party.role.companion': 'Companion',
            'party.role.scout': 'Scout',
            'party.role.guard': 'Guard',
            'party.role.support': 'Support',
            'party.role.gatherer': 'Gatherer',
            'party.aiOrder.aggressive': 'Aggressive',
            'party.aiOrder.defensive': 'Defensive',
            'party.aiOrder.healer': 'Healer',
            'party.aiOrder.scavenger': 'Scavenger',
            'party.aiOrder.passive': 'Passive',
            'party.dismiss': 'Dismiss',
            'party.statsFor': 'Show stats for {name}',
            'party.makeLeaderFor': 'Make {name} party leader',
            'party.dragToReorder': 'Drag {name} to reorder',
            'party.moveUp': 'Move {name} up',
            'party.moveDown': 'Move {name} down',
            'party.dismissFor': 'Dismiss {name}',
            'party.confirmDismiss': 'Dismiss {name} from the party?',
            'party.dismissed': '{name} leaves the party.',
            'party.dismissedNearby': '{name} leaves the party and remains nearby.',
            'party.roleFor': 'Party role for {name}',
            'party.aiOrderFor': 'AI order for {name}',
            'save.title': 'Save Slots',
            'save.newTitle': 'Choose New Game Slot',
            'save.description': 'Auto-save is always on. Empty slots start a new game; occupied slots can load, start a new run, save over, or delete only that slot.',
            'save.newDescription': 'Pick an empty slot for the new run, or deliberately overwrite an occupied slot.',
            'save.toolbarNew': 'New Game',
            'save.toolbarHint': 'Choose a slot next; occupied slots warn before overwrite.',
            'save.slotLabel': 'Slot {number}',
            'save.savedGame': 'Saved game',
            'save.openSlot': 'Open slot',
            'save.empty': 'Empty',
            'save.useEmpty': 'Use Empty Slot',
            'save.overwriteSlot': 'Overwrite Slot',
            'save.newRun': 'New Run',
            'save.load': 'Load',
            'save.save': 'Save',
            'save.delete': 'Delete',
            'save.close': 'Close',
            'save.action.newGame': 'Choose a slot for a new game',
            'save.action.useEmpty': 'Start new game in {slot}',
            'save.action.overwrite': 'Overwrite {slot} with a new game',
            'save.action.newRun': 'Start a new run in {slot}',
            'save.action.load': 'Load {slot}',
            'save.action.save': 'Save current game to {slot}',
            'save.action.delete': 'Delete {slot}',
            'save.confirm.newGameOverwrite': 'Start a new game in {slot}? This will overwrite that save slot. This cannot be undone.',
            'save.confirm.manualOverwrite': 'Overwrite {slot} with the current game? This cannot be undone.',
            'save.confirm.deleteSlot': 'Delete save slot {slot}? This permanently removes only this slot and cannot be undone.',
            'save.error.noGame': 'No game to save!',
            'save.error.noSave': 'No save in {slot}',
            'save.success.saved': 'Game saved to {slot}!',
            'save.error.saveFailed': 'Save failed: {message}',
            'save.error.loadFailed': 'Load failed: {message}',
            'save.error.deleteFailed': 'Delete failed: {message}',
            'save.recovery.prompt': 'Save data is incompatible or corrupted. Options:\n\n1 = Delete save\n2 = Download backup (as base64)\n3 = Cancel\n\nEnter 1, 2, or 3:',
            'save.recovery.deleted': 'Save deleted.',
            'save.recovery.backupDownloaded': 'Backup downloaded. Save remains intact.',
            'target.actors': 'Actors',
            'target.targets': 'Targets',
            'target.act': 'Act',
            'target.mark': 'Target',
            'target.selectActorFor': 'Select {name} to act',
            'target.markFor': 'Mark {name} as target',
            'target.selectAs': 'Select {name} as {action} target',
            'target.cannotSelectAs': 'Cannot select {name} as {action} target',
            'target.clear': 'Clear',
            'target.count': '{count} target',
            'target.count_plural': '{count} targets',
            'target.clearSelected': 'Clear selected targets'
        },
        es: {
            'settings.language': 'Idioma',
            'settings.language.en': 'Ingles',
            'settings.language.es': 'Espanol',
            'action.fight': 'Luchar',
            'action.flirt': 'Coquetear',
            'action.fuck': 'Seducir',
            'action.fuck.sfw': 'Seducir',
            'action.feast': 'Devorar',
            'action.feast.sfw': 'Consumir',
            'action.feed': 'Alimentar',
            'action.flee': 'Huir',
            'action.moveRow': 'Mover fila',
            'action.sync': 'Sincronizar',
            'action.skip': 'Saltar',
            'action.search': 'Buscar',
            'action.rest': 'Descansar',
            'action.inventory': 'Objetos',
            'action.stats': 'Estadisticas',
            'action.quests': 'Misiones',
            'action.acceptQuest': 'Aceptar mision',
            'action.viewQuest': 'Ver mision',
            'action.trade': 'Comerciar',
            'action.acceptQuestFrom': 'Aceptar mision de {name}',
            'action.viewQuestFrom': 'Ver mision de {name}',
            'action.tradeWith': 'Comerciar con {name}',
            'action.loot': 'Saquear',
            'action.scavenge': 'Rebuscar',
            'action.interact': 'Interactuar',
            'action.inspect': 'Inspeccionar',
            'action.recruit': 'Reclutar',
            'action.enter': 'Entrar',
            'action.exit': 'Salir',
            'action.map': 'Mapa',
            'action.party': 'Grupo',
            'action.enemies': 'Enemigos',
            'inventory.use': 'Usar',
            'inventory.equip': 'Equipar',
            'inventory.drop': 'Soltar',
            'inventory.unequip': 'Desequipar',
            'inventory.back': 'Volver',
            'inventory.useItem': 'Usar {name}',
            'inventory.equipItem': 'Equipar {name}',
            'inventory.dropItem': 'Soltar {name}',
            'inventory.unequipSlot': 'Desequipar {slot}',
            'trade.buy': 'Comprar',
            'trade.sell': 'Vender',
            'trade.buyItem': 'Comprar {name}',
            'trade.sellItem': 'Vender {name}',
            'quest.title': 'Misiones',
            'quest.status': 'Estado',
            'quest.sort': 'Ordenar',
            'quest.filter.all': 'Todas',
            'quest.filter.active': 'Activas',
            'quest.filter.turnIn': 'Entregar',
            'quest.filter.completed': 'Completadas',
            'quest.sort.status': 'Estado',
            'quest.sort.title': 'Titulo',
            'quest.showOnMap': 'Mostrar en mapa',
            'quest.showTurnIn': 'Mostrar entrega',
            'quest.turnIn': 'Entregar',
            'quest.showOnMapFor': 'Mostrar {name} en mapa',
            'quest.showTurnInFor': 'Mostrar entrega de {name}',
            'quest.turnInQuest': 'Entregar {name}',
            'perk.choose': 'Elegir mejora',
            'perk.chooseCount': 'Elegir mejora ({count})',
            'perk.pending': 'Opciones pendientes: {count}',
            'perk.trees': 'Arboles de mejoras',
            'perk.filter.all': 'Todas',
            'perk.chooseNamed': 'Elegir {name}',
            'perk.back': 'Volver',
            'perk.respec': 'Reiniciar mejoras',
            'perk.debugGrant': 'Debug +1 opcion de mejora',
            'perk.closeStats': 'Cerrar',
            'ui.close': 'Cerrar',
            'ui.cancel': 'Cancelar',
            'ui.creatureActions': 'Acciones de criatura',
            'ui.partyActions': 'Acciones del grupo',
            'ui.exploration': 'Exploracion',
            'ui.chooseAction': 'Elige tu proxima accion.',
            'ui.area': 'Area',
            'ui.enemies': 'Enemigos',
            'ui.creatures': 'Criaturas',
            'ui.noCreaturesPresent': 'No hay criaturas presentes',
            'ui.noCreaturesHere': 'No hay criaturas aqui',
            'target.chooseFromPanel': 'Selecciona un objetivo desde el panel de criaturas.',
            'target.cancelAction': 'Cancelar {action}',
            'log.movedTo': 'Movimiento a {x}, {y} ({biome})',
            'log.inCombatCannotMove': 'Estas en combate! Usa Huir para escapar.',
            'log.discoveredLandmark': 'Descubriste {name}!',
            'log.restUnavailable': 'No hay un lugar seguro para descansar aqui.',
            'log.rested': 'Descansaste y te recuperaste.',
            'recruit.partyFull': 'El grupo esta lleno! No se puede reclutar a {name}',
            'recruit.notReady': '{name} aun no esta listo para unirse al grupo.',
            'recruit.joined': '{name} se une a tu grupo!',
            'feed.optionsTitle': 'Opciones de alimentacion',
            'feed.noOptions': 'No hay opciones de alimentacion disponibles ahora.',
            'feed.noWoundedAllies': 'No hay aliados heridos para alimentar.',
            'feed.noWillingLivestock': 'No hay ganado dispuesto para sacrificar.',
            'feed.noForceFeedEnemies': 'No hay enemigos para forzar alimentacion.',
            'feed.noValidTarget': 'No hay objetivo valido para esta accion de alimentar.',
            'disposition.hostile': 'Hostil',
            'disposition.friendly': 'Amistoso',
            'disposition.neutral': 'Neutral',
            'disposition.quest': 'Mision',
            'disposition.merchant': 'Mercader',
            'disposition.remains': 'Restos',
            'combat.row': 'Fila',
            'combat.row.front': 'Frente',
            'combat.row.back': 'Retaguardia',
            'combat.moveRowLog': '{name} se mueve a la fila {row}.',
            'combat.cannotReachTarget': '{actor} no puede alcanzar a {target} desde aqui.',
            'combat.flee.noEnemies': 'No hay enemigos de los que huir!',
            'combat.flee.success': 'Huyes con exito!',
            'combat.flee.failed': 'Huida fallida! {name} te intercepta!',
            'combat.sync.chooseAction': 'Elegir accion sincronizada',
            'combat.sync.noAllies': 'No hay aliados disponibles para sincronizar.',
            'combat.sync.action.fuck': 'Seduccion grupal',
            'combat.sync.action.flirt': 'Coqueteo grupal',
            'combat.sync.action.fight': 'Ataque grupal',
            'combat.sync.action.feed': 'Alimentacion grupal',
            'combat.sync.selectParticipants': 'Seleccionar participantes para sincronizar',
            'combat.sync.selectParticipantFor': 'Seleccionar {name} para sincronizar',
            'combat.sync.confirmParticipants': 'Confirmar participantes',
            'combat.sync.needParticipants': 'Necesitas al menos 2 participantes para una accion sincronizada.',
            'combat.sync.selectTarget': 'Seleccionar objetivo sincronizado',
            'combat.sync.selectTargetFor': 'Seleccionar {name} como objetivo sincronizado',
            'capacity.stomach': 'Estomago',
            'capacity.womb': 'Vientre',
            'capacity.balls': 'Bolas',
            'party.stats': 'Estadisticas',
            'party.you': 'Tu',
            'party.ally': 'Aliado',
            'party.leader': 'Lider',
            'party.levelSpecies': 'Nivel {level} {species}',
            'party.punishment': 'Castigo',
            'party.pleasure': 'Placer',
            'party.combat': 'Combate',
            'party.attributes': 'Atributos',
            'party.capacity': 'Capacidad',
            'party.equipment': 'Equipo',
            'party.perks': 'Mejoras',
            'party.none': 'Ninguno',
            'character.xp': 'XP: {xp}/{xpToNext}',
            'character.combatStats': 'Estadisticas de combate',
            'character.body': 'Cuerpo',
            'character.size': 'Tamano',
            'character.appetite': 'Apetito',
            'character.parts': 'Partes',
            'character.chest': 'Pecho',
            'character.bodyParts': 'Cuerpo',
            'character.perkTools': 'Herramientas de mejoras',
            'character.perkToolsHelp': 'Controles de balance/debug.',
            'party.makeLeader': 'Hacer lider',
            'party.role': 'Rol',
            'party.aiOrder': 'Orden IA',
            'party.role.companion': 'Companero',
            'party.role.scout': 'Explorador',
            'party.role.guard': 'Guardia',
            'party.role.support': 'Apoyo',
            'party.role.gatherer': 'Recolector',
            'party.aiOrder.aggressive': 'Agresivo',
            'party.aiOrder.defensive': 'Defensivo',
            'party.aiOrder.healer': 'Sanador',
            'party.aiOrder.scavenger': 'Carronero',
            'party.aiOrder.passive': 'Pasivo',
            'party.dismiss': 'Despedir',
            'party.statsFor': 'Mostrar estadisticas de {name}',
            'party.makeLeaderFor': 'Hacer lider a {name}',
            'party.dragToReorder': 'Arrastrar {name} para reordenar',
            'party.moveUp': 'Mover {name} arriba',
            'party.moveDown': 'Mover {name} abajo',
            'party.dismissFor': 'Despedir a {name}',
            'party.confirmDismiss': 'Despedir a {name} del grupo?',
            'party.dismissed': '{name} deja el grupo.',
            'party.dismissedNearby': '{name} deja el grupo y permanece cerca.',
            'party.roleFor': 'Rol de grupo para {name}',
            'party.aiOrderFor': 'Orden IA para {name}',
            'save.title': 'Partidas',
            'save.newTitle': 'Elegir slot de partida nueva',
            'save.description': 'El autoguardado siempre esta activo. Los slots vacios empiezan una partida nueva; los ocupados pueden cargar, iniciar una nueva partida, guardar encima o borrar solo ese slot.',
            'save.newDescription': 'Elige un slot vacio para la nueva partida, o sobrescribe deliberadamente un slot ocupado.',
            'save.toolbarNew': 'Nueva partida',
            'save.toolbarHint': 'Elige un slot despues; los slots ocupados avisan antes de sobrescribir.',
            'save.slotLabel': 'Slot {number}',
            'save.savedGame': 'Partida guardada',
            'save.openSlot': 'Slot abierto',
            'save.empty': 'Vacio',
            'save.useEmpty': 'Usar slot vacio',
            'save.overwriteSlot': 'Sobrescribir slot',
            'save.newRun': 'Nueva partida',
            'save.load': 'Cargar',
            'save.save': 'Guardar',
            'save.delete': 'Borrar',
            'save.close': 'Cerrar',
            'save.action.newGame': 'Elegir un slot para una partida nueva',
            'save.action.useEmpty': 'Iniciar partida nueva en {slot}',
            'save.action.overwrite': 'Sobrescribir {slot} con una partida nueva',
            'save.action.newRun': 'Iniciar una nueva partida en {slot}',
            'save.action.load': 'Cargar {slot}',
            'save.action.save': 'Guardar partida actual en {slot}',
            'save.action.delete': 'Borrar {slot}',
            'save.confirm.newGameOverwrite': 'Iniciar partida nueva en {slot}? Esto sobrescribira ese slot. Esta accion no se puede deshacer.',
            'save.confirm.manualOverwrite': 'Sobrescribir {slot} con la partida actual? Esta accion no se puede deshacer.',
            'save.confirm.deleteSlot': 'Borrar el slot {slot}? Esto elimina permanentemente solo este slot y no se puede deshacer.',
            'save.error.noGame': 'No hay partida para guardar!',
            'save.error.noSave': 'No hay partida en {slot}',
            'save.success.saved': 'Partida guardada en {slot}!',
            'save.error.saveFailed': 'Error al guardar: {message}',
            'save.error.loadFailed': 'Error al cargar: {message}',
            'save.error.deleteFailed': 'Error al borrar: {message}',
            'save.recovery.prompt': 'Los datos de la partida son incompatibles o estan corruptos. Opciones:\n\n1 = Borrar partida\n2 = Descargar respaldo (base64)\n3 = Cancelar\n\nIngresa 1, 2 o 3:',
            'save.recovery.deleted': 'Partida borrada.',
            'save.recovery.backupDownloaded': 'Respaldo descargado. La partida queda intacta.',
            'target.actors': 'Actores',
            'target.targets': 'Objetivos',
            'target.act': 'Actuar',
            'target.mark': 'Objetivo',
            'target.selectActorFor': 'Seleccionar {name} para actuar',
            'target.markFor': 'Marcar {name} como objetivo',
            'target.selectAs': 'Seleccionar {name} como objetivo de {action}',
            'target.cannotSelectAs': 'No se puede seleccionar {name} como objetivo de {action}',
            'target.clear': 'Limpiar',
            'target.count': '{count} objetivo',
            'target.count_plural': '{count} objetivos',
            'target.clearSelected': 'Limpiar objetivos'
        }
    },
    
    // Template database (populated by modules)
    templates: {
        // Biome introductions
        biome: {
            forest: {
                safe: (ctx) => `You enter a dense forest. Sunlight filters through the canopy.`,
                mature: (ctx) => `The forest closes around you. Shadows dance between ancient trees. Something watches from the underbrush.`,
                adult: (ctx) => `The forest presses close, humid and thick with the scent of lust and danger. You feel eyes upon you, hungry and wanting.`
            },
            swamp: {
                safe: (ctx) => `A murky swamp stretches before you.`,
                mature: (ctx) => `The swamp waters are dark and still. Mist rises between cypress trees.`,
                adult: (ctx) => `The swamp is warm and wet. Something in the water brushes your leg...`
            },
            plains: {
                safe: (ctx) => `Open grasslands stretch to the horizon.`,
                mature: (ctx) => `Tall grasses sway in the breeze, hiding who knows what. The openness feels exposed.`,
                adult: (ctx) => `The open plains offer no cover for the pleasures or predations that may find you here.`
            },
            cave: {
                safe: (ctx) => `A dark cave entrance yawns before you.`,
                mature: (ctx) => `The cave mouth beckons, cool air washing over you. Distant drips echo in the darkness.`,
                adult: (ctx) => `The cave beckons, darkness promising privacy for whatever desires await within.`
            },
            jungle: {
                safe: (ctx) => `Dense jungle vegetation blocks your path.`,
                mature: (ctx) => `Vines hang like curtains in the humid air. The jungle is alive with unseen creatures.`,
                adult: (ctx) => `The jungle presses against you with wet heat. Vines brush against your skin suggestively.`
            },
            dungeon: {
                safe: (ctx) => `Stone corridors stretch into darkness.`,
                mature: (ctx) => `Iron-barred cells line the walls. The dungeon is cold and oppressive.`,
                adult: (ctx) => `Chains hang from the walls. The dungeon holds captives of many kinds...`
            },
            manor: {
                safe: (ctx) => `A grand manor stands before you.`,
                mature: (ctx) => `The manor's hallways echo with emptiness. Antique furniture gathers dust.`,
                adult: (ctx) => `The manor's bedroom doors stand ajar. Silk sheets and velvet cushions await.`
            },
            beach: {
                safe: (ctx) => `White sand stretches to the ocean.`,
                mature: (ctx) => `Waves lap against the shore. Palm trees sway overhead.`,
                adult: (ctx) => `The warm sand invites you to rest. The water is crystal clear and inviting.`
            },
            road: {
                safe: (ctx) => `A dirt road winds through the landscape.`,
                mature: (ctx) => `Wagon ruts mark the well-traveled path. A weathered signpost points onward.`,
                adult: (ctx) => `The road is lonely. A traveler might stop to share warmth and companionship.`
            },
            cliff: {
                safe: (ctx) => `Rocky outcrops tower above.`,
                mature: (ctx) => `The wind howls at your back. A narrow ledge skirts a dangerous drop.`,
                adult: (ctx) => `The dizzying height makes your heart race. Adrenaline courses through your veins.`
            },
            water: {
                safe: (ctx) => `A river rushes past.`,
                mature: (ctx) => `The water is cool and clear. Fish dart beneath the surface.`,
                adult: (ctx) => `The current pulls at your clothes. The water is warm and inviting...`
            },
            bridge: {
                safe: (ctx) => `A wooden bridge spans the gap.`,
                mature: (ctx) => `The bridge creaks beneath your feet. Rope rails sway in the wind.`,
                adult: (ctx) => `The bridge is precarious. You might need to hold someone close for safety...`
            },
            farm: {
                safe: (ctx) => `Barns and fields stretch to the horizon.`,
                mature: (ctx) => `A windmill turns lazily. Plowed earth shows recent work.`,
                adult: (ctx) => `The hayloft is warm and soft. The stable is private and secluded.`
            },
            indoors: {
                safe: (ctx) => `You enter a cozy building.`,
                mature: (ctx) => `Walls enclose the space. A hearth glows with dying embers.`,
                adult: (ctx) => `The room is warm and intimate. Furniture is arranged for closeness.`
            },
            entrance: {
                safe: (ctx) => `A dark entrance beckons.`,
                mature: (ctx) => `A cave mouth yawns in darkness. An ancient archway frames the way.`,
                adult: (ctx) => `The entrance is tight and dark. You must squeeze through to explore deeper...`
            }
        },
        
        // Encounter introductions
        encounter: {
            generic: {
                safe: (ctx) => `A ${ctx.species} stands before you.`,
                mature: (ctx) => `A ${ctx.species} blocks your path, looking ${ctx.mood || 'curious'}.`,
                adult: (ctx) => `A ${ctx.species} approaches, her intentions clear as she eyes you hungrily.`
            },
            predatory: {
                safe: (ctx) => `You sense danger nearby.`,
                mature: (ctx) => `${ctx.species} eyes you with hunger.`,
                adult: (ctx) => `${ctx.species} licks her lips, sizing you up as potential prey.`
            },
            predatory: {
                safe: (ctx) => `You sense danger nearby.`,
                mature: (ctx) => `${ctx.species} eyes you with hunger.`,
                adult: (ctx) => ctx.voreEnabled ? `${ctx.species} licks their lips, sizing you up.` : null
            }
        },
        
        // Combat actions
        combat: {
            attack: {
                safe: (ctx) => `${ctx.attacker} strikes ${ctx.defender} for ${ctx.damage} damage!`,
                mature: (ctx) => `${ctx.attacker} ${ctx.verb || 'slams into'} ${ctx.defender}, dealing ${ctx.damage} damage!`,
                adult: (ctx) => ctx.explicit ? `${ctx.attacker} ${ctx.verb} ${ctx.defender} with brutal force!` : null
            },
            defeat: {
                safe: (ctx) => `${ctx.defender} is defeated.`,
                mature: (ctx) => `${ctx.defender} collapses, unable to continue fighting.`,
                adult: (ctx) => ctx.voreEnabled ? `${ctx.defender} collapses, at your mercy.` : null
            }
        },
        
        // Action outcomes
        action: {
            flee: {
                safe: (ctx) => `You escape successfully.`,
                mature: (ctx) => `You manage to slip away into the ${ctx.terrain || 'wilderness'}.`,
                adult: null
            },
            consume: {
                safe: (ctx) => `You defeat ${ctx.target}.`,
                mature: (ctx) => `${ctx.target} is consumed. You feel stronger.`,
                adult: (ctx) => ctx.voreEnabled ? `${ctx.target} slides down your throat, settling in your belly.` : null
            },
            seduce: {
                safe: (ctx) => `${ctx.target} agrees to join you.`,
                mature: (ctx) => `${ctx.target} is swayed by your charms and joins your party.`,
                adult: (ctx) => ctx.explicit ? `${ctx.target} submits to your advances.` : null
            },
            flirt: {
                safe: (ctx) => `${ctx.actor} makes a friendly gesture toward ${ctx.target}.`,
                mature: (ctx) => `${ctx.actor} flirts with ${ctx.target}, lowering their guard.`,
                adult: (ctx) => ctx.explicit ? `${ctx.actor} sends a sultry gaze and a teasing touch toward ${ctx.target}, making them weak in the knees.` : null
            },
            feed: {
                safe: (ctx) => `${ctx.actor} tends to ${ctx.target}'s needs.`,
                mature: (ctx) => `${ctx.actor} nourishes ${ctx.target}, restoring their strength.`,
                adult: (ctx) => ctx.explicit ? `${ctx.actor} feeds ${ctx.target} intimately, their bodies pressed close as vitality flows between them.` : null
            },
            swallow: {
                safe: (ctx) => `${ctx.actor} consumes ${ctx.target}.`,
                mature: (ctx) => `${ctx.target} is swallowed whole by ${ctx.actor}.`,
                adult: (ctx) => ctx.voreEnabled ? `${ctx.target} slides down ${ctx.actor}'s throat, settling in their stomach with wet gulps.` : null
            },
            chew: {
                safe: (ctx) => `${ctx.target} is defeated by ${ctx.actor}.`,
                mature: (ctx) => `${ctx.actor} tears into ${ctx.target} with savage bites.`,
                adult: (ctx) => ctx.voreEnabled ? `${ctx.actor} chews ${ctx.target} into pieces, blood and flesh dripping from their maw.` : null
            },
            cockVore: {
                safe: (ctx) => `${ctx.target} is captured by ${ctx.actor}.`,
                mature: (ctx) => `${ctx.target} is drawn into ${ctx.actor}'s shaft.`,
                adult: (ctx) => ctx.voreEnabled ? `${ctx.target} is stuffed into ${ctx.actor}'s swollen cock, sliding down into heavy balls.` : null
            },
            unbirth: {
                safe: (ctx) => `${ctx.target} is enveloped by ${ctx.actor}.`,
                mature: (ctx) => `${ctx.target} is drawn into ${ctx.actor}'s womb.`,
                adult: (ctx) => ctx.voreEnabled ? `${ctx.target} is pulled deep into ${ctx.actor}'s warm womb, walls closing around them.` : null
            },
            digest: {
                safe: (ctx) => `${ctx.target} is fully absorbed by ${ctx.actor}.`,
                mature: (ctx) => `${ctx.target} is digested completely inside ${ctx.actor}.`,
                adult: (ctx) => ctx.voreEnabled ? `${ctx.target}'s body is reduced to nutrients inside ${ctx.actor}'s stomach.` : null
            },
            release: {
                safe: (ctx) => `${ctx.target} is freed by ${ctx.actor}.`,
                mature: (ctx) => `${ctx.actor} releases ${ctx.target} from their belly.`,
                adult: (ctx) => ctx.voreEnabled ? `${ctx.actor} heaves, pushing ${ctx.target} out of their stomach, covered in slime and weakened.` : null
            },
            heal: {
                safe: (ctx) => `${ctx.actor} tends to ${ctx.target}.`,
                mature: (ctx) => `${ctx.actor} nourishes ${ctx.target}, restoring their strength.`,
                adult: (ctx) => ctx.explicit ? `${ctx.actor} feeds ${ctx.target}, their warmth spreading as vitality returns.` : null
            },
            breastfeed: {
                safe: (ctx) => `${ctx.actor} nurses ${ctx.target}.`,
                mature: (ctx) => `${ctx.actor} offers milk to ${ctx.target}.`,
                adult: (ctx) => ctx.explicit ? `${ctx.actor} presses ${ctx.target} to their breast, warm milk flowing as pleasure surges through both.` : null
            },
            sacrifice: {
                safe: (ctx) => `${ctx.target} offers themself to ${ctx.actor}.`,
                mature: (ctx) => `${ctx.target} willingly feeds themself to ${ctx.actor}.`,
                adult: (ctx) => ctx.voreEnabled ? `${ctx.target} slides themself into ${ctx.actor}'s mouth, surrendering to the warm darkness of their belly.` : null
            },
            forceFeed: {
                safe: (ctx) => `${ctx.target} is forced into ${ctx.actor}.`,
                mature: (ctx) => `${ctx.target} is held down and forced into ${ctx.actor}'s stomach.`,
                adult: (ctx) => ctx.voreEnabled ? `${ctx.target} struggles against restraints as they are shoved down ${ctx.actor}'s throat, forced into the belly.` : null
            },
            slurp: {
                safe: (ctx) => `${ctx.actor} draws essence from ${ctx.target}.`,
                mature: (ctx) => `${ctx.actor} slurps a portion of ${ctx.target}.`,
                adult: (ctx) => ctx.explicit ? `${ctx.actor} drinks deeply from ${ctx.target}'s yielding form, savoring their essence.` : null
            },
            fragment: {
                safe: (ctx) => `${ctx.actor} breaks a piece from ${ctx.target}.`,
                mature: (ctx) => `${ctx.actor} tears off a chunk of ${ctx.target}.`,
                adult: (ctx) => ctx.explicit ? `${ctx.actor} bites a piece from ${ctx.target}'s breakable body, consuming it as sweet nourishment.` : null
            },
            corpseLoot: {
                safe: (ctx) => ctx.item ? `You search the remains of ${ctx.target} and recover ${ctx.item}.` : `You search the remains of ${ctx.target}, but find nothing useful.`,
                mature: (ctx) => ctx.item ? `You pick over ${ctx.target}'s remains and recover ${ctx.item}.` : `You pick over ${ctx.target}'s remains, but there is nothing worth taking.`,
                adult: (ctx) => ctx.item ? `You pick over the remains of ${ctx.target}, recovering ${ctx.item}.` : `You pick over the remains of ${ctx.target}, finding nothing but cooling flesh.`
            },
            corpseScavenge: {
                safe: (ctx) => `You carefully scavenge the remains of ${ctx.target}.`,
                mature: (ctx) => `You carve useful scraps from ${ctx.target}'s remains.`,
                adult: (ctx) => ctx.voreEnabled ? `You feast from ${ctx.target}'s remains, taking what the battle left behind.` : null
            }
        }
    },
    
    // Initialize from storage
    async init() {
        const saved = localStorage.getItem(this.STORAGE_KEY) || localStorage.getItem(this.LEGACY_STORAGE_KEY);
        if (saved) {
            try {
                this.preferences = { ...this.preferences, ...JSON.parse(saved) };
                localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.preferences));
            } catch (e) {
                console.error('Failed to load content preferences:', e);
            }
        }
    },
    
    // Save preferences
    savePreferences() {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.preferences));
    },
    
    // Set max content tier
    setMaxTier(tier) {
        this.preferences.maxTier = tier;
        this.savePreferences();
    },

    setLanguage(language) {
        this.preferences.language = this.locales[language] ? language : 'en';
        this.savePreferences();
        return this.preferences.language;
    },

    t(key, vars = {}) {
        const language = this.preferences.language || 'en';
        const table = this.locales[language] || this.locales.en;
        let text = table[key] || this.locales.en[key] || key;
        return text.replace(/\{(\w+)\}/g, (_, name) => vars[name] ?? '');
    },

    setPreference(setting, value) {
        if (setting in this.preferences) {
            this.preferences[setting] = value;
            this.savePreferences();
        }
    },
    
    // Toggle specific content
    toggleSetting(setting, value) {
        if (setting in this.preferences) {
            this.preferences[setting] = value !== undefined ? value : !this.preferences[setting];
            this.savePreferences();
        }
    },
    
    // Get content at appropriate tier
    getContent(templatePath, context = {}) {
        const parts = templatePath.split('.');
        const category = parts[0];
        const type = parts[1];
        const variant = parts[2] || 'default';
        
        // Try to get templates (with variant)
        let templates = this.templates[category]?.[type]?.[variant];
        
        // If no variant found, check if the type itself IS a tier container
        if (!templates && this.templates[category]?.[type]) {
            const all = this.templates[category][type];
            const hasTiers = 'safe' in all || 'mature' in all || 'adult' in all;
            if (hasTiers) {
                templates = all; // The type is a direct tier container (safe/mature/adult)
            } else {
                // It's a variant container, pick first available variant
                const variants = Object.keys(all);
                if (variants.length > 0) {
                    templates = all[variants[0]];
                }
            }
        }
        
        if (!templates) {
            return `[Missing content: ${templatePath}]`;
        }
        
        // Try tiers - adult first (default), then fallbacks
        const tiers = ['adult', 'mature', 'safe'];
        const maxTier = this.preferences.maxTier;
        
        // If user has explicit enabled and adult exists, prefer it
        if (maxTier >= 2 && this.preferences.explicitDescriptions) {
            const adultTemplate = templates.adult;
            if (adultTemplate && typeof adultTemplate === 'function') {
                return adultTemplate(context);
            }
        }
        
        for (const tierName of tiers) {
            const tier = this.TIERS[tierName.toUpperCase()];
            
            // Skip if above max tier
            if (tier > maxTier) continue;
            
            // Skip if gated content not enabled
            if (tier === this.TIERS.ADULT) {
                if (templates === null) continue;
                if (context.voreEnabled && !this.preferences.voreEnabled) continue;
                if (context.explicit && !this.preferences.explicitDescriptions) continue;
            }
            
            // Get template function
            const template = templates[tierName];
            if (typeof template === 'function') {
                try {
                    return template(context);
                } catch (e) {
                    console.error(`Template error ${templatePath}:`, e);
                    continue;
                }
            }
        }
        
        // Fallback to safe
        const safeTemplate = templates.safe;
        if (typeof safeTemplate === 'function') {
            return safeTemplate(context);
        }
        
        return '[Content unavailable]';
    },
    
    // Quick content helpers
    biomeIntro(biome, context = {}) {
        return this.getContent(`biome.${biome}`, context);
    },
    
    encounter(species, context = {}) {
        return this.getContent(`encounter.generic`, { 
            species, 
            mood: context.mood || 'curious',
            ...context 
        });
    },
    
    combat(action, context = {}) {
        return this.getContent(`combat.${action}`, context);
    },
    
    actionResult(action, context = {}) {
        return this.getContent(`action.${action}`, context);
    },
    
    // Add custom templates from modules
    registerTemplate(category, type, variant, templates) {
        if (!this.templates[category]) {
            this.templates[category] = {};
        }
        if (!this.templates[category][type]) {
            this.templates[category][type] = {};
        }
        this.templates[category][type][variant] = templates;
    }
};

// Initialize
CONTENT_SYSTEM.init();

// Make available globally
window.CONTENT = CONTENT_SYSTEM;
