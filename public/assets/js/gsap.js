// gsap animation for testimonials

const slider = document.querySelector(".testimonial-slider");
const sliderWidth = slider.scrollWidth / 2; // Half since you duplicated the slides

gsap.to(slider, {
  x: `-${sliderWidth}px`,
  ease: "none",
  duration: 30,
  repeat: -1,
  modifiers: {
    x: gsap.utils.unitize(x => parseFloat(x) % sliderWidth)
  }
});
