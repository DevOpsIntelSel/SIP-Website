(function () {
  var WEBHOOK = "https://script.google.com/macros/s/AKfycbwHYM6hoyvUoqf_qKIqN6jJCqg_3PEzfQZ3Uw8z5kNVhdbRW8VP0YuqXtT4yM7MFYmP/exec";

  function post(fields) {
    return new Promise(function (resolve) {
      var frame = document.getElementById("sip-sheets-frame");
      if (!frame) {
        frame = document.createElement("iframe");
        frame.id = "sip-sheets-frame";
        frame.name = "sip-sheets-frame";
        frame.hidden = true;
        frame.setAttribute("aria-hidden", "true");
        document.body.appendChild(frame);
      }
      var form = document.createElement("form");
      form.method = "POST";
      form.action = WEBHOOK;
      form.target = frame.name;
      form.acceptCharset = "UTF-8";
      form.hidden = true;
      Object.keys(fields).forEach(function (key) {
        if (fields[key] === undefined || fields[key] === null) return;
        var input = document.createElement("input");
        input.type = "hidden";
        input.name = key;
        input.value = String(fields[key]);
        form.appendChild(input);
      });
      document.body.appendChild(form);
      form.submit();
      setTimeout(function () {
        form.remove();
        resolve(null);
      }, 800);
    });
  }

  function formFields(form) {
    var data = {};
    new FormData(form).forEach(function (value, key) {
      data[key] = typeof value === "string" ? value.trim() : value;
    });
    return data;
  }

  function pageName() {
    var file = (location.pathname.split("/").pop() || "index.html");
    return file || "index.html";
  }

  function calculatorFields() {
    var meetings = document.getElementById("meetings");
    var conv = document.getElementById("conv");
    var target = document.getElementById("target");
    var close = document.getElementById("close");
    var ltv = document.getElementById("ltv");
    if (!meetings || !conv || !target || !close || !ltv) return null;
    var totalText = ((document.getElementById("total") || {}).textContent || "").replace(/[^0-9.-]/g, "");
    return {
      tab: "Calculations",
      page: pageName(),
      source: "calculator",
      firstMeetingsPerYear: meetings.value,
      currentConversionPercent: conv.value,
      targetConversionPercent: target.value,
      closeRatePercent: close.value,
      customerLifetimeValue: ltv.value,
      additionalSecondMeetings: ((document.getElementById("addm") || {}).textContent || "").trim(),
      additionalClosedCustomers: ((document.getElementById("addc") || {}).textContent || "").trim(),
      additionalCustomerValue: totalText,
    };
  }

  function setStatus(form, text, isError) {
    var el = form.querySelector(".fine");
    if (!el) return;
    if (!el.dataset.original) el.dataset.original = el.innerHTML;
    if (isError) {
      el.innerHTML = text;
      el.style.color = "#F87171";
    } else {
      el.innerHTML = text || el.dataset.original;
      el.style.color = "";
    }
  }

  function bindWaitlist(form) {
    form.addEventListener("submit", function (event) {
      event.preventDefault();
      if (!form.checkValidity()) {
        form.reportValidity();
        return;
      }
      var btn = form.querySelector(".btn");
      var original = btn.textContent;
      btn.disabled = true;
      btn.textContent = "Sending…";
      setStatus(form);
      var payload = Object.assign(
        { tab: "Waitlist", source: "waitlist", page: pageName() },
        formFields(form)
      );
      post(payload)
        .then(function () {
          if (window.SIP && typeof window.SIP.computeRoi === "function") {
            window.SIP.computeRoi();
          }
          var calc = calculatorFields();
          if (!calc) return;
          calc.firstName = payload.firstName || "";
          calc.lastName = payload.lastName || "";
          calc.email = payload.email || "";
          calc.source = "waitlist";
          return post(calc);
        })
        .then(function () {
          btn.textContent = "You are on the waitlist";
          form.querySelectorAll("input, select").forEach(function (el) {
            el.disabled = true;
          });
        })
        .catch(function () {
          btn.disabled = false;
          btn.textContent = original;
          setStatus(form, "We could not send that. Please try again.", true);
        });
    });
  }

  function bindContact(form) {
    form.addEventListener("submit", function (event) {
      event.preventDefault();
      if (!form.checkValidity()) {
        form.reportValidity();
        return;
      }
      var btn = form.querySelector(".btn");
      var original = btn.textContent;
      btn.disabled = true;
      btn.textContent = "Sending…";
      setStatus(form);
      var payload = Object.assign(
        { tab: "Contacts", source: "contact", page: pageName() },
        formFields(form)
      );
      post(payload)
        .then(function () {
          btn.textContent = "Sent. Thank you.";
          form.querySelectorAll("input, select, textarea").forEach(function (el) {
            el.disabled = true;
          });
        })
        .catch(function () {
          btn.disabled = false;
          btn.textContent = original;
          setStatus(form, "We could not send that. Please try again.", true);
        });
    });
  }

  function bindCalculate() {
    var buttons = document.querySelectorAll(".js-roi-calculate");
    if (!buttons.length) return;
    buttons.forEach(function (btn) {
      btn.addEventListener("click", function () {
        if (window.SIP && typeof window.SIP.computeRoi === "function") {
          window.SIP.computeRoi();
        }
        var fields = calculatorFields();
        if (!fields) return;
        buttons.forEach(function (el) {
          el.disabled = true;
          el.textContent = "Saving…";
        });
        post(fields)
          .then(function () {
            buttons.forEach(function (el) {
              el.disabled = false;
              el.textContent = "Calculated";
            });
            setTimeout(function () {
              buttons.forEach(function (el) {
                if (el.textContent === "Calculated") el.textContent = "Calculate";
              });
            }, 1600);
          })
          .catch(function () {
            buttons.forEach(function (el) {
              el.disabled = false;
              el.textContent = "Calculate";
            });
          });
      });
    });
  }

  document.querySelectorAll("form.form").forEach(function (form) {
    if (form.querySelector("textarea[name='message']")) bindContact(form);
    else bindWaitlist(form);
  });
  bindCalculate();
})();
