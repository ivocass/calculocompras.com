(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
(function (root) {

  // Store setTimeout reference so promise-polyfill will be unaffected by
  // other code modifying setTimeout (like sinon.useFakeTimers())
  var setTimeoutFunc = setTimeout;

  function noop() {}
  
  // Polyfill for Function.prototype.bind
  function bind(fn, thisArg) {
    return function () {
      fn.apply(thisArg, arguments);
    };
  }

  function Promise(fn) {
    if (typeof this !== 'object') throw new TypeError('Promises must be constructed via new');
    if (typeof fn !== 'function') throw new TypeError('not a function');
    this._state = 0;
    this._handled = false;
    this._value = undefined;
    this._deferreds = [];

    doResolve(fn, this);
  }

  function handle(self, deferred) {
    while (self._state === 3) {
      self = self._value;
    }
    if (self._state === 0) {
      self._deferreds.push(deferred);
      return;
    }
    self._handled = true;
    Promise._immediateFn(function () {
      var cb = self._state === 1 ? deferred.onFulfilled : deferred.onRejected;
      if (cb === null) {
        (self._state === 1 ? resolve : reject)(deferred.promise, self._value);
        return;
      }
      var ret;
      try {
        ret = cb(self._value);
      } catch (e) {
        reject(deferred.promise, e);
        return;
      }
      resolve(deferred.promise, ret);
    });
  }

  function resolve(self, newValue) {
    try {
      // Promise Resolution Procedure: https://github.com/promises-aplus/promises-spec#the-promise-resolution-procedure
      if (newValue === self) throw new TypeError('A promise cannot be resolved with itself.');
      if (newValue && (typeof newValue === 'object' || typeof newValue === 'function')) {
        var then = newValue.then;
        if (newValue instanceof Promise) {
          self._state = 3;
          self._value = newValue;
          finale(self);
          return;
        } else if (typeof then === 'function') {
          doResolve(bind(then, newValue), self);
          return;
        }
      }
      self._state = 1;
      self._value = newValue;
      finale(self);
    } catch (e) {
      reject(self, e);
    }
  }

  function reject(self, newValue) {
    self._state = 2;
    self._value = newValue;
    finale(self);
  }

  function finale(self) {
    if (self._state === 2 && self._deferreds.length === 0) {
      Promise._immediateFn(function() {
        if (!self._handled) {
          Promise._unhandledRejectionFn(self._value);
        }
      });
    }

    for (var i = 0, len = self._deferreds.length; i < len; i++) {
      handle(self, self._deferreds[i]);
    }
    self._deferreds = null;
  }

  function Handler(onFulfilled, onRejected, promise) {
    this.onFulfilled = typeof onFulfilled === 'function' ? onFulfilled : null;
    this.onRejected = typeof onRejected === 'function' ? onRejected : null;
    this.promise = promise;
  }

  /**
   * Take a potentially misbehaving resolver function and make sure
   * onFulfilled and onRejected are only called once.
   *
   * Makes no guarantees about asynchrony.
   */
  function doResolve(fn, self) {
    var done = false;
    try {
      fn(function (value) {
        if (done) return;
        done = true;
        resolve(self, value);
      }, function (reason) {
        if (done) return;
        done = true;
        reject(self, reason);
      });
    } catch (ex) {
      if (done) return;
      done = true;
      reject(self, ex);
    }
  }

  Promise.prototype['catch'] = function (onRejected) {
    return this.then(null, onRejected);
  };

  Promise.prototype.then = function (onFulfilled, onRejected) {
    var prom = new (this.constructor)(noop);

    handle(this, new Handler(onFulfilled, onRejected, prom));
    return prom;
  };

  Promise.all = function (arr) {
    var args = Array.prototype.slice.call(arr);

    return new Promise(function (resolve, reject) {
      if (args.length === 0) return resolve([]);
      var remaining = args.length;

      function res(i, val) {
        try {
          if (val && (typeof val === 'object' || typeof val === 'function')) {
            var then = val.then;
            if (typeof then === 'function') {
              then.call(val, function (val) {
                res(i, val);
              }, reject);
              return;
            }
          }
          args[i] = val;
          if (--remaining === 0) {
            resolve(args);
          }
        } catch (ex) {
          reject(ex);
        }
      }

      for (var i = 0; i < args.length; i++) {
        res(i, args[i]);
      }
    });
  };

  Promise.resolve = function (value) {
    if (value && typeof value === 'object' && value.constructor === Promise) {
      return value;
    }

    return new Promise(function (resolve) {
      resolve(value);
    });
  };

  Promise.reject = function (value) {
    return new Promise(function (resolve, reject) {
      reject(value);
    });
  };

  Promise.race = function (values) {
    return new Promise(function (resolve, reject) {
      for (var i = 0, len = values.length; i < len; i++) {
        values[i].then(resolve, reject);
      }
    });
  };

  // Use polyfill for setImmediate for performance gains
  Promise._immediateFn = (typeof setImmediate === 'function' && function (fn) { setImmediate(fn); }) ||
    function (fn) {
      setTimeoutFunc(fn, 0);
    };

  Promise._unhandledRejectionFn = function _unhandledRejectionFn(err) {
    if (typeof console !== 'undefined' && console) {
      console.warn('Possible Unhandled Promise Rejection:', err); // eslint-disable-line no-console
    }
  };

  /**
   * Set the immediate function to execute callbacks
   * @param fn {function} Function to execute
   * @deprecated
   */
  Promise._setImmediateFn = function _setImmediateFn(fn) {
    Promise._immediateFn = fn;
  };

  /**
   * Change the function to execute on unhandled rejection
   * @param {function} fn Function to execute on unhandled rejection
   * @deprecated
   */
  Promise._setUnhandledRejectionFn = function _setUnhandledRejectionFn(fn) {
    Promise._unhandledRejectionFn = fn;
  };
  
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = Promise;
  } else if (!root.Promise) {
    root.Promise = Promise;
  }

})(this);

},{}],2:[function(require,module,exports){
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

"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _promisePolyfill = require('promise-polyfill');

var _promisePolyfill2 = _interopRequireDefault(_promisePolyfill);

var _app = require('./app');

var _app2 = _interopRequireDefault(_app);

var _logger = require('./logger');

var _logger2 = _interopRequireDefault(_logger);

var _signal = require('./signal');

var _signal2 = _interopRequireDefault(_signal);

var _termsMgr = require('./termsMgr');

var _termsMgr2 = _interopRequireDefault(_termsMgr);

var _calculator = require('./calculator');

var _calculator2 = _interopRequireDefault(_calculator);

var _settings = require('./settings');

var _settings2 = _interopRequireDefault(_settings);

var _currency = require('./currency/currency');

var _currency2 = _interopRequireDefault(_currency);

var _currencyManager = require('./currency/currencyManager');

var _currencyManager2 = _interopRequireDefault(_currencyManager);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

// import quoteGenerator from './quoteGenerator';
Vue.config.devtools = false;

// ie polyfill
if (!window.Promise) {
    window.Promise = _promisePolyfill2.default;
}

// ie polyfill
Number.isInteger = Number.isInteger || function (value) {
    return typeof value === "number" && isFinite(value) && Math.floor(value) === value;
};

var App = function App() {

    log('App()');

    this.config = new Config();
    this.data;

    var hasInitialized = false;
    var termsMgr;
    var currencyManager;
    var settings;
    var calc;

    this.currencyUpdated = new _signal2.default();
    this.currencySelected = new _signal2.default();
    this.currencySliderToggled = new _signal2.default();
    this.currencyModified = new _signal2.default();
    this.settingsChanged = new _signal2.default();
    this.saveSettingRequested = new _signal2.default();

    this.init = function () {

        log('App - init()');

        if (hasInitialized) return;
        hasInitialized = true;

        _logger2.default.setMaxEntries(this.config.loggerMaxEntries);

        this.data = new Vue({
            el: '#app',
            data: {
                termsAndConditions: "cargando..",
                hasAcceptedTerms: false,
                alternativeDesignEnabled: false,
                alternateDetailsEnabled: false,
                mainColor: '#10c77b',
                currency: new _currency2.default('USD'), // dummy currency for Vue, until the current one is set
                currencyUSD: new _currency2.default('USD'),
                currencyEUR: new _currency2.default('EUR'),
                currencyGBP: new _currency2.default('GBP'),
                currencyARS: new _currency2.default('ARS'),
                currencies: [],
                selectOptionUSD: 'USD (Dólar) - $...',
                selectOptionEUR: 'EUR (Euro) - $...',
                selectOptionGBP: 'GBP (Libra) - $...',
                selectOptionARS: 'ARS (Peso)',
                valCompra: _app2.default.config.defaultPurchase,
                valCurrencyConversion: 0,
                valCurrencyConversionText: '$0',
                valAfip: 0,
                valCorreo: _app2.default.config.gestionCorreo,
                valFranquicia: 0,
                valTotal: 0,
                showCompraPesos: true,
                showAfip: true,
                showCorreo: true,
                showFranquicia: true,
                showInfoIcons: true,
                showCheckboxes: true,
                infoModalTitle: '',
                valCompraMax: _app2.default.config.valCompraMax,
                isCompraOutOfRange: false,
                showingSettings: false,
                version: _app2.default.config.version
            },
            methods: {

                // settings
                setMainColor: function setMainColor(color) {
                    settings.setMainColor(color);
                },
                onCurrencyModified: function onCurrencyModified(event, id) {
                    settings.onCurrencyModified(event, id);
                },
                toggleDesign: function toggleDesign() {
                    settings.toggleDesign();
                },
                toggleCustomCurrency: function toggleCustomCurrency(id) {
                    settings.toggleCustomCurrency(id);
                },
                toggleInfoIcons: function toggleInfoIcons() {
                    settings.toggleInfoIcons();
                },
                toggleCheckboxes: function toggleCheckboxes() {
                    settings.toggleCheckboxes();
                },

                // termsMgr
                onTermsCheckboxClicked: function onTermsCheckboxClicked() {
                    termsMgr.onTermsCheckboxClicked();
                },
                onWelcomeContinueClicked: function onWelcomeContinueClicked() {
                    termsMgr.onWelcomeContinueClicked();
                },

                // app
                openSettings: function openSettings(color) {
                    _app2.default.data.showingSettings = true;
                },
                closeSettings: function closeSettings(color) {
                    _app2.default.data.showingSettings = false;
                },
                showDetailsSection: function showDetailsSection() {
                    _app2.default.data.alternateDetailsEnabled = true;
                },
                hideDetailsSection: function hideDetailsSection() {
                    _app2.default.data.alternateDetailsEnabled = false;
                },
                onFacebookClicked: function onFacebookClicked() {
                    _app2.default.onFacebookClicked();
                },
                onExtensionClicked: function onExtensionClicked(name) {
                    _app2.default.onExtensionClicked(name);
                },

                // currencyManager
                onCurrencySelected: function onCurrencySelected(e) {
                    currencyManager.onCurrencySelected(e);
                },
                updateCurrency: function updateCurrency(id) {
                    currencyManager.updateCurrency(id);
                },

                // calc
                onLabelClicked: function onLabelClicked(name) {
                    calc.onLabelClicked(name);
                },
                showInfoModal: function showInfoModal(id) {
                    calc.showInfoModal(id);
                }
            }
        });

        if (!this.config.loggerEnabled) {
            _logger2.default.disable();
        }

        termsMgr = new _termsMgr2.default();
        currencyManager = new _currencyManager2.default();
        settings = new _settings2.default();
        calc = new _calculator2.default();
    };

    this.onFacebookClicked = function () {
        ga('send', {
            hitType: 'event',
            eventCategory: 'Facebook',
            eventAction: 'Clicked'
        });

        window.open('https://www.facebook.com/CalculoCompras', '_blank');
    };

    this.onExtensionClicked = function (browserName) {
        ga('send', {
            hitType: 'event',
            eventCategory: 'Extension',
            eventAction: 'Clicked',
            eventLabel: browserName
        });
    };
};

exports.default = new App();

// $(document).ready(app.init);

_app2.default.init();

},{"./app":2,"./calculator":3,"./currency/currency":4,"./currency/currencyManager":5,"./logger":7,"./settings":8,"./signal":9,"./termsMgr":10,"promise-polyfill":1}],3:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
        value: true
});
exports.default = Calculator;

var _app = require('./app');

var _app2 = _interopRequireDefault(_app);

var _utils = require('./utils');

var _utils2 = _interopRequireDefault(_utils);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

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

function Calculator() {

        log('Calculator()');

        // todo: user better names to identify html elements
        var priceCompraInput;
        var currencyConversionText;
        var priceAfip;
        var priceCorreo;
        var priceFranquicia;
        var valTotalSpan;
        var data = null;
        var prevInput = '';

        function init() {

                log('Calculator - init()');

                data = _app2.default.data;

                priceCompraInput = $('#price-compra-input').get(0);
                currencyConversionText = $('#currency-conversion-text').get(0);
                priceAfip = $('#price-afip').get(0);
                priceCorreo = $('#price-correo').get(0);
                priceFranquicia = $('#price-franquicia').get(0);
                valTotalSpan = $('#val-total').get(0);
                prevInput = data.valCompra;

                document.body.addEventListener('wheel', mouseWheelListener);
                priceCompraInput.addEventListener('keyup', onPriceCompraInputChanged);

                _app2.default.currencyUpdated.add(onCurrencyUpdated);
                _app2.default.settingsChanged.add(updateTotal);

                updatePrice(priceCompraInput, data.valCompra);

                processNewCompraVal();

                updateTotal();

                if (_app2.default.config.runTests) {
                        runTests();
                }

                _app2.default.currencySelected.add(processNewCompraVal);
        }

        init();

        this.showInfoModal = function (id) {

                $('.info-modal-content').addClass('d-none');

                data.infoModalTitle = $(id).data('title');

                $(id).removeClass('d-none');
        };

        function onCurrencyUpdated() {

                log('Calculator() - onCurrencyUpdated()');

                processNewCompraVal();
        }

        function onPriceCompraInputChanged(e) {

                // firefox allows other characters in input even with type="number"
                // this code helps (but first needs to be tested in mac and mobile)
                // var key = e.keyCode;
                // const KEY_BACKSPACE = 8;
                // const KEY_DEL = 46;
                // const KEY_PERIOD = 190;
                // const KEY_NUMPAD_PERIOD = 110;        
                // const KEY_HOME = 36;
                // const KEY_END = 35;

                // // numbers, numpad numbers, arrows
                // var allowedKeys = [48, 49, 50, 51, 52, 53, 54, 55, 56, 57, KEY_BACKSPACE, KEY_DEL, 97, 98, 99, 100, 101, 102, 103, 104, 105, 106, KEY_PERIOD, KEY_NUMPAD_PERIOD, 37, 38, 39, 40, KEY_HOME, KEY_END];

                // if (allowedKeys.indexOf(key) == -1)
                // {
                //     priceCompraInput.value = prevInput;

                //     return;
                // }

                // prevInput = priceCompraInput.value;

                processNewCompraVal();
        }

        function processNewCompraVal() {

                log('Calculator() - processNewCompraVal()', priceCompraInput.value);

                if (Number(priceCompraInput.value) < 0) {
                        priceCompraInput.value = 0;
                }

                data.valCompra = Number(priceCompraInput.value);

                data.isCompraOutOfRange = getIsCompraOutOfRange();

                updateTotal();
        }

        function mouseWheelListener(e) {

                if (data.showingSettings) {
                        return;
                }

                var val = Number(priceCompraInput.value);

                var step = 1;

                if (e.shiftKey) {
                        step = 10;
                } else if (e.altKey) {
                        step = 0.1;
                }

                if (e.deltaY < 0) {
                        val += step;
                } else {
                        val -= step;
                }

                if (val < 0) {
                        val = 0;
                }

                val = formatPrice(val);

                priceCompraInput.value = val;

                processNewCompraVal();
        }

        this.onLabelClicked = function (name) {

                log('Calculator - onLabelClicked', name);

                switch (name) {

                        case 'afip':
                                data.showAfip = !data.showAfip;
                                break;

                        case 'correo':
                                data.showCorreo = !data.showCorreo;
                                break;

                        case 'franquicia':
                                data.showFranquicia = !data.showFranquicia;

                                _app2.default.saveSettingRequested.dispatch({ name: 'showFranquicia', value: data.showFranquicia });
                                break;
                }

                updateTotal();
        };

        // todo: stop using english and spanish for f#$k's sake...
        function getIsCompraOutOfRange() {

                // get valCompra in USD
                var valCompraUSD = data.valCompra;

                // if we are not using USD
                if (data.currency != data.currencyUSD) {

                        var valCompraARS = data.valCompra;

                        // if we are not using ARS
                        if (data.currency != data.currencyARS) {

                                // convert to ARS
                                valCompraARS = data.valCompra * data.currency.getCurrentVal();
                        }

                        // then convert to USD
                        valCompraUSD = valCompraARS / data.currencyUSD.getCurrentVal();
                }

                if (valCompraUSD > data.valCompraMax) {

                        log('Calculator - getIsCompraOutOfRange()', data.valCompra, valCompraUSD, true);
                        return true;
                }

                log('Calculator - getIsCompraOutOfRange()', data.valCompra, valCompraUSD, false);

                return false;
        }

        function updatePrice(priceLabel, value) {

                // console.log('Calculator - updatePrice()', priceLabel, value);

                value = formatPrice(value);

                if (priceLabel.tagName == 'INPUT') {
                        priceLabel.value = value;
                } else {
                        priceLabel.innerHTML = value;
                }
        }

        function formatPrice(val) {

                val = parseFloat(val).toFixed(2);

                if (Number.isInteger(Number(val))) {

                        return parseFloat(val).toFixed(0);
                }

                return val;
        }

        function updateTotal() {

                var currencyModifier = data.currency.getCurrentVal();

                var valPurchase = data.valCompra * currencyModifier;

                var valAfip = data.showAfip ? valPurchase * 0.5 : 0;
                var valCorreo = data.showCorreo ? _app2.default.config.gestionCorreo : 0;
                var valFranquicia = data.showFranquicia ? -25 * data.currencyUSD.getCurrentVal() : 0;

                var valAfipTemp = valAfip;

                if (data.showAfip && data.showFranquicia) {

                        // if afip is 10 usd, franchise will be -10
                        if (valFranquicia * -1 > valAfipTemp) {
                                valFranquicia = -valAfipTemp;
                        }

                        valAfipTemp += valFranquicia;

                        if (valAfipTemp < 0) {
                                valAfipTemp = 0;
                        }
                }

                var valTotal = valPurchase + valAfipTemp + valCorreo;

                // console.log('data.valTotal', data.valTotal, data.valPesos, data.valAfip, data.valCorreo);


                if (data.currency.getId() == 'ARS') {

                        // currencyConversionText will show peso to dollar

                        data.valCurrencyConversion = data.valCompra / data.currencyUSD.getCurrentVal();

                        data.valCurrencyConversionText = 'U$S{1}';
                } else {

                        // currencyConversionText will show peso from other currencies

                        data.valCurrencyConversion = valPurchase;

                        data.valCurrencyConversionText = '${1}';
                }

                data.valCurrencyConversion = formatPrice(data.valCurrencyConversion);
                data.valCurrencyConversionText = data.valCurrencyConversionText.replace('{1}', data.valCurrencyConversion);

                data.valAfip = formatPrice(valAfip);
                data.valCorreo = formatPrice(valCorreo);
                data.valFranquicia = formatPrice(valFranquicia);
                data.valTotal = formatPrice(valTotal);

                if (data.valCompra == 0) {
                        data.valTotal = '?';
                }

                log('Calculator - updateTotal() -', data.currency.getCurrentVal(), valPurchase, valAfipTemp, valCorreo, valTotal);
        }

        function runTests() {

                console.log('<<<<<<<<<<<<<<<<< Calculator - runTests() - STARTED >>>>>>>>>>>>>>>>');

                console.log('--------- TEST 1 ---------');

                data.valCompra = 123.45;
                data.currencyUSD.setCurrentVal(18.12);
                data.gestionCorreo = 120;
                data.valFranquicia = -25 * data.valDolar;

                data.showAfip = true;
                data.showCorreo = true;
                data.showFranquicia = true;

                updateTotal();

                // force render
                _app2.default.data.$mount();

                _utils2.default.assertEquals('currencyConversionText.innerHTML', currencyConversionText.innerHTML, "$2236.91");
                _utils2.default.assertEquals('priceAfip.innerHTML', priceAfip.innerHTML, "$1118.46");
                _utils2.default.assertEquals('priceCorreo.innerHTML', priceCorreo.innerHTML, "$120");
                _utils2.default.assertEquals('priceFranquicia.innerHTML', priceFranquicia.innerHTML, "$-453");
                _utils2.default.assertEquals('valTotalSpan.innerHTML', valTotalSpan.innerHTML, "3022.37");

                // get the total independently
                var valPesos = data.valCompra * data.currencyUSD.getCurrentVal();
                var valAfip = valPesos * 0.5;
                var valCorreo = 120;
                var valFranquicia = -25 * data.currencyUSD.getCurrentVal();

                var valAfipTemp = valAfip + valFranquicia;

                if (valAfipTemp < 0) {
                        valAfipTemp = 0;
                }

                var valTotal = valPesos + valAfipTemp + valCorreo;

                _utils2.default.assertEquals('valPesos', valPesos, 2236.914);
                _utils2.default.assertEquals('valAfip', valAfip, 1118.457);
                _utils2.default.assertEquals('valFranquicia', valFranquicia, -453);
                _utils2.default.assertEquals('valAfipTemp', valAfipTemp, 665.4570000000001);
                _utils2.default.assertEquals('valTotal', valTotal, 3022.371);

                _utils2.default.assertEquals('data.valAfip', data.valAfip, formatPrice(valAfip));
                _utils2.default.assertEquals('data.valFranquicia', data.valFranquicia, formatPrice(valFranquicia));
                _utils2.default.assertEquals('data.valTotal', data.valTotal, formatPrice(valTotal));

                console.log('--------- TEST 2 ---------');

                data.valCompra = 42.42;
                data.currency = data.currencyEUR;
                data.currencyEUR.setCurrentVal(22.54);
                data.gestionCorreo = 120;
                data.valFranquicia = 0;

                data.showAfip = true;
                data.showCorreo = true;
                data.showFranquicia = false;

                updateTotal();

                // force render
                _app2.default.data.$mount();

                _utils2.default.assertEquals('currencyConversionText.innerHTML', currencyConversionText.innerHTML, "$956.15");
                _utils2.default.assertEquals('priceAfip.innerHTML', priceAfip.innerHTML, "$478.07");
                _utils2.default.assertEquals('priceCorreo.innerHTML', priceCorreo.innerHTML, "$120");
                _utils2.default.assertEquals('priceFranquicia.innerHTML', priceFranquicia.innerHTML, "$0");
                _utils2.default.assertEquals('valTotalSpan.innerHTML', valTotalSpan.innerHTML, "1554.22");

                // get the total independently
                valPesos = data.valCompra * data.currency.getCurrentVal();
                valAfip = valPesos * 0.5;
                valCorreo = 120;
                valFranquicia = 0;

                valAfipTemp = valAfip + valFranquicia;

                if (valAfipTemp < 0) {
                        valAfipTemp = 0;
                }

                valTotal = valPesos + valAfipTemp + valCorreo;

                _utils2.default.assertEquals('valPesos', valPesos, 956.1468);
                _utils2.default.assertEquals('valAfip', valAfip, 478.0734);
                _utils2.default.assertEquals('valFranquicia', valFranquicia, 0);
                _utils2.default.assertEquals('valAfipTemp', valAfipTemp, valAfip);
                _utils2.default.assertEquals('valTotal', valTotal, 1554.2202);

                _utils2.default.assertEquals('data.valAfip', data.valAfip, formatPrice(valAfip));
                _utils2.default.assertEquals('data.valFranquicia', data.valFranquicia, formatPrice(valFranquicia));
                _utils2.default.assertEquals('data.valTotal', data.valTotal, formatPrice(valTotal));

                console.log('<<<<<<<<<<<<<<<<< Calculator - runTests() - ENDED >>>>>>>>>>>>>>>>');
        }
}

},{"./app":2,"./utils":11}],4:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _utils = require('../utils');

var _utils2 = _interopRequireDefault(_utils);

var _app = require('../app');

var _app2 = _interopRequireDefault(_app);

var _currencyUpdater = require('./currencyUpdater');

var _currencyUpdater2 = _interopRequireDefault(_currencyUpdater);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var Currency = function Currency(id) {

    log('Currency() - id:', id);

    var self = this;
    var _index = -1;
    var id = id;
    var name = '-1';
    var currentVal = 0;
    var fallbackVal = -1;
    var updatedVal = -1;
    var customVal = -1;
    var lastFallbackValDate = -1;
    var lastUpdateDate = -1;
    var lastCustomValDate = -1;
    var _usesCustomVal = false;
    var queryUrl = '';
    var isSelected = false;
    var currencyUpdater;

    this.getName = function () {
        return name;
    };

    this.getId = function () {
        return id;
    };

    this.getCurrentVal = function () {

        log('Currency - getCurrentVal()', id, currentVal);

        return currentVal;
    };

    this.setCurrentVal = function (val) {

        log('Currency - setCurrentVal()', id, val);

        currentVal = val;

        updateSelectOption();
    };

    this.setAutoMode = function (usesCustomVal) {

        log('Currency - setAutoMode()', id, usesCustomVal);

        _usesCustomVal = usesCustomVal;

        if (_usesCustomVal) {

            if (customVal == -1) {
                customVal = self.getCurrentVal();
            }

            lastCustomValDate = Date.now();

            self.setCurrentVal(customVal);
        } else {

            if (updatedVal > -1) {

                self.setCurrentVal(updatedVal);
            } else {
                log('Currency - setAutoMode() - using fallbackVal', id, usesCustomVal, fallbackVal);
                self.setCurrentVal(fallbackVal);
            }
        }

        self.save();
    };

    this.setCustomVal = function (val) {

        customVal = val;

        self.setCurrentVal(customVal);

        self.save();
    };

    this.setSelectedState = function (val) {
        isSelected = val;

        if (isSelected) {

            if (id != 'ARS') {
                currencyUpdater.wakeUp();
            }
        } else {
            currencyUpdater.sleep();
        }
    };

    this.getLastUpdateDate = function () {
        return lastUpdateDate;
    };

    this.getLastUpdateDateReadable = function () {

        if (lastUpdateDate == -1) {
            return '-1';
        }

        return new Date(lastUpdateDate).toLocaleString('es-AR');
    };

    this.getHasCustomVal = function () {
        return _usesCustomVal;
    };

    this.getIndex = function () {
        return _index;
    };

    this.load = function (index) {

        _index = index;

        // load from config.js
        var data = _app2.default.config.currencies[_index];

        log('Currency - load() data.id', data.id);

        if (id != data.id) {

            var errorMsg = 'Currency - load() - expected id: "' + id + '" doesnt match data.id: "' + data.id + '"';
            log(errorMsg);
            throw new Error(errorMsg);
        }

        name = data.name;
        fallbackVal = data.val;
        lastUpdateDate = data.lastUpdate;
        lastFallbackValDate = data.lastUpdate;
        queryUrl = _app2.default.config.currencyQueryUrl.replace('{1}', id);

        currencyUpdater = new _currencyUpdater2.default(id, queryUrl, onUpdateReady);

        self.setCurrentVal(fallbackVal);

        // load from localStorage
        var savedData = _utils2.default.getSavedItem(id);

        if (!savedData || savedData.id != id) {
            log('Currency - load() - no saved data', savedData, id);
            return;
        }

        updatedVal = savedData.updatedVal;
        customVal = savedData.customVal;
        lastUpdateDate = savedData.lastUpdateDate;
        lastCustomValDate = savedData.lastCustomValDate;
        _usesCustomVal = savedData.usesCustomVal;

        log('Currency - load() - loading:', updatedVal, customVal, lastUpdateDate, lastCustomValDate, _usesCustomVal);

        if (_usesCustomVal == false) {

            if (updatedVal > -1 && lastUpdateDate > -1 && lastUpdateDate > lastFallbackValDate) {

                log('Currency - load() - loaded successfully. setting updatedVal:', updatedVal);
                self.setCurrentVal(updatedVal);
            } else {
                log('Currency - load() - FAILED to load:', id, updatedVal);
            }
        } else {

            if (customVal > -1) {
                self.setCurrentVal(customVal);
            } else {
                // we keep using the fallbackVal that we just set
                _usesCustomVal = false;

                self.save();
            }
        };
    };

    this.save = function () {

        log('Currency - save()', id);

        localStorage.setItem(id, getSaveData());
    };

    function getSaveData() {

        var data = { id: id,
            updatedVal: updatedVal,
            customVal: customVal,
            lastUpdateDate: lastUpdateDate,
            lastCustomValDate: lastCustomValDate,
            usesCustomVal: _usesCustomVal };

        return JSON.stringify(data);
    }

    this.update = function () {

        log('Currency - update()', id);

        currencyUpdater.update();
    };

    function updateSelectOption() {

        log('Currency - updateSelectOption() - ' + id);

        switch (id) {

            case 'USD':
                _app2.default.data.selectOptionUSD = 'USD (Dólar) - $' + String(self.getCurrentVal()) + (self.getHasCustomVal() ? '*' : '');
                break;
            case 'EUR':
                _app2.default.data.selectOptionEUR = 'EUR (Euro) - $' + String(self.getCurrentVal()) + (self.getHasCustomVal() ? '*' : '');
                break;
            case 'GBP':
                _app2.default.data.selectOptionGBP = 'GBP (Libra) - $' + String(self.getCurrentVal()) + (self.getHasCustomVal() ? '*' : '');
                break;
        }
    }

    function onUpdateReady(update) {

        log('Currency - onUpdateReady()', update.id, update.value, update.date);

        if (update.id != id) {

            log('Currency - onUpdateReady() - ids dont match:', update.id, id);
            return;
        }

        if (update.date > lastUpdateDate) {

            lastUpdateDate = update.date;
            updatedVal = update.value;

            log('Currency - onUpdateReady() - success', id);

            if (!_usesCustomVal) {
                self.setCurrentVal(updatedVal);
            }

            self.save();

            _app2.default.currencyUpdated.dispatch(self);
        } else {
            log('Currency - onUpdateReady() - update.date is older than:', getLastUpdateDate());
        }
    }
};

exports.default = Currency;

},{"../app":2,"../utils":11,"./currencyUpdater":6}],5:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _app = require('../app');

var _app2 = _interopRequireDefault(_app);

var _utils = require('../utils');

var _utils2 = _interopRequireDefault(_utils);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var CurrencyManager = function CurrencyManager() {

    log('CurrencyManager()');

    function init() {

        log('CurrencyManager - init()');

        // don't include ARS (as it shouldn't be in Configuración)
        _app2.default.data.currencies.push(_app2.default.data.currencyUSD, _app2.default.data.currencyEUR, _app2.default.data.currencyGBP);

        _app2.default.data.currencyUSD.load(0);
        _app2.default.data.currencyEUR.load(1);
        _app2.default.data.currencyGBP.load(2);
        _app2.default.data.currencyARS.load(3);

        var selectedCurrencyId = _utils2.default.getSavedItem('selectedCurrencyId');

        if (selectedCurrencyId == null || selectedCurrencyId == undefined || selectedCurrencyId == '') {

            selectedCurrencyId = _app2.default.config.defaultCurrencyId;

            ga('send', {
                hitType: 'event',
                eventCategory: 'Settings',
                eventAction: 'loaded',
                eventLabel: 'selectedCurrencyId',
                eventValue: selectedCurrencyId
            });
        }

        _app2.default.data.currency = getCurrencyById(selectedCurrencyId);

        $('#currency-select').prop('selectedIndex', _app2.default.data.currency.getIndex());

        _app2.default.data.currency.setSelectedState(true);

        log('CurrencyManager - init() - app.data.currency.getId():', _app2.default.data.currency.getId());

        _app2.default.currencySliderToggled.add(onCurrencySliderToggled);
        _app2.default.currencyModified.add(onCurrencyModified);
    }

    this.updateCurrency = function (id) {

        var currency = getCurrencyById(id);

        if (currency) {
            currency.update();
        }
    };

    function onCurrencySliderToggled(data) {

        var currency = getCurrencyById(data.id);

        if (currency) {
            currency.setAutoMode(data.value);
        }
    }

    function onCurrencyModified(data) {

        var currency = getCurrencyById(data.id);

        if (currency) {
            currency.setCustomVal(data.value);
        }
    }

    function getCurrencyById(id) {

        log('CurrencyManager - getCurrencyById()', id);

        switch (id) {

            case 'USD':
                return _app2.default.data.currencyUSD;

            case 'EUR':
                return _app2.default.data.currencyEUR;

            case 'GBP':
                return _app2.default.data.currencyGBP;

            case 'ARS':
                return _app2.default.data.currencyARS;
        }

        throw new Error('CurrencyManager - getCurrencyById() - unrecognized currency id:' + id);

        return null;
    }

    this.onCurrencySelected = function (e) {

        if (e == null || e.target.selectedIndex == undefined) {
            throw new Error('CurrencyManager - onCurrencySelected()');
        }

        var id = _app2.default.config.currencies[e.target.selectedIndex].id;

        log('CurrencyManager - onCurrencySelected()', id);

        var selectedCurrency = getCurrencyById(id);

        if (!selectedCurrency || selectedCurrency == _app2.default.data.currency) {
            return;
        }

        _app2.default.data.currency.setSelectedState(false);

        _app2.default.data.currency = selectedCurrency;

        _app2.default.data.currency.setSelectedState(true);

        _app2.default.currencySelected.dispatch();

        _app2.default.saveSettingRequested.dispatch({ name: 'selectedCurrencyId', value: id });
    };

    this.onCurrencyModified = function (event, id) {};

    init();
};

exports.default = CurrencyManager;

},{"../app":2,"../utils":11}],6:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _app = require('../app');

var _app2 = _interopRequireDefault(_app);

var _utils = require('../utils');

var _utils2 = _interopRequireDefault(_utils);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

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

var CurrencyUpdater = function CurrencyUpdater(id, queryUrl, onUpdateSuccessful, onUpdateError) {

    log('CurrencyUpdater() - id:', id, 'queryUrl:', queryUrl);

    var req = new XMLHttpRequest();
    var timerId = '';
    var sleeping = true;

    this.wakeUp = function () {

        log('CurrencyUpdater() - wakeUp()', id, _app2.default.config.updateCurrency);

        if (!_app2.default.config.updateCurrency) {
            return;
        }

        sendRequest();

        clearInterval(timerId);
        timerId = setInterval(sendRequest, _app2.default.config.currencyUpdateInterval);
        sleeping = false;
    };

    this.sleep = function () {
        clearInterval(timerId);

        timerId = '';
        sleeping = true;
    };

    this.update = function () {
        sendRequest();
    };

    function sendRequest() {

        log('CurrencyUpdater() - sendRequest() - queryUrl:', queryUrl);

        req.open('GET', queryUrl, true);
        req.send();
    }

    req.onreadystatechange = function () {

        log('CurrencyUpdater() - req.onreadystatechange()', id, 'req.readyState:', req.readyState);

        if (req.readyState === XMLHttpRequest.DONE) {

            log('CurrencyUpdater() - req.onreadystatechange() - req.status:', req.status);

            if (req.status === 200) {

                try {
                    var xmlDoc = _utils2.default.stringToXML(req.responseText);
                    var rate = xmlDoc.documentElement.getElementsByTagName('Rate')[0].childNodes[0].nodeValue;

                    if (!isNaN(rate) && rate > 0) {

                        rate = parseFloat(rate).toFixed(2);

                        onUpdateSuccessful({ id: id, value: rate, date: Date.now() });
                    }
                } catch (err) {

                    log('CurrencyUpdater() - req.onreadystatechange() - error caught! - reason', err.name);

                    if (onUpdateError) {

                        onUpdateError("error getting rate");
                    } else {
                        console.log('CurrencyUpdater - error getting rate', err);
                    }
                }
            } else {
                if (onUpdateError) {

                    onUpdateError("error getting currency");
                } else {
                    console.log('CurrencyUpdater - error getting currency');
                }
            }
        }
    };
};

exports.default = CurrencyUpdater;

/*

sample responseText

<query xmlns:yahoo="http://www.yahooapis.com/v1/base.rng" yahoo:count="1" yahoo:created="2017-08-11T18:07:52Z" yahoo:lang="en-US">
    <diagnostics>
        <url execution-start-time="1" execution-stop-time="2" execution-time="1"><![CDATA[http://www.datatables.org/yahoo/finance/yahoo.finance.xchange.xml]]></url>
        <publiclyCallable>true</publiclyCallable>
        <cache execution-start-time="4" execution-stop-time="4" execution-time="0" method="GET" type="MEMCACHED"><![CDATA[e1b28fd8ab8a7bf21a52162f420f1447]]></cache>
        <url execution-start-time="4" execution-stop-time="5" execution-time="1"><![CDATA[http://download.finance.yahoo.com/d/quotes.csv?s=USDARS=X&amp;f=snl1d1t1ab]]></url>
        <query execution-start-time="4" execution-stop-time="5" execution-time="1"><![CDATA[select * from csv where url='http://download.finance.yahoo.com/d/quotes.csv?s=USDARS=X&amp;f=snl1d1t1ab' and columns='Symbol,Name,Rate,Date,Time,Ask,Bid']]></query>
        <javascript execution-start-time="2" execution-stop-time="5" execution-time="2" instructions-used="18668" table-name="yahoo.finance.xchange" />
        <user-time>6</user-time>
        <service-time>2</service-time>
        <build-version>2.0.164</build-version>
    </diagnostics>
    <results>
        <rate id="USDARS">
            <Name>USD/ARS</Name>
            <Rate>17.7150</Rate>
            <Date>8/11/2017</Date>
            <Time>5:50pm</Time>
            <Ask>17.7200</Ask>
            <Bid>17.7150</Bid>
        </rate>
    </results>
</query>
*/

},{"../app":2,"../utils":11}],7:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
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

/*

about: lightweight logger
author: ivocass

version: 0.11
last updated: 20170908

-description:
stores lines in an array, then dumps to console upon request.
when 'maxEntries' is reached, it starts storing from index 0 again.

-usage:
log('some message');
log(isValid, array.length, moreParams);
then in the console: logger.show()

 */

var Logger = function Logger() {

    var self = this;
    var enabled = true;
    var maxEntries = 2000;

    var logHistory = [];
    var logHistoryIndex = 0;
    var entryId = 0;

    function init() {

        window.logger = self;

        window.log = logEntry;
    }

    function logEntry() {

        var args = Array.prototype.slice.call(arguments).toString();

        logHistory[logHistoryIndex] = String(entryId) + ') ' + args;

        logHistoryIndex++;
        entryId++;

        if (logHistoryIndex == maxEntries) {
            logHistoryIndex = 0;
        }
    }

    this.setMaxEntries = function (value) {
        maxEntries = value;
    };

    this.disable = function () {
        enabled = false;
    };

    this.show = function () {

        console.log('---------------- LOG BEGINS ----------------');

        // TODO: if logHistory.length > logHistoryIndex, start from logHistoryIndex + 1, then go from 0 to logHistoryIndex
        for (var i = 0; i < logHistory.length; i++) {

            console.log(logHistory[i]);
        }

        console.log('---------------- LOG ENDS ------------------');
    };

    init();
};

exports.default = new Logger();

},{}],8:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.default = Settings;

var _app = require('./app');

var _app2 = _interopRequireDefault(_app);

var _utils = require('./utils');

var _utils2 = _interopRequireDefault(_utils);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

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

function Settings() {

    var self = this;
    var dolarInputCustom;

    function init() {

        var showInfoIcons = _utils2.default.getSavedItem('showInfoIcons');
        var showCheckboxes = _utils2.default.getSavedItem('showCheckboxes');
        var showFranquicia = _utils2.default.getSavedItem('showFranquicia');
        var alternativeDesignEnabled = _utils2.default.getSavedItem('alternativeDesignEnabled');

        dolarInputCustom = $('#dolar-input-custom').get(0);

        _app2.default.valCompra = _app2.default.config.defaultPurchase;

        // it may be null, true, false
        if (alternativeDesignEnabled === null) alternativeDesignEnabled = _app2.default.data.alternativeDesignEnabled; // set to default
        _app2.default.data.alternativeDesignEnabled = alternativeDesignEnabled;
        $('#sliderToggleDesign').prop('checked', _app2.default.data.alternativeDesignEnabled);

        ga('send', {
            hitType: 'event',
            eventCategory: 'Settings',
            eventAction: 'loaded',
            eventLabel: 'alternativeDesignEnabled',
            eventValue: _app2.default.data.alternativeDesignEnabled
        });

        loadMainColor();

        // it may be null, true, false
        if (showInfoIcons === null) showInfoIcons = _app2.default.data.showInfoIcons; // set to default
        _app2.default.data.showInfoIcons = showInfoIcons;
        $('#sliderToggleInfo').prop('checked', _app2.default.data.showInfoIcons);

        // it may be null, true, false
        if (showCheckboxes === null) showCheckboxes = _app2.default.data.showCheckboxes; // set to default
        _app2.default.data.showCheckboxes = showCheckboxes;
        $('#sliderToggleCheckboxes').prop('checked', _app2.default.data.showCheckboxes);

        if (showFranquicia !== null && (showFranquicia === true || showFranquicia === false)) {
            _app2.default.data.showFranquicia = showFranquicia;
        }

        _app2.default.saveSettingRequested.add(onSaveSettingRequested);
    }

    this.toggleDesign = function () {

        _app2.default.data.alternativeDesignEnabled = $('#sliderToggleDesign').prop('checked');

        this.setMainColor(_app2.default.data.mainColor);

        localStorage.setItem('alternativeDesignEnabled', _app2.default.data.alternativeDesignEnabled);
    };

    // todo: is 'important' necessary?
    this.setMainColor = function (color) {

        log('Settings - setMainColor() color:', color);

        $(document.body).css('background-color', color, 'important');
        $('#app').css('background-color', color, 'important');
        $('#settings .settings-header').css('background-color', color, 'important');
        $('#infoModal .modal-header').css('background-color', color, 'important');

        // dont change when on the welcome screen
        if (_app2.default.data.hasAcceptedTerms) {
            $('#termsModal .modal-header').css('background-color', color, 'important');
            $('#terms-ok-btn').css('background-color', color, 'important');
        }

        // $('#contact-link').css('color', color, 'important');        
        $('.checkbox-check').css('color', color, 'important');
        // $('#price-compra-input').css('color', color, 'important');
        // $('#compra-stuff .form-control').css('color', color, 'important');
        // $('.arrow .fa-caret-down').css('color', color, 'important');
        $('#settings .panel-left').css('background-color', color, 'important');

        if (_app2.default.data.alternativeDesignEnabled) {
            $('#section-purchase').css('background-color', color);
            $('#section-total').css('background-color', 'white');
            $('#section-total').css('color', color);

            $('#app-links button').css('color', color);
        } else {
            $('#section-purchase').css('background-color', _utils2.default.changeColorLuminance(color, -_app2.default.config.colorLuminanceChange));
            $('#section-expenses').css('background-color', color);
            $('#section-total').css('background-color', _utils2.default.changeColorLuminance(color, _app2.default.config.colorLuminanceChange));

            $('#section-total').css('color', 'white');
            $('#app-links button').css('color', 'white');
        }

        localStorage.setItem('mainColor', color);

        _app2.default.data.mainColor = color;
    };

    this.onCurrencyModified = function (event, id) {

        if (!event || !event.srcElement) {

            throw new Error('Settings - onCurrencyModified() - "!event || !event.srcElement"');
        }

        var val = event.srcElement.value;

        if (isNaN(val)) {
            $(event.srcElement).addClass('input-error');
            return;
        }

        val = Number(val);

        if (val <= 0) {
            $(event.srcElement).addClass('input-error');
        } else {
            $(event.srcElement).removeClass('input-error');

            _app2.default.currencyModified.dispatch({ id: id, value: val });

            _app2.default.settingsChanged.dispatch();
        }
    };

    this.toggleCustomCurrency = function (id) {

        var signalData = { id: id, value: false };

        // if 'checked' is true, 'value' is false (it affects 'usesCustomValue')
        if (!$('#sliderToggle' + id).prop('checked')) {

            signalData.value = true;
        }

        _app2.default.currencySliderToggled.dispatch(signalData);

        _app2.default.settingsChanged.dispatch();
    };

    this.toggleInfoIcons = function () {

        _app2.default.data.showInfoIcons = $('#sliderToggleInfo').prop('checked');

        localStorage.setItem('showInfoIcons', _app2.default.data.showInfoIcons);
    };

    this.toggleCheckboxes = function () {

        _app2.default.data.showCheckboxes = $('#sliderToggleCheckboxes').prop('checked');

        localStorage.setItem('showCheckboxes', _app2.default.data.showCheckboxes);
    };

    function loadMainColor() {

        var mainColor = _utils2.default.getSavedItem('mainColor');

        if (mainColor !== null) {

            self.setMainColor(mainColor);

            ga('send', {
                hitType: 'event',
                eventCategory: 'Settings',
                eventAction: 'loaded',
                eventLabel: 'mainColor',
                eventValue: mainColor
            });
        } else {
            self.setMainColor(_app2.default.config.mainColor);
        }
    }

    function onSaveSettingRequested(setting) {
        localStorage.setItem(setting.name, setting.value);
    }

    init();
}

},{"./app":2,"./utils":11}],9:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
	value: true
});
exports.default = Signal;
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

//_____________________________

/**
* author: ivocass
* date created: 2011
* date modified: 20170810
* description: lightweight and awesome signal. ported from AS3.
* version: 0.13
* 
*/
function Signal() {

	var listeners = [];
	var amount = 0;

	var stepping = false;

	var hasColdListeners = false;

	this.destroy = function () {

		for (var i = 0; i < listeners.length; i++) {
			listeners[i].callbackFunction = null;
		}

		listeners = null;
		amount = 0;
	};

	this.reset = function () {

		this.destroy();

		listeners = [];

		stepping = false;
		hasColdListeners = false;
	};

	this.add = function (callback) {
		var removeOnFirstCallback = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : false;

		if (getListenerIndex(callback) > -1) {
			throw new Error("Attempt to add a callback twice.");
		}

		var listener = new SignalListener(callback);
		listener.removeOnFirstCallback = removeOnFirstCallback;

		listeners.push(listener);
		amount++;
	};

	this.rem = function (callback) {
		var safeRemove = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : false;


		var index = getListenerIndex(callback);

		if (index == -1) {
			if (safeRemove) {
				return;
			} else {
				throw new Error("Attempt to remove an unregistered callback.");
			}
		}

		if (stepping) {
			listeners[index].isCold = true;
			listeners[index].callbackFunction = null;

			hasColdListeners = true;
		} else {
			listeners.splice(index, 1);
			amount--;
		}
	};

	var getListenerIndex = function getListenerIndex(callback) {

		for (var i = 0; i < amount; i++) {
			if (listeners[i].callbackFunction == callback) {
				return i;
			}
		}

		return -1;
	};

	this.dispatch = function () {
		var param = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : null;


		if (stepping) {
			throw new Error("Attempt to dispatch a signal while stepping.");
		}

		stepping = true;

		for (var i = 0; i < amount; i++) {
			var listener = listeners[i];

			if (listener.isCold) continue;

			if (listener.paramsRequired == 0) {
				listener.callbackFunction();
			} else if (listener.paramsRequired == 1) {
				listener.callbackFunction(param);
			} else if (listener.paramsRequired == 2) {
				listener.callbackFunction(this, param);
			}

			if (listener.removeOnFirstCallback) {
				listener.callbackFunction = null;
				listener.isCold = true;
				hasColdListeners = true;
			}
		}

		if (hasColdListeners) {
			for (i = amount - 1; i > -1; i--) {
				if (listeners[i].isCold) {
					listeners.splice(i, 1);
					amount--;
				}
			}

			hasColdListeners = false;
		}

		stepping = false;
	};
}

var SignalListener = function SignalListener(callbackFunction) {

	this.callbackFunction = callbackFunction;

	this.removeOnFirstCallback = false;

	this.isCold = false;

	this.paramsRequired = callbackFunction.length; // 0:none, 1:param, 2:signal and param
};

},{}],10:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.default = TermsMgr;

var _app = require('./app');

var _app2 = _interopRequireDefault(_app);

var _utils = require('./utils');

var _utils2 = _interopRequireDefault(_utils);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

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

function TermsMgr() {

    log('TermsMgr()');

    function init() {

        _utils2.default.loadText('assets/terms.txt').then(function (txt) {

            log('TermsMgr() - txt loaded', txt.length);

            _app2.default.data.termsAndConditions = txt;
        });

        var hasAcceptedTerms = _utils2.default.getSavedItem('hasAcceptedTerms');

        log('TermsMgr() - hasAcceptedTerms:', hasAcceptedTerms);

        if (hasAcceptedTerms) {
            _app2.default.data.hasAcceptedTerms = true;
        }
    }

    this.onTermsCheckboxClicked = function () {

        if ($('#termsCheckbox').prop('checked')) {

            $('#btnWelcomeContinue').removeClass('disabled');
        } else {
            $('#btnWelcomeContinue').addClass('disabled');
        }
    };

    this.onWelcomeContinueClicked = function () {

        if ($('#termsCheckbox').prop('checked')) {

            $('#welcome').addClass('d-none');

            _app2.default.data.hasAcceptedTerms = true;

            localStorage.setItem('hasAcceptedTerms', true);
        } else {
            // alert('');
        }
    };

    init();
}

},{"./app":2,"./utils":11}],11:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
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

var Utils = function Utils() {

    this.isBrowser = function (name) {

        return navigator.userAgent.indexOf(name) > -1;
    };

    this.assertEquals = function (name, currentVal, expectedVal) {

        var isSuccessful = currentVal === expectedVal ? true : false;

        if (isSuccessful) {
            console.log('assertEquals()', 'SUCCESS', name, currentVal);
        } else {
            console.log('assertEquals()', 'ERROR', name, 'current/expected:', currentVal, '/', expectedVal);
        }

        if (!isSuccessful) {
            console.log('ERROR ------------------------------------------');
            console.log('|            LAST TEST FAILED =(');
            console.log('ERROR ------------------------------------------');
        }
    };

    this.getSavedItem = function (name) {

        log('Utils - getSavedItem()', name);

        var item = localStorage.getItem(name);

        // console.log('utils.getSavedItem() - name:', name, ' - item:', item);

        if (item !== null && item !== undefined && item !== 'undefined') {

            switch (true) {

                case item === 'false':
                    return false;

                case item === 'true':
                    return true;

                case !isNaN(item):
                    return Number(item);

                case typeof item == 'string':
                    try {
                        var data = JSON.parse(item);

                        if (data != null) {
                            return data;
                        }
                    } catch (err) {
                        return item;
                    }
                    break;

            }
        }

        return null;
    };

    this.loadText = function (url) {

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
    };

    // returns an XML DOM document
    this.stringToXML = function (text) {

        if (text) {
            return new DOMParser().parseFromString(text, "text/xml");
        }

        return null;
    };

    // lum should represent a percentage (e.g. for 5%, provide 0.05. negative values to darken)
    this.changeColorLuminance = function (hex, lum) {

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
            c = Math.round(Math.min(Math.max(0, c + c * lum), 255)).toString(16);
            rgb += ("00" + c).substr(c.length);
        }

        return rgb;
    };
};

exports.default = new Utils();

},{}]},{},[2])

//# sourceMappingURL=bundle.js.map
