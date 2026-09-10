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
	var dots = [];

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
		/* Nearer dots drift farther, so the field reads as depth rather than
		   one flat sheet sliding about. */
		var swing = 22 + (1 - depth) * 26;
		dot.style.setProperty('--driftx', ((rand() - 0.5) * swing).toFixed(1) + 'px');
		dot.style.setProperty('--drifty', ((rand() - 0.5) * swing).toFixed(1) + 'px');
		dot.style.setProperty('--scale', (0.86 + rand() * 0.3).toFixed(2));
		dot.style.setProperty('--dur', (6 + rand() * 7).toFixed(1) + 's');
		/* Offset each drift so the field never breathes in unison. */
		dot.style.setProperty('--ddelay', (depth * 0.75 + rand() * 5).toFixed(2) + 's');

		wrap.appendChild(dot);
		frag.appendChild(wrap);
		dots.push({ el: wrap, x: x, y: y, depth: depth, ox: 0, oy: 0 });
	}

	svg.appendChild(frag);

	/* Two frames so the initial scattered transform is painted before we
	   transition to the settled state. */
	requestAnimationFrame(function () {
		requestAnimationFrame(function () {
			svg.classList.add('is-settled');
		});
	});

	/* ── the cursor ────────────────────────────────────────────────────────
	 * Dots get out of the way of the pointer and ease back once it passes —
	 * layered on top of the CSS drift, which keeps running underneath.
	 * The field sits behind the headline, so moving over the text stirs it. */

	if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

	var REACH = 135;   /* how far the cursor's influence carries, in viewBox units */
	var PUSH = 58;     /* how far a dot at the very centre of that gets shoved */
	var EASE = 0.11;   /* per-frame approach — lower is looser, slower to recover */

	var ctm = null;
	var px = 0, py = 0;
	var engaged = false;
	var frame = 0;

	function forgetCtm() { ctm = null; }
	window.addEventListener('resize', forgetCtm);
	window.addEventListener('scroll', forgetCtm, { passive: true });

	/* Client pixels → viewBox units, so the maths below can work in the same
	   coordinates the dots were laid out in. */
	function toField(clientX, clientY) {
		if (!ctm) {
			var m = svg.getScreenCTM();
			if (!m) return null;
			ctm = m.inverse();
		}
		var p = svg.createSVGPoint();
		p.x = clientX;
		p.y = clientY;
		return p.matrixTransform(ctm);
	}

	function tick() {
		var busy = false;

		for (var j = 0; j < dots.length; j++) {
			var d = dots[j];
			var tx = 0, ty = 0;

			if (engaged) {
				var vx = d.x - px;
				var vy = d.y - py;
				var dist = Math.sqrt(vx * vx + vy * vy);
				if (dist < REACH) {
					if (dist < 0.001) { vx = 1; vy = 0; dist = 1; }
					/* Squared falloff, and the nearer (bigger) dots shove hardest. */
					var f = (1 - dist / REACH);
					f = f * f * PUSH * (1.15 - d.depth * 0.5);
					tx = vx / dist * f;
					ty = vy / dist * f;
				}
			}

			d.ox += (tx - d.ox) * EASE;
			d.oy += (ty - d.oy) * EASE;

			if (Math.abs(d.ox) > 0.04 || Math.abs(d.oy) > 0.04) busy = true;
			else { d.ox = 0; d.oy = 0; }

			d.el.style.transform =
				'translate(' + d.ox.toFixed(2) + 'px,' + d.oy.toFixed(2) + 'px)';
		}

		/* Idle when everything is home again — nothing spins in the background. */
		frame = busy ? requestAnimationFrame(tick) : 0;
	}

	function wake() { if (!frame) frame = requestAnimationFrame(tick); }

	/* Only take over the wrappers once the entrance transition is done with
	   them; an inline transform before that would cut the settle short. */
	window.setTimeout(function () {
		svg.classList.add('is-live');

		window.addEventListener('pointermove', function (e) {
			var p = toField(e.clientX, e.clientY);
			if (!p) return;
			px = p.x;
			py = p.y;
			engaged = true;
			wake();
		}, { passive: true });

		var letGo = function () { engaged = false; wake(); };
		document.addEventListener('pointerleave', letGo);
		document.addEventListener('pointercancel', letGo);
		window.addEventListener('blur', letGo);
	}, 2800);
})();
