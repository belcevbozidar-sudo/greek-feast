/* Общи помощни функции: цени (евро + автоматично левове) и безопасно екраниране.
   Зарежда се като обикновен скрипт на всяка страница ПРЕДИ останалите. */
(function () {
  // Официален фиксиран курс на БНБ: 1 EUR = 1.95583 BGN.
  var BGN_PER_EUR = 1.95583;
  window.BGN_PER_EUR = BGN_PER_EUR;

  function toEur(n) {
    var v = parseFloat(n);
    return isFinite(v) ? v : 0;
  }

  window.eurToBgn = function (eur) {
    return Math.round(toEur(eur) * BGN_PER_EUR * 100) / 100;
  };

  window.formatEur = function (eur) {
    return toEur(eur).toFixed(2) + " €";
  };

  window.formatBgn = function (eur) {
    return window.eurToBgn(eur).toFixed(2) + " лв";
  };

  // Екранира текст за безопасно вмъкване в HTML (защита от XSS).
  window.escapeHtml = function (str) {
    return String(str == null ? "" : str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  };

  // HTML блок за цена: евро (главна) + левове (конвертирано).
  window.priceHTML = function (eur, unit) {
    var u = unit ? ' <span class="unit">/ ' + window.escapeHtml(unit) + "</span>" : "";
    return (
      '<span class="price">' +
      window.escapeHtml(window.formatEur(eur)) +
      "</span>" +
      '<span class="price-bgn">' +
      window.escapeHtml(window.formatBgn(eur)) +
      "</span>" +
      u
    );
  };
})();
