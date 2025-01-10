// Sends signals with callbacks using our microserver
window.callbackIds = 0;
window.sendSignal = function( command, data = false, callback = false )
{
    let callbackId = window.callbackIds++;
    if( data )
    {
        if( typeof( data ) == 'object' )
            data = JSON.stringify( data );
        command += "\n" + base64EncodeUtf8( data );
    }
    window.callbacks[ callbackId ] = function( response = false )
    {
        if( callback ) callback( response ?? base64DecodeUtf8( response ) );
    }
    window.webkit.messageHandlers.receiveSignal.postMessage( callbackId + "\n" + command );
}
window.callbacks = {};
window.executeSignalCallback = function( callbackId, data = '' )
{
    // Execute and clean up
    if( window.callbacks[ callbackId ] )
    {
        data = base64DecodeUtf8( data );
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