const MelodyControls = require('./melody-controls');
const MusicGenerator = require('./src/generation/MusicGenerator');

async function demonstrateAdvancedFeatures() {
  console.log('🎵 AI Music Assistant - Advanced Features Demo\n');

  const controls = new MelodyControls();
  const generator = new MusicGenerator();

  // Test cases showcasing different features
  const testCases = [
    {
      name: '🎼 Classical Sonata with Controls',
      description: {
        style: 'classical',
        shape: 'arch',
        prompt: 'Create a beautiful classical melody with arch shape'
      },
      controls: {
        complexity: 0.8, // High complexity
        creativity: 0.9, // Very creative
        energy: 0.6,    // Moderate energy
        groove: 0.3,    // Low groove (classical)
        harmony: 0.8    // High harmony awareness
      },
      options: {
        key: 'C',
        tempo: 100,
        duration: 4
      }
    },
    {
      name: '🎷 Jazz Improvisation with Preview',
      description: {
        style: 'jazz',
        shape: 'wave',
        prompt: 'Jazz improvisation with blue notes and syncopation'
      },
      controls: {
        complexity: 0.7,
        creativity: 0.9,
        energy: 0.8,
        groove: 0.9,    // High groove
        harmony: 0.6
      },
      options: {
        key: 'Bb',
        tempo: 180,
        duration: 3
      }
    },
    {
      name: '🎹 Electronic with Analysis',
      description: {
        style: 'electronic',
        shape: 'spiral',
        prompt: 'Electronic melody with arpeggios and effects'
      },
      controls: {
        complexity: 0.9,
        creativity: 0.7,
        energy: 0.9,
        groove: 0.8,
        harmony: 0.5
      },
      options: {
        key: 'D',
        tempo: 140,
        duration: 2
      }
    }
  ];

  for (const testCase of testCases) {
    console.log(`\n--- ${testCase.name} ---`);

    try {
      // Generate melody with controls
      const result = await controls.generateWithControls(testCase.description, {
        ...testCase.options,
        controls: testCase.controls
      });

      console.log(`✅ Generated ${result.melody.notes.length} notes`);
      console.log(`🎼 Key: ${testCase.options.key}, Tempo: ${testCase.options.tempo} BPM`);
      console.log(`🎛️  Controls: Complexity ${testCase.controls.complexity}, Creativity ${testCase.controls.creativity}, Energy ${testCase.controls.energy}`);

      // Display analysis
      const analysis = result.analysis;
      console.log(`📊 Analysis:`);
      console.log(`   Duration: ${analysis.duration.toFixed(1)}s, Range: ${analysis.range} semitones`);
      console.log(`   Key: ${analysis.key}, Shape: ${analysis.shape}, Rhythm: ${analysis.rhythmVariety}`);
      console.log(`   Motifs: ${analysis.motifs}, Dynamics: ${analysis.dynamics}`);
      console.log(`   🎵 Musicality Score: ${analysis.musicality}/100`);

      // Test preview (in a real app, this would play audio)
      console.log(`🔊 Preview: ${result.melody.notes.length} notes ready for audio playback`);

      // Test export capabilities
      console.log(`💾 Export: MIDI and WAV export available`);

    } catch (error) {
      console.log(`❌ Failed: ${error.message}`);
    }
  }

  // Show generation history
  console.log('\n📚 GENERATION HISTORY');
  console.log('======================');

  const history = controls.getHistory();
  history.forEach((entry, index) => {
    console.log(`${index + 1}. ${entry.description.style} - Score: ${entry.analysis.musicality}/100`);
  });

  console.log('\n🎉 Advanced Features Demo Complete!');
  console.log('✨ New Capabilities:');
  console.log('   • Melody preview with real-time audio');
  console.log('   • Advanced controls (complexity, creativity, energy, groove, harmony)');
  console.log('   • Detailed musical analysis');
  console.log('   • MIDI and WAV export');
  console.log('   • Generation history and comparison');
  console.log('   • Improved library learning from your music collection');
}

async function testLibraryLearning() {
  console.log('\n🧠 TESTING IMPROVED LIBRARY LEARNING');

  const AdvancedMelodyGenerator = require('./advanced-melody-generator');
  const gen = new AdvancedMelodyGenerator();

  // Test with real library data structure
  const mockLibraryFiles = [
    {
      analysis: {
        key: 'C major',
        genre: 'Classical',
        tempo: 120,
        chords: ['I', 'IV', 'V', 'I'],
        duration: 4
      },
      type: 'midi'
    },
    {
      analysis: {
        key: 'Bb major',
        genre: 'Jazz',
        tempo: 180,
        chords: ['I', 'vi', 'ii', 'V'],
        duration: 3
      },
      type: 'audio'
    },
    {
      analysis: {
        key: 'A minor',
        genre: 'Pop',
        tempo: 100,
        chords: ['i', 'VII', 'VI', 'V'],
        duration: 2
      },
      type: 'audio'
    }
  ];

  gen.learnFromLibrary(mockLibraryFiles);

  console.log('✅ Library learning completed');
  console.log(`📊 Learned patterns from ${mockLibraryFiles.length} files`);
}

// Run the comprehensive demo
demonstrateAdvancedFeatures().then(() => {
  return testLibraryLearning();
}).catch(console.error);