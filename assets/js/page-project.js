// Settings

window.currentProject = {
    name: '',
    filename: '',
    path: ''
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
        let o = JSON.parse( atob( str ) );
        o.filename = filename;
        o.path = path;
        
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
}
