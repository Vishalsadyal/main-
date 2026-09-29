const clinicmasterGsap = function(){
  
  gsap.registerPlugin(ScrollTrigger);

    var animateSplitTitle = function () {
		const titles = document.querySelectorAll(".split-title");

		titles.forEach((title) => {
			const words = title.innerText.split(" ");

			// Wrap words in span
			title.innerHTML = words.map(word => `<span class="word">${word}</span>`).join(" ");

			gsap.to(title.querySelectorAll(".word"), {
			scrollTrigger: {
				trigger: title,
				start: "top 80%",
				end: "bottom 20%",
				scrub: true
			},
			opacity: 1,
			duration: 0.8,
			stagger: 0.5
			});
		});
	}

	var animateSlider = function () {
		const el = document.querySelector(".dz-features");
		el.innerHTML = el.textContent.split("").map(char => {
			return `<span class="letter">${char}</span>`;
		}).join("");


		let tl = gsap.timeline({
			scrollTrigger: {
			trigger: el,
			start: "top 80%",
			toggleActions: "play none none none"
			},
			repeat: -1,       // infinite loop
			repeatDelay: 0.1  // small pause before repeating
		});

		// Step 1: yellow
		tl.to(".dz-features .letter", {
			color: "#141414",
			duration: 0.3,
			stagger: 0.05
		});

		// Step 2: red with slight overlap
		tl.to(".dz-features .letter", {
			color: "yellow",
			duration: 0.4,
			stagger: 0.05
		}, "<2.6");

		// Step 3: back to initial color
		tl.to(".dz-features .letter", {
			color: "#141414",
			x: 0,
			opacity: 1,
			duration: 0.6,
			ease: "power2.out",
			stagger: 0.05
		}, "<2.2");
	}

	var animateBox = function () {
		if ($(".counter-box").length > 0) {   // length check
			gsap.from(".counter-box", {
				scrollTrigger: {
					trigger: ".counter-wrapper",
					start: "top 80%",
				},
				x: -100,
				opacity: 0,
				duration: 1,
				ease: "power2.out",
				stagger: 0.4
			});
		}
	};

  return {
    init(){
      animateSplitTitle();
      animateSlider();
      animateBox();
    },
  };
};

$(document).ready(function () {
  clinicmasterGsap().init();
});
 

let resizeTimeout;
window.addEventListener("resize", () => {
  clearTimeout(resizeTimeout);
  resizeTimeout = setTimeout(() => {
    ScrollTrigger.refresh();
  }, 250);
});