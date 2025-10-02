// midi-analyzer.js
const { Midi } = require('@tonejs/midi');
const fs = require('fs/promises'); // Use fs.promises for async file operations
const path = require('path');

async function analyzeMidiFile(filePath) {
    try {
        const midiData = await fs.readFile(filePath);
        const midi = new Midi(midiData);

        // Focus on patterns and chord information only
        const analysis = {
            filePath: filePath,
            fileName: path.basename(filePath),
            type: 'midi',
            // Basic metadata
            tracks: midi.tracks.length,
            duration: midi.duration,
            tempos: midi.header.tempos.map(t => t.bpm),
            timeSignatures: midi.header.timeSignatures.map(ts => `${ts.numerator}/${ts.denominator}`),
            
            // Pattern analysis
            patterns: extractPatterns(midi),
            chords: extractChordProgressions(midi),
            chordProgressions: extractChordProgressions(midi),
            
            // Melodic patterns
            melodicPatterns: extractMelodicPatterns(midi),
            rhythmicPatterns: extractRhythmicPatterns(midi),
            
            // Structure analysis
            songStructure: analyzeSongStructure(midi),
            
            // Note data for pattern analysis
            notes: extractNoteData(midi),
            totalNotes: 0
        };

        // Count total notes
        analysis.totalNotes = analysis.notes.length;

        console.log(`MIDI Pattern Analysis for ${analysis.fileName}:`, {
            patterns: analysis.patterns.length,
            chords: analysis.chords.length,
            melodicPatterns: analysis.melodicPatterns.length,
            rhythmicPatterns: analysis.rhythmicPatterns.length
        });
        
        return analysis;

    } catch (error) {
        console.error(`Error analyzing MIDI file ${filePath}:`, error);
        throw new Error(`Failed to analyze MIDI file: ${error.message}`);
    }
}

// Pattern extraction functions
function extractPatterns(midi) {
    const patterns = [];
    
    midi.tracks.forEach((track, trackIndex) => {
        if (track.notes.length === 0) return;
        
        // Group notes by time intervals to find patterns
        const timeGroups = groupNotesByTime(track.notes);
        
        timeGroups.forEach((notes, timeIndex) => {
            if (notes.length >= 2) { // Only consider groups with multiple notes
                const pattern = {
                    trackIndex,
                    timeIndex,
                    notes: notes.map(note => ({
                        midi: note.midi,
                        name: note.name,
                        velocity: note.velocity
                    })),
                    duration: Math.max(...notes.map(n => n.duration)),
                    startTime: notes[0].time
                };
                patterns.push(pattern);
            }
        });
    });
    
    return patterns;
}

function extractChordProgressions(midi) {
    const chords = [];
    
    midi.tracks.forEach((track, trackIndex) => {
        if (track.notes.length === 0) return;
        
        // Group simultaneous notes to form chords
        const timeGroups = groupNotesByTime(track.notes);
        
        timeGroups.forEach((notes, timeIndex) => {
            if (notes.length >= 2) { // Chords need at least 2 notes
                const chord = {
                    trackIndex,
                    timeIndex,
                    notes: notes.map(note => note.midi),
                    chordName: identifyChord(notes.map(note => note.midi)),
                    startTime: notes[0].time,
                    duration: Math.max(...notes.map(n => n.duration))
                };
                chords.push(chord);
            }
        });
    });
    
    return chords;
}

function extractMelodicPatterns(midi) {
    const melodicPatterns = [];
    
    midi.tracks.forEach((track, trackIndex) => {
        if (track.notes.length === 0) return;
        
        // Extract melodic sequences
        const sequences = extractSequences(track.notes);
        
        sequences.forEach((sequence, seqIndex) => {
            if (sequence.length >= 3) { // Minimum 3 notes for a melodic pattern
                const pattern = {
                    trackIndex,
                    sequenceIndex: seqIndex,
                    notes: sequence.map(note => ({
                        midi: note.midi,
                        name: note.name,
                        time: note.time
                    })),
                    intervals: calculateIntervals(sequence),
                    startTime: sequence[0].time,
                    duration: sequence[sequence.length - 1].time - sequence[0].time
                };
                melodicPatterns.push(pattern);
            }
        });
    });
    
    return melodicPatterns;
}

function extractRhythmicPatterns(midi) {
    const rhythmicPatterns = [];
    
    midi.tracks.forEach((track, trackIndex) => {
        if (track.notes.length === 0) return;
        
        // Extract rhythmic patterns based on note timing
        const rhythms = extractRhythms(track.notes);
        
        rhythms.forEach((rhythm, rhythmIndex) => {
            const pattern = {
                trackIndex,
                rhythmIndex,
                durations: rhythm.durations,
                intervals: rhythm.intervals,
                startTime: rhythm.startTime,
                patternLength: rhythm.patternLength
            };
            rhythmicPatterns.push(pattern);
        });
    });
    
    return rhythmicPatterns;
}

function analyzeSongStructure(midi) {
    const structure = {
        sections: [],
        totalDuration: midi.duration
    };
    
    // Simple structure analysis based on tempo changes and note density
    const tempoChanges = midi.header.tempos;
    const noteDensity = calculateNoteDensity(midi);
    
    // Identify sections based on tempo and density changes
    let currentSection = { type: 'intro', startTime: 0, tempo: tempoChanges[0]?.bpm || 120 };
    
    tempoChanges.forEach((tempo, index) => {
        if (index > 0) {
            currentSection.endTime = tempo.ticks / 480; // Convert ticks to seconds
            structure.sections.push(currentSection);
            currentSection = { 
                type: index % 2 === 0 ? 'verse' : 'chorus', 
                startTime: tempo.ticks / 480,
                tempo: tempo.bpm 
            };
        }
    });
    
    currentSection.endTime = midi.duration;
    structure.sections.push(currentSection);
    
    return structure;
}

function extractNoteData(midi) {
    const allNotes = [];
    
    midi.tracks.forEach(track => {
        track.notes.forEach(note => {
            allNotes.push({
                midi: note.midi,
                name: note.name,
                time: note.time,
                duration: note.duration,
                velocity: note.velocity,
                track: track.name || 'Unknown'
            });
        });
    });
    
    return allNotes.sort((a, b) => a.time - b.time);
}

// Helper functions
function groupNotesByTime(notes, tolerance = 0.1) {
    const groups = [];
    const sortedNotes = notes.sort((a, b) => a.time - b.time);
    
    let currentGroup = [];
    let lastTime = -1;
    
    sortedNotes.forEach(note => {
        if (Math.abs(note.time - lastTime) > tolerance) {
            if (currentGroup.length > 0) {
                groups.push(currentGroup);
            }
            currentGroup = [note];
        } else {
            currentGroup.push(note);
        }
        lastTime = note.time;
    });
    
    if (currentGroup.length > 0) {
        groups.push(currentGroup);
    }
    
    return groups;
}

function identifyChord(midiNotes) {
    // Simple chord identification based on MIDI note numbers
    const pitchClasses = midiNotes.map(note => note % 12);
    const uniquePitches = [...new Set(pitchClasses)].sort((a, b) => a - b);
    
    // Basic chord recognition
    if (uniquePitches.length >= 3) {
        const root = uniquePitches[0];
        const third = uniquePitches.find(p => p === (root + 4) % 12);
        const fifth = uniquePitches.find(p => p === (root + 7) % 12);
        
        if (third && fifth) {
            return `${getNoteName(root)} major`;
        }
    }
    
    return 'Unknown chord';
}

function getNoteName(midiNote) {
    const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    return noteNames[midiNote % 12];
}

function extractSequences(notes) {
    const sequences = [];
    const sortedNotes = notes.sort((a, b) => a.time - b.time);
    
    let currentSequence = [];
    let lastTime = -1;
    const maxGap = 2.0; // 2 seconds max gap between notes in a sequence
    
    sortedNotes.forEach(note => {
        if (note.time - lastTime > maxGap) {
            if (currentSequence.length > 0) {
                sequences.push(currentSequence);
            }
            currentSequence = [note];
        } else {
            currentSequence.push(note);
        }
        lastTime = note.time;
    });
    
    if (currentSequence.length > 0) {
        sequences.push(currentSequence);
    }
    
    return sequences;
}

function calculateIntervals(notes) {
    const intervals = [];
    for (let i = 1; i < notes.length; i++) {
        intervals.push(notes[i].midi - notes[i-1].midi);
    }
    return intervals;
}

function extractRhythms(notes) {
    const rhythms = [];
    const sortedNotes = notes.sort((a, b) => a.time - b.time);
    
    let currentRhythm = { durations: [], intervals: [], startTime: sortedNotes[0]?.time || 0 };
    
    for (let i = 0; i < sortedNotes.length; i++) {
        const note = sortedNotes[i];
        currentRhythm.durations.push(note.duration);
        
        if (i > 0) {
            const interval = note.time - sortedNotes[i-1].time;
            currentRhythm.intervals.push(interval);
        }
    }
    
    currentRhythm.patternLength = currentRhythm.durations.length;
    rhythms.push(currentRhythm);
    
    return rhythms;
}

function calculateNoteDensity(midi) {
    const totalNotes = midi.tracks.reduce((sum, track) => sum + track.notes.length, 0);
    return totalNotes / midi.duration; // notes per second
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
