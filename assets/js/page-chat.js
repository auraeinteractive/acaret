window.toolbar = window.toolbar ? window.toolbar : {};
window.toolbar.chat = function() {
    let tct = document.getElementById( 'top_chat_title' );
    let tcd = tct.getElementsByTagName( 'div' )[0];
    let tci = tct.getElementsByTagName( 'div' )[1];
    tcd.innerHTML = 'Global chat';
    tcd.className = 'chat';
    tci.innerHTML = '<em class="chat-reset" title="Reset chat"></em><em class="chat-save" title="Save chat"></em><em class="chat-more" title="Options"></em>';
    
}
