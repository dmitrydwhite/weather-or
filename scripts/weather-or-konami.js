module.exports = function () {
  return {

    konamiOrder: [38, 38, 40, 40, 37, 39, 37, 39, 66, 65],
    konamiOverheard: [],
    hasSucceeded: false,

    listen: function (callback) {
      this.codeSuccessful = typeof callback == 'function' ? (callback) : function () {return true;};
      $(document).on('keyup', $.proxy(this.konamiProgress, this));
    },

    konamiProgress: function (evt) {
      if (this.hasSucceeded) return;
      var enteredLength;

      if (evt.keyCode) {
        this.konamiOverheard.push(evt.keyCode);
        enteredLength = this.konamiOverheard.length;

        if (this.arraysEqual(this.konamiOverheard, this.konamiOrder)) {
          this.hasSucceeded = true;
          this.codeSuccessful();
        }

        if ( !this.arraysEqual(this.konamiOverheard, this.konamiOrder.slice(0, enteredLength)) ) {
          this.konamiOverheard = [];
        }
      }
    },

    arraysEqual: function (arr1, arr2) {
      if (arr1.length != arr2.length) {
        return false;
      } else {
        var areEqual = true;
        for (var i=0; i<arr1.length; i++) {
          if (arr1[i] !== arr2[i]) {
            areEqual = false;
            break;
          }
        }

        return areEqual;
      }
    }
  };
};