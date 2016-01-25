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
      this.allInputs = this.upperData.$input.add(this.lowerData.$input);

      this.upperData.$output = $('.output-container').find('div.js-upper');
      this.lowerData.$output = $('.output-container').find('div.js-lower');

      this.$differenceCont = $('.container').find('.difference-container');
      this.$difference = $('.container').find('.difference-msg');
      this.$clearButton = $('.container').find('.clear-button');
    },

    /* Initialize the listeners on the selectors */
    initListeners: function () {
      this.allInputs.on('change', $.proxy(this.handleInputChange, this));
      this.allInputs.on('keyup', $.proxy(this.manageInputEntry, this));
      this.$clearButton.on('click touch', $.proxy(this.clearData, this));
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

    clearData: function (evt) {
      var blankObj = {
        placeName: '',
        tempString: '',
        tempVal: 0,
        iconUrl: ''
      };

      $.extend(this.upperData, blankObj);
      $.extend(this.lowerData, blankObj);

      this.allInputs.val('');

      this.clearTemplate(this.upperData, this.lowerData);
      this.clearComparison();
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

      $outputCont.find('.city-name').html(data.placeName);
      $outputCont.find('.local-temp').html(this.markupTemperature(data.tempString));
      $outputCont.find('.img-container')
        .empty()
        .append($('<img>', {
          src: data.iconUrl
        }));

      if (this.upperData.tempVal && this.lowerData.tempVal) {
        this.compareTwoLocations();
      }
    },

    clearTemplate: function () {
      var $outputCont;

      for (var i=0; i < arguments.length; i++) {
        $outputCont = arguments[i].$output;

        $outputCont.find('.city-name').html('');
        $outputCont.find('.local-temp').html('');
        $outputCont.find('.img-container').empty();
      }

    },

    markupTemperature: function (temperatureString) {
      var markupFormat = '<span class="narrow-deg">&deg;</span><span class="small-f">F</span>';
      return temperatureString + markupFormat;
    },

    populateComparison: function (difference, topIsWarmer) {
      var comparisonString;
      var diffString = 'is <span class="larger-deg">%d&deg;</span>';
      var topWarmer = ' warmer than';
      var topCooler = ' cooler than';
      var sameString = 'is the same temperature as';

      if (difference) {
        comparisonString = topIsWarmer ? topWarmer : topCooler;
        diffString = diffString.replace('%d', difference);

        this.$difference.html(diffString + comparisonString);
      } else {
        this.$difference.html(sameString);
      }

      this.$differenceCont.removeClass('hidden');
    },

    manageInputEntry: function (evt) {
      var $thisInput = $(evt.target);
      var entry = $thisInput.val();

      if (entry.length > 9) {
        $thisInput.addClass('smaller-input-text');
      } else {
        $thisInput.removeClass('smaller-input-text');
      }
    },

    clearComparison: function () {
      this.$difference.html('');
      this.$differenceCont.addClass('hidden');
    },

    compareTwoLocations: function () {
      var diff = roundto(this.upperData.tempVal - this.lowerData.tempVal, 1);
      var abs = Math.abs(diff);
      var topIsWarmer = diff > 0;

      this.populateComparison(abs, topIsWarmer);
    }
  };
}

// TODO: Reduce font-size when input characters are > 16
// TODO: Add specificity when placeName is equal
// TODO: Handle Bad Response Error
// TODO: Handle Multipe Results Error
// TODO: Handle Error from Service
// TODO: Style for Desktop
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
        this.stubRequest();
      });

    return Def;
  };

  this.stubRequest = function (reqObj) {
    var Def = $.Deferred();

    Def.resolve({
      placeName: 'SALEM, OR',
      tempString: '47.2 F',
      tempVal: 47.2,
      iconUrl: 'http://icons.wxug.com/i/c/i/nt_clear.gif'
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

        ret.placeName = obsv.display_location.full.toUpperCase();
        ret.specificPlace = obsv.observation_location.full.split(',')[0].toUpperCase().trim();
        ret.tempString = obsv.temp_f.toString();
        ret.tempVal = obsv.temp_f;
        ret.iconUrl = this.buildIconUrl(obsv.icon, obsv.icon_url);
      }
    }

    return ret;
  };

  this.buildUrl = function (searchString) {
    var firstPart = 'http://api.wunderground.com/api/8c4c6c8bebd341a5/conditions/q/';
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
