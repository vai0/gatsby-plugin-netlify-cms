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

var _copyWebpackPlugin = _interopRequireDefault(require("copy-webpack-plugin"));

var _htmlWebpackTagsPlugin = _interopRequireDefault(require("html-webpack-tags-plugin"));

// TODO: swap back when https://github.com/geowarin/friendly-errors-webpack-plugin/pull/86 lands
// Deep mapping function for plain objects and arrays. Allows any value,
// including an object or array, to be transformed.
function deepMap(obj, fn) {
  // If the transform function transforms the value, regardless of type, return
  // the transformed value.
  var mapped = fn(obj);

  if (mapped !== obj) {
    return mapped;
  } // Recursively deep map arrays and plain objects, otherwise return the value.


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

function replaceRule(value) {
  // If `value` does not have a `test` property, it isn't a rule object.
  if (!value || !value.test) {
    return value;
  } // remove dependency rule


  if (value.type === "javascript/auto" && value.use && value.use[0] && value.use[0].options && value.use[0].options.presets && /babel-preset-gatsby[/\\]dependencies\.js/.test(value.use[0].options.presets)) {
    return null;
  }

  return value;
}

exports.onPreInit = function (_ref) {
  var reporter = _ref.reporter;

  try {
    require.resolve("netlify-cms");

    reporter.warn("The netlify-cms package is deprecated, please install netlify-cms-app instead. You can do this by running \"npm install netlify-cms-app\"");
  } catch (err) {// carry on
  }
};

exports.onCreateDevServer = function (_ref2, _ref3) {
  var app = _ref2.app,
      store = _ref2.store;
  var _ref3$publicPath = _ref3.publicPath,
      publicPath = _ref3$publicPath === void 0 ? "admin" : _ref3$publicPath;

  var _store$getState = store.getState(),
      program = _store$getState.program;

  var publicPathClean = (0, _lodash.trim)(publicPath, "/");
  app.get("/" + publicPathClean, function (req, res) {
    res.sendFile(_path["default"].join(program.directory, "public", publicPathClean, "index.html"), function (err) {
      if (err) {
        res.status(500).end(err.message);
      }
    });
  });
};

exports.onCreateWebpackConfig = function (_ref4, _ref5) {
  var store = _ref4.store,
      stage = _ref4.stage,
      getConfig = _ref4.getConfig,
      plugins = _ref4.plugins,
      pathPrefix = _ref4.pathPrefix,
      loaders = _ref4.loaders,
      rules = _ref4.rules,
      actions = _ref4.actions;
  var modulePath = _ref5.modulePath,
      customizeWebpackConfig = _ref5.customizeWebpackConfig,
      _ref5$publicPath = _ref5.publicPath,
      publicPath = _ref5$publicPath === void 0 ? "admin" : _ref5$publicPath,
      _ref5$enableIdentityW = _ref5.enableIdentityWidget,
      enableIdentityWidget = _ref5$enableIdentityW === void 0 ? true : _ref5$enableIdentityW,
      _ref5$htmlTitle = _ref5.htmlTitle,
      htmlTitle = _ref5$htmlTitle === void 0 ? "Content Manager" : _ref5$htmlTitle,
      _ref5$htmlFavicon = _ref5.htmlFavicon,
      htmlFavicon = _ref5$htmlFavicon === void 0 ? "" : _ref5$htmlFavicon,
      _ref5$manualInit = _ref5.manualInit,
      manualInit = _ref5$manualInit === void 0 ? false : _ref5$manualInit,
      _ref5$includeRobots = _ref5.includeRobots,
      includeRobots = _ref5$includeRobots === void 0 ? false : _ref5$includeRobots;

  if (!["develop", "build-javascript"].includes(stage)) {
    return Promise.resolve();
  }

  var gatsbyConfig = getConfig();

  var _store$getState2 = store.getState(),
      program = _store$getState2.program;

  var publicPathClean = (0, _lodash.trim)(publicPath, "/");
  var externals = [{
    name: "react",
    global: "React",
    assetDir: "umd",
    assetName: "react.production.min.js"
  }, {
    name: "react-dom",
    global: "ReactDOM",
    assetDir: "umd",
    assetName: "react-dom.production.min.js"
  }, {
    name: "netlify-cms-app",
    global: "NetlifyCmsApp",
    assetDir: "dist",
    assetName: "netlify-cms-app.js",
    sourceMap: "netlify-cms-app.js.map"
  }];

  if (enableIdentityWidget) {
    externals.unshift({
      name: "netlify-identity-widget",
      global: "netlifyIdentity",
      assetDir: "build",
      assetName: "netlify-identity-widget.js",
      sourceMap: "netlify-identity-widget.js.map"
    });
  }

  var config = (0, _extends2["default"])({}, gatsbyConfig, {
    entry: {
      cms: [_path["default"].join(__dirname, "cms.js"), enableIdentityWidget && _path["default"].join(__dirname, "cms-identity.js")].concat(modulePath).filter(function (p) {
        return p;
      })
    },
    output: {
      path: _path["default"].join(program.directory, "public", publicPathClean)
    },
    module: {
      rules: deepMap(gatsbyConfig.module.rules, replaceRule).filter(Boolean)
    },
    plugins: [].concat(gatsbyConfig.plugins.filter(function (plugin) {
      return !["MiniCssExtractPlugin", "GatsbyWebpackStatsExtractor"].find(function (pluginName) {
        return plugin.constructor && plugin.constructor.name === pluginName;
      });
    }), [
    /**
     * Provide a custom message for Netlify CMS compilation success.
     */
    stage === "develop" && new _friendlyErrorsWebpackPlugin["default"]({
      clearConsole: false,
      compilationSuccessInfo: {
        messages: ["Netlify CMS is running at " + (program.ssl ? "https" : "http") + "://" + program.host + ":" + program.port + "/" + publicPathClean + "/"]
      }
    }), // Use a simple filename with no hash so we can access from source by
    // path.
    new _miniCssExtractPlugin["default"]({
      filename: "[name].css"
    }), // Auto generate CMS index.html page.
    new _htmlWebpackPlugin["default"]({
      title: htmlTitle,
      favicon: htmlFavicon,
      chunks: ["cms"],
      excludeAssets: [/cms.css/],
      meta: {
        robots: includeRobots ? "all" : "none" // Control whether search engines index this page

      }
    }), // Exclude CSS from index.html, as any imported styles are assumed to be
    // targeting the editor preview pane. Uses `excludeAssets` option from
    // `HtmlWebpackPlugin` config.
    new _htmlWebpackExcludeAssetsPlugin["default"](), // Pass in needed Gatsby config values.
    new _webpack["default"].DefinePlugin({
      __PATH__PREFIX__: pathPrefix,
      CMS_PUBLIC_PATH: JSON.stringify(publicPath)
    }), new _copyWebpackPlugin["default"]([].concat.apply([], externals.map(function (_ref6) {
      var name = _ref6.name,
          assetName = _ref6.assetName,
          sourceMap = _ref6.sourceMap,
          assetDir = _ref6.assetDir;
      return [{
        from: require.resolve(_path["default"].join(name, assetDir, assetName)),
        to: assetName
      }, sourceMap && {
        from: require.resolve(_path["default"].join(name, assetDir, sourceMap)),
        to: sourceMap
      }].filter(function (item) {
        return item;
      });
    }))), new _htmlWebpackTagsPlugin["default"]({
      tags: externals.map(function (_ref7) {
        var assetName = _ref7.assetName;
        return assetName;
      }),
      append: false
    }), new _webpack["default"].DefinePlugin({
      CMS_MANUAL_INIT: JSON.stringify(manualInit),
      PRODUCTION: JSON.stringify(stage !== "develop")
    })]).filter(function (p) {
      return p;
    }),
    // Remove common chunks style optimizations from Gatsby's default
    // config, they cause issues for our pre-bundled code.
    mode: stage === "develop" ? "development" : "production",
    optimization: {
      // Without this, node can get out of memory errors when building for
      // production.
      minimizer: stage === "develop" ? [] : gatsbyConfig.optimization.minimizer
    },
    devtool: stage === "develop" ? "cheap-module-source-map" : "source-map",
    externals: externals.map(function (_ref8) {
      var _ref9;

      var name = _ref8.name,
          global = _ref8.global;
      return _ref9 = {}, _ref9[name] = global, _ref9;
    })
  });

  if (customizeWebpackConfig) {
    customizeWebpackConfig(config, {
      store: store,
      stage: stage,
      pathPrefix: pathPrefix,
      getConfig: getConfig,
      rules: rules,
      loaders: loaders,
      plugins: plugins
    });
  }

  actions.setWebpackConfig({
    // force code splitting for netlify-identity-widget
    optimization: stage === "develop" ? {} : {
      splitChunks: {
        cacheGroups: {
          "netlify-identity-widget": {
            test: /[\\/]node_modules[\\/](netlify-identity-widget)[\\/]/,
            name: "netlify-identity-widget",
            chunks: "all",
            enforce: true
          }
        }
      }
    },
    // ignore netlify-identity-widget when not enabled
    plugins: enableIdentityWidget ? [] : [new _webpack["default"].IgnorePlugin({
      resourceRegExp: /^netlify-identity-widget$/
    })]
  });
  return new Promise(function (resolve, reject) {
    if (stage === "develop") {
      (0, _webpack["default"])(config).watch({}, function () {});
      return resolve();
    }

    return (0, _webpack["default"])(config).run(function (err, stats) {
      if (err) return reject(err);
      var errors = stats.compilation.errors || [];
      if (errors.length > 0) return reject(stats.compilation.errors);
      return resolve();
    });
  });
};