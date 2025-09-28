const fs = require('fs');
const path = require('path');

class MusicGenerator {
  constructor() {
    this.algorithms = {
      melody: this.generateMelody,
      harmony: this.generateHarmony,
      rhythm: this.generateRhythm,
      bassline: this.generateBassline
    };
  }

  async generateMusic(prompt, options = {}) {
    const {
      style = 'melodic',
      outputFormat = 'mid',
      tempo = 120,
      key = 'C major',
      timeSignature = [4, 4],
      duration = 16 // bars
    } = options;

    try {
      // Parse the musical description from the prompt
      const musicalDescription = this.parseMusicalDescription(prompt);
      
      // Generate the musical elements
      const music = {
        metadata: {
          title: musicalDescription.title || 'Generated Music',
          tempo,
          key,
          timeSignature,
          duration,
          style,
          generatedAt: new Date().toISOString()
        },
        tracks: []
      };

      // Generate different tracks based on style
      if (style === 'melodic' || style === 'harmonic') {
        music.tracks.push(await this.generateMelodyTrack(musicalDescription, options));
        music.tracks.push(await this.generateHarmonyTrack(musicalDescription, options));
      }

      if (style === 'rhythmic') {
        music.tracks.push(await this.generateRhythmTrack(musicalDescription, options));
        music.tracks.push(await this.generateBassTrack(musicalDescription, options));
      }

      if (style === 'experimental') {
        music.tracks.push(await this.generateExperimentalTrack(musicalDescription, options));
      }

      // Format output based on requested format
      if (outputFormat === 'mid') {
        return await this.formatAsMIDI(music);
      } else if (outputFormat === 'json') {
        return await this.formatAsLogicProScript(music);
      }

      return music;
    } catch (error) {
      console.error('Music generation failed:', error);
      throw error;
    }
  }

  parseMusicalDescription(prompt) {
    // Simple parsing - in a real implementation, this would be more sophisticated
    const description = {
      title: this.extractTitle(prompt),
      mood: this.extractMood(prompt),
      instruments: this.extractInstruments(prompt),
      style: this.extractStyle(prompt),
      key: this.extractKey(prompt),
      tempo: this.extractTempo(prompt)
    };

    return description;
  }

  extractTitle(prompt) {
    // Look for title patterns
    const titleMatch = prompt.match(/title[:\s]+["']([^"']+)["']/i);
    return titleMatch ? titleMatch[1] : 'Generated Music';
  }

  extractMood(prompt) {
    const moods = ['happy', 'sad', 'melancholic', 'energetic', 'calm', 'dramatic', 'mysterious'];
    const foundMood = moods.find(mood => prompt.toLowerCase().includes(mood));
    return foundMood || 'neutral';
  }

  extractInstruments(prompt) {
    const instruments = ['piano', 'guitar', 'violin', 'drums', 'bass', 'saxophone', 'trumpet', 'flute'];
    return instruments.filter(instrument => 
      prompt.toLowerCase().includes(instrument)
    );
  }

  extractStyle(prompt) {
    const styles = ['jazz', 'classical', 'rock', 'blues', 'electronic', 'folk', 'pop', 'ambient'];
    const foundStyle = styles.find(style => prompt.toLowerCase().includes(style));
    return foundStyle || 'general';
  }

  extractKey(prompt) {
    const keyMatch = prompt.match(/([A-G][#b]?)\s*(major|minor)/i);
    return keyMatch ? `${keyMatch[1]} ${keyMatch[2]}` : 'C major';
  }

  extractTempo(prompt) {
    const tempoMatch = prompt.match(/(\d+)\s*bpm/i);
    return tempoMatch ? parseInt(tempoMatch[1]) : 120;
  }

  async generateMelodyTrack(description, options) {
    const { tempo = 120, key = 'C major', duration = 16 } = options;
    const keyNotes = this.getKeyNotes(key);
    
    const melody = {
      name: 'Melody',
      instrument: 'Piano',
      notes: []
    };

    const beatsPerBar = 4;
    const totalBeats = duration * beatsPerBar;
    const beatDuration = 60 / tempo; // seconds per beat

    for (let beat = 0; beat < totalBeats; beat += 0.5) {
      if (Math.random() > 0.3) { // 70% chance of note
        const note = this.generateMelodyNote(beat, keyNotes, description);
        if (note) {
          melody.notes.push({
            pitch: note.pitch,
            velocity: note.velocity,
            startTime: beat * beatDuration,
            duration: note.duration * beatDuration
          });
        }
      }
    }

    return melody;
  }

  generateMelodyNote(beat, keyNotes, description) {
    const octave = 4 + Math.floor(Math.random() * 2); // Octaves 4-5
    const noteIndex = Math.floor(Math.random() * keyNotes.length);
    const pitch = keyNotes[noteIndex] + (octave * 12);

    return {
      pitch,
      velocity: 64 + Math.floor(Math.random() * 40),
      duration: 0.5 + Math.random() * 1.5
    };
  }

  async generateHarmonyTrack(description, options) {
    const { tempo = 120, key = 'C major', duration = 16 } = options;
    const chords = this.getChordProgression(key, duration);

    const harmony = {
      name: 'Harmony',
      instrument: 'Piano',
      notes: []
    };

    const beatsPerBar = 4;
    const beatDuration = 60 / tempo;

    chords.forEach((chord, barIndex) => {
      const startTime = barIndex * beatsPerBar * beatDuration;
      const chordNotes = this.getChordNotes(chord, 4); // 4-note chord

      chordNotes.forEach((note, noteIndex) => {
        harmony.notes.push({
          pitch: note,
          velocity: 60 + Math.floor(Math.random() * 20),
          startTime: startTime + (noteIndex * 0.1), // Slight arpeggiation
          duration: beatsPerBar * beatDuration - (noteIndex * 0.1)
        });
      });
    });

    return harmony;
  }

  async generateRhythmTrack(description, options) {
    const { tempo = 120, duration = 16 } = options;
    
    const rhythm = {
      name: 'Drums',
      instrument: 'Drum Kit',
      notes: []
    };

    const beatsPerBar = 4;
    const totalBeats = duration * beatsPerBar;
    const beatDuration = 60 / tempo;

    // Generate basic drum pattern
    for (let beat = 0; beat < totalBeats; beat++) {
      // Kick drum on beats 1 and 3
      if (beat % 4 === 0 || beat % 4 === 2) {
        rhythm.notes.push({
          pitch: 36, // C1 - Kick drum
          velocity: 80,
          startTime: beat * beatDuration,
          duration: 0.1
        });
      }

      // Snare on beats 2 and 4
      if (beat % 4 === 1 || beat % 4 === 3) {
        rhythm.notes.push({
          pitch: 38, // D1 - Snare drum
          velocity: 70,
          startTime: beat * beatDuration,
          duration: 0.1
        });
      }

      // Hi-hat on eighth notes
      if (beat % 0.5 === 0) {
        rhythm.notes.push({
          pitch: 42, // F#1 - Hi-hat
          velocity: 50,
          startTime: beat * beatDuration,
          duration: 0.05
        });
      }
    }

    return rhythm;
  }

  async generateBassTrack(description, options) {
    const { tempo = 120, key = 'C major', duration = 16 } = options;
    const keyNotes = this.getKeyNotes(key);
    
    const bass = {
      name: 'Bass',
      instrument: 'Bass',
      notes: []
    };

    const beatsPerBar = 4;
    const totalBeats = duration * beatsPerBar;
    const beatDuration = 60 / tempo;

    for (let beat = 0; beat < totalBeats; beat += 1) {
      const noteIndex = Math.floor(Math.random() * keyNotes.length);
      const pitch = keyNotes[noteIndex] + (2 * 12); // Bass octave

      bass.notes.push({
        pitch,
        velocity: 80,
        startTime: beat * beatDuration,
        duration: beatDuration
      });
    }

    return bass;
  }

  async generateExperimentalTrack(description, options) {
    const { tempo = 120, duration = 16 } = options;
    
    const experimental = {
      name: 'Experimental',
      instrument: 'Synthesizer',
      notes: []
    };

    const beatsPerBar = 4;
    const totalBeats = duration * beatsPerBar;
    const beatDuration = 60 / tempo;

    for (let beat = 0; beat < totalBeats; beat += 0.25) {
      if (Math.random() > 0.4) {
        const pitch = 60 + Math.floor(Math.random() * 24); // Random pitch in middle range
        experimental.notes.push({
          pitch,
          velocity: 40 + Math.floor(Math.random() * 60),
          startTime: beat * beatDuration,
          duration: (0.1 + Math.random() * 0.5) * beatDuration
        });
      }
    }

    return experimental;
  }

  getKeyNotes(key) {
    const keyMap = {
      'C major': [0, 2, 4, 5, 7, 9, 11],
      'C minor': [0, 2, 3, 5, 7, 8, 10],
      'G major': [7, 9, 11, 0, 2, 4, 6],
      'G minor': [7, 9, 10, 0, 2, 3, 5],
      'D major': [2, 4, 6, 7, 9, 11, 1],
      'D minor': [2, 4, 5, 7, 9, 10, 0],
      'A major': [9, 11, 1, 2, 4, 6, 8],
      'A minor': [9, 11, 0, 2, 4, 5, 7],
      'E major': [4, 6, 8, 9, 11, 1, 3],
      'E minor': [4, 6, 7, 9, 11, 0, 2],
      'F major': [5, 7, 9, 10, 0, 2, 4],
      'F minor': [5, 7, 8, 10, 0, 1, 3]
    };

    return keyMap[key] || keyMap['C major'];
  }

  getChordProgression(key, duration) {
    const progressions = {
      'C major': ['C', 'Am', 'F', 'G'],
      'G major': ['G', 'Em', 'C', 'D'],
      'D major': ['D', 'Bm', 'G', 'A'],
      'A major': ['A', 'F#m', 'D', 'E'],
      'E major': ['E', 'C#m', 'A', 'B'],
      'F major': ['F', 'Dm', 'Bb', 'C']
    };

    const baseProgression = progressions[key] || progressions['C major'];
    const barsPerChord = Math.ceil(duration / baseProgression.length);
    
    const progression = [];
    for (let i = 0; i < duration; i += barsPerChord) {
      const chordIndex = Math.floor(i / barsPerChord) % baseProgression.length;
      progression.push(baseProgression[chordIndex]);
    }

    return progression;
  }

  getChordNotes(chord, octave = 4) {
    const chordMap = {
      'C': [0, 4, 7, 12],
      'D': [2, 6, 9, 14],
      'E': [4, 8, 11, 16],
      'F': [5, 9, 12, 17],
      'G': [7, 11, 14, 19],
      'A': [9, 13, 16, 21],
      'B': [11, 15, 18, 23],
      'Am': [9, 12, 16, 21],
      'Bm': [11, 14, 18, 23],
      'Cm': [0, 3, 7, 12],
      'Dm': [2, 5, 9, 14],
      'Em': [4, 7, 11, 16],
      'Fm': [5, 8, 12, 17],
      'Gm': [7, 10, 14, 19]
    };

    const baseNotes = chordMap[chord] || chordMap['C'];
    return baseNotes.map(note => note + (octave * 12));
  }

  async formatAsMIDI(music) {
    // This would use a MIDI library to create actual MIDI files
    // For now, we'll return the structure that would be converted
    return {
      format: 'midi',
      data: music,
      filename: `${music.metadata.title.replace(/\s+/g, '_')}.mid`
    };
  }

  async formatAsLogicProScript(music) {
    // Format for Logic Pro Scripter
    const script = {
      name: music.metadata.title,
      tempo: music.metadata.tempo,
      timeSignature: music.metadata.timeSignature,
      tracks: music.tracks.map(track => ({
        name: track.name,
        instrument: track.instrument,
        events: track.notes.map(note => ({
          type: 'note',
          pitch: note.pitch,
          velocity: note.velocity,
          startTime: note.startTime,
          duration: note.duration
        }))
      }))
    };

    return {
      format: 'logic-pro-script',
      data: script,
      filename: `${music.metadata.title.replace(/\s+/g, '_')}.json`
    };
  }
}

module.exports = MusicGenerator;
