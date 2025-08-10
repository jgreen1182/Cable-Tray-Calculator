

// ESC key listener to exit mode
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && mode !== null) {
    mode = null;
    tempBoardPos = null;
    selectedFromBoard = null;
    isDrawingPathway = false;
    pathStart = null;
    pathEnd = null;

    updateButtonHighlight();
    draw();
  }
});


canvas.addEventListener("mousemove", e => {
  if (mode === "add-board") {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left - BOARD_WIDTH / 2;
    const y = e.clientY - rect.top - BOARD_HEIGHT / 2;

    const posX = Math.min(Math.max(0, x), canvas.width - BOARD_WIDTH);
    const posY = Math.min(Math.max(0, y), canvas.height - BOARD_HEIGHT);

    tempBoardPos = { x: posX, y: posY };
    draw();
  } else if (mode === "add-pathway") {
    const rect = canvas.getBoundingClientRect();

    if (selectedFromBoard === null) {
      pathEnd = { x: e.clientX - rect.left, y: e.clientY - rect.top };
      draw();
    } else if (isDrawingPathway) {
      // Snap ladder cursor to FROM board center and draw line to mouse
      const fromBoard = boards[selectedFromBoard];
      const fromX = fromBoard.x + BOARD_WIDTH / 2;
      const fromY = fromBoard.y + BOARD_HEIGHT / 2;

      pathStart = { x: fromX, y: fromY };
      pathEnd = { x: e.clientX - rect.left, y: e.clientY - rect.top };

      pathEnd = { x: e.clientX - rect.left, y: e.clientY - rect.top };
      draw();
    }
  }
});

canvas.addEventListener("click", e => {
  const rect = canvas.getBoundingClientRect();
  const clickX = e.clientX - rect.left;
  const clickY = e.clientY - rect.top;

  if (mode === "add-board" && tempBoardPos) {
    if (isOverlapping(tempBoardPos.x, tempBoardPos.y)) {
      alert("Cannot place board overlapping existing one.");
      return;
    }

    pendingBoardPos = { x: tempBoardPos.x, y: tempBoardPos.y };
    tempBoardPos = null;

    showModal("Enter Board/Equipment Name", "e.g. MSB1", (name) => {
      const boardId = crypto.randomUUID(); // or your own counter
      boards.push({ id: boardId, ...pendingBoardPos, name, placed: true });
      draw();

      if (boards.length >= 2) {
        addPathwayBtn.disabled = false;
        addPathwayBtn.style.cursor = "pointer";
        addPathwayBtn.style.opacity = "1";
      }
      updateFinishPathwaysBtn();
    });

  } else if (mode === "add-pathway") {
    const clickedBoardIndex = boards.findIndex(b =>
      clickX >= b.x && clickX <= b.x + BOARD_WIDTH &&
      clickY >= b.y && clickY <= b.y + BOARD_HEIGHT
    );
    if (clickedBoardIndex === -1) return;

    if (selectedFromBoard === null) {
      selectedFromBoard = clickedBoardIndex;
      pathStart = {
        x: boards[selectedFromBoard].x + BOARD_WIDTH / 2,
        y: boards[selectedFromBoard].y + BOARD_HEIGHT / 2
      };
      pathEnd = { ...pathStart };
      isDrawingPathway = true;
      draw();
    } else if (selectedFromBoard === clickedBoardIndex) {
      alert("Cannot select the same board as TO. Choose a different board.");
    } else {
      // Snap pathEnd to TO board center
      pathEnd = {
        x: boards[clickedBoardIndex].x + BOARD_WIDTH / 2,
        y: boards[clickedBoardIndex].y + BOARD_HEIGHT / 2
      };
      isDrawingPathway = false;

      showModal(`Enter distance (m) from "${boards[selectedFromBoard].name}" to "${boards[clickedBoardIndex].name}"`, "e.g. 25", (distStr) => {
        const dist = parseFloat(distStr);
        if (isNaN(dist) || dist <= 0) {
          alert("Invalid distance.");
          return;
        }
        pathways.push({
          fromId: boards[selectedFromBoard].id,
          toId: boards[clickedBoardIndex].id,
          distance: dist,
          cables: []
        });        
        selectedFromBoard = null;
        pathStart = null;
        pathEnd = null;
        draw();
        updateFinishPathwaysBtn();

      });
    }
  }
});

addBoardBtn.addEventListener("click", () => {
  setMode("add-board");

  addPathwayBtn.disabled = boards.length < 2;
  addPathwayBtn.style.cursor = boards.length < 2 ? "not-allowed" : "pointer";

  finishPathwaysBtn.disabled = false;
  finishPathwaysBtn.style.cursor = "pointer";
});


addPathwayBtn.addEventListener("click", () => {
  if (boards.length < 2) {
    alert("Add at least two boards first.");
    return;
  }
  setMode("add-pathway");
});

finishPathwaysBtn.addEventListener("click", () => {
  mode = null;
  tempBoardPos = null;
  selectedFromBoard = null;
  isDrawingPathway = false;
  pathStart = null;
  pathEnd = null;
  updateButtonHighlight();

  finishPathwaysBtn.disabled = true;
  finishPathwaysBtn.style.cursor = "not-allowed";

  draw();
  alert("Finished defining pathways!");

  // Show the rest of the app UI now that pathways are finalized
  document.getElementById("rest-of-app").style.display = "block";

  // Populate pathways table with current data
  populatePathwaysTable();
});

function showModal(title, placeholder, callback) {
  const modal = document.getElementById("board-name-modal");
  const input = document.getElementById("board-name-input");
  const titleEl = modal.querySelector("h2");
  const confirmBtn = document.getElementById("confirm-board-name");
  const cancelBtn = document.getElementById("cancel-board-name");

  titleEl.textContent = title;
  input.placeholder = placeholder;
  input.value = "";
  modal.classList.remove("hidden");

  function closeModal() {
    modal.classList.add("hidden");
    confirmBtn.onclick = null;
    cancelBtn.onclick = null;
  }

  confirmBtn.onclick = () => {
    const value = input.value.trim();
    if (value) {
      closeModal();
      callback(value);
    } else {
      alert("Please enter a valid name.");
    }
  };

  cancelBtn.onclick = () => {
    closeModal();
  };
}

draw(); // initial render
updateFinishPathwaysBtn();

// New modal for editing board or pathway
const editModal = document.createElement("div");
editModal.style.position = "fixed";
editModal.style.top = "50%";
editModal.style.left = "50%";
editModal.style.transform = "translate(-50%, -50%)";
editModal.style.background = "#fff";
editModal.style.border = "1px solid #ccc";
editModal.style.padding = "20px";
editModal.style.zIndex = "1000";
editModal.style.display = "none";
document.body.appendChild(editModal);

function openEditModal(type, index) {
  editModal.innerHTML = ""; // clear content

  if (type === "board") {
    const board = boards[index];
    const title = document.createElement("h3");
    title.textContent = `Edit Board: ${board.name}`;
    const input = document.createElement("input");
    input.type = "text";
    input.value = board.name;
    input.style.width = "100%";
    input.style.marginBottom = "10px";

    const renameBtn = document.createElement("button");
    renameBtn.textContent = "Rename";
    renameBtn.style.marginRight = "10px";

    const deleteBtn = document.createElement("button");
    deleteBtn.textContent = "Delete";
    deleteBtn.style.marginRight = "10px";

    const cancelBtn = document.createElement("button");
    cancelBtn.textContent = "Cancel";

    editModal.appendChild(title);
    editModal.appendChild(input);
    editModal.appendChild(renameBtn);
    editModal.appendChild(deleteBtn);
    editModal.appendChild(cancelBtn);

    // Rename button
    renameBtn.onclick = () => {
      const newName = input.value.trim();
      if (!newName) {
        alert("Name cannot be empty");
        return;
      }
      boards[index].name = newName;
      
      closeEditModal();
      draw();
      populatePathwaysTable();

      finishPathwaysBtn.disabled = false;
      finishPathwaysBtn.style.cursor = "pointer";
    };

    deleteBtn.onclick = () => {
      if (confirm(`Delete board "${board.name}"? This will also remove related pathways.`)) {
        // Remove the board
        boards.splice(index, 1);
    
        // Remove any pathways connected to this board
        for (let i = pathways.length - 1; i >= 0; i--) {
          const p = pathways[i];
          const fromBoardIndex = boards.findIndex(b => b.id === p.fromId);
          const toBoardIndex = boards.findIndex(b => b.id === p.toId);
    
          // If from or to board no longer exists, remove the pathway
          if (fromBoardIndex === -1 || toBoardIndex === -1) {
            pathways.splice(i, 1);
            // Also remove any cable data linked to this route index:
            if (routeCableData[i]) {
              delete routeCableData[i];
            }
          }
        }
    
        // After board removal, update any routeCableData keys (shift down keys if needed)
        // Because deleting pathways changes indices, rebuild routeCableData mapping:
    
        let newRouteCableData = {};
        pathways.forEach((p, i) => {
          // Try to keep existing cables if available
          newRouteCableData[i] = routeCableData[i] || [];
        });
        routeCableData = newRouteCableData;
    
        closeEditModal();
        draw();
    
        // Refresh the pathways table so no invalid entries show
        populatePathwaysTable();
    
        // Enable the Finish button again so user can re-confirm routes
        finishPathwaysBtn.disabled = false;
        finishPathwaysBtn.style.cursor = "pointer";
    
      }
    };
    

    // Cancel button (make sure modal closes & nothing lingers)
    cancelBtn.onclick = () => {
      closeEditModal();
      draw();
      populatePathwaysTable();
    };

  } else if (type === "pathway") {
    const path = pathways[index];
    const fromName = boards.find(b => b.id === path.fromId)?.name || "Unknown";
    const toName = boards.find(b => b.id === path.toId)?.name || "Unknown";

    const title = document.createElement("h3");
    title.textContent = `Edit Pathway: ${fromName} → ${toName}`;

    const input = document.createElement("input");
    input.type = "number";
    input.min = "0.1";
    input.step = "0.1";
    input.value = path.distance;
    input.style.width = "100%";
    input.style.marginBottom = "10px";

    const saveBtn = document.createElement("button");
    saveBtn.textContent = "Save";
    saveBtn.style.marginRight = "10px";

    const deleteBtn = document.createElement("button");
    deleteBtn.textContent = "Delete";
    deleteBtn.style.marginRight = "10px";

    const cancelBtn = document.createElement("button");
    cancelBtn.textContent = "Cancel";

    editModal.appendChild(title);
    editModal.appendChild(input);
    editModal.appendChild(saveBtn);
    editModal.appendChild(deleteBtn);
    editModal.appendChild(cancelBtn);

    saveBtn.onclick = () => {
      const newDist = parseFloat(input.value);
      if (isNaN(newDist) || newDist <= 0) {
        alert("Please enter a valid positive number for distance.");
        return;
      }
      pathways[index].distance = newDist;
      closeEditModal();
      draw();
      populatePathwaysTable();
    
      // Re-enable "Finish Defining Routes" button to allow re-finalizing after edits
      finishPathwaysBtn.disabled = false;
      finishPathwaysBtn.style.cursor = "pointer";
    };

    deleteBtn.onclick = () => {
      if (confirm(`Delete pathway from "${fromName}" to "${toName}"?`)) {
        // Remove the pathway
        pathways.splice(index, 1);
    
        // Remove any cable data linked to this route
        if (routeCableData[index]) {
          delete routeCableData[index];
        }
    
        // Rebuild routeCableData to shift indices
        let newRouteCableData = {};
        pathways.forEach((p, i) => {
          newRouteCableData[i] = routeCableData[i] || [];
        });
        routeCableData = newRouteCableData;
    
        closeEditModal();
        draw();
        populatePathwaysTable();
    
        // Enable Finish button again
        finishPathwaysBtn.disabled = false;
        finishPathwaysBtn.style.cursor = "pointer";
      }
    };
    

    cancelBtn.onclick = closeEditModal;
  }

  editModal.style.display = "block";
}

function closeEditModal() {
  editModal.style.display = "none";
}

// Helper: check if point is inside board rect
function getBoardAtPosition(x, y) {
  return boards.findIndex(b =>
    x >= b.x && x <= b.x + BOARD_WIDTH &&
    y >= b.y && y <= b.y + BOARD_HEIGHT
  );
}

// Helper: check if point is near any pathway line (within 5px)
function getPathwayAtPosition(x, y) {
  for (let i = 0; i < pathways.length; i++) {
    const p = pathways[i];
    const from = boards.find(b => b.id === p.fromId);
    const to = boards.find(b => b.id === p.toId);
    if (!from || !to) continue;

    const x1 = from.x + BOARD_WIDTH / 2;
    const y1 = from.y + BOARD_HEIGHT / 2;
    const x2 = to.x + BOARD_WIDTH / 2;
    const y2 = to.y + BOARD_HEIGHT / 2;

    if (pointNearLineSegment(x, y, x1, y1, x2, y2, 5)) {
      return i;
    }
  }
  return -1;
}

// Utility: point near line segment with tolerance
function pointNearLineSegment(px, py, x1, y1, x2, y2, tolerance) {
  const A = px - x1;
  const B = py - y1;
  const C = x2 - x1;
  const D = y2 - y1;

  const dot = A * C + B * D;
  const len_sq = C * C + D * D;
  let param = -1;
  if (len_sq !== 0) param = dot / len_sq;

  let xx, yy;

  if (param < 0) {
    xx = x1;
    yy = y1;
  } else if (param > 1) {
    xx = x2;
    yy = y2;
  } else {
    xx = x1 + param * C;
    yy = y1 + param * D;
  }

  const dx = px - xx;
  const dy = py - yy;
  return (dx * dx + dy * dy) <= tolerance * tolerance;
}

// Add double-click listener on canvas
canvas.addEventListener("dblclick", (e) => {
  const rect = canvas.getBoundingClientRect();
  const clickX = e.clientX - rect.left;
  const clickY = e.clientY - rect.top;

  // Check boards first
  const boardIndex = getBoardAtPosition(clickX, clickY);
  if (boardIndex !== -1) {
    openEditModal("board", boardIndex);
    return;
  }

  // Then check pathways
  const pathwayIndex = getPathwayAtPosition(clickX, clickY);
  if (pathwayIndex !== -1) {
    openEditModal("pathway", pathwayIndex);
    return;
  }
});

function populatePathwaysTable() {
  const tbody = document.querySelector("#pathways-table tbody");
  tbody.innerHTML = ""; // Clear previous

  pathways.forEach((p, index) => {
    const fromBoard = boards.find(b => b.id === p.fromId);
    const toBoard = boards.find(b => b.id === p.toId);

    const row = document.createElement("tr");
    row.setAttribute("data-route-index", index);
    row.style.cursor = "pointer";

    row.innerHTML = `
      <td>${fromBoard?.name || "???"}</td>
      <td>${toBoard?.name || "???"}</td>
      <td>${p.distance} m</td>
    `;

    row.addEventListener("click", () => {
      handleRouteClick(index);
    });

    tbody.appendChild(row);
  });
}

let routeCableData = {}; // key: routeIndex, value: array of cable objects
let selectedRouteIndex = null;

function addCableToSelectedRoute(cableObj) {
  if (selectedRouteIndex === null) {
    alert("Please select a route first.");
    return;
  }

  if (!routeCableData[selectedRouteIndex]) {
    routeCableData[selectedRouteIndex] = {
      cables: [],
      allowMixedInstallation: false,
      allowMixedCableType: false
    };
  }

  routeCableData[selectedRouteIndex].cables.push(cableObj);

  updateCableTableUI();
}


function handleRouteClick(index) {
  selectedRouteIndex = index;

  if (!routeCableData[selectedRouteIndex]) {
    routeCableData[selectedRouteIndex] = {
      cables: [],
      allowMixedInstallation: false,
      allowMixedCableType: false
    };
  }

  toggleMixedInstallation.checked = routeCableData[selectedRouteIndex].allowMixedInstallation;
  toggleMixedCableType.checked = routeCableData[selectedRouteIndex].allowMixedCableType;

  // Highlight row
  const rows = document.querySelectorAll("#pathways-table tbody tr");
  rows.forEach((r, i) => {
    r.style.backgroundColor = i === index ? "#e0f1e9" : "";
  });

  document.getElementById("main-content").style.display = "block";

  updateCableTableUI(routeCableData[selectedRouteIndex].cables);
  draw();
}

document.getElementById("rest-of-app").style.display = "none";
document.getElementById('openCableModalBtn').addEventListener('click', openCableModal);

function addPathwayRowClickHandlers() {
  const tableBody = document.querySelector('#pathways-table tbody');
  tableBody.querySelectorAll('tr').forEach((row, index) => {
    row.addEventListener('click', () => {
      handleRouteClick(index);
      highlightSelectedRow(index);
    });
  });
}

function highlightSelectedRow(selectedIndex) {
  const rows = document.querySelectorAll('#pathways-table tbody tr');
  rows.forEach((row, i) => {
    row.style.backgroundColor = (i === selectedIndex) ? '#e0f1e9' : '';
  });
}


function updateCableTableUI(cables) {
  if (!cables && selectedRouteIndex !== null) {
    cables = routeCableData[selectedRouteIndex]?.cables || [];
  }
  const tbody = document.querySelector("#cable-table tbody");
  tbody.innerHTML = "";

  cables.forEach((cable, i) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${cable.name}</td>
      <td>${cable.type || "—"}</td>
      <td>
        <select>
          ${[...Array(10).keys()]
            .map(v => {
              const val = v + 1;
              return `<option value="${val}" ${cable.quantity === val ? "selected" : ""}>${val}</option>`;
            })
            .join('')}
        </select>
      </td>
      <td>${cable.diameter.toFixed(2)}</td>
      <td>${cable.weight.toFixed(2)}</td>
      <td>
        <select>
          <option value="flat" ${cable.installationMethod === 'flat' ? 'selected' : ''}>Laid Flat</option>
          <option value="trefoil" ${cable.installationMethod === 'trefoil' ? 'selected' : ''}>Trefoil</option>
          <option value="spaced" ${cable.installationMethod === 'spaced' ? 'selected' : ''}>Spaced</option>
        </select>
      </td>
      <td><button onclick="removeCable(${i})">Remove</button></td>
    `;

    const quantitySelect = row.querySelector('td:nth-child(3) select');
    quantitySelect.addEventListener("change", (e) => {
      cable.quantity = parseInt(e.target.value);
      // No need to reassign routeCableData here because cable object is modified in place
      console.log("Updated quantity", cable.quantity, "for cable", cable.name);
    });

    const methodSelect = row.querySelector('td:nth-child(6) select');
    methodSelect.addEventListener("change", (e) => {
      cable.installationMethod = e.target.value;
      console.log("Updated installation method", cable.installationMethod, "for cable", cable.name);
    });

    tbody.appendChild(row);
  });
}


function removeCable(i) {
  if (selectedRouteIndex !== null && routeCableData[selectedRouteIndex]) {
    routeCableData[selectedRouteIndex].cables.splice(i, 1);
    updateCableTableUI();
  }
}



const toggleMixedInstallationYes = document.getElementById("mixed-installation-yes");
const toggleMixedInstallationNo = document.getElementById("mixed-installation-no");

toggleMixedInstallationYes.addEventListener("change", () => {
  if (toggleMixedInstallationYes.checked && selectedRouteIndex !== null) {
    routeCableData[selectedRouteIndex].allowMixedInstallation = true;
  }
});
toggleMixedInstallationNo.addEventListener("change", () => {
  if (toggleMixedInstallationNo.checked && selectedRouteIndex !== null) {
    routeCableData[selectedRouteIndex].allowMixedInstallation = false;
  }
});



const toggleMixedCableType = document.getElementById("toggleMixedCableType");

toggleMixedInstallation.addEventListener("change", () => {
  if (selectedRouteIndex === null) return;

  if (!routeCableData[selectedRouteIndex]) {
    routeCableData[selectedRouteIndex] = {
      cables: [],
      allowMixedInstallation: false,
      allowMixedCableType: false
    };
  }

  routeCableData[selectedRouteIndex].allowMixedInstallation = toggleMixedInstallation.checked;

  console.log("Route", selectedRouteIndex, "allowMixedInstallation set to", toggleMixedInstallation.checked);
});

toggleMixedCableType.addEventListener("change", () => {
  if (selectedRouteIndex === null) return;

  if (!routeCableData[selectedRouteIndex]) {
    routeCableData[selectedRouteIndex] = {
      cables: [],
      allowMixedInstallation: false,
      allowMixedCableType: false
    };
  }

  routeCableData[selectedRouteIndex].allowMixedCableType = toggleMixedCableType.checked;

  console.log("Route", selectedRouteIndex, "allowMixedCableType set to", toggleMixedCableType.checked);
});

