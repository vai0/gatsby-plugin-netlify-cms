"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

var _netlifyCms = _interopRequireDefault(require("netlify-cms"));

/**
 * Load Netlify CMS automatically if `window.CMS_MANUAL_INIT` is set.
 */
if (!window.CMS_MANUAL_INIT) {
  _netlifyCms.default.init();
} else {
  console.log("`window.CMS_MANUAL_INIT` flag set, skipping automatic initialization.'");
}
/**
 * The stylesheet output from the modules at `modulePath` will be at `cms.css`.
 */


_netlifyCms.default.registerPreviewStyle("cms.css");