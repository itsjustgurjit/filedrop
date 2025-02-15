// Function to generate random 4 digit ID
function generateRandomId() {
    return Math.floor(1000 + Math.random() * 9000).toString();
  }
  
  // Function to create QR code using qrcode.js library
  function generateQRCode(link) {
    const qrContainer = document.createElement("div");
    qrContainer.id = "qrcode";
    new QRCode(qrContainer, {
      text: link,
      width: 128,
      height: 128,
    });
    return qrContainer;
  }
  
  
  function copyLink(link) {
    navigator.clipboard.writeText(link).then(() => {
      const copyButton = document.querySelector(".copy-button");
      copyButton.textContent = "Copied!";
      setTimeout(() => {
        copyButton.textContent = "Copy link";
      }, 2000);
    });
  }
  