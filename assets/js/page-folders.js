let currentFolder = '/home/hogne/Projects/';

window.toolbar = window.toolbar ? window.toolbar : {};
window.toolbar.folders = function() {
    if( document.getElementById( 'page_folders' ).classList.contains( 'active' ) )
    {
        let tct = document.getElementById( 'top_chat_title' );
        let tcd = tct.getElementsByTagName( 'div' )[0];
        let tci = tct.getElementsByTagName( 'div' )[1];
        tcd.innerHTML = '<span>' + currentFolder + '</span>';
        tcd.className = 'folders';
        tci.innerHTML = '<em class="folders-delete" title="Delete"></em><em class="folders-rename" title="Rename"></em><em class="folders-new" title="New folder"></em><em class="folders-back" title="Up"></em>';
        
        tci.querySelector( '.folders-back' ).onclick = function()
        {
            let cf = currentFolder; if ( cf.substr( -1, 1 ) == '/' ) cf = cf.substr( 0, cf.length - 1 );
            let par = cf.split( '/' );
            par.pop(); par = par.join( '/' ) + '/';
            currentFolder = par;
            refreshFolderStructure( currentFolder );
            tcd.innerHTML = currentFolder;
        }
    }
}

function receiveFolders( path, data, depth = 0 )
{
    currentFolder = path;
    
    if( depth == 0 )
    {
        document.getElementById( 'page_folders' ).innerHTML = '';
    }
    let container = document.getElementById( 'page_folders' );
    
    let folders = [];
    for( let a = 0; a < data.length; a++ )
    {
        if( data[a].type.trim() == 'dir' )
        {
            if( data[a].name.substr( 0, 1 ) == '.' ) continue;
            folders.push( data[a].name );
        }
    }
    folders = folders.sort();
    for( let a = 0; a < folders.length; a++ )
    {
        let d = document.createElement( 'div' );
        d.className = 'folder';
        d.innerHTML = '<span>' + folders[a] + '/</span>';
        d.onclick = () => { refreshFolderStructure( currentFolder + folders[a] + '/' ); }
        container.appendChild( d );
    }
    
    let files = [];
    for( let a = 0; a < data.length; a++ )
    {
        if( data[a].type.trim() == 'file' )
        {
            if( data[a].name.substr( 0, 1 ) == '.' ) continue;
            files.push( data[a].name );
        }
    }
    files = files.sort();
    for( let a = 0; a < files.length; a++ )
    {
        let d = document.createElement( 'div' );
        d.className = 'file';
        d.innerHTML = '<span>' + files[a] + '</span>';
        d.onclick = () => { loadFileFromPath( currentFolder + files[a] ); }
        container.appendChild( d );
    }
    
    window.toolbar.folders();
}

refreshFolderStructure( currentFolder );

window.addEventListener('message', function(event) 
{
    if (event.data && event.data.type === "folderStructure") {
        console.log("Received folder structure:", event.data.files);
        // Update your UI or handle the data as needed
        const filesContainer = document.body;
        filesContainer.innerHTML = '';
        event.data.files.forEach(file => {
            const fileElement = document.createElement('div');
            fileElement.textContent = `Name: ${file.name}, Size: ${file.size} bytes, Date: ${file.date}`;
            filesContainer.appendChild(fileElement);
        });
    }
} );

