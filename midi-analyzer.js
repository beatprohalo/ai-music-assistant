// midi-analyzer.js
const { Midi } = require('@tonejs/midi');
const fs = require('fs/promises'); // Use fs.promises for async file operations
const path = require('path');

async function analyzeMidiFile(filePath) {
    try {
        const midiData = await fs.readFile(filePath);
        const midi = new Midi(midiData);

        // Basic analysis
        const analysis = {
            filePath: filePath,
            fileName: path.basename(filePath),
            tracks: midi.tracks.length,
            duration: midi.duration,
            tempos: midi.header.tempos.map(t => t.bpm),
            timeSignatures: midi.header.timeSignatures.map(ts => `${ts.numerator}/${ts.denominator}`),
            totalNotes: 0,
            averageVelocity: 0,
            notes: [] // Simplified note list for feature extraction later
        };

        let totalVelocity = 0;
        midi.tracks.forEach(track => {
            analysis.totalNotes += track.notes.length;
            track.notes.forEach(note => {
                totalVelocity += note.velocity; // velocity is 0-1, convert to 0-127 if needed for display
                analysis.notes.push({
                    midi: note.midi,
                    name: note.name,
                    time: note.time, // in seconds
                    duration: note.duration, // in seconds
                    velocity: note.velocity // 0-1
                });
            });
        });

        if (analysis.totalNotes > 0) {
            analysis.averageVelocity = totalVelocity / analysis.totalNotes;
        }

        console.log(`MIDI Analysis for ${analysis.fileName}:`, analysis);
        return analysis;

    } catch (error) {
        console.error(`Error analyzing MIDI file ${filePath}:`, error);
        throw new Error(`Failed to analyze MIDI file: ${error.message}`);
    }
}

// Function to extract specific humanization features (placeholder for now)
function extractHumanizationFeatures(midiAnalysis) {
    // This is where we'd look for micro-timing, velocity variations etc.
    // For now, return a dummy
    return {
        timingOffsets: Array.from({length: 10}, () => (Math.random() - 0.5) * 50), // +/- 50ms
        velocityVariance: Math.random() * 0.2 + 0.05, // 0.05 - 0.25
        swingFactor: Math.random() * 0.1 // 0 - 0.1
    };
}


module.exports = {
    analyzeMidiFile,
    extractHumanizationFeatures
};
