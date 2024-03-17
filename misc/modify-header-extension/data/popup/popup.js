var background = (function () {
  var tmp = {};
  chrome.runtime.onMessage.addListener(function (request) {
    for (var id in tmp) {
      if (tmp[id] && (typeof tmp[id] === "function")) {
        if (request.path == "background-to-popup") {
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
        "method": id, 
        "data": data,
        "path": "popup-to-background"
      }, function () {
        return chrome.runtime.lastError;
      });
    }
  }
})();

var load = function () {
  var reload = document.querySelector(".reload");
  var toggle = document.querySelector(".toggle");
  var options = document.querySelector(".options");
  var support = document.querySelector(".support");
  var donation = document.querySelector(".donation");
  /*  */
  toggle.addEventListener("click", function () {background.send("state")});
  reload.addEventListener("click", function () {background.send("reload")});
  options.addEventListener("click", function () {background.send("options")});
  support.addEventListener("click", function () {background.send("support")});
  donation.addEventListener("click", function () {background.send("donation")});
  /*  */
  background.send("load");
  window.removeEventListener("load", load, false);
};

background.receive("storage", function (e) {
  var toggle = document.querySelector(".toggle");
  toggle.setAttribute("state", e.state);
});

window.addEventListener("load", load, false);
