// Sends signals with callbacks using our microserver
window.callbackIds = 0;
window.sendSignal = function( signal, callback )
{
    let callbackId = window.callbackIds++;
    window.callbacks[ callbackId ] = function( data )
    {
        if( callback ) callback( base64DecodeUtf8( data ) );
    }
    window.webkit.messageHandlers.receiveSignal.postMessage( callbackId + "\n" + signal );
}
window.callbacks = {};
window.executeSignalCallback = function( callbackId, data = '' )
{
    // Execute and clean up
    if( window.callbacks[ callbackId ] )
    {
        window.callbacks[ callbackId ]( data );
        let o = {};
        for( let a in window.callbacks )
        {
            if( a != callbackId )
            {
                out[ a ] = window.callbacks[ a ];
            }
        }
        window.callbacks = o;
    }
}
window.addEventListener( 'message', function( data )
{
    console.log( '[signal] Got message: ', data );
} );