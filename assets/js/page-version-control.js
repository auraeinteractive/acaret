// Version control

window.toolbar = window.toolbar ? window.toolbar : {};
window.toolbar[ 'version-control' ] = function() {
    let topToolbar = document.getElementById( 'top_toolbar' );
    topToolbar.innerHTML = '<div><strong>Version control</strong></div>';
}
