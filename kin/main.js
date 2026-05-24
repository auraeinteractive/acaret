(function() {
    function qp(name) {
        try { return new URLSearchParams(location.search).get(name) || ''; }
        catch (_e) { return ''; }
    }
    function run() {
        if (!window.kin || !kin.classes || !kin.classes.Window) {
            console.error('kin_acaret: kin app API unavailable');
            return;
        }
        var pkg = qp('kin_repo_package') || 'kin_acaret';
        var q = {};
        var openPath = qp('kin_open_path') || qp('path');
        if (openPath) q.kin_open_path = openPath;
        new kin.classes.Window({
            entry: 'index.html',
            packageId: pkg,
            title: 'Acaret — Code Editor',
            width: 1024,
            height: 768,
            quitOnClose: true,
            module: true,
            query: q,
            assets: [
                { type: 'css', href: '../kin_ui/theme/kin-ui.css' }
            ]
        });
    }
    run();
})();
