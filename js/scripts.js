document.addEventListener("DOMContentLoaded", function () {
  var nav = document.getElementById("mainNav");
  var navToggle = document.getElementById("navToggle");
  var navLinks = document.querySelectorAll(".nav-links a");
  var sections = document.querySelectorAll("main section[id]");
  var backToTop = document.getElementById("backToTop");

  // Scrolled / open nav state
  function onScroll() {
    if (window.scrollY > 24) {
      nav.classList.add("scrolled");
    } else {
      nav.classList.remove("scrolled");
    }
    if (backToTop) {
      backToTop.classList.toggle("show", window.scrollY > 500);
    }
    updateActiveLink();
  }

  function updateActiveLink() {
    var scrollPos = window.scrollY + 140;
    var current = null;
    sections.forEach(function (section) {
      if (section.offsetTop <= scrollPos) {
        current = section.getAttribute("id");
      }
    });
    navLinks.forEach(function (link) {
      link.classList.toggle("active", link.getAttribute("href") === "#" + current);
    });
  }

  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  // Mobile nav toggle
  if (navToggle) {
    navToggle.addEventListener("click", function () {
      nav.classList.toggle("open");
    });
    navLinks.forEach(function (link) {
      link.addEventListener("click", function () {
        nav.classList.remove("open");
      });
    });
  }

  // Reveal on scroll
  var revealEls = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window) {
    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
    );
    revealEls.forEach(function (el) { observer.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add("is-visible"); });
  }

  // Typewriter role rotator
  var roleEl = document.getElementById("roleText");
  if (roleEl) {
    var roles = [
      "Research Intern @ ÉTS Montréal",
      "AI Engineer",
      "Full-Stack Developer",
      "Machine Learning Researcher",
      "Big Data Engineer",
      "Mobile App Developer",
    ];
    var roleIndex = 0;
    var charIndex = 0;
    var deleting = false;

    function tick() {
      var current = roles[roleIndex];
      if (!deleting) {
        charIndex++;
        roleEl.textContent = current.slice(0, charIndex);
        if (charIndex === current.length) {
          deleting = true;
          setTimeout(tick, 1600);
          return;
        }
      } else {
        charIndex--;
        roleEl.textContent = current.slice(0, charIndex);
        if (charIndex === 0) {
          deleting = false;
          roleIndex = (roleIndex + 1) % roles.length;
        }
      }
      setTimeout(tick, deleting ? 35 : 65);
    }
    tick();
  }

  // Back to top
  if (backToTop) {
    backToTop.addEventListener("click", function () {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  // Copy email to clipboard
  var copyBtns = document.querySelectorAll("[data-copy]");
  var toast = document.getElementById("toast");
  copyBtns.forEach(function (btn) {
    btn.addEventListener("click", function (e) {
      var value = btn.getAttribute("data-copy");
      if (navigator.clipboard) {
        e.preventDefault();
        navigator.clipboard.writeText(value).then(function () {
          showToast("Email copied to clipboard");
        });
      }
    });
  });

  function showToast(message) {
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add("show");
    setTimeout(function () { toast.classList.remove("show"); }, 2200);
  }

  // Footer year
  var yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();
});
