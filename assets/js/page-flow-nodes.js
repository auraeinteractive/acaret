// Flow nodes

window.toolbar = window.toolbar ? window.toolbar : {};
window.toolbar[ 'flow-nodes' ] = function() {
    let topToolbar = document.getElementById( 'top_toolbar' );
    topToolbar.innerHTML = '<div><strong>Flow nodes</strong></div>';
    refreshFlowNodes();
}

function refreshFlowNodes()
{
    let container = document.getElementById( 'page_flow-nodes' );
    
    let divCanvas = container.querySelector( '.div-canvas' );
    if( !divCanvas )
    {
        container.innerHTML = '';
        divCanvas = document.createElement( 'div' );
        divCanvas.className = 'div-canvas';
        container.appendChild( divCanvas );
    }
}
