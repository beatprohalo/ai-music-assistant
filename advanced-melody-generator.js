// advanced-melody-generator.js
// Enhanced melody generation with motifs, shapes, and harmonic awareness

class AdvancedMelodyGenerator {
  constructor() {
    this.motifLibrary = this.initializeMotifLibrary();
    this.scalePatterns = this.initializeScalePatterns();
    this.melodyShapes = this.initializeMelodyShapes();
    this.libraryPatterns = {}; // Will store learned patterns from library
  }

  // Utility method for random selection
  selectRandom(array) {
    if (!array || array.length === 0) return null;
    return array[Math.floor(Math.random() * array.length)];
  }

  initializeMotifLibrary() {
    return {
      // Basic motifs (2-4 notes)
      basic: [
        [0, 2, 4, 2], // I-II-III-II (ascending-descending)
        [0, -2, 0, 2], // I-down-I-up
        [0, 2, 0, -2], // I-up-I-down
        [0, 4, 2, 0], // I-III-II-I
        [0, -2, -4, -2], // Descending with return
      ],
      // Developmental motifs (5-8 notes)
      developmental: [
        [0, 2, 4, 5, 4, 2, 0, -2], // Arch shape
        [0, 2, 0, 2, 4, 2, 4, 5], // Stepwise development
        [0, 4, 2, 0, -2, 0, 2, 4], // Wave pattern
        [0, 2, 4, 7, 4, 2, 0, -2], // Leap and return
      ],
      // Rhythmic motifs
      rhythmic: [
        { notes: [0, 2, 4], durations: [1, 0.5, 1.5] },
        { notes: [0, -2, 0], durations: [0.5, 1, 0.5] },
        { notes: [0, 2, 0, 2], durations: [0.75, 0.75, 0.5, 1] },
      ]
    };
  }

  initializeScalePatterns() {
    return {
      'major': [0, 2, 4, 5, 7, 9, 11, 12],
      'minor': [0, 2, 3, 5, 7, 8, 10, 12],
      'dorian': [0, 2, 3, 5, 7, 9, 10, 12],
      'mixolydian': [0, 2, 4, 5, 7, 9, 10, 12],
      'lydian': [0, 2, 4, 6, 7, 9, 11, 12],
      'phrygian': [0, 1, 3, 5, 7, 8, 10, 12],
      'locrian': [0, 1, 3, 5, 6, 8, 10, 12],
      'pentatonic_major': [0, 2, 4, 7, 9, 12],
      'pentatonic_minor': [0, 3, 5, 7, 10, 12],
      'blues': [0, 3, 5, 6, 7, 10, 12]
    };
  }

  initializeMelodyShapes() {
    return {
      ascending: (length) => {
        const shape = [];
        for (let i = 0; i < length; i++) {
          shape.push(i * 2); // Gradual ascent
        }
        return shape;
      },
      descending: (length) => {
        const shape = [];
        for (let i = 0; i < length; i++) {
          shape.push((length - 1 - i) * -2); // Gradual descent
        }
        return shape;
      },
      arch: (length) => {
        const shape = [];
        const midpoint = Math.floor(length / 2);
        for (let i = 0; i < length; i++) {
          if (i <= midpoint) {
            shape.push(i * 2); // Ascending
          } else {
            shape.push((length - 1 - i) * 2); // Descending
          }
        }
        return shape;
      },
      wave: (length) => {
        const shape = [];
        for (let i = 0; i < length; i++) {
          shape.push(Math.sin(i * 0.5) * 4); // Sine wave pattern
        }
        return shape;
      },
      zigzag: (length) => {
        const shape = [];
        for (let i = 0; i < length; i++) {
          shape.push(i % 2 === 0 ? i * 2 : (i - 1) * 2); // Up-down pattern
        }
        return shape;
      },
      plateau: (length) => {
        const shape = [];
        const plateauStart = Math.floor(length * 0.3);
        const plateauEnd = Math.floor(length * 0.7);
        for (let i = 0; i < length; i++) {
          if (i < plateauStart) {
            shape.push(i); // Ascending to plateau
          } else if (i <= plateauEnd) {
            shape.push(plateauStart); // Plateau
          } else {
            shape.push(plateauStart - (i - plateauEnd)); // Descending from plateau
          }
        }
        return shape;
      },
      call_response: (length) => {
        const shape = [];
        const callLength = Math.floor(length * 0.4);
        const responseLength = length - callLength;

        // Call (ascending)
        for (let i = 0; i < callLength; i++) {
          shape.push(i * 1.5);
        }
        // Response (descending)
        for (let i = 0; i < responseLength; i++) {
          shape.push((responseLength - 1 - i) * -1.5);
        }
        return shape;
      },
      spiral: (length) => {
        const shape = [];
        for (let i = 0; i < length; i++) {
          const angle = (i / length) * Math.PI * 4; // 2 full spirals
          shape.push(Math.sin(angle) * 3 + Math.cos(angle) * 2);
        }
        return shape;
      }
    };
  }

  // Library learning methods
  learnFromLibrary(libraryFiles) {
    console.log(`Learning from ${libraryFiles.length} library files...`);

    this.libraryPatterns = {
      motifs: [],
      shapes: [],
      rhythms: [],
      harmonies: [],
      keys: [],
      genres: [],
      tempos: []
    };

    libraryFiles.forEach(file => {
      if (file.analysis) {
        this.analyzeFilePatterns(file.analysis, file.type);
      }
    });

    console.log(`Learned ${this.libraryPatterns.motifs.length} motifs, ${this.libraryPatterns.shapes.length} shapes, ${this.libraryPatterns.harmonies.length} harmonies`);
  }

  analyzeFilePatterns(analysis, fileType) {
    // Extract key patterns
    if (analysis.key) {
      this.libraryPatterns.keys.push({
        key: analysis.key,
        weight: 1,
        type: fileType
      });
    }

    // Extract genre patterns
    if (analysis.genre) {
      this.libraryPatterns.genres.push({
        genre: analysis.genre,
        weight: 1,
        type: fileType
      });
    }

    // Extract tempo patterns
    if (analysis.tempo) {
      this.libraryPatterns.tempos.push({
        tempo: analysis.tempo,
        weight: 1,
        type: fileType
      });
    }

    // Extract chord progressions for harmonic learning
    if (analysis.chords && analysis.chords.length > 0) {
      this.libraryPatterns.harmonies.push({
        progression: analysis.chords,
        key: analysis.key,
        weight: 1,
        type: fileType
      });

      // Generate melody motifs inspired by chord progressions
      const chordMotifs = this.generateMotifsFromChords(analysis.chords, analysis.key);
      chordMotifs.forEach(motif => {
        this.libraryPatterns.motifs.push({
          pattern: motif,
          source: 'chord_inspired',
          weight: 1,
          type: fileType
        });
      });
    }

    // Extract rhythm patterns from tempo and duration
    if (analysis.tempo && analysis.duration) {
      const rhythmPattern = this.extractRhythmPattern(analysis);
      if (rhythmPattern) {
        this.libraryPatterns.rhythms.push({
          pattern: rhythmPattern,
          tempo: analysis.tempo,
          weight: 1,
          type: fileType
        });
      }
    }
  }

  generateMotifsFromChords(chords, key) {
    const motifs = [];
    const keyRoot = this.noteNameToMidi(key.split(' ')[0] + '4');

    chords.forEach((chord, index) => {
      // Convert roman numeral to scale degrees
      const scaleDegrees = this.romanNumeralToScaleDegrees(chord);
      if (scaleDegrees && scaleDegrees.length > 0) {
        // Create motif based on chord tones
        const motif = scaleDegrees.map(degree => keyRoot + degree);
        motifs.push(motif);

        // Add variations
        if (motif.length >= 3) {
          motifs.push(motif.slice(0, 3)); // First 3 notes
          motifs.push([...motif].reverse()); // Retrograde
        }
      }
    });

    return motifs;
  }

  romanNumeralToScaleDegrees(roman) {
    const romanMap = {
      'I': [0, 4, 7], 'II': [2, 5, 9], 'III': [4, 7, 11], 'IV': [5, 9, 0], 'V': [7, 11, 2], 'VI': [9, 0, 4], 'VII': [11, 2, 5],
      'i': [0, 3, 7], 'ii': [2, 5, 8], 'iii': [3, 7, 10], 'iv': [5, 8, 0], 'v': [7, 10, 2], 'vi': [8, 0, 3], 'vii°': [10, 2, 5]
    };
    return romanMap[roman];
  }

  extractRhythmPattern(analysis) {
    // Create rhythm pattern based on tempo and duration
    const tempo = analysis.tempo || 120;
    const duration = analysis.duration || 1;

    // Estimate note duration based on tempo
    const beatDuration = 60 / tempo;
    const estimatedNotes = Math.max(1, Math.floor(duration / beatDuration));

    // Create a basic rhythm pattern
    const pattern = [];
    for (let i = 0; i < Math.min(8, estimatedNotes); i++) {
      pattern.push({
        duration: beatDuration * (0.5 + Math.random() * 1.5), // Varied note lengths
        velocity: 60 + Math.random() * 40
      });
    }

    return pattern;
  }

  extractMotifsFromNotes(notes) {
    const motifs = [];
    const minMotifLength = 3;
    const maxMotifLength = 5;

    for (let length = minMotifLength; length <= maxMotifLength; length++) {
      for (let i = 0; i <= notes.length - length; i++) {
        const motif = notes.slice(i, i + length).map(note => ({
          interval: note.pitch - notes[0].pitch, // Relative to first note
          duration: note.duration
        }));
        motifs.push(motif);
      }
    }

    return motifs;
  }

  analyzeMelodyShape(notes) {
    if (notes.length < 3) return 'flat';

    const pitches = notes.map(note => note.pitch);
    const startPitch = pitches[0];
    const endPitch = pitches[pitches.length - 1];
    const maxPitch = Math.max(...pitches);
    const minPitch = Math.min(...pitches);

    const range = maxPitch - minPitch;
    const direction = endPitch - startPitch;

    if (Math.abs(direction) < range * 0.3) {
      return 'arch'; // Goes up and comes back
    } else if (direction > 0) {
      return 'ascending';
    } else {
      return 'descending';
    }
  }

  analyzeRhythmPattern(notes) {
    const durations = notes.map(note => note.duration);
    const uniqueDurations = [...new Set(durations)];

    // Classify rhythm complexity
    if (uniqueDurations.length === 1) {
      return 'simple'; // All same duration
    } else if (uniqueDurations.length <= 3) {
      return 'moderate';
    } else {
      return 'complex';
    }
  }

  getInspiredMotifs(category = null, count = 3) {
    let availableMotifs = this.libraryPatterns.motifs;

    if (category) {
      availableMotifs = availableMotifs.filter(motif => motif.category === category);
    }

    if (availableMotifs.length === 0) {
      return this.motifLibrary.basic; // Fallback to built-in motifs
    }

    // Select motifs by weight (could implement more sophisticated selection)
    const selected = [];
    for (let i = 0; i < Math.min(count, availableMotifs.length); i++) {
      const motif = this.selectRandom(availableMotifs);
      selected.push(motif.pattern.map(note => note.interval));
    }

    return selected.length > 0 ? selected : this.motifLibrary.basic;
  }

  getInspiredShape(category = null) {
    let availableShapes = this.libraryPatterns.shapes;

    if (category) {
      availableShapes = availableShapes.filter(shape => shape.category === category);
    }

    if (availableShapes.length === 0) {
      return 'arch'; // Default shape
    }

    const shape = this.selectRandom(availableShapes);
    return shape.shape;
  }

  generateMelody(options = {}) {
    const {
      key = 'C',
      scale = 'major',
      length = 16, // Number of notes
      tempo = 120,
      shape = 'arch',
      complexity = 'medium',
      chordProgression = null,
      mood = 'neutral'
    } = options;

    // Get scale notes
    const scaleNotes = this.getScaleNotes(key, scale);
    const rootNote = this.noteNameToMidi(key + '4');

    // Generate base melody shape
    const melodyShape = this.generateMelodyShape(shape, length);

    // Generate motifs
    const motifs = this.generateMotifs(length, complexity, scaleNotes);

    // Create melody notes
    const melody = [];
    let currentTime = 0;
    const beatDuration = 60 / tempo;

    for (let i = 0; i < length; i++) {
      const motif = motifs[i % motifs.length];
      const shapeOffset = melodyShape[i] || 0;

      // Apply harmonic awareness if chord progression provided
      let harmonicAdjustment = 0;
      if (chordProgression) {
        const chordIndex = Math.floor(i / (length / chordProgression.length));
        const currentChord = chordProgression[chordIndex % chordProgression.length];
        harmonicAdjustment = this.getHarmonicAdjustment(currentChord, scaleNotes);
      }

      // Calculate note
      const noteOffset = motif + shapeOffset + harmonicAdjustment;
      const midiNote = rootNote + this.constrainToScale(noteOffset, scaleNotes);

      // Generate rhythm
      const duration = this.generateRhythm(i, length, complexity);

      melody.push({
        pitch: midiNote,
        velocity: this.generateVelocity(i, length, mood),
        startTime: currentTime,
        duration: duration * beatDuration
      });

      currentTime += duration * beatDuration;
    }

    // Evaluate and refine the melody
    const evaluation = this.evaluateMelody(melody, { chordProgression });
    if (evaluation.overall < 0.7) {
      return this.refineMelody(melody, evaluation, { chordProgression });
    }

    return melody;
  }

  generateMelodyShape(shapeType, length) {
    // Use library-inspired shape if available and requested shape is 'auto'
    if (shapeType === 'auto') {
      shapeType = this.getInspiredShape();
    }

    const shapeFunction = this.melodyShapes[shapeType] || this.melodyShapes.arch;
    return shapeFunction(length);
  }

  generateMotifs(length, complexity, scaleNotes) {
    const motifs = [];
    const motifPool = complexity === 'simple' ? this.motifLibrary.basic :
                     complexity === 'complex' ? this.motifLibrary.developmental :
                     [...this.motifLibrary.basic, ...this.motifLibrary.developmental];

    // Try to use library-inspired motifs if available
    const inspiredMotifs = this.getInspiredMotifs();
    const useInspired = inspiredMotifs.length > 0 && Math.random() < 0.6; // 60% chance to use inspired motifs

    const primaryMotif = useInspired ?
      this.selectRandom(inspiredMotifs) :
      this.selectRandom(motifPool);

    for (let i = 0; i < length; i++) {
      if (i % 4 === 0) {
        // Every 4 notes, potentially introduce variation
        if (Math.random() < 0.3) {
          motifs.push(this.varyMotif(primaryMotif, scaleNotes));
        } else {
          motifs.push(primaryMotif);
        }
      } else {
        motifs.push(primaryMotif);
      }
    }

    return motifs.flat();
  }

  varyMotif(motif, scaleNotes) {
    // Apply variations: transpose, invert, retrograde, etc.
    const variationType = this.selectRandom(['original', 'transpose', 'invert', 'retrograde']);

    switch (variationType) {
      case 'transpose':
        return motif.map(note => note + this.selectRandom([2, 4, -2, -4]));
      case 'invert':
        const maxNote = Math.max(...motif);
        return motif.map(note => maxNote - note);
      case 'retrograde':
        return [...motif].reverse();
      default:
        return motif;
    }
  }

  getScaleNotes(key, scaleType) {
    const scalePattern = this.scalePatterns[scaleType] || this.scalePatterns.major;
    const rootMidi = this.noteNameToMidi(key + '4');
    return scalePattern.map(interval => rootMidi + interval);
  }

  constrainToScale(noteOffset, scaleNotes) {
    // Find the closest scale note to the desired offset
    const targetNote = scaleNotes[0] + noteOffset;
    let closestNote = scaleNotes[0];
    let minDistance = Math.abs(targetNote - closestNote);

    for (const scaleNote of scaleNotes) {
      const distance = Math.abs(targetNote - scaleNote);
      if (distance < minDistance) {
        minDistance = distance;
        closestNote = scaleNote;
      }
    }

    return closestNote - scaleNotes[0];
  }

  getHarmonicAdjustment(chord, scaleNotes) {
    // Simple harmonic awareness - prefer chord tones
    const chordTones = this.getChordTones(chord);
    return this.selectRandom(chordTones) || 0;
  }

  getChordTones(chord) {
    // Simplified chord tone extraction
    const chordMap = {
      'C': [0, 4, 7],
      'Dm': [2, 5, 9],
      'Em': [4, 7, 11],
      'F': [5, 9, 0],
      'G': [7, 11, 2],
      'Am': [9, 0, 4],
      'Bdim': [11, 2, 5]
    };
    return chordMap[chord] || [0, 4, 7];
  }

  generateRhythm(position, totalLength, complexity) {
    const baseDurations = complexity === 'simple' ? [1, 2] :
                         complexity === 'complex' ? [0.5, 1, 1.5, 2] :
                         [0.5, 1, 1.5];

    // Add rhythmic interest
    if (position % 4 === 0) {
      return this.selectRandom([1, 1.5]); // Strong beats
    } else if (position % 2 === 0) {
      return this.selectRandom([0.5, 1]); // Medium beats
    } else {
      return this.selectRandom(baseDurations); // Weak beats
    }
  }

  generateVelocity(position, totalLength, mood) {
    let baseVelocity = 64;

    // Adjust based on mood
    switch (mood) {
      case 'energetic':
        baseVelocity = 80 + Math.random() * 30;
        break;
      case 'calm':
        baseVelocity = 50 + Math.random() * 20;
        break;
      case 'dramatic':
        baseVelocity = position % 4 === 0 ? 90 : 60;
        break;
      default:
        baseVelocity = 60 + Math.random() * 30;
    }

    return Math.round(baseVelocity);
  }

  noteNameToMidi(noteName) {
    const noteMap = {
      'C': 0, 'C#': 1, 'Db': 1, 'D': 2, 'D#': 3, 'Eb': 3,
      'E': 4, 'F': 5, 'F#': 6, 'Gb': 6, 'G': 7, 'G#': 8,
      'Ab': 8, 'A': 9, 'A#': 10, 'Bb': 10, 'B': 11
    };

    const match = noteName.match(/^([A-G]#?b?)(\d+)$/);
    if (!match) return 60; // Default to C4

    const note = match[1];
    const octave = parseInt(match[2]);

    return noteMap[note] + (octave + 1) * 12;
  }

  // Melody transformation methods
  transformMelody(melody, transformation) {
    switch (transformation) {
      case 'invert':
        return this.invertMelody(melody);
      case 'retrograde':
        return this.retrogradeMelody(melody);
      case 'augment':
        return this.augmentMelody(melody);
      case 'diminish':
        return this.diminishMelody(melody);
      case 'transpose':
        return this.transposeMelody(melody, 7); // Up a fifth
      default:
        return melody;
    }
  }

  invertMelody(melody) {
    if (melody.length === 0) return melody;
    const axis = melody[0].pitch; // Use first note as axis
    return melody.map(note => ({
      ...note,
      pitch: axis - (note.pitch - axis)
    }));
  }

  retrogradeMelody(melody) {
    return [...melody].reverse().map((note, index) => ({
      ...note,
      startTime: melody[melody.length - 1 - index].startTime
    }));
  }

  augmentMelody(melody) {
    return melody.map(note => ({
      ...note,
      duration: note.duration * 2
    }));
  }

  diminishMelody(melody) {
    return melody.map(note => ({
      ...note,
      duration: note.duration * 0.5
    }));
  }

  transposeMelody(melody, interval) {
    return melody.map(note => ({
      ...note,
      pitch: note.pitch + interval
    }));
  }

  // Genre-specific melody generation
  generateGenreMelody(genre, options = {}) {
    const genreStyles = {
      'classical': {
        shape: 'arch',
        complexity: 'complex',
        scale: 'major',
        motifs: this.motifLibrary.developmental,
        rhythm: 'structured'
      },
      'jazz': {
        shape: 'wave',
        complexity: 'complex',
        scale: 'mixolydian',
        motifs: this.motifLibrary.developmental,
        rhythm: 'swing'
      },
      'pop': {
        shape: 'arch',
        complexity: 'medium',
        scale: 'major',
        motifs: this.motifLibrary.basic,
        rhythm: 'straight'
      },
      'blues': {
        shape: 'call_response',
        complexity: 'medium',
        scale: 'blues',
        motifs: this.motifLibrary.basic,
        rhythm: 'shuffle'
      },
      'electronic': {
        shape: 'zigzag',
        complexity: 'simple',
        scale: 'minor',
        motifs: this.motifLibrary.basic,
        rhythm: 'straight'
      },
      'folk': {
        shape: 'plateau',
        complexity: 'medium',
        scale: 'pentatonic_major',
        motifs: this.motifLibrary.basic,
        rhythm: 'moderate'
      }
    };

    const style = genreStyles[genre] || genreStyles['pop'];
    return this.generateMelody({
      ...options,
      ...style
    });
  }

  // Add ornamentation to melody
  addOrnamentation(melody, style = 'trill') {
    const ornamented = [];

    melody.forEach(note => {
      ornamented.push(note); // Original note

      // Add ornamentation based on style
      switch (style) {
        case 'trill':
          if (note.duration > 0.5) { // Only ornament longer notes
            const trillNotes = this.generateTrill(note);
            ornamented.push(...trillNotes);
          }
          break;
        case 'grace':
          if (Math.random() < 0.3) { // 30% chance
            const graceNote = this.generateGraceNote(note);
            ornamented.push(graceNote);
          }
          break;
        case 'turn':
          if (note.duration > 1.0 && Math.random() < 0.2) {
            const turn = this.generateTurn(note);
            ornamented.push(...turn);
          }
          break;
      }
    });

    return ornamented;
  }

  generateTrill(note) {
    const trillSpeed = 0.1; // 10th notes
    const trillLength = Math.min(note.duration * 0.3, 0.8); // Up to 30% of note duration
    const trillNotes = [];

    for (let time = 0; time < trillLength; time += trillSpeed) {
      const trillNote = {
        pitch: time % (trillSpeed * 2) < trillSpeed ? note.pitch : note.pitch + 1,
        velocity: note.velocity * 0.7,
        startTime: note.startTime + time,
        duration: trillSpeed
      };
      trillNotes.push(trillNote);
    }

    return trillNotes;
  }

  generateGraceNote(note) {
    return {
      pitch: note.pitch - 1, // Approach from below
      velocity: note.velocity * 0.6,
      startTime: note.startTime - 0.1, // Slightly before main note
      duration: 0.08
    };
  }

  // Counterpoint generation
  generateCounterpoint(melody, style = 'first_species') {
    const counterpoint = [];

    switch (style) {
      case 'first_species':
        counterpoint.push(...this.generateFirstSpeciesCounterpoint(melody));
        break;
      case 'second_species':
        counterpoint.push(...this.generateSecondSpeciesCounterpoint(melody));
        break;
      case 'third_species':
        counterpoint.push(...this.generateThirdSpeciesCounterpoint(melody));
        break;
      case 'free':
        counterpoint.push(...this.generateFreeCounterpoint(melody));
        break;
    }

    return counterpoint;
  }

  generateFirstSpeciesCounterpoint(cantusFirmus) {
    // First species: note against note
    const counterpoint = [];
    let currentTime = 0;

    cantusFirmus.forEach(note => {
      // Generate a counterpoint note that follows voice leading rules
      const cpNote = {
        pitch: this.generateCounterpointNote(note.pitch, counterpoint.length > 0 ? counterpoint[counterpoint.length - 1].pitch : null),
        velocity: note.velocity * 0.8,
        startTime: currentTime,
        duration: note.duration
      };
      counterpoint.push(cpNote);
      currentTime += note.duration;
    });

    return counterpoint;
  }

  generateSecondSpeciesCounterpoint(cantusFirmus) {
    // Second species: two notes against one
    const counterpoint = [];
    let currentTime = 0;

    cantusFirmus.forEach(note => {
      if (note.duration >= 1.0) { // Only for longer notes
        // Two half notes
        const halfDuration = note.duration / 2;
        const pitches = this.generateSecondSpeciesPitches(note.pitch);

        pitches.forEach((pitch, index) => {
          counterpoint.push({
            pitch: pitch,
            velocity: note.velocity * 0.8,
            startTime: currentTime + (index * halfDuration),
            duration: halfDuration
          });
        });
      } else {
        // Single note for shorter durations
        counterpoint.push({
          pitch: this.generateCounterpointNote(note.pitch, counterpoint.length > 0 ? counterpoint[counterpoint.length - 1].pitch : null),
          velocity: note.velocity * 0.8,
          startTime: currentTime,
          duration: note.duration
        });
      }
      currentTime += note.duration;
    });

    return counterpoint;
  }

  generateThirdSpeciesCounterpoint(cantusFirmus) {
    // Third species: four notes against one
    const counterpoint = [];
    let currentTime = 0;

    cantusFirmus.forEach(note => {
      if (note.duration >= 1.0) {
        const quarterDuration = note.duration / 4;
        const pitches = this.generateThirdSpeciesPitches(note.pitch);

        pitches.forEach((pitch, index) => {
          counterpoint.push({
            pitch: pitch,
            velocity: note.velocity * 0.8,
            startTime: currentTime + (index * quarterDuration),
            duration: quarterDuration
          });
        });
      } else {
        counterpoint.push({
          pitch: this.generateCounterpointNote(note.pitch, counterpoint.length > 0 ? counterpoint[counterpoint.length - 1].pitch : null),
          velocity: note.velocity * 0.8,
          startTime: currentTime,
          duration: note.duration
        });
      }
      currentTime += note.duration;
    });

    return counterpoint;
  }

  generateFreeCounterpoint(cantusFirmus) {
    // Free counterpoint - more flexible
    const counterpoint = [];
    let currentTime = 0;

    cantusFirmus.forEach(note => {
      // Generate 1-3 notes per cantus firmus note
      const numNotes = Math.floor(Math.random() * 3) + 1;
      const noteDuration = note.duration / numNotes;

      for (let i = 0; i < numNotes; i++) {
        counterpoint.push({
          pitch: this.generateCounterpointNote(note.pitch, counterpoint.length > 0 ? counterpoint[counterpoint.length - 1].pitch : null),
          velocity: note.velocity * 0.8,
          startTime: currentTime + (i * noteDuration),
          duration: noteDuration
        });
      }
      currentTime += note.duration;
    });

    return counterpoint;
  }

  generateCounterpointNote(cantusPitch, previousCpPitch) {
    // Generate a counterpoint note that follows basic voice leading rules
    const intervals = [-7, -5, -4, -3, -2, 2, 3, 4, 5, 7]; // Preferred intervals
    let bestPitch = cantusPitch + this.selectRandom(intervals);

    // Avoid parallel fifths/octaves if we have a previous note
    if (previousCpPitch !== null) {
      const interval = Math.abs(bestPitch - previousCpPitch);
      if (interval === 0 || interval === 7) { // Unison or fifth
        bestPitch += this.selectRandom([-2, 2]); // Adjust by a second
      }
    }

    return bestPitch;
  }

  generateSecondSpeciesPitches(cantusPitch) {
    // Generate two pitches for second species
    const firstPitch = this.generateCounterpointNote(cantusPitch, null);
    const secondPitch = this.generateCounterpointNote(cantusPitch, firstPitch);
    return [firstPitch, secondPitch];
  }

  generateThirdSpeciesPitches(cantusPitch) {
    // Generate four pitches for third species
    const pitches = [];
    let previousPitch = null;

    for (let i = 0; i < 4; i++) {
      const pitch = this.generateCounterpointNote(cantusPitch, previousPitch);
      pitches.push(pitch);
      previousPitch = pitch;
    }

    return pitches;
  }

  // Melody evaluation and refinement system
  evaluateMelody(melody, criteria = {}) {
    const scores = {
      contour: this.evaluateContour(melody),
      rhythm: this.evaluateRhythm(melody),
      harmony: this.evaluateHarmony(melody, criteria.chordProgression),
      repetition: this.evaluateRepetition(melody),
      range: this.evaluateRange(melody),
      overall: 0
    };

    // Calculate overall score
    scores.overall = (
      scores.contour * 0.25 +
      scores.rhythm * 0.20 +
      scores.harmony * 0.25 +
      scores.repetition * 0.15 +
      scores.range * 0.15
    );

    return scores;
  }

  evaluateContour(melody) {
    if (melody.length < 3) return 0.5;

    let directionChanges = 0;
    let totalMovement = 0;

    for (let i = 1; i < melody.length; i++) {
      const prevPitch = melody[i-1].pitch;
      const currPitch = melody[i].pitch;
      const movement = currPitch - prevPitch;

      totalMovement += Math.abs(movement);

      // Check for direction changes
      if (i > 1) {
        const prevMovement = melody[i-1].pitch - melody[i-2].pitch;
        if ((movement > 0 && prevMovement < 0) || (movement < 0 && prevMovement > 0)) {
          directionChanges++;
        }
      }
    }

    // Good contour has some direction changes but not too many
    const directionScore = Math.max(0, 1 - Math.abs(directionChanges - melody.length * 0.3) / melody.length);
    const movementScore = Math.min(1, totalMovement / (melody.length * 7)); // Expect some movement

    return (directionScore + movementScore) / 2;
  }

  evaluateRhythm(melody) {
    if (melody.length < 2) return 0.5;

    const durations = melody.map(note => note.duration);
    const uniqueDurations = new Set(durations);
    const avgDuration = durations.reduce((sum, d) => sum + d, 0) / durations.length;

    // Prefer some rhythmic variety but not too much
    const varietyScore = Math.min(1, uniqueDurations.size / 4);
    const consistencyScore = 1 - (this.calculateVariance(durations) / (avgDuration * avgDuration));

    return (varietyScore + consistencyScore) / 2;
  }

  evaluateHarmony(melody, chordProgression) {
    if (!chordProgression || chordProgression.length === 0) return 0.7; // Neutral score if no harmony provided

    let harmonyScore = 0;
    const totalNotes = melody.length;

    melody.forEach((note, index) => {
      const chordIndex = Math.floor(index / (totalNotes / chordProgression.length));
      const currentChord = chordProgression[chordIndex % chordProgression.length];
      const chordTones = this.getChordTones(currentChord);

      // Check if note is a chord tone (simplified)
      const noteInKey = note.pitch % 12;
      const isChordTone = chordTones.some(tone => Math.abs(noteInKey - tone) <= 1); // Allow slight deviation

      if (isChordTone) harmonyScore += 1;
    });

    return harmonyScore / totalNotes;
  }

  evaluateRepetition(melody) {
    if (melody.length < 4) return 0.5;

    let repetitionScore = 0;
    const motifs = this.extractMotifs(melody, 3); // 3-note motifs

    // Count motif repetitions
    const motifCounts = {};
    motifs.forEach(motif => {
      const key = motif.join(',');
      motifCounts[key] = (motifCounts[key] || 0) + 1;
    });

    const repeatedMotifs = Object.values(motifCounts).filter(count => count > 1).length;
    const totalUniqueMotifs = Object.keys(motifCounts).length;

    if (totalUniqueMotifs > 0) {
      repetitionScore = repeatedMotifs / totalUniqueMotifs;
    }

    // Good balance of repetition and variety
    return Math.max(0.3, Math.min(0.8, repetitionScore));
  }

  evaluateRange(melody) {
    if (melody.length === 0) return 0.5;

    const pitches = melody.map(note => note.pitch);
    const minPitch = Math.min(...pitches);
    const maxPitch = Math.max(...pitches);
    const range = maxPitch - minPitch;

    // Ideal range is 12-24 semitones (octave to two octaves)
    const idealMin = 12;
    const idealMax = 24;

    if (range < idealMin) {
      return range / idealMin; // Too narrow
    } else if (range > idealMax) {
      return Math.max(0.3, 1 - (range - idealMax) / idealMax); // Too wide
    } else {
      return 1.0; // Perfect range
    }
  }

  extractMotifs(melody, length) {
    const motifs = [];
    for (let i = 0; i <= melody.length - length; i++) {
      const motif = melody.slice(i, i + length).map(note => note.pitch);
      motifs.push(motif);
    }
    return motifs;
  }

  calculateVariance(values) {
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
    return squaredDiffs.reduce((sum, val) => sum + val, 0) / values.length;
  }

  // Refine melody based on evaluation
  refineMelody(melody, evaluation, options = {}) {
    const refined = [...melody];

    // Improve contour if needed
    if (evaluation.contour < 0.6) {
      this.refineContour(refined);
    }

    // Improve harmony if needed
    if (evaluation.harmony < 0.6 && options.chordProgression) {
      this.refineHarmony(refined, options.chordProgression);
    }

    // Improve rhythm if needed
    if (evaluation.rhythm < 0.6) {
      this.refineRhythm(refined);
    }

    // Improve repetition if needed
    if (evaluation.repetition < 0.4) {
      this.addMotifRepetition(refined);
    }

    return refined;
  }

  refineContour(melody) {
    // Add more direction changes for better contour
    for (let i = 1; i < melody.length - 1; i++) {
      const prev = melody[i-1].pitch;
      const curr = melody[i].pitch;
      const next = melody[i+1].pitch;

      // If three notes in same direction, add a change
      if ((curr > prev && next > curr) || (curr < prev && next < curr)) {
        if (Math.random() < 0.3) {
          melody[i].pitch += (Math.random() - 0.5) * 4; // Small adjustment
        }
      }
    }
  }

  refineHarmony(melody, chordProgression) {
    melody.forEach((note, index) => {
      const chordIndex = Math.floor(index / (melody.length / chordProgression.length));
      const currentChord = chordProgression[chordIndex % chordProgression.length];
      const chordTones = this.getChordTones(currentChord);

      const noteInKey = note.pitch % 12;
      const closestChordTone = chordTones.reduce((closest, tone) => {
        return Math.abs(noteInKey - tone) < Math.abs(noteInKey - closest) ? tone : closest;
      });

      // Adjust to closest chord tone with some probability
      if (Math.abs(noteInKey - closestChordTone) > 1 && Math.random() < 0.4) {
        const octave = Math.floor(note.pitch / 12) * 12;
        note.pitch = octave + closestChordTone;
      }
    });
  }

  refineRhythm(melody) {
    // Add some rhythmic variety
    melody.forEach((note, index) => {
      if (Math.random() < 0.2) {
        const variation = (Math.random() - 0.5) * 0.5;
        note.duration = Math.max(0.25, note.duration + variation);
      }
    });
  }

  addMotifRepetition(melody) {
    if (melody.length < 6) return;

    // Find a good motif and repeat it
    const motifLength = 3;
    const startIndex = Math.floor(Math.random() * (melody.length - motifLength * 2));
    const motif = melody.slice(startIndex, startIndex + motifLength);

    // Repeat motif later in the melody
    const repeatStart = startIndex + motifLength + 2;
    if (repeatStart + motifLength <= melody.length) {
      for (let i = 0; i < motifLength; i++) {
        melody[repeatStart + i].pitch = motif[i].pitch;
      }
    }
  }

  // Integration method for existing MusicGenerator
  generateMelodyTrack(description, options) {
    const melodyOptions = {
      key: options.key || 'C',
      scale: this.detectScale(description),
      length: options.duration * 4 || 16, // 4 notes per bar
      tempo: options.tempo || 120,
      shape: this.detectShape(description),
      complexity: this.detectComplexity(description),
      mood: description.mood || 'neutral'
    };

    let melodyNotes = this.generateMelody(melodyOptions);

    // Apply genre-specific style
    const genre = this.detectGenre(description);
    melodyNotes = this.applyGenreStyleToNotes(melodyNotes, genre);

    // Add ornamentation if requested
    if (description.addOrnamentation || description.prompt?.toLowerCase().includes('ornament')) {
      const ornamentStyle = this.detectOrnamentationStyle(description);
      melodyNotes = this.addOrnamentation(melodyNotes, ornamentStyle);
    }

    // Add counterpoint if requested
    if (description.addCounterpoint || description.prompt?.toLowerCase().includes('counterpoint')) {
      const counterpointType = this.detectCounterpointType(description);
      const counterpointTrack = this.generateCounterpoint(melodyNotes, counterpointType);
      // For now, return just the main melody; counterpoint would be a separate track
    }

    // Apply transformations if specified
    if (description.transformations) {
      melodyNotes = this.applyTransformationsToNotes(melodyNotes, description.transformations);
    }

    return {
      name: 'Melody',
      instrument: 'Piano',
      notes: melodyNotes
    };
  }

  detectGenre(description) {
    const genreKeywords = {
      'classical': 'classical',
      'jazz': 'jazz',
      'pop': 'pop',
      'blues': 'blues',
      'electronic': 'electronic',
      'folk': 'folk'
    };

    for (const [keyword, genre] of Object.entries(genreKeywords)) {
      if (description.style?.includes(keyword) || description.prompt?.toLowerCase().includes(keyword)) {
        return genre;
      }
    }
    return 'pop'; // Default
  }

  applyGenreStyleToNotes(notes, genre) {
    // Apply genre-specific modifications to note array
    switch (genre) {
      case 'jazz':
        return this.applyJazzStyle(notes);
      case 'classical':
        return this.applyClassicalStyle(notes);
      case 'blues':
        return this.applyBluesStyle(notes);
      case 'electronic':
        return this.applyElectronicStyle(notes);
      default:
        return notes;
    }
  }

  applyJazzStyle(notes) {
    // Add jazz-specific elements: blue notes, syncopation
    return notes.map(note => ({
      ...note,
      // Add slight pitch variations for jazz feel
      pitch: note.pitch + (Math.random() < 0.1 ? -1 : 0) // Occasional blue note
    }));
  }

  applyClassicalStyle(notes) {
    // Classical style: more structured, balanced phrases
    return notes; // For now, return unchanged
  }

  applyBluesStyle(notes) {
    // Blues style: blue notes, slower tempo feel
    return notes.map(note => ({
      ...note,
      // Emphasize blue notes (flattened 3rd, 5th, 7th)
      pitch: note.pitch + (Math.random() < 0.15 ? -1 : 0)
    }));
  }

  applyElectronicStyle(notes) {
    // Electronic style: quantized, arpeggiated
    return notes.map(note => ({
      ...note,
      // Make rhythms more mechanical
      duration: Math.round(note.duration * 4) / 4 // Quantize to 16ths
    }));
  }

  detectOrnamentationStyle(description) {
    if (description.prompt?.toLowerCase().includes('trill')) return 'trill';
    if (description.prompt?.toLowerCase().includes('grace')) return 'grace';
    if (description.prompt?.toLowerCase().includes('turn')) return 'turn';
    return 'trill'; // Default
  }

  detectCounterpointType(description) {
    if (description.prompt?.toLowerCase().includes('first species')) return 'first_species';
    if (description.prompt?.toLowerCase().includes('second species')) return 'second_species';
    if (description.prompt?.toLowerCase().includes('third species')) return 'third_species';
    if (description.prompt?.toLowerCase().includes('free')) return 'free';
    return 'free'; // Default
  }

  applyTransformationsToNotes(notes, transformations) {
    let transformedNotes = [...notes];

    transformations.forEach(transform => {
      switch (transform) {
        case 'invert':
          transformedNotes = this.invertMelody(transformedNotes);
          break;
        case 'retrograde':
          transformedNotes = this.retrogradeMelody(transformedNotes);
          break;
        case 'augment':
          transformedNotes = this.augmentMelody(transformedNotes);
          break;
        case 'diminish':
          transformedNotes = this.diminishMelody(transformedNotes);
          break;
        case 'transpose':
          transformedNotes = this.transposeMelody(transformedNotes, 7); // Up a fifth
          break;
      }
    });

    return transformedNotes;
  }

  detectScale(description) {
    const scaleKeywords = {
      'minor': 'minor',
      'major': 'major',
      'jazz': 'mixolydian',
      'blues': 'blues',
      'pentatonic': 'pentatonic_minor'
    };

    for (const [keyword, scale] of Object.entries(scaleKeywords)) {
      if (description.style?.includes(keyword) || description.prompt?.toLowerCase().includes(keyword)) {
        return scale;
      }
    }
    return 'major';
  }

  detectShape(description) {
    const shapeKeywords = {
      'ascending': 'ascending',
      'descending': 'descending',
      'arch': 'arch',
      'wave': 'wave',
      'rising': 'ascending',
      'falling': 'descending'
    };

    for (const [keyword, shape] of Object.entries(shapeKeywords)) {
      if (description.prompt?.toLowerCase().includes(keyword)) {
        return shape;
      }
    }

    return 'arch'; // Default shape
  }

  detectComplexity(description) {
    if (description.style?.includes('simple') || description.prompt?.toLowerCase().includes('simple')) {
      return 'simple';
    } else if (description.style?.includes('complex') || description.prompt?.toLowerCase().includes('complex')) {
      return 'complex';
    }
    return 'medium';
  }

  // Library-inspired pattern methods
  getInspiredMotifs() {
    if (!this.libraryPatterns.motifs || this.libraryPatterns.motifs.length === 0) {
      return [];
    }

    // Return motifs from library, weighted by frequency
    const motifCounts = {};
    this.libraryPatterns.motifs.forEach(item => {
      const key = JSON.stringify(item.pattern);
      motifCounts[key] = (motifCounts[key] || 0) + item.weight;
    });

    // Convert back to motif arrays
    return Object.entries(motifCounts)
      .sort((a, b) => b[1] - a[1]) // Sort by frequency
      .slice(0, 10) // Top 10 motifs
      .map(([key, count]) => JSON.parse(key));
  }

  getInspiredShape() {
    if (!this.libraryPatterns.shapes || this.libraryPatterns.shapes.length === 0) {
      return 'arch';
    }

    // Return most common shape from library
    const shapeCounts = {};
    this.libraryPatterns.shapes.forEach(item => {
      shapeCounts[item.shape] = (shapeCounts[item.shape] || 0) + item.weight;
    });

    const sortedShapes = Object.entries(shapeCounts).sort((a, b) => b[1] - a[1]);
    return sortedShapes[0][0];
  }

  getInspiredRhythm() {
    if (!this.libraryPatterns.rhythms || this.libraryPatterns.rhythms.length === 0) {
      return 'moderate';
    }

    // Return most common rhythm pattern
    const rhythmCounts = {};
    this.libraryPatterns.rhythms.forEach(item => {
      rhythmCounts[item.pattern] = (rhythmCounts[item.pattern] || 0) + item.weight;
    });

    const sortedRhythms = Object.entries(rhythmCounts).sort((a, b) => b[1] - a[1]);
    return sortedRhythms[0][0];
  }
}

module.exports = AdvancedMelodyGenerator;