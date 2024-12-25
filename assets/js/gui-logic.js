// Main GUI logic

window.toolbar = {};

function initializeGUI()
{
    initTabs( 'leftbar' );
    initTabs( 'bottombar', { state: 'inactive' } );
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

