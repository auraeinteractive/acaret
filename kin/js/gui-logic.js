// Main GUI logic

window.toolbar = {};
window.chatShift = false;
window.rightPanelVisible = true;

function initializeGUI()
{
    initTabs( 'leftbar' );
    initRightPanel();
    initTabs( 'rightbar', { defaultTabId: 'tab_folders' } );
    initTabs( 'bottombar', { state: 'inactive' } );
    
    let closers = document.getElementById( 'debug' ).getElementsByClassName( 'close-page' );
    let closerp = document.getElementById( 'debug' ).getElementsByClassName( 'page' );
    for( let a = 0; a < closers.length; a++ )
    {
        closers[a].onclick = () => {
            for( let b = 0; b < closerp.length; b++ )
                closerp[b].classList.remove( 'active' );
        };
    }
    
    document.body.addEventListener( 'keyup', function( e )
    {
        if( e.which == 16 )
            window.chatShift = false;
        else if( e.which == 17 )
            window.chatCtrl = false;
    } );
    document.body.addEventListener( 'keydown', function( e )
    {
        if( e.which == 16 )
            window.chatShift = true;
        else if( e.which == 17 )
            window.chatCtrl = true;
    } );
    
    // Prepare to get the startup screen
    sendSignal( 'startup', false, function( data )
    {
        if( data == 'fail' )
        {
            console.log( 'Nothing in startup' );
            return;
        }
        console.log( 'We got the startup check: ' + data );
    } );

    if( typeof refreshFolderStructure === 'function' )
        refreshFolderStructure( typeof currentFolder !== 'undefined' ? currentFolder : 'Home:' );
}

function getToolbarKeyForTab( tabButton )
{
    return tabButton.id.replace( /^tab_/, '' );
}

function setRightPanelWidth( width )
{
    const min = 220;
    const max = Math.max( min, Math.floor( window.innerWidth * 0.65 ) );
    const w = Math.max( min, Math.min( max, Math.round( width ) ) );
    document.documentElement.style.setProperty( '--right-panel-width', w + 'px' );
    if( typeof resizeAllEditors === 'function' )
        resizeAllEditors();
}

function showRightPanel()
{
    if( window.rightPanelVisible )
        return;
    window.rightPanelVisible = true;
    document.body.classList.remove( 'right-panel-collapsed' );
    const saved = parseInt( localStorage.getItem( 'acaret-right-panel-width' ) || '449', 10 );
    setRightPanelWidth( isNaN( saved ) ? 449 : saved );
}

function hideRightPanel()
{
    if( !window.rightPanelVisible )
        return;
    window.rightPanelVisible = false;
    document.body.classList.add( 'right-panel-collapsed' );
    if( typeof resizeAllEditors === 'function' )
        resizeAllEditors();
}

function toggleRightPanel()
{
    if( window.rightPanelVisible )
        hideRightPanel();
    else
        showRightPanel();
}

function initRightPanel()
{
    let resizer = document.getElementById( 'right-panel-resizer' );
    if( !resizer )
    {
        resizer = document.createElement( 'div' );
        resizer.id = 'right-panel-resizer';
        resizer.title = 'Drag to resize';
        document.body.appendChild( resizer );
    }

    const saved = parseInt( localStorage.getItem( 'acaret-right-panel-width' ) || '449', 10 );
    setRightPanelWidth( isNaN( saved ) ? 449 : saved );

    let dragging = false;
    let startX = 0;
    let startWidth = 0;

    resizer.addEventListener( 'mousedown', function( e ) {
        if( !window.rightPanelVisible )
            return;
        dragging = true;
        startX = e.clientX;
        startWidth = parseInt( getComputedStyle( document.documentElement ).getPropertyValue( '--right-panel-width' ), 10 ) || 449;
        document.body.classList.add( 'right-panel-resizing' );
        e.preventDefault();
    } );

    document.addEventListener( 'mousemove', function( e ) {
        if( !dragging )
            return;
        setRightPanelWidth( startWidth + ( startX - e.clientX ) );
    } );

    document.addEventListener( 'mouseup', function() {
        if( !dragging )
            return;
        dragging = false;
        document.body.classList.remove( 'right-panel-resizing' );
        const w = parseInt( getComputedStyle( document.documentElement ).getPropertyValue( '--right-panel-width' ), 10 );
        if( !isNaN( w ) && w > 0 )
            localStorage.setItem( 'acaret-right-panel-width', String( w ) );
    } );
}

function initTabs( element, options = false )
{
    let tabButtons = document.querySelector( '#' + element ).getElementsByTagName( 'button' );
    const isRightBar = element === 'rightbar';
    for( let a = 0; a < tabButtons.length; a++ )
    {
        tabButtons[a].onclick = () => {
            let pageId = tabButtons[a].id.split( 'tab_' ).join( 'page_' );
            let page = document.getElementById( pageId );
            let tabKey = getToolbarKeyForTab( tabButtons[a] );

            if( isRightBar )
            {
                let wasActive = tabButtons[a].classList.contains( 'active' );
                if( wasActive )
                {
                    toggleRightPanel();
                    return;
                }
                showRightPanel();
            }

            if( tabButtons.length == 1 )
            {
                if( tabButtons[a].classList.contains( 'active' ) )
                {
                    tabButtons[a].classList.remove( 'active' );
                    page.classList.remove( 'active' );
                }
                else
                {
                    tabButtons[a].classList.add( 'active' );
                    page.classList.add( 'active' );
                }
                return;
            }
            tabButtons[a].classList.add( 'active' );
            page.classList.add( 'active' );
            for( let b = 0; b < tabButtons.length; b++ )
            {
                if( b == a ) continue;
                tabButtons[b].classList.remove( 'active' );
                document.getElementById( tabButtons[b].id.split( 'tab_' ).join( 'page_' ) ).classList.remove( 'active' );
            }
            if( window.toolbar[ tabKey ] )
            {
                window.toolbar[ tabKey ]();
            }
        }
    }
    if( !options || options.state != 'inactive' )
    {
        let defaultId = ( options && options.defaultTabId ) ? options.defaultTabId : tabButtons[0].id;
        for( let a = 0; a < tabButtons.length; a++ )
        {
            if( tabButtons[a].id === defaultId )
            {
                tabButtons[a].click();
                break;
            }
        }
    }
}

// Check the context menus..
window.addEventListener( 'contextmenu', function( e = false )
{
    if( !e ) return;
    let tar = e.target;
    while( tar != document.body )
    {
        if( tar.contextMenu )
        {
            showContextMenu( tar.contextMenu, e );
            e.preventDefault();
            e.stopPropagation();
            return;
        }
        tar = tar.parentNode;
    }
} );
window.contextMenu = null;
function showContextMenu( menu, evt )
{
    if( !window.contextMenu )
    {
        let c = document.createElement( 'div' );
        c.className = 'mlContextMenu';
        document.body.appendChild( c );
        window.contextMenu = c;
    }
    let c = window.contextMenu;
    let actionList = [];
    
    function renderMenu( menu, actions = [], depth = 0, e = false )
    {
        let str = '';
        for( let a = 0; a < menu.length; a++ )
        {
            if( menu[a].type == 'menu' )
            {
                str += renderMenu( menu[a].items, actions, depth + 1, e );
            }
            else
            {
                let im = '';
                if( menu[ a ].icon )
                {
                    im = ' class="' + menu[ a ].icon + '"';
                }
                str += '<div class="menu-item" itemid="' + actions.length + '"><span' + im + '></span>' + menu[a].name + '</div>';
                actions.push( menu[a].action );
            }
        }
        return str;
    }
    
    c.innerHTML = renderMenu( menu, actionList, 0, evt );
    let items = c.querySelectorAll( '.menu-item' );
    for( let a = 0; a < items.length; a++ )
    {
        items[a].addEventListener( 'mouseup', ( o ) => {
            let index = items[a].getAttribute( 'itemid' );
            if( actionList[ parseInt( index ) ] )
            {
                actionList[ parseInt( index ) ]();
            }
            window.contextMenu = null;
            c.classList.add( 'hidden' );
            setTimeout( function()
            {
                document.body.removeChild( c );
            }, 250 );
            o.stopPropagation();
            o.preventDefault();
        } );
    }
    
    c.style.top = evt.clientY + 'px';
    c.style.left = evt.clientX + 'px';
}
window.addEventListener( 'mouseup', function( e )
{
    if( window.contextMenu )
    {
        let c = window.contextMenu;
        window.contextMenu = null;
        setTimeout( () => {
            c.classList.add( 'hidden' );
            setTimeout( function()
            {
                document.body.removeChild( c );
            }, 250 );
        }, 25 );
    }
} );
// Done context menus

