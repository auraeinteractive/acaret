// Flow nodes

let iterator = 0;

let flowNodes = {
    nodes: [],
    z: 0
}

// Tag: A flow node connector class
class FlowNodeConnector
{
    constructor( options )
    {
        if( options && options.parent )
        {
            // Owner of relationship
            this.parent = options.parent;
            
            let d = document.createElement( 'div' );
            d.className = 'FlowNodeConnector';
            options.from.connectFrom.appendChild( d );
            this.connectorFrom = d;
            
            let t = document.createElement( 'div' );
            t.className = 'FlowNodeConnector';
            options.to.connectTo.appendChild( d );
            this.connectorTo = t;
        }
    }
}

// Tag: Flow node class
class FlowNode
{
    constructor( options )
    {
        this.container = flowNodes.container || document.body;
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
        this.div.innerHTML = `
            <div>
                <div class="connectors connectorTo"></div>
                <div class="top">${this.type}</div>
                <div class="area"></div>
                <div class="connectors connectorFrom"></div>
            </div>`;
        this.connectors = [];
         
        this.connectTo = this.div.querySelector( '.connectorTo' );
        this.connectFrom = this.div.querySelector( '.connectorFrom' );
        
        this.container.appendChild( this.div );
        
        this.div.onmousedown = ( e ) => { 
            this.ox = e.clientX - this.div.offsetLeft; 
            this.oy = e.clientY - this.div.offsetTop; 
            this.div.style.zIndex = ++flowNodes.z;
            flowNodes.currentObject = this; 
        };
    }
    // Tag: Connect node to another node
    connectTo( node )
    {
        let conn = new FlowNodeConnector( { from: this, to: node, parent: this } );
        this.connectors.push( conn );
    }
    // Tag: Drawing a node connector
    drawConnector( conn )
    {
        
    }
    refresh()
    {
        for( let a = 0; a < this.connectors.length; a++ )
        {
            this.drawConnector( this.connectors[ a ] );
        }
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
     
    // Skip flow nodes initialization for now - needs refactoring for Kin
    // The FlowNode class has issues with the container property
    /*
    if( flowNodes.nodes.length == 0 )
    {
        let source = new FlowNode( { type: 'input', name: 'Source' } );
        let destination = new FlowNode( { type: 'output', name: 'Destination' } );
        let middle = new FlowNode( { type: 'processor', name: 'Processor' } );
        
        console.log( middle );
        source.connectTo( middle );
        middle.connectTo( destination );
        
        flowNodes.nodes.push( source );
        flowNodes.nodes.push( destination );
        flowNodes.nodes.push( middle );
    }
    */
    refreshFlowNodes();
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
        flowNodes.nodes[a].refresh();
    }
}
