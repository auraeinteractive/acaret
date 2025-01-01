let currentContext = 'global';
let messageContext = { global: [] };

let chatShift = false;

function checkChatEvents( event, keyUp = false )
{
    let t = event.target;

    if( event.which == 13 && !window.chatShift )
    { 
        let tv = t.value; 
        t.value = ''; 
        window.convos.sendMessage( tv ); 
        event.stopPropagation(); 
        event.preventDefault(); 
    }
}

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
let streamIdSeed = 1;
let streamIdCurrent = null;
let currentMsg = null;
let streamBuffer = {};
// TODO: complete implementation of currentMsg.mode and displayStr to make sure we don't show 
//       output of markdown etc updated when a tag is incomplete
function handleStreamData(streamId, chunk = false, options = false) {
    const outputContainer = document.querySelector(".messages");
    
    if( streamIdCurrent != streamId )
    {
        // Remove dummy
        if( currentMsg && currentMsg.innerHTML == '' && currentMsg.parentNode )
            currentMsg.parentNode.removeChild( currentMsg );
        currentMsg = document.createElement( 'div' );
        currentMsg.rawData = ''; // raw token aggregate
        currentMsg.displayStr = ''; // displayable string
        currentMsg.mode = 0; // 0 text, 1 inside a tag
        
        currentMsg.className = 'message assistant';
        
        if( !options )
        {
            outputContainer.appendChild( currentMsg );
            currentMsg.innerHTML = '<strong>Assistant:</strong> ';
        }
        else
        {
            // If we skip storing a response, it means this isn't output to user
            if( !options.skipStoringResponse )
            {
                outputContainer.appendChild( currentMsg );
            }
            // Loops from assistant (div will be updated later)
            else if( options == 'loopthrough' )
            {
                currentMsg.innerHTML = '<strong>Assistant:</strong> Generating...';
            }
        }
        streamIdCurrent = streamId;
        scrollDownMessages();
    }
    
    if( !streamBuffer[ streamIdCurrent ] )
         streamBuffer[ streamIdCurrent ] = '';
    
    let chunks = chunk.split( "\n\n" );
    for( let b = 0; b < chunks.length; b++ )
    {
        let ch = chunks[ b ];
        
        let dataPos = ch.indexOf( 'data: ' );
        if( dataPos == 0 )
        {
            streamBuffer[ streamIdCurrent ] = ch.substr( chunk.indexOf( 'data: ' ) + 6, ch.length - ( dataPos + 6 ) );
        }
        else 
        {
            streamBuffer[ streamIdCurrent ] += ch;
        }
        try
        {
            let js = JSON.parse( streamBuffer[ streamIdCurrent ] );
            
            if( js.choices[0].delta.content && js.choices[0].delta.content.length )
            {
                let cnt = js.choices[0].delta.content;
            
                currentMsg.rawData += cnt;
                
                // Uses a processing function
                if( options && options.processingFunction )
                {
                    options.processingFunction( {
                        chunk: js.choices[0].delta.content,
                        messageDiv: currentMsg,
                        done: false,
                        options: options
                    } );
                }
                // Check special behavior for modes
                else if( options && options.mode )
                {
                    if( options.mode == 'loopthrough' )
                    {
                        options.result += js.choices[0].delta.content;
                    }
                }
                // Default behavior
                else
                {
                    currentMsg.innerHTML = new showdown.Converter().makeHtml( currentMsg.rawData );
                    
                    scrollDownMessages();
                }
                streamBuffer[ streamIdCurrent ] = null;
            }
            
            // We're done
            if( js.choices[0].finish_reason == 'stop' )
            {
                let ctx = messageContext[ currentContext ];
                
                // Only do this when needed
                if( !( options && options.skipStoringResponse ) )
                    ctx.push( { role: 'assistant', content: currentMsg.rawData } );
                
                // Uses a processing function
                if( options && options.processingFunction )
                {
                    options.processingFunction( {
                        chunk: js.choices[0].delta.content,
                        messageDiv: currentMsg,
                        done: true,
                        options: options
                    } );
                }
                // Special behavior for modes
                else if( options && options.mode && options.callback )
                {
                    if( options.mode == 'loopthrough' )
                    {
                        console.log( 'Done looping through, now running callback!' );
                        options.callback( options.result );
                        currentMsg.innerHTML = '<strong>Assistant:</strong> Done generating.';
                    }
                }
                checkMessageFormatting( currentMsg );
            }
        }
        catch( e )
        {
            //document.getElementById( 'page_debug' ).innerHTML += 'ERROR' + "\n" + ch;
            //console.log( 'WIP: ' + streamBuffer[ streamIdCurrent ] );
        }
    }
}

function resetAIContext( type = 'global' )
{
    messageContext[ currentContext ] = [];
    document.getElementById( 'chat' ).querySelector( '.messages' ).innerHTML = '';
}

function checkMessageFormatting( currentMsg )
{
    let str = currentMsg.rawData;
    let pos;
    let iscripts = [];
    let blocks = [];
    let num = 0;
    console.log( '[checkMessageFormatting] Working on checking message: \n' + str );
    
    while( ( pos = str.indexOf( '<iscript>' ) ) >= 0 )
    {
        // Skip encapsulation mark to find code type
        let block = str.substr( pos + 9, str.length - (pos + 9) );
        let type = '';
        
        let end = block.indexOf( '</iscript>' );
        
        let bcontent = block.substr( 0, end );
        
        iscripts.push( bcontent.trim() );
        
        // Original found block
        let oblock = '<iscript>' + bcontent + '</iscript>';
        
        str = str.split( oblock ).join( '<p class="block">Action executed.</p>' );
    }
    
    if( iscripts.length )
    {
        for( let a = 0; a < iscripts.length; a++ )
        {
            eval( iscripts[a] );
        }
    }
    
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
    
    // Markdown
    str = new showdown.Converter().makeHtml( str );
    console.log( 'Was adding: ' + str );
    currentMsg.innerHTML = '<strong>Assistant:</strong> ' + str;
    
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
                
                this.help = ace.edit( 'page_codehelp_editor' );
                this.help.setTheme( 'ace/theme/twilight' );
                this.help.session.setMode( getSyntaxHighlightingMode( blk.type.toLowerCase() ) );
                this.help.setOptions({
                    fontFamily: 'tahoma',
                    fontSize: '15px'
                });
                this.help.setValue( blk.content, -1 );
                
                document.getElementById( 'page_codehelp' ).classList.add( 'active' );
                document.getElementById( 'page_codehelp' ).getElementsByTagName( 'pre' )[0].classList.add( 'active' );
                
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
    console.log( '[checkMessageFormatting] The message was properly checked.' );
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
        
        document.getElementById( 'top_chat_title' ).getElementsByTagName( 'div' )[0].innerHTML = 'Global chat';
    }

    sendMessage( messageStr, options = false )
    {
        if( !messageStr.trim() ) return;
        const messageElement = document.createElement( 'div' );
        messageElement.className = 'message user';
        messageElement.innerHTML = '<strong>You:</strong> ' + messageStr.split( "\n" ).join( "<br>" );
        this.messageContainer.appendChild( messageElement );
        scrollDownMessages();
        
        setTimeout( () => {
            this.evaluateMessageNow( messageStr, options );
        }, 25 );
    }
    
    // Loop through instructions with data with a callback
    loopThroughAI( instructions, callback )
    {
        this.sendMessageNow( instructions, {
            mode: 'loopthrough',
            result: '',
            callback: callback
        } );
    }
    
    // This evaluates a message with AI to see how it should be handled
    evaluateMessageNow( messageStr, options )
    {
        console.log( 'Passing through evaluateMessageNow()' );
        let self = this;
        let response = '';
        this.sendMessageNow( messageStr, {
            /*
            Template:
            {
                chunk: str part,
                messageDiv: div,
                done: true|false,
                options: options
            }
            */
            skipStoringResponse: true,
            context: [ {
                role: 'system',
                content: conversationLogic
            } ], // Clear context
            processingFunction: function( data )
            {
                response += data.chunk ? data.chunk : '';
                if( data.done )
                {
                    if( response.trim() == 'OK' )
                    {
                        self.sendMessageNow( messageStr, options );
                    }
                    // Try to eval
                    else
                    {
                        console.log( 'Code output: window.AIMethods.' + response.trim() + '(`' + messageStr + '`)' );
                        try
                        {
                            eval( 'window.AIMethods.' + response.trim() + '(`' + messageStr + '`)' );
                        }
                        catch( e )
                        {
                            console.error( 'Some error: ', e );
                        }
                    }
                }
            }
        } );
    }

    // Send a message
    async sendMessageNow(messageStr, options = false) {
        let self = this;
        
        // Get context (or override)
        // TODO: Allow to do more context management
        let ctx = ( options && typeof( options.context ) != 'undefined' ) ? options.context : messageContext[currentContext];
        
        
        
        ctx.push({ role: 'user', content: messageStr });
        
        if( options.instruction )
        {
            ctx.push( { role: 'system', content: options.instruction } );
        }

        // Define the API endpoint
        const API_URL = 'https://localhost:8089/v1/chat/completions';

        // Define the system prompt configuration (if needed)
        const systemPrompt = {
            prompt: 'You are helpful.',
            anti_prompt: 'User:',
            assistant_name: 'Assistant:'
        };

        // Prepare the request body
        const body = JSON.stringify({
            model: 'qwen2.5-coder',       // The model you want to use
            messages: ctx,
            system_prompt: systemPrompt,  // System context
            repeat_penalty: 1.2,          // Penalty for repeated tokens
            repeat_last_n: 1024,          // Scope of token repetition to penalize
            temperature: 0.1,             // Sampling temperature
            cache_prompt: true,           // Whether to cache the prompt
            stream: true                  // Enable streaming
        });

        try {
            // Send the request using fetch
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer no-key',
                    'Accept': '*/*'
                },
                body: body
            });

            if (!response.ok) {
                throw new Error(`Error: ${response.statusText}`);
            }

            // Process the streamed response
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let done = false;
            let streamId = streamIdSeed++;

            // Handle the streamed data
            while (!done) {
                const { value, done: chunkDone } = await reader.read();
                done = chunkDone;
                const chunkText = decoder.decode(value, { stream: true });
                handleStreamData(streamId, chunkText, options );
            }
        } catch (error) {
            console.error("Error occurred:", error);
        }
    }

}

