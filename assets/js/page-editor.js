// Editor

window.toolbar = window.toolbar ? window.toolbar : {};
window.toolbar.editor = function() {
    document.getElementById( 'top_toolbar' ).innerHTML = '<div class="TopTabs"><div class="TopTab">unnamed.html</div></div><div class="TopTabOption"><button class="taboption add">New file</button></div>';
};
