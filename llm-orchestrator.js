// llm-orchestrator.js
const path = require('path');
const fs = require('fs');
const vectorDatabase = require('./vector-database'); // Import vector database

let currentProvider = 'none';
let apiKey = '';
let localLlmEnabled = false;

function configureLlm(settings) {
    localLlmEnabled = settings.localLlmEnabled;
    currentProvider = localLlmEnabled ? 'local' : settings.cloudLlmProvider;
    apiKey = settings.apiKey;
    console.log(`LLM Orchestrator configured: Provider: ${currentProvider}, Local Enabled: ${localLlmEnabled}`);
}

async function generateLlmResponse(prompt, queryVector = null, queryType = null) {
    if (currentProvider === 'none' && !localLlmEnabled) {
        return { response: "No LLM selected. Cannot generate a response.", sourceFiles: [] };
    }

    let context = "";
    let relevantSourceFiles = [];

    let patterns = [];
    if (queryVector && queryType) {
        if (queryType === 'humanization') {
            patterns = await vectorDatabase.queryHumanizationFeatures(queryVector, 3); // Get top 3
        } else if (queryType === 'pattern') {
            patterns = await vectorDatabase.queryPatternFeatures(queryVector, 3); // Get top 3
        }

        if (patterns.length > 0) {
            context += "\n\n--- Relevant Musical Context from Library ---\n";
            patterns.forEach((res, index) => {
                context += `\nMatch ${index + 1} (Similarity Score: ${res._distance ? res._distance.toFixed(3) : 'N/A'}):\n`;
                context += `  Source File: ${path.basename(res.sourceFile)}\n`;
                context += `  Type: ${res.type}, Tags: ${res.tags.join(', ')}\n`;
                // In a real scenario, you'd translate featureVector into descriptive text
                context += `  Key Features: [${res.featureVector.map(f => f.toFixed(2)).join(', ')}]\n`;
                relevantSourceFiles.push(res.sourceFile); // Track source files
            });
            context += "\n-----------------------------------------\n\n";
        } else {
            context += "\n\n(No highly relevant musical context found in library for this query type.)\n\n";
        }
    }

    const fullPrompt = `Analyze the following musical request and provide creative ideas. Reference the provided musical context if available. Focus on stylistic elements, mood, and potential note/rhythm adjustments.
    \nRequest: "${prompt}"\n
    ${context}
    \nBased on this, how would a traditional "${prompt}" be played? Suggest specific musical elements or a high-level creative direction for a MIDI pattern or humanization. Output your suggestion directly.`;


    let response = "";
    console.log(`LLM Request: Provider: ${currentProvider}, Full Prompt: \n${fullPrompt}`);

    // Simulate LLM response
    if (localLlmEnabled) {
        response = `(Local Gemma 2B): Considering your request for "${prompt}" and the library data, here are some ideas: ${fullPrompt.split('Request:')[1].slice(0, 100)}...`;
    } else if (currentProvider === 'google') {
        response = `(Google AI): Analyzing "${prompt}" with library context. We found similar vibes. Perhaps a syncopated rhythm with subtle velocity shifts, referencing files like ${relevantSourceFiles.map(s => path.basename(s)).join(', ')}.`;
    } else if (currentProvider === 'openai') {
        response = `(OpenAI): For "${prompt}", drawing from your library, we suggest a legato melody with a slight timing lag on the 2nd and 4th beats, reminiscent of patterns in ${relevantSourceFiles.map(s => path.basename(s)).join(', ')}.`;
    } else if (currentProvider === 'anthropic') {
        response = `(Anthropic): A subtle swing and a dynamic envelope that slowly builds then releases, informed by similar patterns found in your scanned tracks for "${prompt}".`;
    } else {
        response = "Unknown LLM provider selected. Cannot generate.";
    }

    await new Promise(resolve => setTimeout(resolve, Math.random() * 2000 + 1000));
    return { response, sourceFiles: relevantSourceFiles, patterns }; // Return source files and patterns
}

module.exports = {
    configureLlm,
    generateLlmResponse
};
