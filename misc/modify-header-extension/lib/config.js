var config = {};

config.header = {
  set array (val) {app.storage.write("header", JSON.stringify(val))},
  get array () {return app.storage.read("header") !== undefined ? JSON.parse(app.storage.read("header")) : []}
};

config.welcome = {
  set lastupdate (val) {app.storage.write("lastupdate", val)},
  get lastupdate () {return app.storage.read("lastupdate") !== undefined ? app.storage.read("lastupdate") : 0}
};

config.addon = {
  set state (val) {app.storage.write("state", val)},
  set log (val) {app.storage.write("console-log", val)},
  get state () {return app.storage.read("state") !== undefined ? app.storage.read("state") : "enabled"},
  get log () {return app.storage.read("console-log") !== undefined ? app.storage.read("console-log") : false}
};

config.truncate = function (str, len) {
  if (str.length <= len) return str;
  var frontChars = Math.ceil((len - 3) / 2);
  var backChars = Math.floor((len - 3) / 2);
  return str.substr(0, frontChars) + '...' + str.substr(str.length - backChars);
};

config.log = function (e) {
  if (config.addon.log) {
    var url = config.truncate(e.url, 40);
    var tab = config.truncate(e.tab, 40);
    var method = (e.header.checked_s ? 'Using Tab URL' : 'Using Exact URL');
    var name = e.header.checked_a ? ">> Add" : (e.header.checked_m ? ">> Modify" : (e.header.checked_r ? ">> Delete" : ">> No Action"));
    console.error(name, e.name, 'for URL', url, 'Matched', e.key, method, tab);
  }
};

config.hostname = function (url) {
  url = url.replace("www.", '');
  var s = url.indexOf("//") + 2;
  if (s > 1) {
    var o = url.indexOf('/', s);
    if (o > 0) return url.substring(s, o);
    else {
      o = url.indexOf('?', s);
      if (o > 0) return url.substring(s, o);
      else return url.substring(s);
    }
  } else return url;
};

config.toolbar = {
  "icon": function () {
    var state = config.addon.state;
    app.button.label = "Modify Header Value: " + state;
    app.button.icon = {
      "path": {
        "16": "../../data/icons/" + (state ? state + '/' : '') + "16.png",
        "32": "../../data/icons/" + (state ? state + '/' : '') + "32.png",
        "48": "../../data/icons/" + (state ? state + '/' : '') + "48.png",
        "64": "../../data/icons/" + (state ? state + '/' : '') + "64.png"
      }
    };
  }
};
