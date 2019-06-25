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

exports.onCreateDevServer = function (_ref, _ref2) {
  var app = _ref.app,
      store = _ref.store;
  var _ref2$publicPath = _ref2.publicPath,
      publicPath = _ref2$publicPath === void 0 ? "admin" : _ref2$publicPath;

  var _store$getState = store.getState(),
      program = _store$getState.program;

  var publicPathClean = (0, _lodash.trim)(publicPath, "/");
  app.get("/" + publicPathClean, function (req, res) {
    res.sendFile(_path.default.join(program.directory, "public", publicPathClean, "index.html"), function (err) {
      if (err) {
        res.status(500).end(err.message);
      }
    });
  });
};

exports.onCreateWebpackConfig = function (_ref3, _ref4) {
  var store = _ref3.store,
      stage = _ref3.stage,
      getConfig = _ref3.getConfig,
      plugins = _ref3.plugins,
      pathPrefix = _ref3.pathPrefix;
  var modulePath = _ref4.modulePath,
      _ref4$publicPath = _ref4.publicPath,
      publicPath = _ref4$publicPath === void 0 ? "admin" : _ref4$publicPath,
      _ref4$enableIdentityW = _ref4.enableIdentityWidget,
      enableIdentityWidget = _ref4$enableIdentityW === void 0 ? true : _ref4$enableIdentityW,
      _ref4$htmlTitle = _ref4.htmlTitle,
      htmlTitle = _ref4$htmlTitle === void 0 ? "Content Manager" : _ref4$htmlTitle,
      _ref4$manualInit = _ref4.manualInit,
      manualInit = _ref4$manualInit === void 0 ? false : _ref4$manualInit,
      _ref4$resolvePaths = _ref4.resolvePaths,
      resolvePaths = _ref4$resolvePaths === void 0 ? [] : _ref4$resolvePaths;

  if (!["develop", "build-javascript"].includes(stage)) {
    return Promise.resolve();
  }

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
      modules: resolvePaths.concat(["node_modules"])
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
    plugins: gatsbyConfig.plugins.filter(function (plugin) {
      return !["MiniCssExtractPlugin", "GatsbyWebpackStatsExtractor"].find(function (pluginName) {
        return plugin.constructor && plugin.constructor.name === pluginName;
      });
    }).concat([
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
     * Remove common chunks style optimizations from Gatsby's default
     * config, they cause issues for our pre-bundled code.
     */
    mode: stage === "develop" ? "development" : "production",
    optimization: {
      /**
       * Without this, node can get out of memory errors
       * when building for production.
       */
      minimizer: stage === "develop" ? [] : gatsbyConfig.optimization.minimizer
    },
    // Disable sourcemaps in development to speed up HMR
    devtool: stage === "develop" ? undefined : "source-map"
  });
  config.module.rules.push({
    test: /gatsby\/cache-dir.*\.js$/,
    loader: require.resolve("babel-loader"),
    options: {
      presets: [require.resolve("@babel/preset-react"), [require.resolve("@babel/preset-env"), {
        shippedProposals: true,
        useBuiltIns: "entry",
        corejs: 2
      }]],
      plugins: [require.resolve("@babel/plugin-proposal-class-properties"), require.resolve("babel-plugin-remove-graphql-queries")]
    }
  });
  config.module.rules.exclude = [/node_modules\/(?!(gatsby)\/)/];
  return new Promise(function (resolve, reject) {
    if (stage === "develop") {
      (0, _webpack.default)(config).watch({}, function () {});
      return resolve();
    }

    return (0, _webpack.default)(config).run(function (err, stats) {
      if (err) return reject(err);
      var errors = stats.compilation.errors || [];
      if (errors.length > 0) return reject(stats.compilation.errors);
      return resolve();
    });
  });
};