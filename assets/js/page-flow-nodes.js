// Flow nodes

let flowNodes = {
    nodes: []
}

window.toolbar = window.toolbar ? window.toolbar : {};
window.toolbar[ 'flow-nodes' ] = function() {
    let topToolbar = document.getElementById( 'top_toolbar' );
    topToolbar.innerHTML = '<div><strong>Flow nodes</strong></div>';
    
    refreshFlowNodes();
    
    if( flowNodes.nodes.length == 0 )
    {
        flowNodes.nodes.push( new FlowNode( { container: document.getElementById( 'page_flow-nodes' ).querySelector( '.div-canvas' ) } ) );
    }
}


class FlowNode
{
    constructor( options )
    {
        this.container = document.body;
        if( options.container )
        {
            this.container = options.container;
        }
        this.div = document.createElement( 'div' );
        this.div.className = 'FlowNode';
        this.div.innerHTML = '<div><div class="top"></div><div class="area"></div></div>';
        this.container.appendChild( this.div );
    }
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
