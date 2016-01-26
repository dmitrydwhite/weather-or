var WUAPI = require('./weather-underground-api.js');
var roundto = require('round-to');

function App () {
  return {
    /* These are two containers to store our results in */
    upperData: {},
    lowerData: {},

    /* This is a Class Property that tells the App if it needs to add specificity to PlaceName */
    specificPlaceNameNeeded: false,

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

      this.$errorContainer = $('.container').find('.error-container');
      this.$errorArrow = $('.container').find('.error-indicator');
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
      updateObject.error = null;

      this.retrieveConditionsData(updateObject)
        .done($.proxy(this.populateTemplate, this))
        .fail($.proxy(this.handleError, this));
    },

    /**
     * Listener on both inputs for responding to user interaction.  Clears error, adjusts font size.
     * @param  {jQuery}  evt  jQuery event.
     */
    manageInputEntry: function (evt) {
      var $thisInput = $(evt.target);
      var entry = $thisInput.val();

      if (entry === '') this.handleError(entry);

      if (entry.length > 9) {
        $thisInput.addClass('smaller-input-text');
      } else {
        $thisInput.removeClass('smaller-input-text');
      }
    },

    /**
     * Clears all data from the view.
     * @param  {jQuery}  evt  The jQuery event if needed
     */
    clearData: function (evt) {
      var blankObj = {
        placeName: '',
        tempString: '',
        tempVal: 0,
        iconUrl: '',
        error: {}
      };

      $.extend(this.upperData, blankObj);
      $.extend(this.lowerData, blankObj);

      this.allInputs.val('');

      this.clearTemplate(this.upperData, this.lowerData);
      this.clearComparison();
      this.clearErrors();
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
        })
        .fail(function (error) {
          Def.reject($.extend(updateObject, error));
        });

      return Def;
    },

    /**
     * Populate the template with the data received from the API
     * @param  {Object}  data  Formatted object received from weather API
     */
    populateTemplate: function (data) {
      if (data.error) {
        this.handleError(data);
      } else {
        this.clearErrors();
        var $outputCont = data.$output;

        // Check to see if this new placeName is the same as the existing placeName
        this.specificPlaceNameNeeded = this.upperData.placeName === this.lowerData.placeName &&
          this.upperData.specificPlace !== this.lowerData.specificPlace;

        $outputCont.find('.city-name').html(data.placeName);
        $outputCont.find('.local-temp').html(this.markupTemperature(data.tempString));
        $outputCont.find('.img-container')
          .empty()
          .append($('<img>', {
            src: data.iconUrl
          }));

        this.updatePlaceNames(this.upperData, this.lowerData);

        if (this.upperData.tempVal && this.lowerData.tempVal) {
          this.compareTwoLocations();
        }
      }
    },

    /**
     * Clears a single template of data.
     * @param  {Arguments}  args  Expects one or more data objects as Arguments
     */
    clearTemplate: function (args) {
      var $outputCont;

      for (var i=0; i < arguments.length; i++) {
        $outputCont = arguments[i].$output;

        $outputCont.find('.city-name').html('');
        $outputCont.find('.local-temp').html('');
        $outputCont.find('.img-container').empty();
      }

    },

    /**
     * Specifically targets the displayed location name, adds more specificity if the two displayed
     * places are identical.
     * @param  {Arguments}  args  Expects one or more data objects as Arguments.
     */
    updatePlaceNames: function (args) {
      var addSpecificity = this.specificPlaceNameNeeded;
      var outputObj;
      var propToAdd = addSpecificity ? 'specificPlace' : 'placeName';

      for (var i=0; i < arguments.length; i++) {
        outputObj = arguments[i];
        outputObj.$output.find('.city-name').html(outputObj[propToAdd]);
        outputObj.isSpecific = addSpecificity;
      }
    },

    /**
     * Builds the mark up for the temperature string; wraps portions of the markup in HTML elements
     * for styling.
     * @param  {String}  temperatureString  A string descriping the temperature in degrees F, e.g. '48.5'.
     * @return {String}                     A string formatted with HTML wrapping.
     */
    markupTemperature: function (temperatureString) {
      var markupFormat = '<span class="narrow-deg">&deg;</span><span class="small-f">F</span>';
      var formattedString = '';

      if (temperatureString) {
        formattedString = temperatureString + markupFormat;
      }

      return formattedString;
    },

    /**
     * Un-displays the error popup and re-sets it.
     */
    clearErrors: function () {
      this.$errorContainer.html('').addClass('hidden');
      this.$errorArrow.removeClass('upper lower').addClass('hidden');
    },

    /**
     * Populates the comparison template of the view.
     * @param  {String}  difference  String describing the difference in temperature between the two 
     *                               entered locations.
     * @param  {boolean} topIsWarmer Boolean describing whether the "upper" data object is warmer than
     *                               the lower.
     */
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

    /**
     * Empties the comparison template
     */
    clearComparison: function () {
      this.$difference.html('');
      this.$differenceCont.addClass('hidden');
    },

    /**
     * View method to add or clear errors received from the Service or initiated by the view. 
     * @param  {Object or ''}  error  Either the data object with an 'error' parameter (to add the error)
     *                                or a falsey value to remove the error.
     */
    handleError: function (error) {
      if (error && error.error) {
        var indicatorClass = error.$input.hasClass('js-upper') ? 'upper' : 'lower';
        this.$errorContainer.html(error.error.description).removeClass('hidden');
        this.$errorArrow.removeClass('upper lower').addClass(indicatorClass).removeClass('hidden');
        this.clearTemplate(error);
        this.clearComparison();
      } else {
        this.clearErrors();
      }
    }
  };
}

// TODO: Unit Tests!
// TODO: Docs!
// TODO: Make a Grunt Build task ?
window.weather0r = new App();
weather0r.init();