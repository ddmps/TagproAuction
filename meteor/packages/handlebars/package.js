Package.describe({
  summary: "Deprecated",
  version: '1.0.2-ipc.0'
});

Package.on_use(function (api) {
// XXX we unfortunately we can't do this since `meteor test-packages`
// tries to load all packages.
//
//  throw new Error(
//    "The 'handlebars' package is deprecated. "
//      + "`Handlebars.registerHelper` is now `Template.registerHelper`.");
});