// Settings

window.currentProject = {
    name: '',
    filename: '',
    path: '',
    languages: {
        default: {
            'namespace.hello': 'world'
        }
    },
    languageKeys: {
        'namespace': {
            'hello': {}
        }
    }
};

window.toolbar = window.toolbar ? window.toolbar : {};
window.toolbar.project = function() {
    let topToolbar = document.getElementById( 'top_toolbar' );
    topToolbar.innerHTML = '<div><strong>Project settings</strong></div>';
    
    document.getElementById( 'p-name' ).onchange = function(){ currentProject.name = this.value; };
    document.getElementById( 'p-git-url' ).onchange = function(){ currentProject.gitUrl = this.value; };
    document.getElementById( 'p-git-username' ).onchange = function(){ currentProject.gitUsername = this.value; };
    document.getElementById( 'p-git-password' ).onchange = function(){ currentProject.gitPassword = this.value; };
    document.getElementById( 'p-git-key' ).onchange = function(){ currentProject.gitKey = this.value; };
}

function loadProject( str, path, filename )
{
    try
    {
        const binaryArray = Uint8Array.from( atob( str ), char => char.charCodeAt( 0 ) );
        // Decode the Uint8Array as a UTF-8 string
        const utf8Decoder = new TextDecoder("utf-8");
        const utf8String = utf8Decoder.decode( binaryArray );
    
        let o = JSON.parse( utf8String );
        o.filename = filename;
        o.path = path;
        if( o.path.substr( -1, 1 ) != '/' )
            o.path += '/';
        
        document.getElementById( 'p-name' ).value = o.name ?? 'unnamed';
        document.getElementById( 'p-git-url' ).value = o.gitUrl ?? '';
        document.getElementById( 'p-git-username' ).value = o.gitUsername ?? '';
        document.getElementById( 'p-git-password' ).value = o.gitPassword ?? '';
        document.getElementById( 'p-git-key' ).value = o.gitKey ?? '';
        
        setCurrentProject( o );
        updateBottomBar();
    }
    catch( e )
    {
        alert( 'Could not load project.' );
    }
}

function setCurrentProject( obj )
{
    for( let a in obj )
    {
        window.currentProject[ a ] = obj[ a ];
    }
    currentFolder = obj.path.substr( -1, 1 ) == '/' ? obj.path : ( obj.path + '/' );
    refreshFolderStructure( currentFolder );
    updateBottomBar();
    
    // Add the current project to session profile
    sendSignal( 'add-current-project', base64EncodeUtf8( JSON.stringify( window.currentProject ) ), function( d )
    {
        console.log( 'Result: ', d );
    } );
}
