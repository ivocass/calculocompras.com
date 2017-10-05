 /*
MIT License

Copyright (c) 2017 Ivo Cass

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/

import app from './app';
import utils from './utils';

export default function TermsMgr(){
    
    log('TermsMgr()');

    function init(){

        utils.loadText('assets/terms.txt').then((txt) => {

            log('TermsMgr() - txt loaded', txt.length);

            app.data.termsAndConditions = txt;
        });

        var hasAcceptedTerms = utils.getSavedItem('hasAcceptedTerms');

        log('TermsMgr() - hasAcceptedTerms:', hasAcceptedTerms);

        if(hasAcceptedTerms){
            app.data.hasAcceptedTerms = true;
        }
    }

    this.onTermsCheckboxClicked = function(){

        if($('#termsCheckbox').prop('checked')){

            $('#btnWelcomeContinue').removeClass('disabled');
        }
        else{
            $('#btnWelcomeContinue').addClass('disabled');
        }
    };

    this.onWelcomeContinueClicked = function(){

        if($('#termsCheckbox').prop('checked')){

            $('#welcome').addClass('d-none');

            app.data.hasAcceptedTerms = true;

            localStorage.setItem('hasAcceptedTerms', true);
        }
        else{
            // alert('');
        }
    };
    
    init();
}
