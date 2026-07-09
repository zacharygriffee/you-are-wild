/**
 * YOU ARE WILD MOBILE UNIT CHIP
 * Renders mobile party and creature chips for actor/target routing and detail drawers.
 */

const YAW_MOBILE_UNIT_CHIP = {
    render(app, unit, index, type) {
        const density = app.combatState?.active ? 'micro' : 'medium';
        return YAW_TACTICAL_CARD.render(app, unit, index, type, { presentation: 'mobile', density });
    }
};

if (typeof window !== 'undefined') {
    window.YAW_MOBILE_UNIT_CHIP = YAW_MOBILE_UNIT_CHIP;
}
