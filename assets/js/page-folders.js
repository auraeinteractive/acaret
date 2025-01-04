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
        tci.innerHTML = '<em class="folders-delete" title="Delete"></em><em class="folders-rename" title="Rename"></em><em class="file-new" title="New file"></em><em class="folders-new" title="New folder"></em><em class="folders-back" title="Up"></em>';
        
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

// Receive from server
let targetFolderElements = {};

function setActiveItem( itm )
{
    let container = document.getElementById( 'page_folders' );
    let items = container.querySelectorAll( '.folder, .file' );
    for( let a = 0; a < items.length; a++ )
    {
        if( items[ a ] != itm )
        {
            items[ a ].classList.remove( 'active' );
        }
    }
    itm.classList.add( 'active' );
}

function receiveFolders( path, data, depth = 0 )
{
    let container = document.getElementById( 'page_folders' );
    
    console.log( 'Trying: ' + path );
    if( targetFolderElements[ path ] )
    {
        container = targetFolderElements[ path ];
        if( container.className != 'folder-children' )
        {
            let c = document.createElement( 'div' );
            c.className = 'folder-children';
            container.folderChildren = c;
            container.appendChild( c );
            targetFolderElements[ path ] = c;
            container = c;
        }
    }
    else
    {
        if( depth == 0 )
        {
            document.getElementById( 'page_folders' ).innerHTML = '';
            console.log( 'No target: ' + path );
        }
    }
    
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
        targetFolderElements[ path + folders[a] + '/' ] = d;
        d.onclick = ( e ) => { 
            if( d.classList.contains( 'active' ) )
            {
                d.classList.remove( 'active' );
            }
            else
            {
                setActiveItem( d );
            }
            if( d.folderChildren )
            {
                if( d.folderChildren.classList.contains( 'hidden' ) )
                {
                    d.folderChildren.classList.remove( 'hidden' );
                }
                else
                {
                    d.folderChildren.classList.add( 'hidden' );
                }
            } 
            else 
            { 
                refreshFolderStructure( path + folders[a] + '/' ); 
            }
            e.stopPropagation();
            e.preventDefault();
        }
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
        d.onclick = ( e ) => { 
            if( d.classList.contains( 'active' ) )
            {
                d.classList.remove( 'active' );
            }
            else
            {
                setActiveItem( d );
            }
            loadFileFromPath( path + files[a] ); 
            e.stopPropagation();
            e.preventDefault();
        }
        container.appendChild( d );
    }
    
    window.toolbar.folders();
}


// Tag: Refreshing the folder structure the first time
window.addEventListener( 'load', () => {
    refreshFolderStructure( currentFolder );
} );
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





