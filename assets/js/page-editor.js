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
        if( !currentEditor )
        {
            newEditor();
        }
    }
    
    let toptabs = topToolbar.querySelector('.TopTabs');
    if( toptabs )
    {
        let isScrolling = false; // Prevent multiple animations at the same time
        let currentDelta = 0; // Store the current delta for smooth updates

        // Add a wheel event listener to handle the scroll logic
        toptabs.addEventListener('wheel', (event) => {
            event.preventDefault();

            // Adjust the speed multiplier based on the Shift key
            let speedMultiplier = 3;
            currentDelta += event.deltaY * 0.5 * speedMultiplier;

            if (!isScrolling) {
                isScrolling = true;

                let startScroll = toptabs.scrollLeft;
                let duration = 300; // Duration of the tween in milliseconds
                let startTime = null;

                // Easing function for a smooth transition (ease-out)
                const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

                const animateScroll = (timestamp) => {
                    if (!startTime) startTime = timestamp;

                    let elapsed = timestamp - startTime;
                    let progress = Math.min(elapsed / duration, 1); // Cap progress at 1
                    let easedProgress = easeOutCubic(progress);

                    // Update scroll position dynamically based on currentDelta
                    toptabs.scrollLeft = startScroll + currentDelta * easedProgress;

                    if (progress < 1) {
                        requestAnimationFrame(animateScroll);
                    } else {
                        // Reset for the next scroll interaction
                        isScrolling = false;
                        currentDelta = 0; // Reset delta after completing animation
                    }
                };

                requestAnimationFrame(animateScroll);
            }
        });
        // Function to check overflow and add ellipsis
        const checkOverflowAndAddEllipsis = () => {
            // Get the last child element under toptabs
            const tabs = Array.from(toptabs.querySelectorAll('div'));
            if (tabs.length === 0 && toptabs.parentNode ) 
            {
                let ee = toptabs.parentNode.querySelector( '.TopTabEllipsis' );
                if( ee ) ee.parentNode.removeChild( ee );
                return;
            }

            const lastTab = tabs[tabs.length - 1];
            const toptabsRect = toptabs.getBoundingClientRect();
            const lastTabRect = lastTab.getBoundingClientRect();

            // Check if the last tab is overflowing
            if( lastTabRect.right > toptabsRect.right ){
                // Add ellipsis if it doesn't already exist
                if (!toptabs.parentNode.querySelector('.TopTabEllipsis')) {
                    const ellipsis = document.createElement('div');
                    ellipsis.innerHTML = ''; // Vertical ellipsis
                    let left = toptabs.offsetWidth - 10;
                    ellipsis.className = 'TopTabEllipsis';
                    toptabs.style.position = 'relative'; // Ensure the parent is relatively positioned
                    toptabs.parentNode.appendChild(ellipsis);

                    // Add click event to show the widget
                    ellipsis.addEventListener('click', () => {
                        showOverflowWidget(toptabs.querySelectorAll('div'));
                    });
                }
            }
            else if( toptabs.parentNode )
            {
                // Remove ellipsis if no overflow
                const ee = toptabs.parentNode.querySelector( '.TopTabEllipsis' );
                if( ee )
                {
                    ee.parentNode.removeChild( ee );
                    console.log( 'REM' );
                }
            }
            else
            {
                console.log( 'Uncaught test of toptabs ellipsis.' );
            }
        };

        // Function to show overflow widget
        const showOverflowWidget = (tabs) => {
            // Create a modal-like container
            const blocker = document.createElement( 'div' );
            blocker.className = 'blocker';
            document.body.appendChild( blocker );
            toptabs.blocker = blocker;
            
            const widget = document.createElement('div');
            widget.className = 'overflow-widget';

            // Add tabs to the widget
            tabs.forEach((tab) => {
                const item = document.createElement('div');
                item.textContent = tab.textContent;
                item.className = 'overflow-row-element';
                item.addEventListener('click', () => {
                    tab.parentNode.scrollLeft = tab.offsetLeft;
                    tab.click(); // Trigger click on the original tab
                    if( widget && widget.parentNode )
                        blocker.removeChild( widget ); // Close the widget
                    if( blocker.parentNode )
                        document.body.removeChild( blocker );
                    toptabs.blocker = null;
                });
                widget.appendChild(item);
            });

            // Add the widget to the body
            blocker.appendChild( widget );

            // Close the widget on outside click
            const closeWidget = (e) => {
                if (!widget.contains(e.target)) {
                    blocker.removeChild(widget);
                    document.body.removeChild( blocker );
                    toptabs.blocker = null;
                    document.removeEventListener('click', closeWidget);
                }
            };
            setTimeout(() => document.addEventListener('click', closeWidget), 0); // Delay to avoid immediate removal
        };

        // Initial check and attach resize listener
        checkOverflowAndAddEllipsis();
        window.addEventListener('resize', checkOverflowAndAddEllipsis);
    }
    
    // Recreate tabs that were removed
    if( !toptabs.querySelector( '.TopTab' ) )
    {
        for( let a in editorDocuments )
        {
            toptabs.appendChild( editorDocuments[ a ].tab );
        }
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
    if( !document.getElementById( 'top_toolbar' ).querySelector( '.TopTabs' ) )
    {
        document.getElementById( 'tab_editor' ).click();
    }
    
    if( path.substr( -1, 1 ) != '/' )
        path += '/';
        
    // Don't open the same one!
    for( let a in editorDocuments )
    {
        console.log( 'Current matrix: ' + editorDocuments[ a ].path + ' // ' + editorDocuments[ a ].filename );
        if( editorDocuments[ a ].path == path && editorDocuments[ a ].filename == filename )
        {
            editorDocuments[ a ].tab.click();
            return;
        }
    }
    
    console.log( 'Loading file: ' + filename, path, editorDocuments );
    let editor = newEditor( filename, path );
    
    const binaryArray = Uint8Array.from( atob( str ), char => char.charCodeAt( 0 ) );
    // Decode the Uint8Array as a UTF-8 string
    const utf8Decoder = new TextDecoder("utf-8");
    const utf8String = utf8Decoder.decode( binaryArray );
    
    editor.setValue( utf8String );
    editor.getSession().getUndoManager().reset();
    editor.document_saved = true;
    editor.clearSelection();
    
    // These needs to be here
    editor.path = path;
    editor.filename = filename;
    
    updateBottomBar();
}

function setCurrentEditor( data )
{
    currentEditor.path = data.path;
    if( currentEditor.path.substr( -1, 1 ) != '/' )
        currentEditor.path += '/';
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
            case 'ini':
            case 'conf':
                mode = 'ace/mode/ini';
                break;
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
            case 'h':
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

function removeDocumentFromStack( edName )
{
    let out = {};
    for( let a in editorDocuments )
    {
        if( a != edName )
        {
            out[ a ] = editorDocuments[ a ];
        }
    }
    editorDocuments = out;
}

let edName = 1;
function newEditor( filename = false, path = false )
{
    if( !document.getElementById( 'top_toolbar' ).querySelector( '.TopTabs' ) )
    {
        document.getElementById( 'tab_editor' ).click();
    }
    
    if( path && path.substr( -1, 1 ) != '/' )
        path += '/';
    
    // Don't open the same one!
    for( let a in editorDocuments )
    {
        if( editorDocuments[ a ].path == path && editorDocuments[ a ].filename == filename )
        {
            editorDocuments[ a ].tab.click();
            return;
        }
    }

    edName++;
    
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
    editor.editorId = edName;
    editor.filename = filename ? filename : 'New file';
    editor.path = path ? path : '';
    if( editor.path.substr( -1, 1 ) != '/' )
        editor.path += '/';
    
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
        removeDocumentFromStack( editor.editorId );
        editor.destroy();
        // Remove page
        editor.container.parentNode.removeChild( editor.container );
        if( activate ) 
        {
            setTimeout( () => { activate.click(); }, 1 );
        }
        toolbar.editor();
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

function closeFileAll()
{
    let unsaved = false;
    for( let a in editorDocuments )
    {
        if( !editorDocuments[ a ].document_saved )
        {
            unsaved = true;
            break;
        }
    }
    let conf = true;
    if( unsaved )
    {
        conf = false;
        if( confirm( 'You have unsaved document(s). Do you still want to close all documents?' ) )
        {
            conf = true;
        }
    }
    if( conf )
    {
        for( let a in editorDocuments )
        {
            closeFile( editorDocuments[a] );
        }
    }
}

function closeFile( ed = false )
{
    if( !ed || !ed.tab ) return;
    let p = ed.tab.parentNode;
    let activate = false;
    
    let tab = ed.tab;
    togglePreview( false );
    
    // Try to activate next/prev?
    if( p )
    {
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
    }
    removeDocumentFromStack( ed.editorId );
    ed.destroy();
    
    // Remove page
    if( ed.parentNode )
    {
        ed.container.parentNode.removeChild( editor.container );
        if( activate ) 
        {
            setTimeout( () => { activate.click(); }, 1 );
        }
    }
    toolbar.editor();
}

