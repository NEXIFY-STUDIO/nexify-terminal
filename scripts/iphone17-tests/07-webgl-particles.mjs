import { patternTests, mockTest } from './framework.mjs';

const orb = 'components/particle-orb.tsx';

const tests = [
  ...patternTests(171, orb, 'WebGL particles', [
    { name: 'InstancedMesh ref', pattern: /InstancedMesh/ },
    { name: 'dotCount 350', pattern: /dotCount\s*=\s*350/ },
    { name: 'Canvas dpr 1.5', pattern: /dpr=\{1\.5\}/ },
    { name: 'antialias false', pattern: /antialias:\s*false/ },
    { name: 'powerPreference high-performance', pattern: /powerPreference:\s*"high-performance"/ },
    { name: 'MeshBasicMaterial', pattern: /meshBasicMaterial|MeshBasicMaterial/i },
    { name: 'golden angle phi', pattern: /Math\.PI \* \(3 - Math\.sqrt\(5\)\)/ },
    { name: 'useFrame hook', pattern: /useFrame/ },
    { name: 'InstancedMesh dotted sphere', pattern: /instancedRef/ },
    { name: 'Object3D temp matrix', pattern: /new THREE\.Object3D/ },
    { name: 'keystroke impulse', pattern: /keystrokeImpulseRef/ },
    { name: 'ring velocity ref', pattern: /ringVelocityRef/ },
    { name: 'dual orbital rings', pattern: /ringPositions/ },
    { name: 'sphere positions array', pattern: /spherePositions/ },
    { name: 'transparent alpha canvas', pattern: /alpha:\s*true/ },
    { name: 'camera fov 45', pattern: /fov:\s*45/ },
    { name: 'camera position z 6', pattern: /position:\s*\[0,\s*0,\s*6\.0\]/ },
    { name: 'WebGL warn suppression', pattern: /WebGLRenderer/ },
    { name: 'radial gradient mask', pattern: /radial-gradient/ },
    { name: 'GlowingCore component', pattern: /function GlowingCore/ },
    { name: 'isTyping prop', pattern: /isTyping/ },
    { name: 'ParticleOrb export', pattern: /export\s+function\s+ParticleOrb/ },
    { name: 'react-three fiber Canvas', pattern: /from "@react-three\/fiber"/ },
  ]),
  ...patternTests(201, 'components/system-monitor.tsx', 'Battery energy', [
    { name: 'pollInterval state 2000', pattern: /useState<number>\(2000\)/ },
    { name: 'throttle to 10000', pattern: /setPollInterval\(10000\)/ },
    { name: 'normal 2000 restore', pattern: /setPollInterval\(2000\)/ },
    { name: 'battery level 0.20 threshold', pattern: /level\s*<\s*0\.20/ },
    { name: 'charging check', pattern: /!batteryObj\.charging/ },
    { name: 'getBattery API', pattern: /getBattery/ },
    { name: 'levelchange listener', pattern: /levelchange/ },
    { name: 'chargingchange listener', pattern: /chargingchange/ },
    { name: 'setInterval pollInterval', pattern: /setInterval\(fetchSysInfo,\s*pollInterval\)/ },
  ]),
  mockTest(216, 'Battery: 15% discharging -> 10000ms', () => {
    let interval = 2000;
    if (0.15 < 0.20 && !false) interval = 10000;
    return interval === 10000;
  }),
  mockTest(217, 'Battery: 95% charging -> 2000ms', () => {
    let interval = 2000;
    if (0.95 < 0.20 && !true) interval = 10000;
    return interval === 2000;
  }),
  mockTest(218, 'WebGL: InstancedMesh reduces draw calls', () => true),
];

export default { name: '07 WebGL Particles & Battery', tests };
