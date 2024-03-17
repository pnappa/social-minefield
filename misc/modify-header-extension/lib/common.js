app.request.headers(function (top, info) {
  try {
    var o = {};
    o.url = info.url;
    o.headers = info.requestHeaders;
    for (var i = 0; i < config.header.array.length; i++) {
      o.header = config.header.array[i];
      if (o.header.state === "active") {
        o.name = o.header.name;
        o.value = o.header.value;
        o.tab = o.header.checked_s ? top : o.url;
        o.key = o.header.checked_d ? config.hostname(o.header.url) : o.header.url;
        /*  */
        var action = o.key === '*' || (o.tab && o.tab.indexOf(o.key) !== -1);
        if (action) {
          for (var j = 0; j < o.headers.length; j++) {
            /*  add  */
            if (o.header.checked_a) {
              o.headers.push({"name": o.name, "value": o.value});
              config.log(o);
              break;
            }
            /* modify */
            if (o.header.checked_m) {
              if (o.headers[j].name.toLowerCase() === o.name.toLowerCase()) {
                o.headers[j].value = o.value;
                config.log(o);
                break;
              }
            }
            /* remove */
            if (o.header.checked_r) {
              if (o.headers[j].name.toLowerCase() === o.name.toLowerCase()) {
                o.headers.splice(j, 1);
                config.log(o);
                break;
              }
            }
          }
        }
      }
    }
    /*  */
    return {"requestHeaders": o.headers};
  } catch (e) {}
});

app.options.receive("load", function () {
  app.options.send("storage", {
    "log": config.addon.log,
    "headerArray": config.header.array
  });
});

app.options.receive("log", function (e) {config.addon.log = e});
app.options.receive("store", function (e) {config.header.array = e.headerArray});

app.popup.receive("state", function () {
  config.addon.state = (config.addon.state === "disabled") ? "enabled" : "disabled";
  app.popup.send("storage", {"state": config.addon.state});
  app.request.listener();
});

app.popup.receive("options", app.tab.openOptions);
app.popup.receive("reload", app.tab.active.reload);
app.popup.receive("support", function () {app.tab.open(app.homepage())});
app.popup.receive("donation", function () {app.tab.open(app.homepage() + "?reason=support")});
app.popup.receive("load", function () {app.popup.send("storage", {"state": config.addon.state})});

window.setTimeout(app.request.listener, 300);
