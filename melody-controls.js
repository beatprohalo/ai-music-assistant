const MelodyPreview = require('./melody-preview');

class MelodyControls {
  constructor() {
    this.preview = new MelodyPreview();
    this.currentMelody = null;
    this.generationHistory = [];
  }

  // Generate melody with variation controls
  async generateWithControls(description, baseOptions = {}) {
    const controls = {
      complexity: baseOptions.complexity || 0.5, // 0-1
      creativity: baseOptions.creativity || 0.5, // 0-1
      energy: baseOptions.energy || 0.5, // 0-1
      groove: baseOptions.groove || 0.5, // 0-1
      harmony: baseOptions.harmony || 0.5, // 0-1
      ...baseOptions.controls
    };

    // Apply control influences to generation options
    const enhancedOptions = this.applyControlsToOptions(description, controls, baseOptions);

    // Generate melody
    const MusicGenerator = require('./src/generation/MusicGenerator');
    const generator = new MusicGenerator();
    const melodyTrack = await generator.generateMelodyTrack(description, enhancedOptions);

    // Store in history
    this.currentMelody = melodyTrack;
    this.generationHistory.push({
      melody: melodyTrack,
      description,
      options: enhancedOptions,
      controls,
      timestamp: new Date()
    });

    return {
      melody: melodyTrack,
      analysis: this.analyzeMelody(melodyTrack),
      controls
    };
  }

  applyControlsToOptions(description, controls, baseOptions) {
    const options = { ...baseOptions };

    // Complexity affects length and motif usage
    if (controls.complexity < 0.3) {
      options.duration = Math.max(1, (options.duration || 2) * 0.7);
      description.complexity = 'simple';
    } else if (controls.complexity > 0.7) {
      options.duration = (options.duration || 2) * 1.3;
      description.complexity = 'complex';
    } else {
      description.complexity = 'medium';
    }

    // Creativity affects motif variation and randomness
    if (controls.creativity > 0.7) {
      description.addOrnamentation = true;
      description.ornamentationType = 'trill';
    }

    // Energy affects tempo and velocity
    const energyMultiplier = 0.8 + (controls.energy * 0.4); // 0.8 to 1.2
    options.tempo = (options.tempo || 120) * energyMultiplier;

    // Groove affects rhythm patterns
    if (controls.groove > 0.6) {
      description.prompt = (description.prompt || '') + ' with syncopation and groove';
    }

    // Harmony affects chord awareness
    if (controls.harmony > 0.7) {
      description.addCounterpoint = true;
      description.counterpointType = 'free';
    }

    return options;
  }

  // Preview current melody
  async previewCurrentMelody(options = {}) {
    if (!this.currentMelody) {
      throw new Error('No melody to preview. Generate a melody first.');
    }

    return await this.preview.previewMelody(this.currentMelody, options);
  }

  // Stop preview
  stopPreview() {
    this.preview.stopPreview();
  }

  // Export current melody
  async exportCurrentMelody(format = 'midi', filename = null) {
    if (!this.currentMelody) {
      throw new Error('No melody to export. Generate a melody first.');
    }

    if (!filename) {
      const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
      filename = `melody-${timestamp}.${format}`;
    }

    if (format === 'midi') {
      return await this.preview.exportMelodyAsMIDI(this.currentMelody, filename);
    } else if (format === 'wav') {
      return await this.preview.exportMelodyAsWAV(this.currentMelody, filename);
    } else {
      throw new Error(`Unsupported export format: ${format}`);
    }
  }

  // Analyze melody characteristics
  analyzeMelody(melodyTrack) {
    const notes = melodyTrack.notes || [];
    if (notes.length === 0) {
      return { error: 'No notes to analyze' };
    }

    const analysis = {
      noteCount: notes.length,
      duration: this.calculateDuration(notes),
      range: this.calculateRange(notes),
      key: this.detectKey(notes),
      tempo: this.estimateTempo(notes),
      rhythmVariety: this.analyzeRhythm(notes),
      pitchVariety: this.analyzePitch(notes),
      motifs: this.detectMotifs(notes),
      shape: this.analyzeShape(notes),
      dynamics: this.analyzeDynamics(notes),
      musicality: this.calculateMusicalityScore(notes)
    };

    return analysis;
  }

  calculateDuration(notes) {
    if (notes.length === 0) return 0;
    const maxEndTime = Math.max(...notes.map(n => (n.startTime || 0) + (n.duration || 0)));
    return maxEndTime;
  }

  calculateRange(notes) {
    if (notes.length === 0) return 0;
    const pitches = notes.map(n => n.pitch || n.midi || 60).filter(p => p > 0);
    if (pitches.length === 0) return 0;
    return Math.max(...pitches) - Math.min(...pitches);
  }

  detectKey(notes) {
    // Simple key detection based on pitch distribution
    const pitchCounts = {};
    notes.forEach(note => {
      const pitch = (note.pitch || note.midi || 60) % 12;
      pitchCounts[pitch] = (pitchCounts[pitch] || 0) + 1;
    });

    const sortedPitches = Object.entries(pitchCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);

    // Map to key (simplified)
    const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const rootPitch = parseInt(sortedPitches[0][0]);
    return noteNames[rootPitch] + ' major';
  }

  estimateTempo(notes) {
    if (notes.length < 2) return 120;

    // Estimate based on average note duration
    const avgDuration = notes.reduce((sum, n) => sum + (n.duration || 0.5), 0) / notes.length;
    const estimatedBPM = 60 / avgDuration;

    // Clamp to reasonable range
    return Math.max(60, Math.min(200, estimatedBPM));
  }

  analyzeRhythm(notes) {
    const durations = notes.map(n => n.duration || 0.5);
    const uniqueDurations = new Set(durations.map(d => Math.round(d * 4) / 4));

    if (uniqueDurations.size === 1) return 'Monotonic';
    if (uniqueDurations.size <= 3) return 'Varied';
    return 'Complex';
  }

  analyzePitch(notes) {
    const pitches = notes.map(n => n.pitch || n.midi || 60);
    const uniquePitches = new Set(pitches);

    if (uniquePitches.size <= 5) return 'Limited';
    if (uniquePitches.size <= 12) return 'Moderate';
    return 'Wide';
  }

  detectMotifs(notes) {
    if (notes.length < 6) return 0;

    let motifCount = 0;
    for (let i = 0; i < notes.length - 6; i++) {
      const pattern = notes.slice(i, i + 3).map(n => n.pitch || n.midi);
      for (let j = i + 3; j < notes.length - 3; j++) {
        const comparePattern = notes.slice(j, j + 3).map(n => n.pitch || n.midi);
        if (pattern.every((note, idx) => note === comparePattern[idx])) {
          motifCount++;
          break;
        }
      }
    }
    return motifCount;
  }

  analyzeShape(notes) {
    if (notes.length < 4) return 'Unknown';

    const pitches = notes.map(n => n.pitch || n.midi || 60);
    const firstHalf = pitches.slice(0, Math.floor(pitches.length / 2));
    const secondHalf = pitches.slice(Math.floor(pitches.length / 2));

    const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;

    if (Math.abs(secondAvg - firstAvg) < 2) return 'Flat';
    if (secondAvg > firstAvg) return 'Rising';
    return 'Falling';
  }

  analyzeDynamics(notes) {
    const velocities = notes.map(n => n.velocity || 64);
    const avgVelocity = velocities.reduce((a, b) => a + b, 0) / velocities.length;
    const velocityRange = Math.max(...velocities) - Math.min(...velocities);

    if (velocityRange < 10) return 'Static';
    if (velocityRange < 30) return 'Moderate';
    return 'Dynamic';
  }

  calculateMusicalityScore(notes) {
    if (notes.length === 0) return 0;

    let score = 0;

    // Note count (more notes = higher score, up to a point)
    score += Math.min(notes.length / 10, 1) * 20;

    // Range (wider range = higher score)
    const range = this.calculateRange(notes);
    score += Math.min(range / 24, 1) * 20; // 2 octaves = full points

    // Motifs (more repetition = more musical)
    const motifs = this.detectMotifs(notes);
    score += Math.min(motifs / 3, 1) * 20;

    // Rhythm variety
    const rhythmVariety = this.analyzeRhythm(notes);
    const rhythmScore = rhythmVariety === 'Complex' ? 1 : rhythmVariety === 'Varied' ? 0.7 : 0.3;
    score += rhythmScore * 20;

    // Dynamics
    const dynamics = this.analyzeDynamics(notes);
    const dynamicScore = dynamics === 'Dynamic' ? 1 : dynamics === 'Moderate' ? 0.7 : 0.3;
    score += dynamicScore * 20;

    return Math.round(score);
  }

  // Get generation history
  getHistory() {
    return this.generationHistory.map(entry => ({
      timestamp: entry.timestamp,
      description: entry.description,
      controls: entry.controls,
      analysis: this.analyzeMelody(entry.melody)
    }));
  }

  // Load melody from history
  loadFromHistory(index) {
    if (index < 0 || index >= this.generationHistory.length) {
      throw new Error('Invalid history index');
    }

    this.currentMelody = this.generationHistory[index].melody;
    return this.currentMelody;
  }
}

module.exports = MelodyControls;