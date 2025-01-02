let currentFolder = '/home/hogne/Projects';

window.toolbar = window.toolbar ? window.toolbar : {};
window.toolbar.folders = function() {
    document.getElementById( 'top_chat_title' ).getElementsByTagName( 'div' )[0].innerHTML = currentFolder;
    document.getElementById( 'top_chat_title' ).getElementsByTagName( 'div' )[0].className = 'folders';
}

function receiveFolders( path, data, depth = 0 )
{
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
        container.appendChild( d );
    }
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

