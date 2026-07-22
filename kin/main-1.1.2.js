( function() {
    function qp( name ) {
        try { return new URLSearchParams( location.search ).get( name ) || ''; }
        catch( _error ) { return ''; }
    }

    if( !window.kin || !kin.classes || !kin.classes.Window ) {
        console.error( 'kin_acaret: Kin window API unavailable' );
        return;
    }

    const openPath = qp( 'kin_open_path' ) || qp( 'path' );
    new kin.classes.Window( {
        entry: 'app-1.1.2.mjs',
        packageId: qp( 'kin_repo_package' ) || 'kin_acaret',
        title: 'Acaret — Code Editor',
        width: 1360,
        height: 860,
        quitOnClose: true,
        module: true,
        assets: [
            { type: 'css', href: '../kin_ui/theme/kin-ui.css' },
            { type: 'css', href: 'styles/main.css' }
        ],
        query: openPath ? { kin_open_path: openPath } : {}
    } );
} )();
