// tags

window.toolbar = window.toolbar ? window.toolbar : {};
window.toolbar.tags = function() {
    let tct = document.getElementById( 'top_chat_title' );
    let tcd = tct.getElementsByTagName( 'div' )[0];
    let tci = tct.getElementsByTagName( 'div' )[1];
    tcd.innerHTML = 'Tags';
    tcd.className = 'tags';
    tci.innerHTML = ''; //<em class="chat-reset" title="Reset chat"></em><em class="chat-save" title="Save chat"></em><em class="chat-more" title="Options"></em>';
    
    let cont = document.getElementById( 'page_tags' );
    cont.innerHTML = '';
    
    // Check document tags
    if( currentEditor )
    {
        let val = currentEditor.getValue();
        
        // Normalize
        val = val.split( 'Tag' ).join( 'tag' );
        val = val.split( '// tag' ).join( '//tag' );
        
        let tagDiv = document.createElement( 'div' );
        tagDiv.className = 'tags';
        cont.appendChild( tagDiv );
        
        let tags = val.split( '//tag' );
        
        console.log( tags );
        
        for( let a = 0; a < tags.length; a++ )
        {
            let tag = tags[a].trim();
            if( tag.substr( 0, 1 ) != ':' ) continue;
            tag = tag.split( "\n" );
            tag.pop();
            tag = tag[0].split( ':' );
            
            console.log( 'Found a tag: ', tag );
            
            if( !tag[1].trim() ) continue;
            tag = tag[1].split( '(' );
            tag = tag[0].trim();
            let t = document.createElement( 'div' );
            t.className = 'tag';
            t.innerHTML = tag;
            tagDiv.appendChild( t );
            
            t.onclick = () => {
                let session = currentEditor.getSession();
                if( !session ) return;
                let searchStrings = [
                    '//tag: ' + tag,
                    '//Tag: ' + tag,
                    '// tag: ' + tag,
                    '// Tag: ' + tag
                ];
                for( let b = 0; b < searchStrings.length; b++ )
                {
                    let range = currentEditor.find( searchStrings[b], {
                        backwards: false,
                        caseSensitive: false,
                        wholeWord: false
                    } );
                    if( range )
                    {
                        currentEditor.selection.setRange( range );
                        return;
                    }
                }
            };
        }
    }
}

