"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

var _netlifyCmsApp = _interopRequireDefault(require("netlify-cms-app"));

/**
 * Load Netlify CMS automatically if `window.CMS_MANUAL_INIT` is set.
 */
// eslint-disable-next-line no-undef
if (!CMS_MANUAL_INIT) {
  _netlifyCmsApp["default"].init();
} else {
  console.log("`CMS_MANUAL_INIT` flag set, skipping automatic initialization.'");
} // eslint-disable-next-line no-undef


if (PRODUCTION) {
  /**
   * The stylesheet output from the modules at `modulePath` will be at `cms.css`.
   */
  _netlifyCmsApp["default"].registerPreviewStyle("cms.css");
} else {
  /**
   * In development styles are injected dynamically via the style-loader plugin
   */
  window.addEventListener("DOMContentLoaded", function (event) {
    var list = document.querySelectorAll("link[rel='stylesheet']");
    list.forEach(function (_ref) {
      var href = _ref.href;

      _netlifyCmsApp["default"].registerPreviewStyle(href);
    });
  });
}