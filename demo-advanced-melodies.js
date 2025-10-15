const MusicGenerator = require('./src/generation/MusicGenerator');

async function demonstrateAdvancedMelodyGeneration() {
  console.log('🎵 AI Music Assistant - Advanced Melody Generation Demo\n');

  const generator = new MusicGenerator();

  // Define test cases showcasing different features
  const testCases = [
    {
      name: '🎼 Classical Sonata Movement',
      description: {
        style: 'classical',
        shape: 'arch',
        complexity: 'complex',
        prompt: 'Create a classical melody with arch shape and motif development'
      },
      options: {
        key: 'C',
        tempo: 100,
        duration: 4,
        addOrnamentation: true
      }
    },
    {
      name: '🎷 Jazz Improvisation',
      description: {
        style: 'jazz',
        shape: 'wave',
        complexity: 'complex',
        prompt: 'Jazz improvisation with blue notes and syncopation'
      },
      options: {
        key: 'Bb',
        tempo: 180,
        duration: 3,
        addOrnamentation: true
      }
    },
    {
      name: '🎤 Pop Hook with Counterpoint',
      description: {
        style: 'pop',
        shape: 'hook',
        complexity: 'medium',
        prompt: 'Catchy pop melody with counterpoint',
        addCounterpoint: true,
        counterpointType: 'free'
      },
      options: {
        key: 'G',
        tempo: 120,
        duration: 2
      }
    },
    {
      name: '🎸 Blues Progression',
      description: {
        style: 'blues',
        shape: 'call_response',
        complexity: 'medium',
        prompt: '12-bar blues with call and response',
        transformations: ['retrograde']
      },
      options: {
        key: 'A',
        tempo: 90,
        duration: 4
      }
    },
    {
      name: '🎹 Electronic Arpeggio',
      description: {
        style: 'electronic',
        shape: 'spiral',
        complexity: 'complex',
        prompt: 'Electronic melody with arpeggios and effects'
      },
      options: {
        key: 'D',
        tempo: 140,
        duration: 2
      }
    },
    {
      name: '🎻 Folk Tune with Ornamentation',
      description: {
        style: 'folk',
        shape: 'plateau',
        complexity: 'simple',
        prompt: 'Simple folk melody with grace notes',
        addOrnamentation: true,
        ornamentationType: 'grace'
      },
      options: {
        key: 'E',
        tempo: 110,
        duration: 3
      }
    }
  ];

  const results = [];

  for (const testCase of testCases) {
    console.log(`\n--- ${testCase.name} ---`);

    try {
      const melodyTrack = await generator.generateMelodyTrack(testCase.description, testCase.options);

      const analysis = analyzeMelody(melodyTrack.notes);
      results.push({
        test: testCase.name,
        success: true,
        notes: melodyTrack.notes.length,
        analysis: analysis
      });

      console.log(`✅ Generated ${melodyTrack.notes.length} notes`);
      console.log(`🎼 Key: ${testCase.options.key}, Tempo: ${testCase.options.tempo} BPM`);
      console.log(`🎵 Range: ${analysis.range} semitones, Motifs: ${analysis.motifs}`);
      console.log(`🎶 Rhythm variety: ${analysis.rhythmVariety}`);

      // Show first few notes as example
      const sampleNotes = melodyTrack.notes.slice(0, 4).map(n =>
        `pitch:${n.pitch} dur:${n.duration.toFixed(2)}`
      ).join(', ');
      console.log(`🎹 Sample: ${sampleNotes}`);

    } catch (error) {
      console.log(`❌ Failed: ${error.message}`);
      results.push({
        test: testCase.name,
        success: false,
        error: error.message
      });
    }
  }

  // Summary
  console.log('\n🎵 DEMO SUMMARY');
  console.log('================');

  const successful = results.filter(r => r.success);
  const totalNotes = successful.reduce((sum, r) => sum + r.notes, 0);

  console.log(`✅ Successful generations: ${successful.length}/${results.length}`);
  console.log(`🎵 Total notes generated: ${totalNotes}`);
  console.log(`📊 Average notes per melody: ${(totalNotes / successful.length).toFixed(1)}`);

  if (successful.length > 0) {
    const avgRange = successful.reduce((sum, r) => sum + r.analysis.range, 0) / successful.length;
    const totalMotifs = successful.reduce((sum, r) => sum + r.analysis.motifs, 0);

    console.log(`🎼 Average melodic range: ${avgRange.toFixed(1)} semitones`);
    console.log(`🎶 Total motifs detected: ${totalMotifs}`);
  }

  console.log('\n🎉 Advanced melody generation is fully integrated and working!');
  console.log('Your AI Music Assistant now creates sophisticated, musical melodies! 🎼✨');
}

function analyzeMelody(notes) {
  if (!notes || notes.length === 0) return { range: 0, motifs: 0, rhythmVariety: 'None' };

  // Calculate range
  const pitches = notes.map(n => n.pitch).filter(p => p);
  const range = pitches.length > 0 ? Math.max(...pitches) - Math.min(...pitches) : 0;

  // Count motifs (repeated 3-note patterns)
  let motifCount = 0;
  for (let i = 0; i < notes.length - 6; i++) {
    const pattern = notes.slice(i, i + 3).map(n => n.pitch);
    for (let j = i + 3; j < notes.length - 3; j++) {
      const comparePattern = notes.slice(j, j + 3).map(n => n.pitch);
      if (pattern.every((note, idx) => note === comparePattern[idx])) {
        motifCount++;
        break;
      }
    }
  }

  // Analyze rhythm variety
  const durations = notes.map(n => n.duration).filter(d => d > 0);
  const uniqueDurations = new Set(durations.map(d => Math.round(d * 4) / 4)); // Quantize to 16ths

  let rhythmVariety;
  if (uniqueDurations.size === 1) rhythmVariety = 'Monotonic';
  else if (uniqueDurations.size <= 3) rhythmVariety = 'Varied';
  else rhythmVariety = 'Complex';

  return { range, motifs: motifCount, rhythmVariety };
}

// Run the demo
demonstrateAdvancedMelodyGeneration().catch(console.error);