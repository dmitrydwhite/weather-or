
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