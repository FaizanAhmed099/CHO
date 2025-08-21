function animateCounter(id, endValue, duration) {
    var el = document.getElementById(id);
    if (!el) return; // Prevent error if element not found
    let startValue = 0;
    var increment = endValue / (duration / 20);

    var counter = setInterval(() => {
      startValue += increment;
      if (startValue >= endValue) {
        el.textContent = Math.round(endValue);
        clearInterval(counter);
      } else {
        el.textContent = Math.floor(startValue);
      }
    }, 20);
}

// Only animate once when the counter is visible
let yearsAnimated = false;

document.addEventListener("DOMContentLoaded", function() {
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting && !yearsAnimated) {
        animateCounter("counter-years", 9, 2000);
        yearsAnimated = true;
        observer.disconnect();
      }
    });
  });

  // Start observing the counter element
  const counterYearsEl = document.getElementById("counter-years");
  if (counterYearsEl) {
    observer.observe(counterYearsEl);
  }
});

// The service section

// the service section end


// Testimonial Slider 

var pictures = [
  "https://img.freepik.com/free-photo/cheerful-cleaning-lady-with-rubber-gloves-apron-holding-bucket-with-cleaning-supplies-showing-thumbs-up-sign_273609-39089.jpg",
  "../uploads/testimonial/profile1 (1).jpg",
  "../uploads/testimonial/profile1 (2).jpg",
  "../uploads/testimonial/profile1 (3).jpg"
];

var text = [
  "That's going to be a chunk of change. Make the font bigger I need a website...",
  "They aim to highlight the most recent advancements and key literature in a particular field.",
  "Mini-reviews should present information in a clear and easily understandable manner.",
  "I have an awesome idea for a startup, I need you to build it for me, so in an ideal world"
];

var user = [
  "Salvador Adams",
  "Julia",
  "Chloe",
  "Louise"
]

let i = 0; // Declare only ONCE at the top of your file

function updateTestimonial() {
  const profile = document.getElementById("profile");
  const review = document.getElementById("review");
  const name = document.getElementById("name");

  if (!profile || !review || !name) {
    console.warn("Some testimonial elements are missing in the DOM.");
    return;
  }

  // Fade out
  profile.classList.add("fade-out");
  review.classList.add("fade-out");
  name.classList.add("fade-out");

  setTimeout(() => {
    // Update content
    profile.src = pictures[i];
    review.innerHTML = text[i];
    name.innerHTML = user[i];

    // Fade in
    profile.classList.remove("fade-out");
    review.classList.remove("fade-out");
    name.classList.remove("fade-out");
  }, 500);
}

function autoplayTestimonial() {
  i = (i + 1) % pictures.length;
  updateTestimonial();
}

document.addEventListener("DOMContentLoaded", function () {
  setInterval(autoplayTestimonial, 3000);
});


// Media-Page FadeInUp 

document.addEventListener("DOMContentLoaded", function () {
  const items = document.querySelectorAll(".grid-item");

  const observer = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add("animate");
        observer.unobserve(entry.target); // Stop observing after animation
      }
    });
  }, {
    threshold: 0.1 // trigger when 10% of item is visible
  });

  items.forEach(item => {
    observer.observe(item);
  });
});
// Media-Page FadeInUp End