// Editor
let editorDocuments = {};
let currentEditor = false;

window.toolbar = window.toolbar ? window.toolbar : {};
window.toolbar.editor = function() {
    let topToolbar = document.getElementById( 'top_toolbar' );
    if( !topToolbar.querySelector( '.TopTabs' ) )
    {
        topToolbar.innerHTML = '<div class="TopTabs"></div><div class="TopTabOption"><button class="taboption preview">Preview</button><button class="taboption add">New file</button></div>';
        
        let taboptions = topToolbar.getElementsByClassName( 'taboption' );
        for( let a = 0; a < taboptions.length; a++ )
        {
            if( taboptions[a].classList.contains( 'add' ) )
            {
                taboptions[a].onclick = ( e ) => {
                    newEditor();
                };
            }
            if( taboptions[a].classList.contains( 'preview' ) )
            {
                taboptions[a].onclick = ( e ) => {
                    togglePreview();
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
                togglePreview( false );
                let ed = this.getAttribute( 'editor' );
                this.classList.add( 'active' );
                currentEditor = this.editor;
                updateBottomBar();
                window.toolbar.navigator();
                for( let c = 0; c < allTabs.length; c++ )
                    if( allTabs[ c ] != this ) allTabs[ c ].classList.remove( 'active' );
                
                for( let b = 0; b < pages.length; b++ )
                {
                    if( pages[ b ].getAttribute( 'editor' ) == ed )
                    {
                        pages[ b ].classList.add( 'active' );
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
    
    const binaryArray = Uint8Array.from( atob( str ), char => char.charCodeAt( 0 ) );

    // Decode the Uint8Array as a UTF-8 string
    const utf8Decoder = new TextDecoder("utf-8");
    const utf8String = utf8Decoder.decode( binaryArray );
    
    editor.setValue( utf8String );
    editor.document_saved = true;
    editor.clearSelection();
    updateBottomBar();
}

function setCurrentEditor( data )
{
    currentEditor.path = data.path;
    currentEditor.filename = data.filename;
    currentEditor.tab.innerHTML = '<span class="close"></span>' + currentEditor.filename;
    updateBottomBar();
}

function getSyntaxHighlightingMode( ext )
{
    let mode = 'ace/mode/plain_text';
    
    if( ext )
    {
        ext = ext.toLowerCase();
        switch( ext )
        {
            case 'yml':
            case 'yaml':
                mode = 'ace/mode/yaml';
                break;
            case 'javascript':
            case 'js':
                mode = 'ace/mode/javascript';
                break;
            case 'html':
                mode = 'ace/mode/html';
                break;
            case 'css':
                mode = 'ace/mode/css';
                break;
            case 'json':
                mode = 'ace/mode/json';
                break;
            case 'xml':
                mode = 'ace/mode/xml';
                break;
            case 'php':
                mode = 'ace/mode/php';
                break;
            case 'py':
                mode = 'ace/mode/python';
                break;
            case 'rb':
                mode = 'ace/mode/ruby';
                break;
            case 'c':
                mode = 'ace/mode/c_cpp';
                break;
            case 'cpp':
                mode = 'ace/mode/c_cpp';
                break;
            case 'java':
                mode = 'ace/mode/java';
                break;
            case 'swift':
                mode = 'ace/mode/swift';
                break;
            case 'go':
                mode = 'ace/mode/go';
                break;
            case 'rs':
                mode = 'ace/mode/rust';
                break;
            case 'ts':
                mode = 'ace/mode/typescript';
                break;
            case 'vue':
                mode = 'ace/mode/vue';
                break;
            case 'md':
                mode = 'ace/mode/markdown';
                break;
            case 'bash':
            case 'sh':
                mode = 'ace/mode/sh';
                break;
            case 'txt':
            case 'new file':
            case 'New file':
            case 'unnamed file':
            default:
                mode = 'ace/mode/plain_text';
                break;
        }
    }
    if( mode == 'makefile' )
    {
        return 'ace/mode/makefile';
    }
    return mode;    
}

function updateBottomBar()
{
    let mode = 'ace/mode/plain_text';
    try
    {
        let ext = currentEditor.filename.split('.').pop();
        mode = getSyntaxHighlightingMode( ext );
    }
    catch( e ){ console.log( 'Some error' ); }
    
    if( currentEditor.filename == 'Makefile' )
        mode = 'ace/mode/makefile';
    
    if( currentEditor.filename.substr( -3, 3 ).toLowerCase() == '.md' )
    {
        document.body.classList.add( 'filetype-md' );
    }
    else
    {
        document.body.classList.remove( 'filetype-md' );
    }
    
    currentEditor.session.setMode( mode );
    
    // Set the bottom bar info
    document.getElementById( 'bottombar' ).querySelector( '.bottom-info' ).innerHTML = '<div>Editing: ' + mode.split( '/' ).pop().split( '_' ).join( '/' ) + '</div><div>' + ( currentEditor.document_saved ? 'Saved.' : 'Not saved.' ) + '</div><div>' + ( currentProject.name ? ( 'Project: ' + currentProject.name ) : 'No project.' ) + '</div>';
}

let previewOn = false;

function togglePreview( forceState = 0 )
{
    if( forceState === false )
    {
        previewOn = true;
    }
    else if( forceState === true )
    {
        previewOn = false;
    }

    if( !previewOn )
    {
        previewOn = true;
        
        document.body.classList.add( 'file-preview' );
        
        let str = currentEditor.getValue();
        
        if( document.body.classList.contains( 'filetype-md' ) )
        {
            str = new showdown.Converter().makeHtml( str );
        }
        
        document.getElementById( 'page_preview' ).innerHTML = '<div>' + str + '</div>';
        document.getElementById( 'page_preview' ).classList.add( 'showing' );
    }
    else
    {
        document.body.classList.remove( 'file-preview' );
        previewOn = false;
        document.getElementById( 'page_preview' ).classList.remove( 'showing' );
        document.getElementById( 'page_preview' ).innerHTML = '';
    }
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
        fontFamily: "Ubuntu Mono, Monospace",
        fontSize: "15px",
        wrap: true
    });
    
    editorDocuments[ edName ] = editor;
    editor.filename = filename ? filename : 'New file';
    editor.path = path ? path : '';
    
    let tab = document.createElement( 'div' );
    tab.innerHTML = '<span class="close"></span>' + editor.filename;
    tab.querySelector( '.close' ).onclick = () => {
        togglePreview( false );
        
        let p = tab.parentNode;
        let activate = false;
        // Try to activate next/prev?
        for( let a = 0; a < p.childNodes.length; a++ )
        {
            if( p.childNodes[a] == tab )
            {
                if( a + 1 < p.childNodes.length )
                {
                    activate = p.childNodes[ a + 1 ];
                }
                else if( a > 0 )
                {
                    activate = p.childNodes[ a - 1 ];
                }
            }
        }
        
        p.removeChild( tab );
        editor.destroy();
        if( activate ) 
        {
            setTimeout( () => { activate.click(); }, 1 );
        }
    };
    tab.className = 'TopTab';
    tab.setAttribute( 'editor', edName );
    tab.editor = editor;
    editor.tab = tab;
    document.getElementById( 'top_toolbar' ).querySelector( '.TopTabs' ).appendChild( tab );
    
    // Reinit
    toolbar.editor();
    
    editor.focus();
    tab.click();
    
    editor.on( 'change', function( e ){
        editor.document_saved = false;
        updateBottomBar();
    } );
    
    updateBottomBar();
    
    // Return reference to editor
    return editor;
}




