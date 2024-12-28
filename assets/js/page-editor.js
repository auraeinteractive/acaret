// Editor
let editorDocuments = {};
let currentEditor = false;

window.toolbar = window.toolbar ? window.toolbar : {};
window.toolbar.editor = function() {
    let topToolbar = document.getElementById( 'top_toolbar' );
    if( !topToolbar.querySelector( '.TopTabs' ) )
    {
        topToolbar.innerHTML = '<div class="TopTabs"></div><div class="TopTabOption"><button class="taboption add">New file</button></div>';
        
        let taboptions = topToolbar.getElementsByClassName( 'taboption' );
        for( let a = 0; a < taboptions.length; a++ )
        {
            if( taboptions[a].classList.contains( 'add' ) )
            {
                taboptions[a].onclick = ( e ) => {
                    newEditor();
                };
            }
        }
        newEditor();
    }
    
    let allTabs = topToolbar.getElementsByClassName( 'TopTab' );
    let pages = document.getElementById( 'page_editor' ).getElementsByTagName( 'pre' );
    if( allTabs && pages )
    {
        let active = false;
        for( let a = 0; a < allTabs.length; a++ )
        {
            if( !active && allTabs[ a ].classList.contains( 'active' ) )
                active = allTabs[ a ];
            allTabs[ a ].onclick = function()
            {
                let ed = this.getAttribute( 'editor' );
                this.classList.add( 'active' );
                currentEditor = this.editor;
                for( let c = 0; c < allTabs.length; c++ )
                    if( allTabs[ c ] != this ) allTabs[ c ].classList.remove( 'active' );
                
                for( let b = 0; b < pages.length; b++ )
                {
                    if( pages[ b ].getAttribute( 'editor' ) == ed )
                    {
                        pages[ b ].classList.add( 'active' );
                        
                        console.log( 'Found the thing' );
                    }
                    else
                    {
                        pages[ b ].classList.remove( 'active' );
                    }
                }
            }
        }
        if( !active )
        {
            allTabs[ 0 ].click();
        }
    }
};
function loadFile( str, path, filename )
{
    console.log( 'Loading file: ' + filename, path );
    let editor = newEditor( filename, path );
    editor.setValue( atob( str ) );
}

let edName = 1;
function newEditor( filename = false, path = false )
{
    edName++;
    
    if( path && path.substr( -1, 1 ) != '/' )
        path += '/';
    
    let p = document.createElement( 'pre' );
    p.setAttribute( 'editor', edName );
    document.getElementById( 'page_editor' ).appendChild( p );
    
    let editor = ace.edit( p );
    editor.setTheme("ace/theme/twilight");
    editor.session.setMode("ace/mode/javascript");
    editor.setOptions({
        fontFamily: "tahoma",
        fontSize: "15px"
    });
    
    editorDocuments[ edName ] = editor;
    editor.filename = filename ? filename : 'unnamed file';
    editor.path = path ? path : '';
    
    let tab = document.createElement( 'div' );
    tab.innerHTML = editor.filename;
    tab.className = 'TopTab';
    tab.setAttribute( 'editor', edName );
    tab.editor = editor;
    document.getElementById( 'top_toolbar' ).querySelector( '.TopTabs' ).appendChild( tab );
    
    // Reinit
    toolbar.editor();
    
    // Return reference to editor
    return editor;
}
