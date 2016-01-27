module.exports = function wapi () {

  /**
   * API Key 
   * @type {String}
   */
  this.APIkey = '625172310aff38a6';

  /**
   * String indicating which icon set from Weather Underground to use.
   * @type {String}
   */
  this.iconSet = 'i/';

  /**
   * Extensible Map of custom errors. Properties should be Objects or return an Object containing
   * at least a 'description' property.
   * @type {Object}
   */
  this.errorType = {

    /**
     * Provide an error for when the service returns multiple results for the search term.
     * @param  {Object}  exampleObj  One of the multiple results returned from the servie.
     * @return {Object}              An error object with a customized description field.
     */
    multipleResults: function (exampleObj) {
      var descriptionString = '';
      var searchTerm = exampleObj.name || exampleObj.city || '';
      var searchLocale = exampleObj.state || exampleObj.country || '';
      var fillerText = [];
      var verboseSearch;

      if (!searchTerm || !searchLocale) {
        fillerText = ['Portland, OR', 'Portland'];
      } else {
        verboseSearch = searchTerm + ', ' + searchLocale;
        fillerText = [verboseSearch, searchTerm];
      }

      descriptionString = 'Try a more descriptive search term, e.g. "' + verboseSearch + 
        '" instead of "' + searchTerm + '".';

      return {description: descriptionString};
    }
  };

  /**
   * Request data from the service.
   * @param  {Object}  reqObj  Request object received from the App, expects "place" property as the search term.
   * @return {Deferred}        jQuery Deferred() object
   */
  this.request = function (reqObj) {
    var Def = $.Deferred();
    var urlString = this.buildUrl(reqObj.place);
    $.ajax(urlString)
      .done(function (response) {
        Def.resolve(this.conform(response));
      }.bind(this))
      .fail(function () {
        Def.reject({error: {description: 'Sorry, we can\'t seem to download any weather information <br>because the internet won\'t answer its phone.'}});
      });

    return Def;
  };

  /**
   * Translate the response from the service to the object expected by the App.
   * @param  {Object}  responseObj  Data object received from the service.
   * @return {Object}               Object parsed to the format the app expects.
   */
  this.conform = function (responseObj) {
    var ret = {};

    if (responseObj.response.error) {
      ret.error = responseObj.response.error;
    } else {
      if (responseObj.response.results && responseObj.response.results.length > 1) {
        ret.error = this.errorType.multipleResults(responseObj.response.results[0]);
      }
      if (responseObj.current_observation) {
        var obsv = responseObj.current_observation;

        ret.placeName = obsv.display_location.full.toUpperCase();
        ret.specificPlace = obsv.observation_location.full.split(',')[0].toUpperCase().trim() + ', ' + ret.placeName;
        ret.tempString = obsv.temp_f.toString();
        ret.tempVal = obsv.temp_f;
        ret.iconUrl = this.buildIconUrl(obsv.icon, obsv.icon_url);
      }
    }

    return ret;
  };

  /**
   * Construct the url string for the AJAX request.
   * @param  {String}  searchString  The search term passed from the App.
   * @return {String}                The complete url for the AJAX request.
   */
  this.buildUrl = function (searchString) {
    var firstPart = 'http://api.wunderground.com/api/' + this.APIkey + '/conditions/q/';
    var lastPart = '.json';

    return firstPart + searchString + lastPart;
  };

  /**
   * Constructs the url for the weather icon based on the service response.
   * @param  {String}  iconType  String describing the type of icon to use.
   * @param  {String}  iconUrl   The default icon url received from the service.
   * @return {String}            The constructed url for the Weather Underground icon, using the specified icon set.
   */
  this.buildIconUrl = function (iconType, iconUrl) {
    iconType = iconUrl.indexOf('nt') === -1 ? iconType : 'nt_' + iconType;

    return 'http://icons.wxug.com/i/c/' + this.iconSet + iconType + '.gif';
  };
};