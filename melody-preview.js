const { Midi } = require('@tonejs/midi');
const fs = require('fs');
const path = require('path');

class MelodyPreview {
  constructor() {
    this.audioContext = null;
    this.currentPlayback = null;
  }

  async initializeAudio() {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }
  }

  async previewMelody(melodyTrack, options = {}) {
    await this.initializeAudio();

    const {
      instrument = 'piano',
      tempo = 120,
      key = 'C',
      scale = 'major'
    } = options;

    // Stop any current playback
    this.stopPreview();

    // Convert melody track to audio buffer
    const audioBuffer = await this.melodyToAudioBuffer(melodyTrack, {
      instrument,
      tempo,
      key,
      scale
    });

    // Play the audio
    this.currentPlayback = this.audioContext.createBufferSource();
    this.currentPlayback.buffer = audioBuffer;
    this.currentPlayback.connect(this.audioContext.destination);
    this.currentPlayback.start();

    return {
      duration: audioBuffer.duration,
      playback: this.currentPlayback
    };
  }

  stopPreview() {
    if (this.currentPlayback) {
      try {
        this.currentPlayback.stop();
      } catch (e) {
        // Already stopped
      }
      this.currentPlayback = null;
    }
  }

  async melodyToAudioBuffer(melodyTrack, options) {
    // For now, create a simple synthesized preview
    // In a full implementation, this would use Web Audio API with samples
    const duration = this.calculateMelodyDuration(melodyTrack.notes, options.tempo);
    const sampleRate = this.audioContext.sampleRate;
    const numSamples = Math.ceil(duration * sampleRate);
    const audioBuffer = this.audioContext.createBuffer(2, numSamples, sampleRate);

    // Generate simple sine wave preview for each note
    melodyTrack.notes.forEach(note => {
      this.generateNoteWave(audioBuffer, note, options);
    });

    return audioBuffer;
  }

  calculateMelodyDuration(notes, tempo) {
    if (!notes || notes.length === 0) return 1;

    const beatDuration = 60 / tempo;
    let maxEndTime = 0;

    notes.forEach(note => {
      const endTime = (note.startTime || 0) + (note.duration || 0) * beatDuration;
      maxEndTime = Math.max(maxEndTime, endTime);
    });

    return Math.max(maxEndTime, 1); // Minimum 1 second
  }

  generateNoteWave(audioBuffer, note, options) {
    const sampleRate = audioBuffer.sampleRate;
    const frequency = this.midiToFrequency(note.pitch || note.midi || 60);
    const startTime = note.startTime || 0;
    const beatDuration = 60 / (options.tempo || 120);
    const duration = (note.duration || 0.5) * beatDuration;
    const velocity = (note.velocity || 64) / 127;

    const startSample = Math.floor(startTime * sampleRate);
    const endSample = Math.floor((startTime + duration) * sampleRate);

    for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
      const channelData = audioBuffer.getChannelData(channel);

      // Simple ADSR envelope
      const attackSamples = Math.floor(0.01 * sampleRate); // 10ms attack
      const decaySamples = Math.floor(0.1 * sampleRate); // 100ms decay
      const releaseSamples = Math.floor(0.2 * sampleRate); // 200ms release

      for (let i = startSample; i < endSample && i < channelData.length; i++) {
        const timeInNote = i - startSample;
        let envelope = velocity;

        // Apply ADSR envelope
        if (timeInNote < attackSamples) {
          envelope *= timeInNote / attackSamples; // Attack
        } else if (timeInNote < attackSamples + decaySamples) {
          envelope *= 1 - 0.3 * (timeInNote - attackSamples) / decaySamples; // Decay to 70%
        } else if (timeInNote > endSample - startSample - releaseSamples) {
          const releaseTime = timeInNote - (endSample - startSample - releaseSamples);
          envelope *= Math.max(0, 1 - releaseTime / releaseSamples); // Release
        }

        // Generate sine wave with some harmonics for richer sound
        const t = (i / sampleRate);
        const wave = Math.sin(2 * Math.PI * frequency * t) * 0.6 +
                    Math.sin(2 * Math.PI * frequency * 2 * t) * 0.3 +
                    Math.sin(2 * Math.PI * frequency * 3 * t) * 0.1;

        channelData[i] += wave * envelope * 0.1; // Keep volume reasonable
      }
    }
  }

  midiToFrequency(midiNote) {
    return 440 * Math.pow(2, (midiNote - 69) / 12);
  }

  // Export melody as MIDI file
  async exportMelodyAsMIDI(melodyTrack, filename, options = {}) {
    const midi = new Midi();

    // Create a track
    const track = midi.addTrack();
    track.name = melodyTrack.name || 'Generated Melody';

    // Set tempo
    midi.header.setTempo(options.tempo || 120);

    // Add notes
    melodyTrack.notes.forEach(note => {
      track.addNote({
        midi: note.pitch || note.midi || 60,
        time: note.startTime || 0,
        duration: note.duration || 0.5,
        velocity: (note.velocity || 64) / 127
      });
    });

    // Write to file
    const outputPath = path.join(process.cwd(), filename);
    fs.writeFileSync(outputPath, new Uint8Array(midi.toArray()));

    return outputPath;
  }

  // Export melody as WAV file (basic implementation)
  async exportMelodyAsWAV(melodyTrack, filename, options = {}) {
    await this.initializeAudio();

    const audioBuffer = await this.melodyToAudioBuffer(melodyTrack, options);

    // Convert AudioBuffer to WAV blob
    const wavBlob = this.audioBufferToWav(audioBuffer);

    // Write to file
    const outputPath = path.join(process.cwd(), filename);
    fs.writeFileSync(outputPath, Buffer.from(await wavBlob.arrayBuffer()));

    return outputPath;
  }

  audioBufferToWav(buffer) {
    const length = buffer.length;
    const numberOfChannels = buffer.numberOfChannels;
    const sampleRate = buffer.sampleRate;
    const bytesPerSample = 2; // 16-bit
    const blockAlign = numberOfChannels * bytesPerSample;
    const byteRate = sampleRate * blockAlign;
    const dataSize = length * blockAlign;
    const bufferSize = 44 + dataSize;

    const arrayBuffer = new ArrayBuffer(bufferSize);
    const view = new DataView(arrayBuffer);

    // WAV header
    const writeString = (offset, string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };

    writeString(0, 'RIFF');
    view.setUint32(4, bufferSize - 8, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true); // Subchunk1Size
    view.setUint16(20, 1, true); // AudioFormat (PCM)
    view.setUint16(22, numberOfChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, byteRate, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, 16, true); // BitsPerSample
    writeString(36, 'data');
    view.setUint32(40, dataSize, true);

    // Convert float samples to 16-bit PCM
    let offset = 44;
    for (let i = 0; i < length; i++) {
      for (let channel = 0; channel < numberOfChannels; channel++) {
        const sample = Math.max(-1, Math.min(1, buffer.getChannelData(channel)[i]));
        view.setInt16(offset, sample * 0x7FFF, true);
        offset += 2;
      }
    }

    return new Blob([arrayBuffer], { type: 'audio/wav' });
  }
}

module.exports = MelodyPreview;