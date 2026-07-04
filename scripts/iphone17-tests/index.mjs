import mod01 from './01-viewport-display.mjs';
import mod02 from './02-pwa-standalone.mjs';
import mod03 from './03-safe-area-dynamic-island.mjs';
import mod04 from './04-lockscreen-auth.mjs';
import mod05 from './05-gestures-navigation.mjs';
import mod06 from './06-haptics-audio.mjs';
import mod07 from './07-webgl-particles.mjs';
import mod08 from './08-ui-animations.mjs';

const rawModules = [
  mod01,
  mod02,
  mod03,
  mod04,
  mod05,
  mod06,
  mod07,
  mod08,
];

/** Assign sequential IDs #001–#250 and validate count. */
let nextId = 1;
const modules = rawModules.map((mod) => {
  const tests = mod.tests.map((t) => ({ ...t, id: nextId++ }));
  return { name: mod.name, tests };
});

const STATIC_COUNT = nextId - 1;
if (STATIC_COUNT !== 250) {
  throw new Error(`Expected 250 static tests, got ${STATIC_COUNT}. Adjust module test counts.`);
}

export { modules, STATIC_COUNT };
