// Flow nodes

let iterator = 0;

let flowNodes = {
    nodes: [],
    z: 0
}

// Tag: Flow node class
class FlowNode
{
    constructor( options )
    {
        this.container = document.body;
        if( options.container )
        {
            this.container = options.container;
        }
        let num = flowNodes.nodes.length + 1;
        this.id = generateUniqueHash();
        this.source = options.source;
        this.type = options.type;
        this.destination = options.destination;
        
        this.div = document.createElement( 'div' );
        this.div.id = 'id-' + this.id;
        this.div.className = 'FlowNode';
        this.div.innerHTML = '<div><div class="top">' + this.type + '</div><div class="area"></div></div>';
        
        flowNodes.container.appendChild( this.div );
        
        this.div.onmousedown = ( e ) => { 
            this.ox = e.clientX - this.div.offsetLeft; 
            this.oy = e.clientY - this.div.offsetTop; 
            this.div.style.zIndex = ++flowNodes.z;
            flowNodes.currentObject = this; 
        };
    }
}

// Tag: Function to generate a unique hash
function generateUniqueHash()
{
    const now_source = ( new Date() );
    const microsecs = Math.floor((now_source.getMilliseconds() * 1000 + (now_source.getUTCMilliseconds() % 1)) * 1000)
    const now = new Date().getTime() * 1000 + Math.floor( microsecs );
    const random = Math.random();
    
    // Convert components to strings and concatenate them
    const combinedString = `${now}${random}${iterator}`;
    
    // Convert the concatenated string to a hexadecimal hash
    let hash = '';
    for( let i = 0; i < combinedString.length; i++ )
    {
        hash += combinedString.charCodeAt( i ).toString( 16 );
    }
    iterator++;
    
    return hash;
}

window.toolbar = window.toolbar ? window.toolbar : {};
window.toolbar[ 'flow-nodes' ] = function() {
    // Just set the container
    flowNodes.container = document.getElementById( 'page_flow-nodes' ).querySelector( '.div-canvas' );
    
    let topToolbar = document.getElementById( 'top_toolbar' );
    topToolbar.innerHTML = '<div><strong>Flow nodes</strong></div>';
    
    // Tag: First nodes, remove this when we refactor
    if( flowNodes.nodes.length == 0 )
    {
        flowNodes.nodes.push( new FlowNode( { type: 'input', id: 'root' } ) );
        flowNodes.nodes.push( new FlowNode( { type: 'output', id: 'out' } ) );
        flowNodes.nodes.push( new FlowNode( { type: 'processor', source: 'root', destination: 'out' } ) );
    }
    refreshFlowNodes();
}

window.addEventListener( 'mousemove', function( e ) {
    if( flowNodes.currentObject )
    {
        let node = flowNodes.currentObject;
        
        let grid = 10;
        let x = ( e.clientX - node.ox );
        let y = ( e.clientY - node.oy );
        x = Math.floor( x / grid ) * grid;
        y = Math.floor( y / grid ) * grid;
        
        node.div.style.top = y + 'px';
        node.div.style.left =  x + 'px';
    }
} );
window.addEventListener( 'mouseup', function() {
    flowNodes.currentObject = false;
} );

function refreshFlowNodes()
{
    for( let a = 0; a < flowNodes.nodes.length; a++ )
    {
        
    }
}
