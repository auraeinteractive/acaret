let currentContext = 'global';
let messageContext = { global: [] };

function base64DecodeUtf8( base64 )
{
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

function base64EncodeUtf8( text )
{
    // Convert the text string into a Uint8Array (UTF-8 encoded bytes)
    const textEncoder = new TextEncoder();
    const bytes = textEncoder.encode(text);

    // Convert the Uint8Array into a binary string
    let binaryString = '';
    for (let i = 0; i < bytes.length; i++) {
        binaryString += String.fromCharCode(bytes[i]);
    }

    // Encode the binary string as base64
    return btoa(binaryString);
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
        currentMsg.rawData = '';
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
                currentMsg.rawData += js.choices[0].delta.content;
                scrollDownMessages();
            }
            
            //document.getElementById( 'page_debug' ).innerHTML += JSON.stringify( js.choices[0] );
            
            // We're done
            if( js.choices[0].finish_reason == 'stop' )
            {
                let ctx = messageContext[ currentContext ];
                ctx.push( { role: 'assistant', content: currentMsg.rawData } );
                
                // Parse content properly
                checkMessageFormatting( currentMsg );
            }
        }
        catch( e )
        {
            //document.getElementById( 'page_debug' ).innerHTML += 'ERROR' + "\n" + ch;
        }
    }
}

function checkMessageFormatting( currentMsg )
{
    let str = currentMsg.rawData;
    let pos;
    let blocks = [];
    let num = 0;
    while( ( pos = str.indexOf( '```' ) ) >= 0 )
    {
        // Skip encapsulation mark to find code type
        let block = str.substr( pos + 3, str.length - (pos + 3) );
        let type = '';
        for( let i = 0; block.substr( i, 1 ) != "\n" && block.substr( i, 1 ) != " " && i < block.length; i++ )
            type += block.substr( i, 1 );
        // Find end of code block
        //let wholeBlock = str.substr( pos, str.length - pos ); // Reset block to whole def
        let end = block.indexOf( '```' );
        
        let bcontent = block.substr( type.length, end - type.length );
        
        let thisBlock = { type: type, content: bcontent.trim() };
        blocks.push( thisBlock );
        
        // Original found block
        let oblock = '```' + type + bcontent + '```';
        
        if( type.length <= 0 )
        {
            type = 'terminal-output';
        }
        
        if( type == 'terminal-output' )
        {
            str = str.split( oblock ).join( '<pre class="block terminal-output" id="codeblock_' + ++num + '"></pre>' );
        }
        else
        {
            str = str.split( oblock ).join( '<p class="block" id="codeblock_' + ++num + '">Examine: <strong>' + type + '</strong></p>' );
        }
    }
    currentMsg.innerHTML = str;
    
    let eles = currentMsg.getElementsByClassName( 'block' );
    for( let a = 0; a < eles.length; a++ )
    {
        eles[a].onclick = function()
        {
            if( this.help )
            {
                this.help.destroy();
                this.help = null;
            }
            document.getElementById( 'page_codehelp' ).className = 'page';
            document.getElementById( 'page_codehelp' ).setAttribute( 'style', '' );
            
            let bblocks = currentMsg.parentNode.getElementsByClassName( 'block' );
            for( let c = 0; c < bblocks.length; c++ )
            {
                if( bblocks[c] != this )
                    bblocks[c].classList.remove( 'active' );
            }
        
            if( this.classList.contains( 'active' ) )
            {
                this.classList.remove( 'active' );
            }
            else
            {
                let blk = blocks[ parseInt( eles[a].id.split( '_' )[1] )-1 ];
                this.classList.add( 'active' );
                
                document.getElementById( 'page_codehelp' ).classList.add( 'active' );
                
                this.help = ace.edit( 'page_codehelp_editor' );
                this.help.setTheme( 'ace/theme/twilight' );
                this.help.session.setMode( 'ace/mode/' + blk.type );
                this.help.setOptions({
                    fontFamily: 'tahoma',
                    fontSize: '15px'
                });
                this.help.setValue( blk.content, -1 );
                
                document.getElementById( 'page_codehelp' ).querySelector( '.close' ).onclick = () =>
                {
                    if( this.help )
                    {
                        this.help.destroy();
                        this.help = null;
                        document.getElementById( 'page_codehelp' ).classList.remove( 'active' );
                        this.classList.remove( 'active' );
                    }
                }
            }
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
    sendMessageNow( messageStr, options = false )
    {
        let ctx = messageContext[ currentContext ];
        ctx.push( { role: 'user', content: messageStr } );

        // Define the API endpoint
        const API_URL = 'https://localhost:8089/v1/chat/completions';

        // Define the system prompt configuration (if needed)
        const systemPrompt = {
            prompt: 'You are expert at evaluating prompts.',
            anti_prompt: 'User:',
            assistant_name: 'Assistant:'
        };

        let xhr = new XMLHttpRequest();
        // Prepare the request body
        const body = JSON.stringify({
            model: 'qwen2.5-coder',       // The model you want to use
            messages: [
                { role: "user", content: "Translate this text to French: Hello, how are you?" }
            ],
            system_prompt: systemPrompt, // System context
            repeat_penalty: 1.2,          // Penalty for repeated tokens
            repeat_last_n: 1024,          // Scope of token repetition to penalize
            temperature: 0.1,             // Sampling temperature
            cache_prompt: true,           // Whether to cache the prompt
            stream: true                  // Enable streaming
        });

        // Configure the request
        xhr.open('POST', API_URL, true); // True for asynchronous

        // Set headers
        xhr.setRequestHeader('Content-Type', 'application/json');
        xhr.setRequestHeader('Accept', 'application/json'); // Add this header for better response handling

        // Handle the response
        xhr.onload = function () {
            if (xhr.status >= 200 && xhr.status < 300) {
                // Parse and handle the response
                console.log("Response received:");
                console.log(xhr.responseText);
            } else {
                console.error("Error:", xhr.statusText);
            }
        };

        // Handle errors
        xhr.onerror = function () {
            console.error("Network error occurred.");
        };

        // Send the request
        xhr.send(body);
    }
}

