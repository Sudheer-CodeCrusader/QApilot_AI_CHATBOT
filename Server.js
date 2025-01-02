// server.js

require('dotenv').config(); // Load environment variables

const express = require('express');
const fs = require('fs').promises; // Use promises for async/await
const path = require('path');
const axios = require('axios'); // Import Axios
const app = express();
const port = 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname)));

let data = {};

// Function to load data
const loadData = async () => {
    try {
        const jsonData = await fs.readFile('./.codegpt/data.json', 'utf8');
        data = JSON.parse(jsonData);
        console.log('Data loaded successfully.');
    } catch (err) {
        console.error('Error reading data file:', err);
    }
};

// Root endpoint
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Search endpoint
app.post('/search', async (req, res) => {
    const query = req.body.query?.toLowerCase() || '';
    const matches = [];

    for (const [keyword, response] of Object.entries(data)) {
        const lowerKeyword = keyword.toLowerCase();
        if (query.includes(lowerKeyword) || lowerKeyword.includes(query)) {
            matches.push(response);
        }
    }

    if (matches.length > 0) {
        return res.send(matches.join('\n'));
    }

    // If no matches, call the AI model
    try {
        const aiResponse = await getAIResponse(query);
        res.send(aiResponse);
    } catch (error) {
        res.status(500).send('Error communicating with AI model.');
    }
});

// Function to get response from AI model
const getAIResponse = async (query) => {
    try {
        const apiKey = process.env.OPENAI_API_KEY; // Load the API key from the environment
        
        if (!apiKey) {
            throw new Error("API key is missing. Please set OPENAI_API_KEY in your environment variables.");
        }

        const response = await axios.post(
            'https://api.openai.com/v1/chat/completions',
            {
                model: 'gpt-3.5-turbo-0125', // Specify the model
                messages: [{ role: 'user', content: query }],
            },
            {
                headers: {
                    'Authorization': `Bearer ${apiKey}`, // Use the API key from the environment
                    'Content-Type': 'application/json',
                },
            }
        );

        return response.data.choices[0].message.content; // Adjust based on the API response structure
    } catch (error) {
        console.error("Error fetching AI response:", error.response ? error.response.data : error.message);
        throw error; // Propagate the error to the caller
    }
};

// Test endpoint
app.post('/test', (req, res) => {
    res.send('Test endpoint is working!');
});

// Start the server after data is loaded
loadData().then(() => {
    app.listen(port, () => {
        console.log(`Server is running at http://localhost:${port}`);
    });
});
