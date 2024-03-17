var background = (function () {
  var tmp = {};
  chrome.runtime.onMessage.addListener(function (request) {
    for (var id in tmp) {
      if (tmp[id] && (typeof tmp[id] === "function")) {
        if (request.path === "background-to-options") {
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
        "path": "options-to-background"
      }, function () {
        return chrome.runtime.lastError;
      });
    }
  }
})();

var config = {
  "header": {"array": []},
  "store": function (render) {
    background.send("store", {"headerArray": config.header.array});
    if (render) config.render({"headerArray": config.header.array});
  },
  "load": function () {
    document.getElementById("input-field-add").addEventListener("click", config.storage.add);
    document.getElementById("explore").style.display = navigator.userAgent.indexOf("Edg") !== -1 ? "none": "block";
    document.getElementById("console-log").addEventListener("click", function (e) {background.send("log", e.target.checked)});
    document.getElementById("input-field").addEventListener("keypress", function (e) {
      if ((e.which || e.keyCode) === 13) {
        config.storage.add();
      }
    });
    /*  */
    background.send("load");
    window.removeEventListener("load", config.load, false);
  },
  "handle": {
    "checkbox": function (e) {
      var tr = e.target.closest("tr");
      if (tr) {
        var add = tr.querySelector("input[rule='add']");
        var modify = tr.querySelector("input[rule='modify']");
        var remove = tr.querySelector("input[rule='remove']");
        /*  */
        if (e.target.getAttribute("rule") === "add") {
          modify.checked = false;
          remove.checked = false;
        }
        /*  */
        if (e.target.getAttribute("rule") === "modify") {
          add.checked = false;
          remove.checked = false;
        }
        /*  */
        if (e.target.getAttribute("rule") === "remove") {
          add.checked = false;
          modify.checked = false;
        }
      }
    }
  },
  "storage": {
    "remove": function (e) {
      var tr = e.target.closest("tr");
      if (tr) {
        var index = tr.getAttribute("index");
        if (index !== undefined) {
          var tmp = [...config.header.array].reverse();
          tmp.splice(index, 1);
          config.header.array = tmp.reverse();
          config.store(true);
        }
      }
    },
    "state": function (e) {
      var tr = e.target.closest("tr");
      if (tr) {
        var index = tr.getAttribute("index");
        if (index !== undefined) {
          var tmp = [...config.header.array].reverse();
          tmp[index].state = tmp[index].state === "active" ? "inactive" : "active";
          config.header.array = tmp.reverse();
          config.store(true);
        }
      }
    },
    "update": function (e, render) {
      config.handle.checkbox(e);
      /*  */
      var tmp = [];
      var tbody = document.getElementById("header-value-tbody");
      var trs = [...tbody.querySelectorAll("tr")];
      /*  */
      if (trs && trs.length) {
        for (var i = 0; i < trs.length; i++) {
          if (trs[i]) {
            tmp.push({
              "url": trs[i].querySelector("input[rule='url']").value.trim(),
              "name": trs[i].querySelector("input[rule='name']").value.trim(),
              "value": trs[i].querySelector("input[rule='value']").value.trim(),
              "state": trs[i].querySelector("td[type='toggle']").textContent,
              "checked_d": trs[i].querySelector("input[rule='domain']").checked,
              "checked_s": trs[i].querySelector("input[rule='sub']").checked,
              "checked_a": trs[i].querySelector("input[rule='add']").checked,
              "checked_m": trs[i].querySelector("input[rule='modify']").checked,
              "checked_r": trs[i].querySelector("input[rule='remove']").checked
            });
          }
        }
      }
      /*  */
      if (tmp && tmp.length) {
        if (tmp.length === config.header.array.length) {
          config.header.array = tmp.reverse();
          config.store(render ? render : false);
        }
      }
    },
    "add": function () {
      var obj = {
        "url": '',
        "name": '',
        "value": '',
        "state": "active",
        "checked_d": true,
        "checked_s": true,
        "checked_a": true,
        "checked_m": false,
        "checked_r": false
      };
      /*  */
      var tr = document.getElementById("input-field");
      var url = tr.children[0].children[0];
      var name = tr.children[1].children[0];
      var value = tr.children[2].children[0];
      /*  */
      if (url.value.trim() !== '*') {
        try {
          obj.url = new URL(url.value.trim()).href;
        } catch (e) {
          obj.url = '';
        }
      } else obj.url = url.value.trim();
      /*  */
      url.value = obj.url;
      obj.name = name.value.trim();
      obj.value = value.value.trim();
      if (config.header.array && config.header.array.length) {
        config.header.array = config.header.array.filter(function (e) {
          return e.url !== obj.url || e.name !== obj.name || e.value !== obj.value;
        });
      }
      /*  */
      config.header.array.push(obj);
      config.store(true);
    }
  },
  "render": function (o) {
    var count = 1;
    var tbody = document.getElementById("header-value-tbody");
    document.getElementById("console-log").checked = o.log ? true : false;
    config.header.array = o.headerArray !== undefined ? o.headerArray : [];
    /*  */
    tbody.textContent = '';
    for (var i = config.header.array.length - 1; i >= 0; i--) {
      var url = document.createElement("td");
      var sub = document.createElement("td");
      var add = document.createElement("td");
      var name = document.createElement("td");
      var close = document.createElement("td");
      var value = document.createElement("td");
      var toggle = document.createElement("td");
      var header = document.createElement("tr");
      var number = document.createElement("td");
      var modify = document.createElement("td");
      var domain = document.createElement("td");
      var remove = document.createElement("td");
      var input_d = document.createElement("input");
      var input_s = document.createElement("input");
      var input_a = document.createElement("input");
      var input_m = document.createElement("input");
      var input_r = document.createElement("input");
      var input_u = document.createElement("input");
      var input_n = document.createElement("input");
      var input_v = document.createElement("input");
      /*  */
      url.setAttribute("type", "url");
      sub.setAttribute("type", "check");
      name.setAttribute("type", "name");
      add.setAttribute("type", "check");
      value.setAttribute("type", "value");
      close.setAttribute("type", "close");
      domain.setAttribute("type", "check");
      modify.setAttribute("type", "check");
      remove.setAttribute("type", "check");
      toggle.setAttribute("type", "toggle");
      number.setAttribute("type", "number");
      /*  */
      close.textContent = '⛌';
      number.textContent = count;
      input_u.value = config.header.array[i].url;
      input_n.value = config.header.array[i].name;
      input_v.value = config.header.array[i].value;
      toggle.textContent = config.header.array[i].state;
      /*  */
      input_s.setAttribute("rule", "sub");
      input_a.setAttribute("rule", "add");
      input_u.setAttribute("rule", "url");
      input_u.setAttribute("type", "text");
      input_n.setAttribute("type", "text");
      input_n.setAttribute("rule", "name");
      input_v.setAttribute("type", "text");
      input_v.setAttribute("rule", "value");
      input_d.setAttribute("rule", "domain");
      input_m.setAttribute("rule", "modify");
      input_r.setAttribute("rule", "remove");
      input_d.setAttribute("type", "checkbox");
      input_s.setAttribute("type", "checkbox");
      input_a.setAttribute("type", "checkbox");
      input_m.setAttribute("type", "checkbox");
      input_r.setAttribute("type", "checkbox");
      /*  */
      input_d.checked = config.header.array[i].checked_d;
      input_s.checked = config.header.array[i].checked_s;
      input_a.checked = config.header.array[i].checked_a;
      input_m.checked = config.header.array[i].checked_m;
      input_r.checked = config.header.array[i].checked_r;
      /*  */
      close.addEventListener("click", config.storage.remove);
      toggle.addEventListener("click", config.storage.state);
      input_d.addEventListener("change", config.storage.update);
      input_s.addEventListener("change", config.storage.update);
      input_a.addEventListener("change", config.storage.update);
      input_m.addEventListener("change", config.storage.update);
      input_r.addEventListener("change", config.storage.update);
      input_u.addEventListener("change", config.storage.update);
      input_n.addEventListener("change", config.storage.update);
      input_v.addEventListener("change", config.storage.update);
      /*  */
      header.setAttribute("index", count - 1);
      toggle.setAttribute("state", config.header.array[i].state);
      header.setAttribute("state", config.header.array[i].state);
      /*  */
      url.appendChild(input_u);
      domain.appendChild(input_d);
      sub.appendChild(input_s);
      name.appendChild(input_n);
      add.appendChild(input_a);
      modify.appendChild(input_m);
      remove.appendChild(input_r);
      value.appendChild(input_v);
      /*  */
      header.appendChild(number);
      header.appendChild(url);
      header.appendChild(domain);
      header.appendChild(sub);
      header.appendChild(name);
      header.appendChild(add);
      header.appendChild(modify);
      header.appendChild(remove);
      header.appendChild(value);
      header.appendChild(toggle);
      header.appendChild(close);
      tbody.appendChild(header);
      count++;
    }
    /*  */
    Sortable.create(tbody, {
      "items": "tr",
      "animation": 200,
      "onEnd": function (e) {
        config.storage.update(e, true);
      }
    });
  }
};

background.receive("storage", config.render);
window.addEventListener("load", config.load, false);
