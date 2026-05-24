let currentFolder = 'Home:';

// Refresh folder structure using Kin API
function refreshFolderStructure(folder) {
    // Convert Kin path to URL format
    let kinPath = folder;
    if (kinPath.startsWith('Home:')) {
        kinPath = kinPath.substring(5);
    }
    
    // Use Kin HTTP API for directory listing
    fetch('/api/dir', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: 'path=' + encodeURIComponent('Home:' + kinPath)
    }).then(function(r) { return r.json(); })
      .then(function(result) {
          if (result.response === 'success' && result.data) {
              receiveFolders(folder, result.data);
          } else {
              console.log('Failed to load folder:', result.message || 'Unknown error');
          }
      }).catch(function(err) {
          console.error('Folder load error:', err);
      });
}



window.toolbar = window.toolbar ? window.toolbar : {};
window.toolbar.folders = function() {
    if( document.getElementById( 'page_folders' ).classList.contains( 'active' ) )
    {
        let tct = document.getElementById( 'top_chat_title' );
        let tcd = tct.getElementsByTagName( 'div' )[0];
        let tci = tct.getElementsByTagName( 'div' )[1];
        tcd.innerHTML = '<span>' + currentFolder + '</span>';
        tcd.className = 'folders';
        tci.innerHTML = '<em class="folders-refresh" title="Refresh"></em><em class="file-new" title="New file"></em><em class="folders-new" title="New folder"></em><em class="folders-back" title="Up"></em>';
        
        tci.querySelector( '.folders-back' ).onclick = function()
        {
            let cf = currentFolder; if ( cf.substr( -1, 1 ) == '/' ) cf = cf.substr( 0, cf.length - 1 );
            let par = cf.split( '/' );
            par.pop(); par = par.join( '/' ) + '/';
            currentFolder = par;
            refreshFolderStructure( currentFolder );
            tcd.innerHTML = currentFolder;
        }
        tci.querySelector( '.folders-refresh' ).onclick = function()
        {
            refreshFolderStructure( currentFolder );
        }
        tci.querySelector( '.file-new' ).onclick = function()
        {
            let data = {
                path: currentFolder,
                file: 'empty file.txt'
            }
            sendSignal( 'file-new', data, function( response )
            {
                console.log( 'Response from file-new: ' + response );
            } );
        }
        tci.querySelector( '.folders-new' ).onclick = function()
        {
            let data = {
                path: currentFolder,
                file: 'folder'
            }
            sendSignal( 'folder-new', data, function( response )
            {
                console.log( 'Response from folders-new: ' + response );
            } );
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
    if( !data || !Array.isArray( data ) )
    {
        console.log( 'Invalid folder data:', data );
        return;
    }
    
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
        if( !data[a] ) continue;
        let itemType = data[a].type || data[a].fileType || '';
        let itemName = data[a].name || data[a].filename || '';
        if( itemType.trim() == 'dir' || itemType.trim() == 'folder' )
        {
            if( itemName.substr( 0, 1 ) == '.' ) continue;
            folders.push( itemName.toLowerCase() + '/' + itemName );
        }
    }
    folders = folders.sort();
    for( let a = 0; a < folders.length; a++ )
    {
        let d = document.createElement( 'div' );
        d.className = 'folder';
        d.contextMenu = [ { type: 'item', name: 'Refresh', icon: 'refresh', action: function(){ console.log( 'Refreshing..' ); } } ];
        let realfldName = folders[a].split( '/' )[1];
        d.innerHTML = '<span>' + realfldName + '/</span>';
        targetFolderElements[ path + realfldName + '/' ] = d;
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
                refreshFolderStructure( path + realfldName + '/' ); 
            }
            e.stopPropagation();
            e.preventDefault();
        }
        container.appendChild( d );
    }
    
    let files = [];
    for( let a = 0; a < data.length; a++ )
    {
        if( !data[a] ) continue;
        let itemType = data[a].type || data[a].fileType || '';
        let itemName = data[a].name || data[a].filename || '';
        if( itemType.trim() == 'file' )
        {
            if( itemName.substr( 0, 1 ) == '.' ) continue;
            files.push( itemName );
        }
    }
    files = files.sort();
    for( let a = 0; a < files.length; a++ )
    {
        let d = document.createElement( 'div' );
        d.className = 'file';
        d.innerHTML = '<span>' + files[a] + '</span>';
        d.contextMenu = [ { type: 'file', name: 'Delete', icon: 'trash', action: function(){ 
            
            console.log( 'Deleting ' + files[a] ); 
            
        } } ];
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





