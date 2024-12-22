function initializeGUI()
{
    let tabButtons = document.querySelector( '#leftbar' ).getElementsByTagName( 'button' );
    for( let a = 0; a < tabButtons.length; a++ )
    {
        tabButtons[a].onclick = () => {
            tabButtons[a].classList.add( 'active' );
            document.getElementById( tabButtons[a].id.split( 'tab_' ).join( 'page_' ) ).classList.add( 'active' );
            for( let b = 0; b < tabButtons.length; b++ )
            {
                if( b == a ) continue;
                tabButtons[b].classList.remove( 'active' );
                document.getElementById( tabButtons[b].id.split( 'tab_' ).join( 'page_' ) ).classList.remove( 'active' );
            }
        }
    }
}
