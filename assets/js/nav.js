    // Toggle Menu Visibility
    function toggleMenu() {
        const menu = document.getElementById("sideMenu");
        menu.classList.toggle("active");
    }

    document.getElementById("menuToggle").addEventListener("click", toggleMenu);

    // Function to copy link to clipboard
    function copyLink() {
        const link = window.location.origin + "?connectionId=" + document.getElementById("connectionId").textContent;
        navigator.clipboard.writeText(link).then(() => {
            alert("Link copied to clipboard!");
        }).catch(err => {
            console.error("Failed to copy link:", err);
        });
    }

    // Connect from the menu using input ID
    function connectFromMenu() {
        const peerId = document.getElementById("menuPeerIdInput").value;
        if (peerId) {
            document.getElementById("peerIdInput").value = peerId;
            document.getElementById("connectButton").click();
        } else {
            alert("Please enter a valid ID");
        }
    }
