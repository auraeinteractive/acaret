class Conversation {
    // Set up conversation object
    constructor(options = false) {
        this.conversationId = null;
        this.eventSourceUrl = null;
        this.messageContainer = document.getElementById('message-container');
        if (options.messageContainer)
            this.messageContainer = options.messageContainer;
        this.currentMessageElement = null;
        this.chunkBuffer = ''; // To store incomplete chunks
    }

    // Send a message
    async sendMessage(messageStr, options = false) {
        const messageElement = document.createElement('div');
        messageElement.className = 'message user';
        messageElement.textContent = messageStr;
        this.messageContainer.appendChild(messageElement);
        this.currentMessageElement = messageElement;

        // Define the API endpoint (use "ihttp" as per your system)
        const API_URL = 'ihttp://localhost:11434/v1/chat/completions';

        // Define the system prompt configuration (if needed)
        const systemPrompt = {
            prompt: 'You are expert at evaluating prompts.',
            anti_prompt: 'User:',
            assistant_name: 'Assistant:'
        };

        try {
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: 'qwen2.5-coder', // Specify the model
                    messages: [{
                        role: 'system',
                        content: 'You are excellent in answering.'
                    }, {
                        role: 'user',
                        content: messageStr
                    }],
                    system_prompt: systemPrompt,
                    repeat_penalty: 1.2,
                    repeat_last_n: 1024,
                    temperature: 0.1,
                    cache_prompt: true,
                    stream: true // Enable streaming
                })
            });

            if (!response.ok) {
                console.error('Error with API request:', response.status, response.statusText);
                return;
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder('utf-8');
            let content = '';
            let chunkContent = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                // Decode the chunk to a string
                const chunk = decoder.decode(value, { stream: true });
                this.chunkBuffer += chunk; // Add chunk to buffer

                // Try to process any full JSON blocks in the buffer
                let startIndex = 0;
                while (true) {
                    const dataStart = this.chunkBuffer.indexOf('data: ', startIndex);
                    if (dataStart === -1) break; // No more "data:" chunks

                    const dataEnd = this.chunkBuffer.indexOf('\n', dataStart);
                    if (dataEnd === -1) break; // Incomplete chunk, wait for more data

                    const jsonData = this.chunkBuffer.substring(dataStart + 6, dataEnd).trim(); // Extract JSON string

                    try {
                        const parsedData = JSON.parse(jsonData);
                        if (parsedData.choices && parsedData.choices.length > 0) {
                            const choice = parsedData.choices[0].delta.content;
                            if (choice) {
                                chunkContent += choice;
                                this.currentMessageElement.textContent = chunkContent; // Update the message element in real-time
                            }
                        }
                    } catch (e) {
                        console.error('Error parsing JSON data:', e);
                    }

                    // Remove the processed data from the buffer
                    startIndex = dataEnd + 1;
                }

                // Keep the unprocessed part of the buffer (in case it's a partial JSON object)
                this.chunkBuffer = this.chunkBuffer.substring(startIndex);
            }

            console.log('Streaming complete:', content);
        } catch (error) {
            console.error('Error during fetch:', error);
        }
    }
}

