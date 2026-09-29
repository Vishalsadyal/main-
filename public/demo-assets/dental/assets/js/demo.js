// Demo page behaviour: mobile menu, sticky header, back-to-top, and optional
// privacy-light click tracking (event name + page only — no personal data).
(function () {
	"use strict";

	var body = document.body;
	var toggler = document.querySelector(".w3menu-toggler");
	var menu = toggler && document.querySelector(toggler.getAttribute("data-target"));
	var closer = document.querySelector(".menu-close");

	function closeMenu() {
		if (!menu) return;
		toggler.classList.remove("open");
		body.classList.remove("fixed");
		menu.classList.remove("show");
	}
	if (toggler && menu) {
		toggler.addEventListener("click", function () {
			toggler.classList.add("open");
			body.classList.add("fixed");
			menu.classList.add("show");
		});
		if (closer) closer.addEventListener("click", closeMenu);
		menu.querySelectorAll("a[href^='#']").forEach(function (link) {
			link.addEventListener("click", closeMenu);
		});
	}

	var sticky = document.querySelector(".sticky-header");
	var scrollTop = document.querySelector(".scroltop");
	window.addEventListener("scroll", function () {
		var y = window.scrollY;
		if (sticky) sticky.classList.toggle("is-fixed", y > sticky.offsetTop);
		if (scrollTop) scrollTop.classList.toggle("show", y > 500);
	}, { passive: true });
	if (scrollTop) {
		scrollTop.addEventListener("click", function () { window.scrollTo({ top: 0, behavior: "smooth" }); });
	}

	var ribbon = document.querySelector(".demo-ribbon");
	var ribbonClose = document.querySelector(".demo-ribbon-close");
	if (ribbon && ribbonClose) {
		ribbonClose.addEventListener("click", function () { ribbon.hidden = true; });
	}

	var isPreview = /[?&]preview=1/.test(location.search);
	function track(event) {
		var url = window.DEMO_TRACKING_URL;
		if (!url || isPreview) return;
		var payload = JSON.stringify({ event: event, page: location.pathname });
		try {
			if (navigator.sendBeacon) {
				navigator.sendBeacon(url, new Blob([payload], { type: "application/json" }));
			} else {
				fetch(url, { method: "POST", body: payload, headers: { "Content-Type": "application/json" }, keepalive: true });
			}
		} catch (e) { /* tracking must never break the page */ }
	}
	track("view");
	document.addEventListener("click", function (event) {
		var el = event.target.closest("[data-track]");
		if (el) track(el.getAttribute("data-track"));
	});
})();
