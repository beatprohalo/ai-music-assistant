const path = require('path');
const fs = require('fs');
const fsp = require('fs').promises;

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateTitleFromPrompt(prompt = '') {
  const ideas = ['Cosmic Echoes', 'Midnight Wanderer', 'Starlight Serenade', 'Oceanic Dreams', 'City of Ghosts'];
  return prompt ? `Song inspired by: ${prompt}` : pickRandom(ideas);
}

function buildDescriptionFromPrompt(prompt = '') {
  return prompt ? `A musical piece inspired by the prompt: "${prompt}".` : 'A randomly generated musical piece.';
}

function inferGenreFromPrompt(prompt = '') {
  const lowerPrompt = prompt.toLowerCase();
  if (lowerPrompt.includes('rock')) return 'Rock';
  if (lowerPrompt.includes('jazz')) return 'Jazz';
  if (lowerPrompt.includes('classical')) return 'Classical';
  if (lowerPrompt.includes('electronic')) return 'Electronic';
  if (lowerPrompt.includes('pop')) return 'Pop';
  return pickRandom(['Ambient', 'Cinematic', 'Experimental']);
}

function buildInstrumentation(prompt = '') {
  const genre = inferGenreFromPrompt(prompt);
  const instruments = {
    'Rock': ['Electric Guitar', 'Bass Guitar', 'Drums', 'Vocals'],
    'Jazz': ['Piano', 'Saxophone', 'Double Bass', 'Drums'],
    'Classical': ['Violin', 'Cello', 'Piano', 'Flute'],
    'Electronic': ['Synthesizer', 'Drum Machine', 'Sampler', 'Vocoder'],
    'Pop': ['Vocals', 'Synthesizer', 'Bass Guitar', 'Drums'],
    'Ambient': ['Synthesizer', 'Pads', 'Soundscapes'],
    'Cinematic': ['Strings', 'Brass', 'Percussion', 'Piano'],
    'Experimental': ['Buchla Easel', 'Theremin', 'Prepared Piano']
  };
  return instruments[genre] || instruments['Ambient'];
}

function inferInstrumentRole(name) {
  const lowerName = name.toLowerCase();
  if (lowerName.includes('guitar') || lowerName.includes('piano') || lowerName.includes('sax')) return 'melody';
  if (lowerName.includes('bass')) return 'bassline';
  if (lowerName.includes('drums') || lowerName.includes('percussion')) return 'rhythm';
  if (lowerName.includes('synth') || lowerName.includes('pads')) return 'harmony';
  return 'melody';
}

function pickRandomArticulations(name) {
  const articulations = ['staccato', 'legato', 'pizzicato', 'vibrato', 'tremolo'];
  return pickRandomSubarray(articulations);
}

function pickRandomSubarray(source, min = 1, max = 3) {
  const shuffled = source.sort(() => 0.5 - Math.random());
  const count = Math.floor(Math.random() * (max - min + 1)) + min;
  return shuffled.slice(0, count);
}

function buildStructure() {
  const sections = ['intro', 'verse', 'chorus', 'verse', 'chorus', 'bridge', 'outro'];
  return sections.map(name => ({ name, length_bars: pickRandom([4, 8, 16]) }));
}

function buildHarmony(analysisPatterns = null) {
  if (analysisPatterns && analysisPatterns.progressions && analysisPatterns.progressions.length > 0) {
    return {
      chord_progression: pickRandom(analysisPatterns.progressions),
      voicings: 'standard'
    };
  }
  return {
    chord_progression: pickRandom([['Am', 'G', 'C', 'F'], ['C', 'G', 'Am', 'F'], ['G', 'D', 'Em', 'C']]),
    voicings: 'standard'
  };
}

function buildMelody() {
  return {
    shape: pickRandom(['ascending', 'descending', 'arch']),
    motif: 'simple, repeating pattern',
    range: 'medium'
  };
}

function buildRhythm() {
  return {
    tempo: pickRandom([80, 100, 120, 140]),
    time_signature: '4/4',
    feel: pickRandom(['straight', 'swing', 'shuffled'])
  };
}

function buildHumanization(analysisPatterns = null) {
  if (analysisPatterns && analysisPatterns.humanization && analysisPatterns.humanization.length > 0) {
    return pickRandom(analysisPatterns.humanization);
  }
  return {
    timing_fluctuation: `${pickRandom([2, 5, 10])}%`,
    velocity_variation: `${pickRandom([5, 10, 15])}%`,
    articulation_randomness: `${pickRandom([1, 3, 5])}%`
  };
}

function buildSimulatedLlmResponse(prompt, context = {}, opts = {}, settings = {}) {
  const analysisPatterns = context.analysisPatterns || null;
  const structure = generateMusicStructure(prompt, analysisPatterns);
  return {
    id: `chatcmpl-${Date.now()}`,
    object: 'chat.completion',
    created: Math.floor(Date.now() / 1000),
    model: 'simulated-local-model',
    choices: [
      {
        index: 0,
        message: {
          role: 'assistant',
          content: JSON.stringify(structure, null, 2)
        },
        finish_reason: 'stop'
      }
    ],
    usage: {
      prompt_tokens: 0,
      completion_tokens: 0,
      total_tokens: 0
    }
  };
}

function generateMusicStructure(prompt, analysisPatterns = null) {
  const title = generateTitleFromPrompt(prompt);
  const description = buildDescriptionFromPrompt(prompt);
  const genre = inferGenreFromPrompt(prompt);
  const instrumentation = buildInstrumentation(prompt).map(name => ({
    name,
    role: inferInstrumentRole(name),
    articulations: pickRandomArticulations(name)
  }));

  return {
    title,
    description,
    genre,
    instrumentation,
    structure: buildStructure(),
    harmony: buildHarmony(analysisPatterns),
    melody: buildMelody(),
    rhythm: buildRhythm(),
    humanization: buildHumanization(analysisPatterns),
    generation_seed: Math.floor(Math.random() * 1000000)
  };
}

function detectGenreFromPrompt(prompt) {
  const lowerCasePrompt = prompt.toLowerCase();
  const genres = {
    'rock': ['rock', 'guitar', 'drums', 'band'],
    'jazz': ['jazz', 'swing', 'saxophone', 'piano'],
    'classical': ['classical', 'orchestra', 'violin', 'symphony'],
    'electronic': ['electronic', 'synth', 'techno', 'house'],
    'hip-hop': ['hip-hop', 'rap', 'beats', '808'],
    'ambient': ['ambient', 'drone', 'atmospheric', 'soundscape']
  };

  for (const genre in genres) {
    if (genres[genre].some(keyword => lowerCasePrompt.includes(keyword))) {
      return genre;
    }
  }
  return 'unknown';
}

function detectMoodFromPrompt(prompt) {
  const lowerCasePrompt = prompt.toLowerCase();
  const moods = {
    'happy': ['happy', 'joyful', 'upbeat', 'bright'],
    'sad': ['sad', 'melancholy', 'somber', 'dark'],
    'energetic': ['energetic', 'fast', 'driving', 'intense'],
    'calm': ['calm', 'relaxing', 'peaceful', 'serene'],
    'epic': ['epic', 'cinematic', 'grand', 'orchestral'],
    'mysterious': ['mysterious', 'eerie', 'suspenseful', 'unsettling']
  };

  for (const mood in moods) {
    if (moods[mood].some(keyword => lowerCasePrompt.includes(keyword))) {
      return mood;
    }
  }
  return 'unknown';
}

function generateInstrumentation(prompt) {
  const genre = detectGenreFromPrompt(prompt);
  const instruments = {
    'rock': ['electric guitar', 'bass guitar', 'drums', 'vocals'],
    'jazz': ['piano', 'double bass', 'drums', 'saxophone'],
    'classical': ['violin', 'cello', 'piano', 'flute'],
    'electronic': ['synthesizer', 'drum machine', 'sampler'],
    'hip-hop': ['sampler', 'drum machine', 'synthesizer', 'vocals'],
    'ambient': ['synthesizer', 'pads', 'soundscapes']
  };
  return instruments[genre] || ['piano', 'strings', 'drums'];
}

function generateDynamics() {
  const dynamics = ['pp', 'p', 'mp', 'mf', 'f', 'ff'];
  const sectionDynamics = {
    'intro': pickRandom(['p', 'mp']),
    'verse': pickRandom(['mp', 'mf']),
    'chorus': pickRandom(['f', 'ff']),
    'bridge': pickRandom(['p', 'mp']),
    'outro': pickRandom(['p', 'pp'])
  };
  return sectionDynamics;
}

function generateSections() {
  const sectionTypes = ['intro', 'verse', 'chorus', 'bridge', 'outro'];
  const structure = [];
  const numSections = pickRandom([3, 4, 5]);

  for (let i = 0; i < numSections; i++) {
    structure.push({
      name: pickRandom(sectionTypes),
      length_bars: pickRandom([4, 8, 12, 16])
    });
  }
  return structure;
}

module.exports = {
  pickRandom,
  generateTitleFromPrompt,
  buildDescriptionFromPrompt,
  inferGenreFromPrompt,
  buildInstrumentation,
  inferInstrumentRole,
  pickRandomArticulations,
  pickRandomSubarray,
  buildStructure,
  buildHarmony,
  buildMelody,
  buildRhythm,
  buildHumanization,
  buildSimulatedLlmResponse,
  generateMusicStructure,
  detectGenreFromPrompt,
  detectMoodFromPrompt,
  generateInstrumentation,
  generateDynamics,
  generateSections
};
