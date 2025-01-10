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

window.addEventListener( 'mousemove', function( e ) {
    if( flowNodes.currentObject )
    {
        let node = flowNodes.currentObject;
        node.style.top = ( e.clientY - node.oy ) + 'px';
        node.style.left = ( e.clientX - node.ox ) + 'px';
    }
} );
window.addEventListener( 'mouseup', function() {
    flowNodes.currentObject = false;
} );

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
        this.div.innerHTML = '<div><div class="top">Unnamed node</div><div class="area"></div></div>';
        this.container.appendChild( this.div );
        this.div.onmousedown = ( e ) => { 
            this.div.ox = e.clientX - this.div.offsetLeft; 
            this.div.oy = e.clientY - this.div.offsetTop; 
            flowNodes.currentObject = this.div; 
        };
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
