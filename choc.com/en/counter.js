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
  "../uploads/testimonial/img4.jpeg",
  "../uploads/testimonial/img1.jpeg",
  "../uploads/testimonial/img2.jpeg",
  "https://www.shutterstock.com/image-photo/positive-handsome-arabic-businessman-beard-600nw-2510267591.jpg"
];

var text = [
  "We took the services of Company haven of cleanliness and were amazed at the spotless results. Every corner was shining, and the freshness was noticeable immediately.",
  "We are very satisfied with the services of Company haven of cleanliness. The cleanliness standards were high, and their staff was professional and efficient.",
  "After hiring Company haven of cleanliness, our hotel became spotless and welcoming. They truly set the standard for cleanliness and hygiene",
  "We took their services for deep cleaning, and the result was excellent. Company haven of cleanliness provided a fresh, healthy, and sparkling environment."
];

var user = [
  "Mohammed Al Rashid",
  "Ahmed Khalifa",
  "Abdullah Hassan",
  "Omar Saeed"
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