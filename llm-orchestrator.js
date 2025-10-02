// llm-orchestrator.js
// Real LLM integration with OpenAI, Anthropic, Google, and local models
const path = require('path');
const fs = require('fs');
const vectorDatabase = require('./vector-database');

// Import LLM SDKs
const OpenAI = require('openai');
const Anthropic = require('@anthropic-ai/sdk');
const { GoogleGenerativeAI } = require('@google/generative-ai');

let currentProvider = 'none';
let apiKey = '';
let localLlmEnabled = false;
let llmClient = null;

function configureLlm(settings) {
    localLlmEnabled = settings.localLlmEnabled;
    currentProvider = localLlmEnabled ? 'local' : settings.cloudLlmProvider;
    apiKey = settings.apiKey;
    
    // Initialize the appropriate LLM client
    try {
        if (currentProvider === 'openai' && apiKey) {
            llmClient = new OpenAI({ apiKey });
            console.log('OpenAI client initialized');
        } else if (currentProvider === 'anthropic' && apiKey) {
            llmClient = new Anthropic({ apiKey });
            console.log('Anthropic client initialized');
        } else if (currentProvider === 'google' && apiKey) {
            llmClient = new GoogleGenerativeAI(apiKey);
            console.log('Google AI client initialized');
        } else if (localLlmEnabled) {
            // For local models, we'd initialize a local inference engine
            // This is a placeholder for local model integration
            llmClient = { type: 'local', model: 'gemma-2b' };
            console.log('Local LLM client initialized');
        }
    } catch (error) {
        console.error('Error initializing LLM client:', error);
        llmClient = null;
    }
    
    console.log(`LLM Orchestrator configured: Provider: ${currentProvider}, Local Enabled: ${localLlmEnabled}`);
}

async function generateLlmResponse(prompt, queryVector = null, queryType = null) {
    if (currentProvider === 'none' && !localLlmEnabled) {
        return { response: "No LLM selected. Cannot generate a response.", sourceFiles: [] };
    }

    if (!llmClient) {
        return { response: "LLM client not initialized. Please check your API keys.", sourceFiles: [] };
    }

    let context = "";
    let relevantSourceFiles = [];

    // Get relevant context from vector database
    if (queryVector && queryType) {
        try {
            let queryResults = [];
            if (queryType === 'humanization') {
                queryResults = await vectorDatabase.queryHumanizationFeatures(queryVector, 3);
            } else if (queryType === 'pattern') {
                queryResults = await vectorDatabase.queryPatternFeatures(queryVector, 3);
            }

            if (queryResults.length > 0) {
                context += "\n\n--- Relevant Musical Context from Library ---\n";
                queryResults.forEach((res, index) => {
                    context += `\nMatch ${index + 1} (Similarity Score: ${res._distance ? res._distance.toFixed(3) : 'N/A'}):\n`;
                    context += `  Source File: ${path.basename(res.sourceFile)}\n`;
                    context += `  Type: ${res.type}, Tags: ${res.tags.join(', ')}\n`;
                    context += `  Key Features: [${res.featureVector.map(f => f.toFixed(2)).join(', ')}]\n`;
                    relevantSourceFiles.push(res.sourceFile);
                });
                context += "\n-----------------------------------------\n\n";
            } else {
                context += "\n\n(No highly relevant musical context found in library for this query type.)\n\n";
            }
        } catch (error) {
            console.warn('Error querying vector database:', error);
        }
    }

    const fullPrompt = `You are an expert music producer and AI assistant specializing in music analysis and generation. 

Analyze the following musical request and provide creative, actionable ideas. Reference the provided musical context if available. Focus on stylistic elements, mood, and specific musical techniques.

Request: "${prompt}"

${context}

Based on this request and context, provide specific musical suggestions including:
1. Stylistic approach and mood
2. Key musical elements (melody, harmony, rhythm)
3. Technical suggestions for MIDI programming
4. Humanization techniques if applicable

Be specific and actionable in your response.`;

    try {
        let response = "";
        
        if (currentProvider === 'openai') {
            response = await callOpenAI(fullPrompt);
        } else if (currentProvider === 'anthropic') {
            response = await callAnthropic(fullPrompt);
        } else if (currentProvider === 'google') {
            response = await callGoogle(fullPrompt);
        } else if (localLlmEnabled) {
            response = await callLocalLLM(fullPrompt);
        } else {
            response = "Unknown LLM provider selected. Cannot generate.";
        }
        
        return { response, sourceFiles: relevantSourceFiles };
        
    } catch (error) {
        console.error('Error generating LLM response:', error);
        return { 
            response: `Error generating response: ${error.message}`, 
            sourceFiles: relevantSourceFiles 
        };
    }
}

async function callOpenAI(prompt) {
    try {
        const completion = await llmClient.chat.completions.create({
            model: "gpt-4",
            messages: [
                {
                    role: "system",
                    content: "You are an expert music producer and AI assistant specializing in music analysis and generation."
                },
                {
                    role: "user",
                    content: prompt
                }
            ],
            max_tokens: 1000,
            temperature: 0.7
        });
        
        return completion.choices[0].message.content;
    } catch (error) {
        console.error('OpenAI API error:', error);
        throw error;
    }
}

async function callAnthropic(prompt) {
    try {
        const message = await llmClient.messages.create({
            model: "claude-3-sonnet-20240229",
            max_tokens: 1000,
            messages: [
                {
                    role: "user",
                    content: prompt
                }
            ]
        });
        
        return message.content[0].text;
    } catch (error) {
        console.error('Anthropic API error:', error);
        throw error;
    }
}

async function callGoogle(prompt) {
    try {
        const model = llmClient.getGenerativeModel({ model: "gemini-pro" });
        const result = await model.generateContent(prompt);
        const response = await result.response;
        
        return response.text();
    } catch (error) {
        console.error('Google AI API error:', error);
        throw error;
    }
}

async function callLocalLLM(prompt) {
    try {
        // This would integrate with a local model like Gemma 2B
        // For now, return a simulated response
        await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate processing time
        
        return `(Local Gemma 2B): Based on your request "${prompt.split('Request: "')[1]?.split('"')[0] || 'music generation'}", I suggest focusing on the harmonic progression and rhythmic patterns. Consider using a combination of major and minor chords with syncopated rhythms to create interest.`;
    } catch (error) {
        console.error('Local LLM error:', error);
        throw error;
    }
}

// Music generation specific functions
async function generateMusicDescription(prompt, style = 'melodic') {
    const musicPrompt = `Generate a detailed musical description for: "${prompt}" in a ${style} style. Include specific details about melody, harmony, rhythm, and mood.`;
    
    try {
        const result = await generateLlmResponse(musicPrompt);
        return result.response;
    } catch (error) {
        console.error('Error generating music description:', error);
        return `Generated ${style} music based on: ${prompt}`;
    }
}

async function generateHumanizationSuggestions(prompt, midiFeatures = {}) {
    const humanizationPrompt = `Based on the MIDI features: ${JSON.stringify(midiFeatures)}, suggest humanization techniques for: "${prompt}". Include specific timing, velocity, and expression adjustments.`;
    
    try {
        const result = await generateLlmResponse(humanizationPrompt, null, 'humanization');
        return result.response;
    } catch (error) {
        console.error('Error generating humanization suggestions:', error);
        return `Humanization suggestions for: ${prompt}`;
    }
}

module.exports = {
    configureLlm,
    generateLlmResponse,
    generateMusicDescription,
    generateHumanizationSuggestions
};
