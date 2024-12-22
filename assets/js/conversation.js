let currentContext = 'global';
let messageContext = { global: [] };

function base64DecodeUtf8(base64) {
    // Decode base64 string into a binary string
    const decodedData = atob(base64);

    // Convert the binary string into a Uint8Array (UTF-8 encoded bytes)
    const bytes = new Uint8Array(decodedData.length);
    for (let i = 0; i < decodedData.length; i++) {
        bytes[i] = decodedData.charCodeAt(i);
    }

    // Convert the Uint8Array back to a string using TextDecoder (which automatically handles UTF-8)
    const textDecoder = new TextDecoder('utf-8');
    return textDecoder.decode(bytes);
}

function scrollDownMessages()
{
    document.querySelector( '.messages' ).scrollTop = document.querySelector( '.messages' ).scrollHeight; // Fix this later to enable scroll up
}

// Handle the chunked data sent from C (via WebKit callback)
let dataStr = '';
let streamIdCurrent = null;
let currentMsg = null;
function handleStreamData(streamId, chunk = false) {
    const outputContainer = document.querySelector(".messages");
    chunk = base64DecodeUtf8( chunk );
    
    if( streamIdCurrent != streamId )
    {
        currentMsg = document.createElement( 'div' );
        outputContainer.appendChild(currentMsg);
        scrollDownMessages();
        currentMsg.className = 'message assistant';
        streamIdCurrent = streamId;
    }
    
    let dataPos = chunk.indexOf( 'data: ' );
    if( dataPos >= 0 )
        chunk = chunk.substr( chunk.indexOf( 'data: ' ) + 6, chunk.length - ( dataPos + 6 ) );
    
    let chunks = chunk.split( "\n\n" );
    for( let b = 0; b < chunks.length; chunks++ )
    {
        let ch = chunks[ b ];
        try
        {
            let js = JSON.parse( ch );
            
            if( js.choices[0].delta.content && js.choices[0].delta.content.length )
            {
                const textNode = document.createTextNode( js.choices[0].delta.content );
                currentMsg.appendChild( textNode );
                scrollDownMessages();
            }
            
            //document.getElementById( 'page_debug' ).innerHTML += JSON.stringify( js.choices[0] );
            
            // We're done
            if( js.choices[0].finish_reason == 'stop' )
            {
                let ctx = messageContext[ currentContext ];
                ctx.push( { role: 'assistant', content: currentMsg.innerText } );
            }
        }
        catch( e )
        {
            //document.getElementById( 'page_debug' ).innerHTML += 'ERROR' + "\n" + ch;
        }
    }
}

class Conversation
{
    // Set up conversation object
    constructor( options = false )
    {
        this.conversationId = null;
        this.eventSourceUrl = null;
        this.messageContainer = document.getElementById( 'message-container' );
        if( options.messageContainer )
            this.messageContainer = options.messageContainer;
        this.chunkBuffer = ''; // To store incomplete chunks
    }

    sendMessage( messageStr, options = false )
    {
        const messageElement = document.createElement( 'div' );
        messageElement.className = 'message user';
        messageElement.textContent = messageStr;
        this.messageContainer.appendChild( messageElement );
        scrollDownMessages();
        
        setTimeout( () => {
            this.sendMessageNow( messageStr, options );
        }, 25 );
    }

    // Send a message
    async sendMessageNow( messageStr, options = false )
    {
        let ctx = messageContext[ currentContext ];
        ctx.push( { role: 'user', content: messageStr } );

        // Define the API endpoint (use "ihttp" as per your system)
        const API_URL = 'ihttp://localhost:11434/v1/chat/completions';

        // Define the system prompt configuration (if needed)
        const systemPrompt = {
            prompt: 'You are expert at evaluating prompts.',
            anti_prompt: 'User:',
            assistant_name: 'Assistant:'
        };

        try {
        
            let messages = [ {
                role: 'system',
                content: 'You are excellent in answering in a relevant way. Do not offer any information that is not asked for.'
            } ].concat( ctx );
            
            document.getElementById( 'page_debug' ).innerHTML = JSON.stringify( messages );
        
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: 'qwen2.5-coder', // Specify the model
                    messages: messages,
                    system_prompt: systemPrompt,
                    repeat_penalty: 1.2,
                    repeat_last_n: 1024,
                    temperature: 0.1,
                    cache_prompt: true,
                    stream: true // Enable streaming
                } )
            } );

            if( !response.ok ){
                console.error( 'Error with API request:', response.status, response.statusText );
                return;
            }
        }
        catch( error )
        {
            console.error( 'Error during fetch:', error );
        }
    }
}

