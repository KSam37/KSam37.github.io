// Scroll-reveal
const observer = new IntersectionObserver(
  (entries) => {
    for (const e of entries) {
      if (e.isIntersecting) {
        e.target.classList.add("visible");
        observer.unobserve(e.target);
      }
    }
  },
  { threshold: 0.08 }
);
document.querySelectorAll(".reveal").forEach((el) => observer.observe(el));

// Scroll progress bar
const progress = document.getElementById("progress");
if (progress) {
  const onScroll = () => {
    const h = document.documentElement;
    const scrolled = h.scrollTop / (h.scrollHeight - h.clientHeight);
    progress.style.width = (scrolled * 100).toFixed(2) + "%";
  };
  document.addEventListener("scroll", onScroll, { passive: true });
  onScroll();
}

// Subtle pointer-reactive parallax on the hero portrait
const portrait = document.querySelector(".hero__portrait .frame");
const hero = document.querySelector(".hero");
if (portrait && hero && !matchMedia("(prefers-reduced-motion: reduce)").matches) {
  hero.addEventListener("mousemove", (e) => {
    const r = hero.getBoundingClientRect();
    const dx = (e.clientX - r.left) / r.width - 0.5;
    const dy = (e.clientY - r.top) / r.height - 0.5;
    portrait.style.transform = `perspective(900px) rotateY(${dx * 5}deg) rotateX(${-dy * 5}deg) translateZ(0)`;
  });
  hero.addEventListener("mouseleave", () => {
    portrait.style.transform = "";
  });
}

// Lightbox for gallery figures + project hero image
const lb = document.createElement("div");
lb.className = "lightbox";
lb.innerHTML = "<img alt=\"\">";
document.body.appendChild(lb);
const lbImg = lb.querySelector("img");

document.querySelectorAll(".gallery .figure img, .proj-hero-img img").forEach((img) => {
  img.style.cursor = "zoom-in";
  img.addEventListener("click", () => {
    lbImg.src = img.src;
    lbImg.alt = img.alt || "";
    lb.classList.add("open");
    document.body.style.overflow = "hidden";
  });
});
lb.addEventListener("click", () => {
  lb.classList.remove("open");
  document.body.style.overflow = "";
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    lb.classList.remove("open");
    document.body.style.overflow = "";
  }
});
