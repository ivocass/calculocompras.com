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


var Utils = function(){
    
    this.isBrowser = function(name){

        return navigator.userAgent.indexOf(name) > -1;
    };

    this.assertEquals = function(name, currentVal, expectedVal){

        var isSuccessful = currentVal === expectedVal ? true : false;

        if(isSuccessful){
            console.log('assertEquals()', 'SUCCESS', name, currentVal);
        }
        else{
            console.log('assertEquals()', 'ERROR', name, 'current/expected:', currentVal, '/', expectedVal);
        }        

        if(!isSuccessful){
           console.log('ERROR ------------------------------------------');
           console.log('|            LAST TEST FAILED =(');
           console.log('ERROR ------------------------------------------');
        }
    };

    this.getSavedItem = function(name){

        log('Utils - getSavedItem()', name);

        var item = localStorage.getItem(name);

        // console.log('utils.getSavedItem() - name:', name, ' - item:', item);

        if(item !== null && item !== undefined && item !== 'undefined'){
            
            switch(true){
                
                case item === 'false':
                    return false;
                
                case item === 'true':
                    return true;
                
                case !isNaN(item):
                    return Number(item);

                case typeof item == 'string':
                    try {
                        var data = JSON.parse(item);

                        if(data != null){
                            return data;
                        }
                    }
                    catch(err) {
                        return item;
                    }
                break;

            }
        }

        return null;
    };

    
    this.loadText = function (url){

        return new Promise(function (resolve, reject) {

            var xhr = new XMLHttpRequest();

            if (xhr.overrideMimeType) {
                xhr.overrideMimeType('text/plain; charset=ISO-8859-1');
            }
            
            xhr.open('GET', url, true);

            xhr.onload = function () {
                if (this.status >= 200 && this.status < 300) {
                    resolve(xhr.response);
                } else {
                    reject({
                    status: this.status,
                    statusText: xhr.statusText
                    });
                }
            };

            xhr.onerror = function () {
                reject({
                    status: this.status,
                    statusText: xhr.statusText
                });
            };

            xhr.send();
        });
    }

    // returns an XML DOM document
    this.stringToXML = function(text){

        if(text){
            return new DOMParser().parseFromString(text, "text/xml");
        }

        return null;
    }

    // lum should represent a percentage (e.g. for 5%, provide 0.05. negative values to darken)
    this.changeColorLuminance = function(hex, lum) {

        // Validate hex string
        hex = String(hex).replace(/[^0-9a-f]/gi, "");
        if (hex.length < 6) {
        hex = hex.replace(/(.)/g, '$1$1');
        }
        lum = lum || 0;

        // Convert to decimal and change luminosity
        var rgb = "#",
        c;
        for (var i = 0; i < 3; ++i) {
            c = parseInt(hex.substr(i * 2, 2), 16);
            c = Math.round(Math.min(Math.max(0, c + (c * lum)), 255)).toString(16);
            rgb += ("00" + c).substr(c.length);
        }

        return rgb;
    }
}

export default new Utils();

