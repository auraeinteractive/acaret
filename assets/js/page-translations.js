// translation tools

window.toolbar = window.toolbar ? window.toolbar : {};
window.toolbar.translations = function() {
    let self = this;
    let tct = document.getElementById( 'top_chat_title' );
    let tcd = tct.getElementsByTagName( 'div' )[0];
    let tci = tct.getElementsByTagName( 'div' )[1];
    tcd.innerHTML = 'Translations: ' + ( window.currentProject.name ? window.currentProject.name : 'Unnamed project' );
    tcd.className = 'translations';
    tci.innerHTML = '<em class="language-add" title="Add language"></em><em class="language-key" title="Add keyword"></em>';
    
    let cont = document.getElementById( 'page_translations' );
    cont.innerHTML = '';
    
    // Check document translations
    if( currentEditor )
    {
        let val = currentEditor.getValue();
        
        // Normalize
        val = val.split( 'Tag' ).join( 'tag' );
        val = val.split( '// tag' ).join( '//tag' );
        
        let tagDiv = document.createElement( 'div' );
        tagDiv.className = 'translations';
        cont.appendChild( tagDiv );
    }
    
    document.querySelector( '.language-key' ).onclick = () => {        
        self.renderTranslations();
    };
    document.querySelector( '.language-add' ).onclick = () => {
        self.renderLanguages();
    };
    
    if( !window.currentProject.currentLanguage )
    {
        window.currentProject.currentLanguage = 'default'; // TODO: Pick this from an existing language in the project
    }
    
    this.renderLanguages = function()
    {
        let l = window.currentProject.languages;
        let str = '<table class="Grid"><tr><th>Language</th><th>Translations</th></tr>';
        for( let a in l )
        {
            let cnt = 0;
            for( let b in l[a] ) cnt++;
            str += '<tr><td>' + a + '</td><td>' + cnt + '</td></tr>';
        }
        str += '</table>';
        
        cont.innerHTML = str;
        
    }
    this.renderTranslations = function()
    {
        let l = window.currentProject.languages[ window.currentProject.currentLanguage ];
        let str = '<table class="Grid">';
        for( let a in l )
        {
            str += '<tr><td>' + a + '</td><td>' + l[a] + '</td></tr>';
        }
        str += '</table>';
        
        cont.innerHTML = str;
    }
    
    this.renderLanguages();
}

