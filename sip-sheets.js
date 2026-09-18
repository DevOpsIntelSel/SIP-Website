(function () {
  var WEBHOOK = "https://script.google.com/macros/s/AKfycbwHYM6hoyvUoqf_qKIqN6jJCqg_3PEzfQZ3Uw8z5kNVhdbRW8VP0YuqXtT4yM7MFYmP/exec";

  function post(fields) {
    var body = new URLSearchParams();
    Object.keys(fields).forEach(function (key) {
      if (fields[key] === undefined || fields[key] === null) return;
      body.append(key, String(fields[key]));
    });
    return fetch(WEBHOOK, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
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

  document.querySelectorAll("form.form").forEach(function (form) {
    if (form.querySelector("textarea[name='message']")) bindContact(form);
    else bindWaitlist(form);
  });

  var calcTimer;
  ["meetings", "conv", "target", "close", "ltv"].forEach(function (id) {
    var el = document.getElementById(id);
    if (!el) return;
    el.addEventListener("input", function () {
      clearTimeout(calcTimer);
      calcTimer = setTimeout(function () {
        var fields = calculatorFields();
        if (fields) post(fields);
      }, 2000);
    });
  });
})();
