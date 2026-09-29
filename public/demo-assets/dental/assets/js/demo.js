// Demo page behaviour: mobile menu, sticky header, back-to-top, and visit tracking
// (opens, button clicks, sections seen, scroll depth, time on page).
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

	// ---- Tracking. The server adds IP, approximate location and device.
	// Preview visits (?preview=1, used by the dashboard) are never counted.
	var isPreview = /[?&]preview=1/.test(location.search);
	var visitor = (function () {
		try {
			var id = localStorage.getItem("w3demo_visitor");
			if (!id) {
				id = Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
				localStorage.setItem("w3demo_visitor", id);
			}
			return id;
		} catch (e) { return ""; }
	})();

	function track(event, detail) {
		var url = window.DEMO_TRACKING_URL;
		if (!url || isPreview) return;
		var payload = JSON.stringify({
			event: event, page: location.pathname, detail: detail === undefined ? "" : String(detail),
			visitor: visitor, referrer: event === "view" ? document.referrer : ""
		});
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

	// Sections the visitor actually looked at (at least 40% on screen), once each.
	if ("IntersectionObserver" in window) {
		var seen = {};
		var observer = new IntersectionObserver(function (entries) {
			entries.forEach(function (entry) {
				var name = entry.target.getAttribute("data-section");
				if (entry.isIntersecting && !seen[name]) {
					seen[name] = true;
					track("section", name);
					observer.unobserve(entry.target);
				}
			});
		}, { threshold: 0.4 });
		document.querySelectorAll("[data-section]").forEach(function (el) { observer.observe(el); });
	}

	// Scroll depth milestones.
	var marks = [25, 50, 75, 100], reached = 0;
	window.addEventListener("scroll", function () {
		var height = document.documentElement.scrollHeight - window.innerHeight;
		var pct = height > 0 ? Math.round(window.scrollY / height * 100) : 100;
		while (reached < marks.length && pct >= marks[reached] - 2) {
			track("scroll", marks[reached]);
			reached++;
		}
	}, { passive: true });

	// Time the page was actually on screen, sent when the visitor leaves or switches away.
	var visibleSince = document.visibilityState === "visible" ? Date.now() : 0;
	var activeMs = 0;
	document.addEventListener("visibilitychange", function () {
		if (document.visibilityState === "hidden") {
			if (visibleSince) activeMs += Date.now() - visibleSince;
			visibleSince = 0;
			var seconds = Math.round(activeMs / 1000);
			activeMs = 0;
			if (seconds >= 2) track("leave", Math.min(seconds, 3600));
		} else {
			visibleSince = Date.now();
		}
	});
})();
