const assert = require('assert');
const sinon = require('sinon');
const { ipcMain } = require('electron');
const { handleGeneration } = require('../main.js');
const midiGenerator = require('../midi-generator.js');
const MusicGenerator = require('../src/generation/MusicGenerator.js');

describe('Generation', function () {
    let generateMusicStub;

    beforeEach(() => {
        generateMusicStub = sinon.stub(MusicGenerator.prototype, 'generateMusic').resolves({
            data: {
                tracks: []
            }
        });
    });

    afterEach(() => {
        generateMusicStub.restore();
    });

    it('should pass analysisPatterns to the MusicGenerator', async () => {
        const analysisPatterns = {
            keys: new Set(['C']),
            genres: new Set(['Electronic']),
            instruments: new Set(['Synth']),
            chords: new Set(['C-F-G']),
            moods: new Set(['Ambient']),
            tempoRange: { min: 120, max: 140, avg: 130 }
        };

        // We need to get the handler for 'generate-midi'
        const generateMidiHandler = ipcMain.handle.withArgs('generate-midi').firstCall.args[1];

        // Now we can call the handler with our test data
        await generateMidiHandler({}, 'a test prompt', { analysisPatterns });


        assert(generateMusicStub.calledOnce, 'generateMusic should be called once');
        const options = generateMusicStub.firstCall.args[1];
        assert.deepStrictEqual(options.patterns, analysisPatterns, 'analysisPatterns should be passed to the MusicGenerator');
    });
});