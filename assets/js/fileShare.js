const PEER_HOST = "serverside-file-share.onrender.com";
let peer = null;
let connection = null;
let files = [];
const chunkSize = 362944;
let currentFileIndex = 0;
let currentChunk = 0;
let paused = false;
const fileReader = new FileReader();
let receivedSize = 0;
let receivedChunks = [];
let currentFileInfo = null;
let receivedFiles = [];
let totalTransferProgress = 0;
let generateShortId_Val = "";
let connection_input_status = document.getElementById("connection-input-status");
let connectButtons = document.querySelectorAll(".connectButton");
let urlParams = new URLSearchParams(window.location.search);
let connectionId = urlParams.get("connectionId");
let loader = document.querySelector(".loader")
let receivedFilesContainer = document.querySelector("#receivedFilesContainer")
let button = document.createElement("button")
let fileTransfer = document.querySelector(".add-file-button")
let processss = document.querySelector("#process")


///connnection code 
// Check if connectionId exists and autofill the input field
async function startPeerConnection() {
  try {
    // loader.style.display = "flex"
    await initializePeer();
    if (connectionId) {
      // Automatically connect when peer is ready
      peer.on("open", () => {
        connection = peer.connect(connectionId, { reliable: true });
        handleConnection(connection);
      });
    }
  } catch (e) {
    console.error("Error initializing peer connection:", e);
  }
}
connectButtons.forEach((button) => {
  button.addEventListener("click", () => {
    connectToPeer();
  });
});

function removeQueryParams() {
  const urlWithoutParams = window.location.origin + window.location.pathname;
  window.history.replaceState({}, document.title, urlWithoutParams);
}

if (connectionId) {
  startPeerConnection();
}

function showConnectionModal(connectionId) {
  // Create modal HTML structure
  const modalHTML = `
    <div id="connectionModal" class="modal-overlay">
        <div class="modal-content txt-black">
            <p id="modalText"class="txt-black">Please wait...</p>
            <button id="connectButtonModal" disabled>Connect and Download</button>
            <button onclick="closeModal()">Close</button>
        </div>
    </div>
    `;

  // Append modal to the body
  document.body.insertAdjacentHTML("beforeend", modalHTML);

  // Close modal when clicking outside the content
  document
    .querySelector(".modal-overlay")
    .addEventListener("click", (event) => {
      if (event.target.classList.contains("modal-overlay")) {
        closeModal();
      }
    });

  // Wait for the peer ID to be generated
  peer.on("open", () => {
    console.log("Peer ID generated:", peer.id); // Logging the peer ID to confirm it's generated

    // Simulate a small delay before showing the connect button
    setTimeout(() => {
      // Update the modal text and connect button once the peer ID is available
      document.getElementById(
        "modalText"
      ).textContent = `Connect with ID: ${connectionId}`;
      const connectButton = document.getElementById("connectButtonModal");
      // Enable the button and set the action to connect
      connectButton.disabled = false;
      connectButton.onclick = () => {
        connectToPeer(connectionId); // Connect to the peer when button is clicked
        closeModal(); // Close the modal after attempting to connect
      };
    }, 1400); // Simulated delay for peer generation (can be adjusted)
  });
}

function closeModal() {
  const modal = document.querySelector(".modal-overlay");
  if (modal) modal.remove();
}

// Initialize everything
function initializePeer() {
  document.getElementById("connectionId").textContent = "..."
  peer = new Peer(generateShortId(), {
    host: PEER_HOST,
    port: 443,
    path: "/",
    secure: true,
  });

  peer.on("open", onPeerOpen);
  peer.on("connection", handleConnection);
  peer.on("error", onPeerError);
  peer.on("disconnected", onPeerDisconnected);


  generateShareLink();
}

function onPeerOpen(id) {
  document.getElementById("connectionId").textContent = id;
  updateStatus("Ready to connect", "success");
}

function onPeerError(error) {
  updateStatus(`Connection error: ${error.message}`, "error");
  removeQueryParams();
  setTimeout(initializePeer, 5000);
}

function onPeerDisconnected() {
  updateStatus("Disconnected from server, reconnecting...", "warning");
  peer.reconnect();
}

function generateShortId() {
  generateShortId_Val = Math.random().toString(36).substring(2, 6);
  return generateShortId_Val;
}

function setupEventListeners() {
  document
    .getElementById("connectButton")
    .addEventListener("click", connectToPeer);
  document
    .getElementById("fileInput")
    .addEventListener("change", onFilesSelected);
}

function connectToPeer() {
  const peerId = document.getElementById("peerIdInput").value.trim();
  if (peerId) {
    connection = peer.connect(peerId, { reliable: true });
    handleConnection(connection);
  } else {
    updateStatus("Please enter a peer ID", "warning");
  }
}

function handleConnection(conn) {
  connection = conn;
  conn.on("open", () => {
    updateStatus("Connected to peer", "success");
    startFileTransfer();
    showConnectedUi();
    closeModal();
  });


  conn.on("data", onDataReceived);
  conn.on("close", onConnectionClose);
  conn.on("error", (error) =>
    updateStatus(`Connection error: ${error.message}`, "error")
  );


}

// generate qr code
function generateQRCode() {
  const qrContainer = document.createElement("div");
  qrContainer.id = "qrcode";
  let generatedLink = generateShareLink();
  new QRCode(qrContainer, {
    text: generatedLink,
    width: 128,
    height: 128,
  });
  return qrContainer;
}

function showConnectedUi() {
  connection_input_status.innerHTML = `
    you are connected
    `;
}

function onDataReceived(data) {
  
 
  fileTransfer.style.display = "none"
 
  if (data.type === "file-info") {
    currentFileInfo = data;
    prepareFileReception(data);
    receivedChunks = new Array(data.totalChunks);
  } else if (data.type === "file-chunk") {
    receiveFileChunk(data);
  } else if (data.type === "transfer-complete") {
    connection.send({
      type: "file-received-confirmation",
      fileName: currentFileInfo.name,
      fileIndex: currentFileInfo.index,
    });
   
    completeFileReception();
  } 
  else if (data.type === "all-files-complete") {
    (document.getElementById("progressContainer").style.display = "none"),
      resetTransfer();
    updateStatus("All files received successfully!", "success");

    // button.addEventListener("click",()=>{
      fileTransfer.style.display = "flex"

    // })
    
  } else if (data.type === "progress-update") {
    updateProgress(data.progress, data.receivedSize, data.totalSize);
    const chunkInfo = data.currentChunk
      ? ` (Chunk ${data.currentChunk}/${fileInfo.totalFiles})`
      : "";
    updateStatus(`Sending ${data.fileName}...`, "success");
  }
  
}


function onConnectionClose() {
  updateStatus("Connection closed", "warning");
  connection_input_status.innerHTML = `<h3>Connect to Peer:</h3>
    <input
      type="text"
      id="peerIdInput"
      placeholder="Enter peer's connection ID"
    />
    <button class="connectButton" onclick="">Connect</button>
  </div>`;
  resetUI();
}

function startFileTransfer() {
  if (files.length === 0 || !connection) return;

  currentFileIndex = 0;
  currentChunk = 0;
  totalTransferProgress = 0;
  sendNextFile();
  document.getElementById("progressContainer").style.display = "block";
}

function generateShareLink() {
  const link = window.location.origin + "?connectionId=" + generateShortId_Val;
  shareLink.href = link;
  shareLink.textContent = link;
  return link;
}
function onFilesSelected(e) {
  files = Array.from(e.target.files);
  if (files.length > 0) {
    updateFileInfo();
    startFileTransfer();
  }
  // Check if there is already an active connection
  if (connection) {
    return; // Don't display the share link UI if already connected
  }
  const link = window.location.origin + "?connectionId=" + generateShortId_Val;
  connection_input_status.innerHTML = `
    <div id="generated_link_div">
        <h2>Share Link:</h2>
        <a id="shareLink" href="#" onclick="copyLinkToClipboard('${link}', event); return false;">${link}</a>
        <button onclick="copyLinkToClipboard('${link}', event)">Copy</button>
    </div>`;
  showShareModal(e.target);
}

// Function to create the modal content
function createModalContent(link) {
  return `
        <div class="share-modal txt-black">
            <button class="close-button">&times;</button>
            
            <div class="link-container" onclick="copyLinkToClipboard('${link}', event)">
                <span class="share-link">${generateShareLink()}</span>
                <button class="copy-button" onclick="copyLink('${generateShareLink()}')">Copy link</button>
            </div>
            
            <div class="id-section">
                <h3>ENTER THIS ID IN THE RECEIVER DEVICE:</h3>
                <div class="random-id">${peer.id}</div>
            </div>
            
            <div class="qr-section" id="qr-container"></div>
            
            <div class="help-text">
                <span>If you don't know how to share files, here the </span>
                <a href="#" class="tutorial-link">Tutorial</a>
            </div>
            
            <div class="connect-section">
                <input type="text" placeholder="Enter id here" class="id-input" id="peerId-modal">
                <button onclick="connectToPeerViaShareModal()">Connect</button>
            </div>
        </div>
    `;
}

function connectToPeerViaShareModal() {
  const peerId = document.getElementById("peerId-modal").value.trim();
  if (peerId) {
    connection = peer.connect(peerId, { reliable: true });
    handleConnection(connection);
  } else {
    updateStatus("Please enter a peer ID", "warning");
  }
}

// Function to show modal
function showShareModal(fileInput) {
  const link = generateShareLink(); // This should be replaced with your actual link

  const modalOverlay = document.createElement("div");
  modalOverlay.className = "modal-overlay";

  const modalContent = document.createElement("div");
  modalContent.className = "modal-content";
  modalContent.innerHTML = createModalContent(link);

  // Add click outside to close
  modalOverlay.addEventListener("click", (event) => {
    if (event.target === modalOverlay) {
      closeModal();
    }
  });

  // Add close button functionality
  modalContent
    .querySelector(".close-button")
    .addEventListener("click", closeModal);

  modalOverlay.appendChild(modalContent);
  document.body.appendChild(modalOverlay);

  // Generate and add QR code after modal is added to DOM
  const qrContainer = document.getElementById("qr-container");
  qrContainer.appendChild(generateQRCode(link));
}

// Function to copy the link and show popup near the cursor
function copyLinkToClipboard(link, event) {
  navigator.clipboard
    .writeText(link)
    .then(() => {
      showPopup(event.pageX, event.pageY);
    })
    .catch((err) => {
      console.error("Error copying link: ", err);
    });
}

// Function to create a floating popup near the cursor
function showPopup(x, y) {
  const popup = document.createElement("div");
  popup.textContent = "Copied!";
  popup.style.position = "absolute";
  popup.style.top = `${y + 10}px`; // Slight offset to avoid overlap with the cursor
  popup.style.left = `${x + 10}px`;
  popup.style.backgroundColor = "#000";
  popup.style.color = "#fff";
  popup.style.padding = "5px 10px";
  popup.style.borderRadius = "8px";
  popup.style.fontSize = "14px";
  popup.style.zIndex = "1000";
  popup.style.pointerEvents = "none"; // Prevent interaction
  popup.style.opacity = "1";
  popup.style.transition = "opacity 0.5s ease-out";

  document.body.appendChild(popup);

  // Update popup position with mouse move
  const moveHandler = (e) => {
    popup.style.top = `${e.pageY + 10}px`;
    popup.style.left = `${e.pageX + 10}px`;
  };

  document.addEventListener("mousemove", moveHandler);

  // Fade out and remove after 1 second
  setTimeout(() => {
    popup.style.opacity = "0";
    setTimeout(() => {
      popup.remove();
      document.removeEventListener("mousemove", moveHandler);
    }, 500);
  }, 1000);
}

function updateFileInfo() {
  const info = files
    .map(
      (file) =>
        `<p><strong>File:</strong> ${file.name} (${formatFileSize(
          file.size
        )})</p>`
    )
    .join("");
  document.getElementById("fileInfo").innerHTML = info;
}

function formatFileSize(size) {
  const units = ["B", "KB", "MB", "GB"];
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  return `${size.toFixed(2)} ${units[unitIndex]}`;
}

function sendNextFile() {
 
  if (currentFileIndex >= files.length) {
    connection.send({ type: "all-files-complete" });
    resetTransfer();
    // updateStatus("All files sent successfully!", "success");
    updateStatus("Waiting for receiver confirmation...", "info");
    return;
  }

  const file = files[currentFileIndex];
  currentFileInfo = {
    type: "file-info",
    name: file.name,
    size: file.size,
    totalChunks: Math.ceil(file.size / chunkSize),
    index: currentFileIndex,
    totalFiles: files.length,
  };

  updateStatus(`Preparing to send: ${currentFileInfo.name}`, "info");

  connection.send(currentFileInfo);
  currentChunk = 0;
  sendNextChunk(file);
}

function sendNextChunk(file) {
  if (paused) return;

  const start = currentChunk * chunkSize;
  const end = Math.min(start + chunkSize, file.size);
  const chunk = file.slice(start, end);

  fileReader.onload = (e) => {
    connection.send({
      type: "file-chunk",
      data: e.target.result,
      chunkIndex: currentChunk,
      fileIndex: currentFileIndex,
      fileName: file.name,
    });

    currentChunk++;
    //   const progress = (currentChunk * chunkSize) / file.size;

    if (end < file.size) {
      setTimeout(() => sendNextChunk(file), 50);
    } else {
      connection.send({ type: "transfer-complete" });
      currentFileIndex++;
      setTimeout(sendNextFile, 100);
    }
  };

  fileReader.readAsArrayBuffer(chunk);
}

function prepareFileReception(fileInfo) {
  receivedSize = 0;
  receivedChunks = new Array(fileInfo.totalChunks);
  updateFileInfo();
  updateStatus(
    `Receiving ${fileInfo.name} (${fileInfo.index + 1}/${fileInfo.totalFiles
    })...`,
    "success"
  );
  document.getElementById("progressContainer").style.display = "block";
}

function receiveFileChunk(data) {
  receivedChunks[data.chunkIndex] = data.data;
  receivedSize += data.data.byteLength;
  const progress = (receivedSize / currentFileInfo.size) * 100;
  updateProgress(progress, receivedSize, currentFileInfo.size);

  connection.send({
    type: "progress-update",
    progress: progress,
    receivedSize: receivedSize,
    totalSize: currentFileInfo.size,
    fileName: currentFileInfo.name,
    currentChunk: data.chunkIndex + 1,
    totalChunks: currentFileInfo.totalChunks,
  });
}

function completeFileReception() {
  receivedFiles.push(currentFileInfo.name);
  updateStatus(
    `File received successfully: ${currentFileInfo.name}`,
    "success"
  );
  displayReceivedFiles();

  button.addEventListener("click", () => {
    fileTransfer.style.display = "flex"

    const blob = new Blob(receivedChunks);
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = currentFileInfo.name;
    a.style.display = "none";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    // Reset for next file
    receivedChunks = [];
    receivedSize = 0;

    // Add this: Send confirmation back to sender when this was the last file
    if (currentFileInfo.index === currentFileInfo.totalFiles - 1) {
      connection.send({ type: "all-files-complete" });
    }
  })
}

function displayReceivedFiles() {
  const receivedList = document.getElementById("receivedFiles");
  receivedList.innerHTML = receivedFiles
    .map((file) => `<li>${file}</li>`)
    .join("");
}

function resetTransfer() {
  currentChunk = 0;
  paused = false;
}

function resetUI() {
  document.getElementById("progressContainer").style.display = "none";
  document.getElementById("fileInfo").innerHTML = "";
}

document.getElementById("status").textContent = "..."
function updateStatus(message, type) {
  const statusElement = document.getElementById("status");
  statusElement.textContent = message;
  statusElement.className = type;
}

function updateProgress(progress, currentSize, totalSize) {
  if (!currentSize || !totalSize) return;

  const formattedValue = Math.min(100, Math.round(progress * 100) / 100);
  document.getElementById("progress").value = formattedValue;

  const formattedCurrent = formatFileSize(currentSize);
  const formattedTotal = formatFileSize(totalSize);
  document.getElementById(
    "transferStatus"
  ).textContent = `${formattedValue}% complete (${formattedCurrent} / ${formattedTotal})`;
}

// Initialize everything
initializePeer();
setupEventListeners();
