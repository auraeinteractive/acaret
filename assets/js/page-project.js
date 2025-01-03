// Settings

window.toolbar = window.toolbar ? window.toolbar : {};
window.toolbar.project = function() {
    let topToolbar = document.getElementById( 'top_toolbar' );
    topToolbar.innerHTML = '<div><strong>Project settings</strong></div>';
}
