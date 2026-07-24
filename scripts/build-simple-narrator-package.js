#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const packagePath = path.join(root, 'optional-mods', 'you-are-wild-narration.yawmod.json');
const sourcePath = path.join(root, 'optional-mods', 'sources', 'you-are-wild-narration.js');
const packageData = JSON.parse(fs.readFileSync(packagePath, 'utf8'));

packageData.module.manifest.version = '0.7.0';
packageData.module.manifest.description = 'Adds concise provider-generated narration with selectable player-safe perspectives after deterministic scene exchanges.';

const settings = packageData.module.manifest.settings;
const profileIndex = settings.findIndex(setting => setting.key === 'profile');
const perspective = {
  key: 'perspective',
  type: 'select',
  label: 'Narration perspective',
  description: 'Player POV is the default. Other modes change grammatical framing only; deterministic events and structured actor, target, self, and observer roles remain authoritative.',
  default: 'player',
  options: [
    { value: 'player', label: 'Player POV (second person)' },
    { value: 'first_person', label: 'First person' },
    { value: 'third_person_limited', label: 'Third-person limited' },
    { value: 'cinematic', label: 'Cinematic observer' }
  ]
};
const existingPerspective = settings.findIndex(setting => setting.key === 'perspective');
if (existingPerspective >= 0) settings.splice(existingPerspective, 1);
settings.splice(profileIndex + 1, 0, perspective);

const systemPrompt = settings.find(setting => setting.key === 'systemPrompt');
systemPrompt.description = 'Optional style guidance applied after the selected perspective and profile. It cannot override viewpoint roles, deterministic facts, policy, plain-text, or length constraints.';
systemPrompt.default = 'Write concise, vivid narration focused on what the player perceives. Follow the selected narration perspective. Give dialogue room when characters speak. Avoid repeating interface labels.';

packageData.module.code = fs.readFileSync(sourcePath, 'utf8').trimEnd();
fs.writeFileSync(packagePath, `${JSON.stringify(packageData, null, 2)}\n`);
