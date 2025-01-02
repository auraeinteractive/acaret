let conversationLogic = `
VERY IMPORTANT INSTRUCTIONS:

Please be sensitive to the following rules. If the user asks you for the following, then use the following javascript API to complete your task.

If the user asks to generate text into the current document, and mentions the current document or file: just respond: insertText

If the user asks to take the currently selected text and improve it, just respond: replaceSelection

If the user just asks you to read or evaluate the selected text, just respond: readSelection

If the user asks you to read or evaluate the current open file or code or document, just respond: readDocument
If the user asks you to read the current file, just respond: readDocument

If none of the above, just respond: OK
`;

window.AIMethods = {
    insertText( str )
    {
        if( !currentEditor ) return;
        
        // Process the selection with AI (loopThroughAI)
        console.log( '[insertText] Looping through AI' );
        let nl = "\n\n";
        window.convos.loopThroughAI( `${str}${nl}Do not add explanations before or after content.`, 
        function( result )
        {
            // Get the current cursor position
            let cursorPosition = currentEditor.getCursorPosition();
            // Insert the text at the current cursor position
            if( confirm( 'May the assistant edit your document?') )
            {
                result = result.trim();
                if( result.substr( -3, 3 ) == '```' )
                    result = result.substr( 0, result.length - 3 );
                if( result.substr( 0, 3 ) == '```' )
                {
                    let pos = result.indexOf( "\n" );
                    result = result.substr( pos, result.length - pos );
                }
                currentEditor.session.insert( cursorPosition, result );
            }
        } );
    },
    readDocument( str )
    {
        if( !currentEditor ) return;
        
        // Process the selection with AI (loopThroughAI)
        console.log( '[readSelection] Looping through AI: ' + currentEditor.getValue() );
        window.convos.sendMessageNow( str, { instruction: 'Document content: ' + currentEditor.getValue() } );
    },
    readSelection( str )
    {
        if( !currentEditor ) return;
        
        // Get the current selection range
        let selectionRange = currentEditor.getSelectionRange();
        
        // Get the currently selected text
        let currentSelectionStr = currentEditor.session.getTextRange( selectionRange );
        
        // Process the selection with AI (loopThroughAI)
        console.log( '[readSelection] Looping through AI: ' + currentSelectionStr  );
        window.convos.sendMessageNow( str, { instruction: 'Selected text content: ' + currentSelectionStr } );
    },
    replaceSelection( str )
    {
        if( !currentEditor ) return;
        
        let nl = "\n\n";
        
        // Get the current selection range
        let selectionRange = currentEditor.getSelectionRange();
        
        let allData = currentEditor.getValue();
        
        // Get the currently selected text
        let currentSelectionStr = currentEditor.session.getTextRange( selectionRange );
        
        // Process the selection with AI (loopThroughAI)
        console.log( '[replaceSelection] Looping through AI' );
        window.convos.loopThroughAI( `User instructions: ${str}
        
Here is the current selection to improve: ${currentSelectionStr}

Do not add explanations before or after content.`, 
        function( result )
        {
            console.log( 'Tried to set this: ' + result );
            // Replace the current selection with the result
            if( confirm( 'May the assistant edit your document?') )
            {
                result = result.trim();
                if( result.substr( -3, 3 ) == '```' )
                    result = result.substr( 0, result.length - 3 );
                if( result.substr( 0, 3 ) == '```' )
                {
                    let pos = result.indexOf( "\n" );
                    result = result.substr( pos, result.length - pos );
                }
                currentEditor.session.replace( selectionRange, result.trim() );
            }
        } );
    }
};






