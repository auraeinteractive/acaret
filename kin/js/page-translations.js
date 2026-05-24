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
        for( let a in window.currentProject.languages )
        {
            window.currentProject.currentLanguage = a;
            break;
        }
    }
    if( !window.currentProject.currentNamespace )
    {
        for( let a in window.currentProject.languageKeys )
        {
            window.currentProject.currentNamespace = a;
            break;
        }
    }
    
    this.renderLanguages = function()
    {
        let l = window.currentProject.languages;
        let str = `<div class="GridTableHeader">
            <table>
                <tr>
                    <th>Language</th>
                    <th>Translations</th>
                    <th>#</th>
                </tr>
            </table>
        </div>
        <div class="GridTableRows">
            <table class="Grid">`;
        
        for( let a in l )
        {
            let cnt = 0;
            for( let b in l[a] ) cnt++;
            let cr = window.currentProject.currentLanguage == a ? 'current' : '&nbsp;';
            str += '<tr><td class="prop" index="' + a + '">' + a + '</td><td>' + cnt + '</td><td class="set">' + cr + '</td></tr>';
        }
        str += `
            </table>
        </div>
        <div class="GridTableBottomBar">
            <button type="button" class="tbutton add-language">
                Add language
            </button>
        </div>`;
        
        cont.innerHTML = str;
        
        let sets = cont.getElementsByClassName( 'set' );
        for( let a = 0; a < sets.length; a++ )
        {
            sets[a].onclick = ( e ) => {
                let ind = sets[a].parentNode.firstChild.getAttribute( 'index' );
                if( !ind ) return;
                window.currentProject.currentLanguage = ind;
                self.renderLanguages();
            }
        }
        
        let tds = cont.getElementsByClassName( 'prop' );
        for( let a = 0; a < tds.length; a++ )
        {
            tds[a].onclick = ( e ) => {
                let el = e.target;
                if( !el || el.tagName != 'TD' ) return;
                let data = el.textContent;
                el.innerHTML = '<input type="text" class="editTd"/>';
                let inp = el.querySelector( '.editTd' );
                inp.value = data;
                inp.focus();
                inp.onblur = () => { el.innerHTML = data; }
                inp.onchange = () => { 
                    // First check if the language does not already exist
                    for( let b in window.currentProject.languages )
                    {
                        // Abort, we already have the name
                        if( b == inp.value )
                        {
                            self.renderLanguages();
                            return;
                        }
                    }
                                        
                    // Rename language
                    let out = {};
                    for( let b in window.currentProject.languages )
                    {
                        if( b == data )
                        {
                            out[ inp.value ] = window.currentProject.languages[ b ];
                        }
                        else
                        {
                            out[ b ] = window.currentProject.languages[ b ];
                        }
                    }
                    window.currentProject.languages = out;
                    self.renderLanguages();
                }
            }
        }
        
        
        let btn = cont.querySelector( '.add-language' ).onclick = () => {
            let okey = 'new language';
            let key = okey;
            let counter = 1;
            while( window.currentProject.languages[ key ] )
                key = okey + ' ' + counter++;
            window.currentProject.languages[ key ] = {};
            self.renderLanguages();
        }
        
    }
    this.renderTranslations = function()
    {
        // Language keywords
        let l = window.currentProject.languages[ window.currentProject.currentLanguage ];
        // Namespace keywords (transcends language)
        let ll = window.currentProject.languageKeys[ window.currentProject.currentNamespace ];
        let keywords = null;
        
        let str = `<div class="GridTableHeader">
            <table>
                <tr>
                    <th>Keyword</th>
                    <th>Translation</th>
                </tr>
            </table>
        </div>
        <div class="GridTableRows">
            <table class="Grid">`;
        for( let a in ll )
        {
            let val = l[window.currentProject.currentNamespace + '.' + a] ?? '';
            str += '<tr><td>' + a + '</td><td>' + val + '</td></tr>';
        }
        
        let namespaces = '';
        for( let c in window.currentProject.languageKeys )
        {
            let sel = '';
            if( c == window.currentProject.currentNamespace )
                sel = ' selected="selected"';
            namespaces += '<option' + sel + ' value="' + c + '">' + c + '</option>';
        }
        
        str += `
            </table>
        </div>
        <div class="GridTableBottomBar">
            <tr>
                <td>
                    <button type="button" class="tbutton add-keyword">
                        Add keyword
                    </button>
                </td>
                <td>
                    <select class="namespace">
                        ${namespaces}
                    </select>
                </td>
            </tr>
        </div>`;
        
        cont.innerHTML = str;
        
        let namSelect = cont.querySelector( '.namespace' );
        namSelect.onchange = ( e ) => {
            let opts = namSelect.options;
            for( let b in opts )
            {
                if( opts[ b ].selected )
                    window.currentProject.currentNamespace = opts[ b ].value;
            }
            self.renderTranslations();
        }
        
        
        let activeKeyword = false;
        
        let btn = cont.querySelector( '.add-keyword' ).onclick = () => {
            if( activeKeyword ) return;
            activeKeyword = true;
            let tr = document.createElement( 'tr' );
            tr.innerHTML = `<td><input type="text" class="new_key"/></td><td><input type="text" class="new_value"/></td>`;
            cont.querySelector( '.Grid' ).appendChild( tr );
            let k = tr.querySelector( '.new_key' );
            k.focus();
            let keyData = '';
            k.onchange = () => {
                keyData = k.value.trim().split( ' ' ).join( '_' );
                k.parentNode.innerHTML = keyData;
            }
            // Abort
            k.onblur = () => {
                if( !keyData )
                {
                    tr.parentNode.removeChild( tr );
                    activeKeyword = false;
                }
            }
            let valueData = '';
            let v = tr.querySelector( '.new_value' );
            v.onchange = () => {
                valueData = v.value.trim();
                l[ window.currentProject.currentNamespace + '.' + keyData ] = valueData;
                if( !window.currentProject.languageKeys[ window.currentProject.currentNamespace ][ keyData ] )
                    window.currentProject.languageKeys[ window.currentProject.currentNamespace ][ keyData ] = {};
                activeKeyword = false;
                self.renderTranslations();
            }
        }
    }
    
    this.renderLanguages();
}

