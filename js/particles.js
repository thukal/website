/* Thukal — the hero particle field.
 *
 * "thukal" (துகள்) is Tamil for particle, and the logo is a cloud of dots
 * condensing into a T. This redraws that idea across the hero: the field
 * arrives scattered, settles left-to-right, then breathes.
 *
 * Positions come from a seeded PRNG so the composition is identical on every
 * load — it's a designed layout, not a random one. */

(function () {
	'use strict';

	var svg = document.getElementById('particles');
	var year = document.getElementById('year');
	var masthead = document.getElementById('masthead');

	if (year) year.textContent = new Date().getFullYear();

	/* Hairline under the masthead, but only once the page has moved. */
	if (masthead) {
		var onScroll = function () {
			masthead.classList.toggle('is-stuck', window.scrollY > 8);
		};
		window.addEventListener('scroll', onScroll, { passive: true });
		onScroll();
	}

	if (!svg) return;

	var NS = 'http://www.w3.org/2000/svg';
	var W = 620;
	var H = 460;
	var COUNT = 110;

	/* mulberry32 — small, fast, and repeatable */
	function seeded(seed) {
		return function () {
			seed |= 0;
			seed = (seed + 0x6D2B79F5) | 0;
			var t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
			t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
			return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
		};
	}

	var rand = seeded(20190412);
	var frag = document.createDocumentFragment();

	for (var i = 0; i < COUNT; i++) {
		/* Density falls off to the right: the cloud is thickest at the edge it
		   streams in from, thinning out behind the headline. */
		var t = rand();
		var x = Math.pow(t, 1.9) * W;
		var depth = x / W;

		/* Pull vertically toward the middle so the field reads as one drift,
		   not a rectangle of confetti. */
		var y = H / 2 + (rand() + rand() - 1) * H * 0.46;

		var r = (1.1 + rand() * 4.4) * (1 - depth * 0.45);

		/* Farther-out dots travel farther to get home. */
		var reach = 40 + depth * 110;
		var wrap = document.createElementNS(NS, 'g');
		wrap.setAttribute('class', 'dot-wrap');
		wrap.style.setProperty('--dx', ((rand() - 0.5) * reach).toFixed(1) + 'px');
		wrap.style.setProperty('--dy', ((rand() - 0.5) * reach).toFixed(1) + 'px');
		wrap.style.setProperty('--delay', (depth * 0.75 + rand() * 0.3).toFixed(3) + 's');

		var dot = document.createElementNS(NS, 'circle');
		dot.setAttribute('cx', x.toFixed(1));
		dot.setAttribute('cy', y.toFixed(1));
		dot.setAttribute('r', r.toFixed(2));
		dot.setAttribute('fill', 'url(#thukal-grad)');
		dot.style.setProperty('--driftx', ((rand() - 0.5) * 14).toFixed(1) + 'px');
		dot.style.setProperty('--drifty', ((rand() - 0.5) * 14).toFixed(1) + 'px');
		dot.style.setProperty('--dur', (5 + rand() * 6).toFixed(1) + 's');

		wrap.appendChild(dot);
		frag.appendChild(wrap);
	}

	svg.appendChild(frag);

	/* Two frames so the initial scattered transform is painted before we
	   transition to the settled state. */
	requestAnimationFrame(function () {
		requestAnimationFrame(function () {
			svg.classList.add('is-settled');
		});
	});
})();
