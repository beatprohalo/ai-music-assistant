const AdvancedMelodyGenerator = require('./advanced-melody-generator');
const { Midi } = require('@tonejs/midi');

class MelodyTester {
  constructor() {
    this.generator = new AdvancedMelodyGenerator();
  }

  async testMelodyTypes() {
    console.log('🎵 Testing Advanced Melody Generation System\n');

    const testCases = [
      {
        name: 'Classical Arch Melody',
        description: {
          style: 'classical',
          shape: 'arch',
          complexity: 'medium',
          prompt: 'Create a beautiful classical melody with arch shape'
        }
      },
      {
        name: 'Jazz Improvisation',
        description: {
          style: 'jazz',
          shape: 'wave',
          complexity: 'complex',
          prompt: 'Jazz improvisation with syncopation and blue notes'
        }
      },
      {
        name: 'Pop Hook',
        description: {
          style: 'pop',
          shape: 'hook',
          complexity: 'simple',
          prompt: 'Catchy pop melody hook'
        }
      },
      {
        name: 'Blues Progression',
        description: {
          style: 'blues',
          shape: 'call_response',
          complexity: 'medium',
          prompt: '12-bar blues melody with call and response'
        }
      },
      {
        name: 'Electronic Arpeggio',
        description: {
          style: 'electronic',
          shape: 'spiral',
          complexity: 'complex',
          prompt: 'Electronic melody with arpeggios and effects'
        }
      },
      {
        name: 'Folk Tune',
        description: {
          style: 'folk',
          shape: 'wave',
          complexity: 'simple',
          prompt: 'Simple folk melody with natural phrasing'
        }
      }
    ];

    const results = [];

    for (const testCase of testCases) {
      console.log(`\n--- Testing: ${testCase.name} ---`);

      try {
        const melodyTrack = this.generator.generateMelodyTrack(testCase.description, {
          key: 'C',
          tempo: 120,
          duration: 4 // 4 bars
        });
        const analysis = this.analyzeMelody(melodyTrack.notes || [], testCase.name);

        results.push({
          test: testCase.name,
          success: true,
          analysis: analysis,
          melody: melodyTrack
        });

        console.log(`✅ Generated ${analysis.noteCount} notes`);
        console.log(`🎼 Key: ${analysis.key}, Range: ${analysis.range} semitones`);
        console.log(`🎵 Shape: ${analysis.shape}, Rhythm: ${analysis.rhythmVariety}`);
        console.log(`🎶 Harmonic: ${analysis.harmonicFit}, Motifs: ${analysis.motifCount}`);

      } catch (error) {
        console.log(`❌ Failed: ${error.message}`);
        results.push({
          test: testCase.name,
          success: false,
          error: error.message
        });
      }
    }

    this.printSummary(results);
    return results;
  }

  analyzeMelody(notes, testName) {
    const analysis = {
      noteCount: notes.length,
      key: this.detectKey(notes),
      range: this.calculateRange(notes),
      shape: this.detectShape(notes),
      rhythmVariety: this.analyzeRhythm(notes),
      harmonicFit: this.checkHarmonicFit(notes, []), // No chords provided in test
      motifCount: this.countMotifs(notes)
    };

    return analysis;
  }

  detectKey(notes) {
    if (!notes || notes.length === 0) return 'Unknown';

    // Simple key detection based on most common notes
    const noteCounts = {};
    notes.forEach(note => {
      const midiNote = note.midi || note.pitch;
      if (midiNote) {
        const noteName = this.midiToNoteName(midiNote % 12);
        noteCounts[noteName] = (noteCounts[noteName] || 0) + 1;
      }
    });

    const sortedNotes = Object.entries(noteCounts).sort((a, b) => b[1] - a[1]);
    return sortedNotes[0][0] + ' Major'; // Simplified
  }

  midiToNoteName(midiNote) {
    const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    return noteNames[midiNote % 12];
  }

  calculateRange(notes) {
    if (!notes || notes.length === 0) return 0;

    const pitches = notes.map(n => n.midi || n.pitch).filter(p => p);
    if (pitches.length === 0) return 0;

    return Math.max(...pitches) - Math.min(...pitches);
  }

  detectShape(notes) {
    if (!notes || notes.length < 4) return 'Unknown';

    const pitches = notes.map(n => n.midi || n.pitch).filter(p => p);
    if (pitches.length < 4) return 'Unknown';

    // Simple shape detection
    const firstHalf = pitches.slice(0, Math.floor(pitches.length / 2));
    const secondHalf = pitches.slice(Math.floor(pitches.length / 2));

    const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;

    if (secondAvg > firstAvg) return 'Rising';
    if (secondAvg < firstAvg) return 'Falling';
    return 'Flat';
  }

  analyzeRhythm(notes) {
    if (!notes || notes.length === 0) return 'None';

    const durations = notes.map(n => n.duration || 0.25).filter(d => d > 0);
    const uniqueDurations = new Set(durations);

    if (uniqueDurations.size === 1) return 'Monotonic';
    if (uniqueDurations.size <= 3) return 'Varied';
    return 'Complex';
  }

  checkHarmonicFit(notes, chords) {
    if (!chords || chords.length === 0) return 'No chords';

    // Simple harmonic fit check
    let fitCount = 0;
    notes.forEach(note => {
      const midiNote = note.midi || note.pitch;
      if (midiNote) {
        const noteInChord = chords.some(chord =>
          chord.notes && chord.notes.includes(midiNote % 12)
        );
        if (noteInChord) fitCount++;
      }
    });

    const fitPercentage = (fitCount / notes.length) * 100;
    if (fitPercentage > 80) return 'Excellent';
    if (fitPercentage > 60) return 'Good';
    if (fitPercentage > 40) return 'Fair';
    return 'Poor';
  }

  countMotifs(notes) {
    if (!notes || notes.length < 6) return 0;

    const pitches = notes.map(n => n.midi || n.pitch).filter(p => p);
    let motifCount = 0;

    // Look for repeated 3-note patterns
    for (let i = 0; i < pitches.length - 6; i++) {
      const pattern = pitches.slice(i, i + 3);
      for (let j = i + 3; j < pitches.length - 3; j++) {
        const comparePattern = pitches.slice(j, j + 3);
        if (pattern.every((note, idx) => note === comparePattern[idx])) {
          motifCount++;
          break;
        }
      }
    }

    return motifCount;
  }

  printSummary(results) {
    console.log('\n🎵 MELODY GENERATION TEST SUMMARY');
    console.log('=====================================');

    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);

    console.log(`\n✅ Successful Tests: ${successful.length}/${results.length}`);

    if (successful.length > 0) {
      console.log('\n📊 Analysis Results:');
      successful.forEach(result => {
        const a = result.analysis;
        console.log(`  ${result.test}:`);
        console.log(`    Notes: ${a.noteCount}, Key: ${a.key}, Range: ${a.range}st`);
        console.log(`    Shape: ${a.shape}, Rhythm: ${a.rhythmVariety}, Harmony: ${a.harmonicFit}`);
        console.log(`    Motifs: ${a.motifCount}`);
      });
    }

    if (failed.length > 0) {
      console.log('\n❌ Failed Tests:');
      failed.forEach(result => {
        console.log(`  ${result.test}: ${result.error}`);
      });
    }

    // Overall statistics
    if (successful.length > 0) {
      const avgNotes = successful.reduce((sum, r) => sum + r.analysis.noteCount, 0) / successful.length;
      const avgRange = successful.reduce((sum, r) => sum + r.analysis.range, 0) / successful.length;
      const motifTotal = successful.reduce((sum, r) => sum + r.analysis.motifCount, 0);

      console.log('\n📈 Overall Statistics:');
      console.log(`  Average Notes: ${avgNotes.toFixed(1)}`);
      console.log(`  Average Range: ${avgRange.toFixed(1)} semitones`);
      console.log(`  Total Motifs Found: ${motifTotal}`);
      console.log(`  Success Rate: ${((successful.length / results.length) * 100).toFixed(1)}%`);
    }
  }

  async saveTestResults(results, filename = 'melody-test-results.json') {
    const fs = require('fs').promises;

    try {
      await fs.writeFile(filename, JSON.stringify(results, null, 2));
      console.log(`💾 Test results saved to ${filename}`);
    } catch (error) {
      console.log(`❌ Failed to save results: ${error.message}`);
    }
  }
}

// Export for use in other modules
module.exports = MelodyTester;

// If run directly, execute tests
if (require.main === module) {
  const tester = new MelodyTester();
  tester.testMelodyTypes().then(results => {
    return tester.saveTestResults(results);
  }).catch(error => {
    console.error('Test execution failed:', error);
  });
}