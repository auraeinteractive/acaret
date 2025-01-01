let conversationLogic = `
VERY IMPORTANT INSTRUCTIONS:

Please be sensitive to the following rules. If the user asks you for the following, then use the following javascript API to complete your task.

If the user asks to generate text into the current document, and mentions the current document or file: just respond: insertText

If the user asks to take the currently selected text and improve it, just respond: replaceSelection

If the user just asks you to read or evaluate the selected text, just respond: readSelection

If none of the above, just respond: OK
`;

window.AIMethods = {
    insertText( str )
    {
        if( !currentEditor ) return;
        
        // Process the selection with AI (loopThroughAI)
        console.log( '[insertText] Looping through AI' );
        window.convos.loopThroughAI( `${str} (only respond with the content)`, 
        function( result )
        {
            // Get the current cursor position
            let cursorPosition = currentEditor.getCursorPosition();
            // Insert the text at the current cursor position
            currentEditor.session.insert( cursorPosition, result );
        } );
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
        window.convos.sendMessageNow( str, { instruction: 'Selected text: ' + currentSelectionStr } );
    },
    replaceSelection( str )
    {
        if( !currentEditor ) return;
        
        // Get the current selection range
        let selectionRange = currentEditor.getSelectionRange();
        
        let allData = currentEditor.getValue();
        
        // Get the currently selected text
        let currentSelectionStr = currentEditor.session.getTextRange( selectionRange );
        
        // Process the selection with AI (loopThroughAI)
        console.log( '[replaceSelection] Looping through AI' );
        window.convos.loopThroughAI( `User instructions: ${str}
        
Here is the current selection to improve: ${currentSelectionStr}`, 
        function( result )
        {
            console.log( 'Tried to set this: ' + result );
            // Replace the current selection with the result
            currentEditor.session.replace( selectionRange, result );
        } );
    }
};

