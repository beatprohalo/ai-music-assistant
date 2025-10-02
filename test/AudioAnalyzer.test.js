const assert = require('assert');
const AudioAnalyzer = require('../src/audio/AudioAnalyzer');

function runTest(name, testFunction) {
  try {
    testFunction();
    console.log(`✔ ${name}`);
  } catch (error) {
    console.error(`✖ ${name}`);
    console.error(error);
    process.exit(1);
  }
}

runTest('extractMIDIFeatures should handle zero duration without errors', () => {
  const analyzer = new AudioAnalyzer();
  const midiData = {
    duration: 0,
    tracks: [
      {
        notes: [
          { pitch: 60, velocity: 100, duration: 0, startTime: 0 }
        ]
      }
    ]
  };

  const features = analyzer.extractMIDIFeatures(midiData);

  assert.strictEqual(features.noteDensity, 0, 'noteDensity should be 0 for zero duration');
});

console.log('All tests passed');