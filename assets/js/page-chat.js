window.toolbar = window.toolbar ? window.toolbar : {};
window.toolbar.chat = function() {
    document.getElementById( 'top_chat_title' ).getElementsByTagName( 'div' )[0].innerHTML = 'Global chat';
    document.getElementById( 'top_chat_title' ).getElementsByTagName( 'div' )[0].className = 'chat';
}
