"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

var _extends2 = _interopRequireDefault(require("@babel/runtime/helpers/extends"));

var _path = _interopRequireDefault(require("path"));

var _lodash = require("lodash");

var _webpack = _interopRequireDefault(require("webpack"));

var _htmlWebpackPlugin = _interopRequireDefault(require("html-webpack-plugin"));

var _htmlWebpackExcludeAssetsPlugin = _interopRequireDefault(require("html-webpack-exclude-assets-plugin"));

var _miniCssExtractPlugin = _interopRequireDefault(require("mini-css-extract-plugin"));

var _friendlyErrorsWebpackPlugin = _interopRequireDefault(require("@pieh/friendly-errors-webpack-plugin"));

// TODO: swap back when https://github.com/geowarin/friendly-errors-webpack-plugin/pull/86 lands

/**
 * Deep mapping function for plain objects and arrays. Allows any value,
 * including an object or array, to be transformed.
 */
function deepMap(obj, fn) {
  /**
   * If the transform function transforms the value, regardless of type,
   * return the transformed value.
   */
  var mapped = fn(obj);

  if (mapped !== obj) {
    return mapped;
  }
  /**
   * Recursively deep map arrays and plain objects, otherwise return the value.
   */


  if (Array.isArray(obj)) {
    return obj.map(function (value) {
      return deepMap(value, fn);
    });
  }

  if ((0, _lodash.isPlainObject)(obj)) {
    return (0, _lodash.mapValues)(obj, function (value) {
      return deepMap(value, fn);
    });
  }

  return obj;
}

exports.onCreateDevServer = function (_ref) {
  var app = _ref.app,
      store = _ref.store;

  var _store$getState = store.getState(),
      program = _store$getState.program;

  app.get("/admin", function (req, res) {
    res.sendFile(_path.default.join(program.directory, "public/admin/index.html"), function (err) {
      if (err) {
        res.status(500).end(err.message);
      }
    });
  });
};

exports.onCreateWebpackConfig = function (_ref2, _ref3) {
  var store = _ref2.store,
      stage = _ref2.stage,
      getConfig = _ref2.getConfig,
      plugins = _ref2.plugins,
      pathPrefix = _ref2.pathPrefix;
  var modulePath = _ref3.modulePath,
      _ref3$publicPath = _ref3.publicPath,
      publicPath = _ref3$publicPath === void 0 ? "admin" : _ref3$publicPath,
      _ref3$enableIdentityW = _ref3.enableIdentityWidget,
      enableIdentityWidget = _ref3$enableIdentityW === void 0 ? true : _ref3$enableIdentityW,
      _ref3$htmlTitle = _ref3.htmlTitle,
      htmlTitle = _ref3$htmlTitle === void 0 ? "Content Manager" : _ref3$htmlTitle,
      _ref3$manualInit = _ref3.manualInit,
      manualInit = _ref3$manualInit === void 0 ? false : _ref3$manualInit,
      _ref3$resolvePaths = _ref3.resolvePaths,
      resolvePaths = _ref3$resolvePaths === void 0 ? [] : _ref3$resolvePaths;

  if (["develop", "build-javascript"].includes(stage)) {
    var gatsbyConfig = getConfig();

    var _store$getState2 = store.getState(),
        program = _store$getState2.program;

    var publicPathClean = (0, _lodash.trim)(publicPath, "/");
    var config = (0, _extends2.default)({}, gatsbyConfig, {
      entry: {
        cms: [manualInit && __dirname + "/cms-manual-init.js", __dirname + "/cms.js", enableIdentityWidget && __dirname + "/cms-identity.js"].concat(modulePath).filter(function (p) {
          return p;
        })
      },
      output: {
        path: _path.default.join(program.directory, "public", publicPathClean)
      },
      resolve: {
        modules: [].concat(resolvePaths, ["node_modules"])
      },
      module: {
        /**
         * Manually swap `style-loader` for `MiniCssExtractPlugin.loader`.
         * `style-loader` is only used in development, and doesn't allow us to
         * pass the `styles` entry css path to Netlify CMS.
         */
        rules: deepMap(gatsbyConfig.module.rules, function (value) {
          if (typeof (0, _lodash.get)(value, "loader") === "string" && value.loader.includes("style-loader")) {
            return (0, _extends2.default)({}, value, {
              loader: _miniCssExtractPlugin.default.loader
            });
          }

          return value;
        })
      },
      plugins: [].concat(gatsbyConfig.plugins.filter(function (plugin) {
        return !["MiniCssExtractPlugin", "GatsbyWebpackStatsExtractor"].find(function (pluginName) {
          return plugin.constructor && plugin.constructor.name === pluginName;
        });
      }), [
      /**
       * Provide a custom message for Netlify CMS compilation success.
       */
      stage === "develop" && new _friendlyErrorsWebpackPlugin.default({
        clearConsole: false,
        compilationSuccessInfo: {
          messages: ["Netlify CMS is running at " + (program.ssl ? "https" : "http") + "://" + program.host + ":" + program.port + "/" + publicPathClean + "/"]
        }
      }),
      /**
       * Use a simple filename with no hash so we can access from source by
       * path.
       */
      new _miniCssExtractPlugin.default({
        filename: "[name].css"
      }),
      /**
       * Auto generate CMS index.html page.
       */
      new _htmlWebpackPlugin.default({
        title: htmlTitle,
        chunks: ["cms"],
        excludeAssets: [/cms.css/]
      }),
      /**
       * Exclude CSS from index.html, as any imported styles are assumed to be
       * targeting the editor preview pane. Uses `excludeAssets` option from
       * `HtmlWebpackPlugin` config.
       */
      new _htmlWebpackExcludeAssetsPlugin.default(),
      /**
       * Pass in needed Gatsby config values.
       */
      new _webpack.default.DefinePlugin({
        __PATH__PREFIX__: pathPrefix,
        CMS_PUBLIC_PATH: JSON.stringify(publicPath)
      })]).filter(function (p) {
        return p;
      }),

      /**
       * Remove mode and common chunks style optimizations from Gatsby's default
       * config, they cause issues for our pre-bundled code.
       */
      mode: "none",
      optimization: {},
      devtool: stage === "develop" ? "cheap-module-source-map" : "source-map"
    });
    config.module.rules.push({
      test: /gatsby\/cache-dir.*\.js$/,
      loader: require.resolve("babel-loader"),
      options: {
        presets: [require.resolve("@babel/preset-react"), [require.resolve("@babel/preset-env"), {
          shippedProposals: true,
          useBuiltIns: "entry"
        }]],
        plugins: [require.resolve("@babel/plugin-proposal-class-properties")]
      }
    }); // Transpile Gatsby module because Gatsby includes un-transpiled ES6 code.

    config.module.rules.exclude = [/node_modules\/(?!(gatsby)\/)/]; // Prefer Gatsby ES6 entrypoint (module) over commonjs (main) entrypoint

    config.resolve.mainFields = ["browser", "module", "main"];

    if (stage === "develop") {
      (0, _webpack.default)(config).watch({}, function () {});
    } else {
      (0, _webpack.default)(config).run();
    }
  }
};