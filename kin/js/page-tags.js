// tags

window.toolbar = window.toolbar ? window.toolbar : {};
window.toolbar.tags = function() {
    let tct = document.getElementById( 'right_panel_header' );
    let tcd = tct.getElementsByTagName( 'div' )[0];
    let tci = tct.getElementsByTagName( 'div' )[1];
    tcd.textContent = 'Tags: ' + ( currentEditor ? currentEditor.filename : 'No file' );
    tcd.className = 'tags';
    tci.replaceChildren();
    
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
        
        for( let a = 0; a < tags.length; a++ )
        {
            let tag = tags[a].trim();
            if( tag.substr( 0, 1 ) != ':' ) continue;
            tag = tag.split( "\n" );
            tag.pop();
            tag = tag[0].split( ':' );
            
            if( !tag[1].trim() ) continue;
            tag = tag[1].split( '(' );
            tag = tag[0].trim();
            let t = document.createElement( 'div' );
            t.className = 'tag';
            t.textContent = tag;
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
