(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
'use strict';
var numberIsNan = require('number-is-nan');

module.exports = Number.isFinite || function (val) {
	return !(typeof val !== 'number' || numberIsNan(val) || val === Infinity || val === -Infinity);
};

},{"number-is-nan":3}],2:[function(require,module,exports){
'use strict';
var numberIsFinite = require('is-finite');

module.exports = Number.isInteger || function (x) {
	return numberIsFinite(x) && Math.floor(x) === x;
};

},{"is-finite":1}],3:[function(require,module,exports){
'use strict';
module.exports = Number.isNaN || function (x) {
	return x !== x;
};

},{}],4:[function(require,module,exports){
'use strict';
var numberIsInteger = require('number-is-integer');

function round(fn, x, precision) {
	if (typeof x !== 'number') {
		throw new TypeError('Expected value to be a number');
	}

	if (!numberIsInteger(precision)) {
		throw new TypeError('Expected precision to be an integer');
	}

	var exponent = precision > 0 ? 'e' : 'e-';
	var exponentNeg = precision > 0 ? 'e-' : 'e';
	precision = Math.abs(precision);

	return Number(Math[fn](x + exponent + precision) + exponentNeg + precision);
}

var fn = module.exports = round.bind(null, 'round');
fn.up = round.bind(null, 'ceil');
fn.down = round.bind(null, 'floor');

},{"number-is-integer":2}],5:[function(require,module,exports){

var WUAPI = require('./weather-underground-api.js');
var roundto = require('round-to');

function App () {
  return {
    /* These are two containers to store our results in */
    upperData: {},
    lowerData: {},

    /* Initialize this! */
    init: function () {
      this.initSelectors();
      this.initListeners();
      this.weatherAPI = new WUAPI();
    },

    /* Identify selectors in markup */
    initSelectors: function () {
      this.upperData.$input = $('.input-container').find('input.js-upper');
      this.lowerData.$input = $('.input-container').find('input.js-lower');
      allInputs = this.upperData.$input.add(this.lowerData.$input);

      this.upperData.$output = $('.output-container').find('div.js-upper');
      this.lowerData.$output = $('.output-container').find('div.js-lower');

      this.$differenceCont = $('.container').find('.difference-container');
      this.$difference = $('.container').find('.difference-msg');
    },

    /* Initialize the listeners on the selectors */
    initListeners: function () {
      allInputs.on('change', $.proxy(this.handleInputChange, this));
    },  

    /**
     * Handle information being entered into the inputs
     * @param  {Event}  evt  jQuery event
     */
    handleInputChange: function (evt) {
      var $target = $(evt.target);
      var location = $target.val();
      var updateObject = $target.hasClass('js-upper') ? this.upperData : this.lowerData;

      updateObject.place = location;

      this.retrieveConditionsData(updateObject)
        .done($.proxy(this.populateTemplate, this))
        .fail($.proxy(this.conditionsUnavailable, this));
    },

    /**
     * Pass the object to be updated to the Weather API to get new data.
     * @param  {Object}  updateObject  The container to be updated with new data
     * @return {Promise}               Returns Promise
     */
    retrieveConditionsData: function (updateObject) {
      var Def = $.Deferred();

      this.weatherAPI.request(updateObject)
        .done(function (responseObj) {
          Def.resolve($.extend(updateObject, responseObj));
        });

      return Def;
    },

    /**
     * Populate the template with the data received from the API
     * @param  {Object}  data  Formatted object received from weather API
     */
    populateTemplate: function (data) {
      var $outputCont = data.$output;

      $outputCont.find('p.city-name').html(data.placeName);
      $outputCont.find('p.local-temp').html(data.tempString);
      $outputCont.find('.img-container')
        .empty()
        .append($('<img>', {
          src: data.iconUrl
        }));

      if (this.upperData.tempVal && this.lowerData.tempVal) {
        this.compareTwoLocations();
      }
    },

    populateComparison: function (warmer, colder, difference) {
      var diffString, sameString;
      var diffStringBuilder = ['%s', 'is', '%d', 'degrees warmer than', '%s'];
      var sameStringBuilder = ['%s', 'and', '%s', 'are reporting the same temperature'];

      if (difference) {
        diffStringBuilder[0] = warmer.placeName;
        diffStringBuilder[2] = difference;
        diffStringBuilder[4] = colder.placeName;
        diffString = diffStringBuilder.join(' ');

        this.$difference.html(diffString);
      } else {
        sameStringBuilder[0] = warmer.placeName;
        sameStringBuilder[2] = colder.placeName;
        sameString = sameStringBuilder.join(' ');

        this.$difference.html(sameString);
      }

      this.$differenceCont.removeClass('hidden');
    },

    compareTwoLocations: function () {
      var warmerLocation, coolerLocation;
      var diff = roundto(this.upperData.tempVal - this.lowerData.tempVal, 1);
      var abs = Math.abs(diff);

      if (diff >= 0) {
        this.populateComparison(this.upperData, this.lowerData, abs);
      } else {
        this.populateComparison(this.lowerData, this.upperData, abs);
      }
    }
  };
}

window.weather0r = new App();
weather0r.init();
},{"./weather-underground-api.js":6,"round-to":4}],6:[function(require,module,exports){
module.exports = function wapi () {

  this.request = function (reqObj) {
    var Def = $.Deferred();
    var urlString = this.buildUrl(reqObj.place);
    $.ajax(urlString)
      .done(function (response) {
        Def.resolve(this.conform(response));
      }.bind(this))
      .fail(function () {
        Def.reject();
      });

    return Def;
  };

  this.conform = function (responseObj) {
    var ret = {};

    if (responseObj.response.error) {
      console.log('you suck');
    } else {
      if (responseObj.current_observation) {
        var obsv = responseObj.current_observation;

        ret.placeName = obsv.display_location.full;
        ret.tempString = obsv.temperature_string.split('(')[0].trim();
        ret.tempVal = obsv.temp_f;
        ret.iconUrl = this.buildIconUrl(obsv.icon, obsv.icon_url);
      }
    }

    return ret;
  };

  this.buildUrl = function (searchString) {
    var firstPart = 'http://api.wunderground.com/api/625172310aff38a6/conditions/q/';
    var lastPart = '.json';

    return firstPart + searchString + lastPart;
  };

  // TODO: This should determine day or night.
  this.buildIconUrl = function (iconType, iconUrl) {
    if (iconUrl.indexOf('nt') !== -1) iconType = 'nt_' + iconType;
    return 'http://icons.wxug.com/i/c/i/' + iconType + '.gif';
  };
};
},{}]},{},[5]);
