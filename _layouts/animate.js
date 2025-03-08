document.addEventListener("scroll", function () {
    const scrollY = window.scrollY;
    const element = document.querySelector(".file-share-container");
  
    // Increase max-width as you scroll (but cap it to avoid excessive size)
    let newSize = Math.min(200, 100 + scrollY * 0.2); // Start from 100vw, grow up to 200vw
    let newOpacity = Math.max(1 - scrollY / 500, 0); // Decrease opacity smoothly
  
    // Apply dynamic styles
    element.style.setProperty("--max-width", `${newSize}vw`);
    element.style.setProperty("--opacity", newOpacity);
  });
  
  console.log('animate js is loaded')