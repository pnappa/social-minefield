var app = {};

app.version = function () {return chrome.runtime.getManifest().version};
app.homepage = function () {return chrome.runtime.getManifest().homepage_url};

app.button = {
  set icon (o) {chrome.browserAction.setIcon(o)},
  set label (label) {chrome.browserAction.setTitle({"title": label})}
};

app.tab = {
  "openOptions": function () {chrome.runtime.openOptionsPage()},
  "open": function (url) {chrome.tabs.create({"url": url, "active": true})},
  "active": {"reload": function () {chrome.tabs.reload({"bypassCache": true})}}
};

if (!navigator.webdriver) {
  chrome.runtime.setUninstallURL(app.homepage() + "?v=" + app.version() + "&type=uninstall", function () {});
  chrome.runtime.onInstalled.addListener(function (e) {
    chrome.management.getSelf(function (result) {
      if (result.installType === "normal") {
        window.setTimeout(function () {
          var previous = e.previousVersion !== undefined && e.previousVersion !== app.version();
          var doupdate = previous && parseInt((Date.now() - config.welcome.lastupdate) / (24 * 3600 * 1000)) > 45;
          if (e.reason === "install" || (e.reason === "update" && doupdate)) {
            var parameter = (e.previousVersion ? "&p=" + e.previousVersion : '') + "&type=" + e.reason;
            app.tab.open(app.homepage() + "?v=" + app.version() + parameter);
            config.welcome.lastupdate = Date.now();
          }
        }, 3000);
      }
    });
  });
}

app.storage = (function () {
  var objs = {};
  window.setTimeout(function () {
    chrome.storage.local.get(null, function (o) {
      objs = o;
      var script = document.createElement("script");
      script.src = "../common.js";
      document.body.appendChild(script);
    });
  }, 300);
  /*  */
  return {
    "read": function (id) {return objs[id]},
    "write": function (id, data, callback) {
      var tmp = {};
      tmp[id] = data;
      objs[id] = data;
      chrome.storage.local.set(tmp, callback);
    }
  }
})();

app.popup = (function () {
  var tmp = {};
  chrome.runtime.onMessage.addListener(function (request) {
    for (var id in tmp) {
      if (tmp[id] && (typeof tmp[id] === "function")) {
        if (request.path === 'popup-to-background') {
          if (request.method === id) tmp[id](request.data);
        }
      }
    }
  });
  /*  */
  return {
    "receive": function (id, callback) {tmp[id] = callback},
    "send": function (id, data) {
      chrome.runtime.sendMessage({
        "data": data,
        "method": id,
        "path": "background-to-popup"
      }, function () {
        return chrome.runtime.lastError;
      });
    }
  }
})();

app.options = (function () {
  var tmp = {};
  chrome.runtime.onMessage.addListener(function (request) {
    for (var id in tmp) {
      if (tmp[id] && (typeof tmp[id] === "function")) {
        if (request.path === "options-to-background") {
          if (request.method === id) tmp[id](request.data);
        }
      }
    }
  });
  /*  */
  return {
    "receive": function (id, callback) {tmp[id] = callback},
    "send": function (id, data, tabId) {
      chrome.runtime.sendMessage({
        "data": data,
        "method": id,
        "path": "background-to-options"
      }, function () {
        return chrome.runtime.lastError;
      });
    }
  }
})();

app.request = {
  "result": null,
  "headers": function (callback) {app.request.result = callback},
  "listener": function () {
    var options = ["blocking", "requestHeaders"];
    var filter = {"urls" : ["http://*/*", "https://*/*"]};
    /*  */
    config.toolbar.icon();
    chrome.webRequest.onBeforeSendHeaders.removeListener(app.request.method);
    if (config.addon.state === "enabled") {
      chrome.webRequest.onBeforeSendHeaders.addListener(app.request.method, filter, options);
    }
  },
  "method": function (info) {
    var top = {};
    var url = info.url;
    var id = info.tabId;
    var type = info.type;
    var docurl = info.documentUrl;
    var initiator = info.initiator;
    /*  */
    if (url.indexOf("http") === 0 || url.indexOf("ftp") === 0) {
      top[id] = initiator ? initiator : (docurl ? docurl : (type === "main_frame" ? url : ''));
      if (app.request.result) {
        return app.request.result(top[id], info);
      }
    }
  }
};
