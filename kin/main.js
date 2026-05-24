(function() {
    function qp(name) {
        try { return new URLSearchParams(location.search).get(name) || ''; }
        catch (_e) { return ''; }
    }

    function loadBootstrapEntry() {
        var pkg = qp('kin_repo_package') || 'kin_acaret';
        var s = document.createElement('script');
        s.src = '/repository/' + encodeURIComponent(pkg) + '/app-content.js';
        s.charset = 'utf-8';
        document.head.appendChild(s);
    }

    function run() {
        if (!window.kin || !kin.classes || !kin.classes.Window) {
            console.warn('kin_acaret: kin.classes.Window unavailable, loading app inline');
            loadBootstrapEntry();
            return;
        }

        var pkg = qp('kin_repo_package') || 'kin_acaret';
        var query = {};
        var openPath = qp('kin_open_path') || qp('path');
        if (openPath) {
            query.kin_open_path = openPath;
        }

        new kin.classes.Window({
            entry: 'app-content.js',
            packageId: pkg,
            title: 'Acaret — Code Editor',
            width: 1280,
            height: 800,
            quitOnClose: true,
            query: query,
            assets: [
                { type: 'css', href: 'styles/main.css' },
                { type: 'css', href: 'styles/page-flow-nodes.css' },
                { type: 'css', href: '../kin_ui/theme/kin-ui.css' }
            ]
        });
    }

    run();
})();
