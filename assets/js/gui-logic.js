// Main GUI logic

window.toolbar = {};
window.chatShift = false;

function initializeGUI()
{
    initTabs( 'leftbar' );
    initTabs( 'rightbar' );
    initTabs( 'bottombar', { state: 'inactive' } );
    
    let closers = document.getElementById( 'debug' ).getElementsByClassName( 'close-page' );
    let closerp = document.getElementById( 'debug' ).getElementsByClassName( 'page' );
    for( let a = 0; a < closers.length; a++ )
    {
        closers[a].onclick = () => {
            console.log( 'fop' );
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
}

function initTabs( element, options = false )
{
    let tabButtons = document.querySelector( '#' + element ).getElementsByTagName( 'button' );
    for( let a = 0; a < tabButtons.length; a++ )
    {
        tabButtons[a].onclick = () => {
            if( tabButtons.length == 1 )
            {
                if( tabButtons[a].classList.contains( 'active' ) )
                {
                    tabButtons[a].classList.remove( 'active' );
                    document.getElementById( tabButtons[a].id.split( 'tab_' ).join( 'page_' ) ).classList.remove( 'active' );
                }
                else
                {
                    tabButtons[a].classList.add( 'active' );
                    document.getElementById( tabButtons[a].id.split( 'tab_' ).join( 'page_' ) ).classList.add( 'active' );
                }
                return;
            }
            tabButtons[a].classList.add( 'active' );
            document.getElementById( tabButtons[a].id.split( 'tab_' ).join( 'page_' ) ).classList.add( 'active' );
            for( let b = 0; b < tabButtons.length; b++ )
            {
                if( b == a ) continue;
                tabButtons[b].classList.remove( 'active' );
                document.getElementById( tabButtons[b].id.split( 'tab_' ).join( 'page_' ) ).classList.remove( 'active' );
            }
            if( window.toolbar[ tabButtons[a].id.split( '_' )[1] ] )
            {
                window.toolbar[ tabButtons[a].id.split( '_' )[1] ]();
            }
        }
    }
    if( !options || options.state != 'inactive' )
        tabButtons[0].click();
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

