// Enhanced renderer with better UX features
document.getElementById("input-form").addEventListener("submit", async (e) => {
    e.preventDefault()
    const statusDiv = document.getElementById("status")
    statusDiv.className = "status-display processing"
    statusDiv.textContent = "Processing your request..."
  
    // Get CSV file
    const csvFile = document.getElementById("csv-input").files[0]
    if (!csvFile) {
      showStatus("Please select a CSV file.", "error")
      return
    }
  
    // Get message template files
    const folderInput = document.getElementById("folder-input")
    const files = Array.from(folderInput.files).filter((f) => f.name.endsWith(".txt"))
    if (files.length === 0) {
      showStatus("No .txt files found in selected folder.", "error")
      return
    }
  
    // Read CSV
    const csvText = await csvFile.text()
    // Simple CSV parse (assume first row is header, comma separated)
    const [headerLine, ...rows] = csvText.trim().split(/\r?\n/)
    const headers = headerLine.split(",")
    const contacts = rows.map((row) => {
      const values = row.split(",")
      return Object.fromEntries(headers.map((h, i) => [h, values[i]]))
    })
  
    // Read all txt files
    const messages = {}
    for (const file of files) {
      messages[file.name] = await file.text()
    }
  
    // Read timing configuration
    const sleepMin = Number.parseFloat(document.getElementById("sleep-min").value) || 0.5
    const sleepMax = Number.parseFloat(document.getElementById("sleep-max").value) || 2
    const batchCount = Number.parseInt(document.getElementById("batch-count").value) || 10
    const batchSleepMin = Number.parseFloat(document.getElementById("batch-sleep-min").value) || 10
    const batchSleepMax = Number.parseFloat(document.getElementById("batch-sleep-max").value) || 30
  
    showStatus(`✅ Loaded ${contacts.length} contacts and ${files.length} message templates. Starting...`, "processing")
  
    // Send all data to main process
    const config = { sleepMin, sleepMax, batchCount, batchSleepMin, batchSleepMax }
    setButtonStates("sending")
    let result
    try {
      if (window.electronAPI && window.electronAPI.startSending) {
        result = await window.electronAPI.startSending({ contacts, messages, config })
      } else if (window.ipcRenderer) {
        result = await window.ipcRenderer.invoke("start-sending", { contacts, messages, config })
      } else {
        showStatus("❌ IPC communication not available.", "error")
        setButtonStates("idle")
        return
      }
      showStatus(
        result.ok ? "🚀 Message sending started successfully!" : "❌ Failed to start sending messages.",
        result.ok ? "success" : "error",
      )
    } catch (err) {
      showStatus("❌ Error: " + (err.message || err), "error")
    } finally {
      if (!result || !result.ok) {
        setButtonStates("idle")
      }
    }
  })
  
  // Enhanced status display function
  function showStatus(message, type = "processing") {
    const statusDiv = document.getElementById("status")
    statusDiv.textContent = message
    statusDiv.className = `status-display ${type}`
  }
  
  // Enhanced CSV preview with table formatting
  const csvInput = document.getElementById("csv-input")
  const csvPreview = document.getElementById("csv-preview")
  const csvUploadArea = document.getElementById("csv-upload-area")
  
  csvInput.addEventListener("change", async () => {
    const file = csvInput.files[0]
    if (!file) {
      csvPreview.classList.remove("show")
      csvUploadArea.classList.remove("file-uploaded")
      return
    }
  
    csvUploadArea.classList.add("file-uploaded")
    const text = await file.text()
    const lines = text.split(/\r?\n/).filter((line) => line.trim())
  
    if (lines.length > 0) {
      const [headerLine, ...dataLines] = lines
      const headers = headerLine.split(",").map((h) => h.trim())
  
      // Create table header
      const tableHead = document.getElementById("table-head")
      const headerRow = document.createElement("tr")
      headers.forEach((header) => {
        const th = document.createElement("th")
        th.textContent = header
        headerRow.appendChild(th)
      })
      tableHead.innerHTML = ""
      tableHead.appendChild(headerRow)
  
      // Create table body (show first 50 rows)
      const tableBody = document.getElementById("table-body")
      tableBody.innerHTML = ""
  
      const rowsToShow = dataLines.slice(0, 50)
      rowsToShow.forEach((line, index) => {
        if (line.trim()) {
          const values = line.split(",").map((v) => v.trim())
          const row = document.createElement("tr")
  
          values.forEach((value, colIndex) => {
            const td = document.createElement("td")
            td.textContent = value || "-"
            row.appendChild(td)
          })
  
          // Add click handler for row selection
          row.addEventListener("click", () => {
            // Remove previous selection
            tableBody.querySelectorAll("tr.selected").forEach((r) => r.classList.remove("selected"))
            // Add selection to clicked row
            row.classList.add("selected")
          })
  
          tableBody.appendChild(row)
        }
      })
  
      // Show total count if there are more rows
      if (dataLines.length > 50) {
        const infoRow = document.createElement("tr")
        const infoCell = document.createElement("td")
        infoCell.colSpan = headers.length
        infoCell.textContent = `... and ${dataLines.length - 50} more rows (${dataLines.length} total contacts)`
        infoCell.style.textAlign = "center"
        infoCell.style.fontStyle = "italic"
        infoCell.style.color = "#6b7280"
        infoCell.style.background = "#f9fafb"
        infoRow.appendChild(infoCell)
        tableBody.appendChild(infoRow)
      }
  
      csvPreview.classList.add("show")
    }
  })
  
  // Enhanced templates preview
  const folderInput = document.getElementById("folder-input")
  const templatesPreview = document.getElementById("templates-preview")
  const templatesUploadArea = document.getElementById("templates-upload-area")
  
  folderInput.addEventListener("change", async () => {
    const files = Array.from(folderInput.files)
      .filter((f) => f.name.endsWith(".txt"))
      .slice(0, 10)
    if (files.length === 0) {
      templatesPreview.classList.remove("show")
      templatesUploadArea.classList.remove("file-uploaded")
      return
    }
  
    templatesUploadArea.classList.add("file-uploaded")
    let out = ""
    for (const file of files) {
      const content = await file.text()
      const preview = content.split(/\r?\n/).slice(0, 3).join("<br>")
      out += `<div class="template-preview">
        <span class="template-filename">${file.name}</span>
        ${preview}${content.split(/\r?\n/).length > 3 ? "<br>..." : ""}
      </div>`
    }
    templatesPreview.innerHTML = out
    templatesPreview.classList.add("show")
  })
  
  // Enhanced drag and drop functionality
  function setupDragAndDrop(uploadArea, fileInput) {
    uploadArea.addEventListener("dragover", (e) => {
      e.preventDefault()
      uploadArea.classList.add("dragover")
    })
  
    uploadArea.addEventListener("dragleave", (e) => {
      e.preventDefault()
      uploadArea.classList.remove("dragover")
    })
  
    uploadArea.addEventListener("drop", (e) => {
      e.preventDefault()
      uploadArea.classList.remove("dragover")
  
      const files = e.dataTransfer.files
      if (files.length > 0) {
        fileInput.files = files
        fileInput.dispatchEvent(new Event("change"))
      }
    })
  }
  
  setupDragAndDrop(csvUploadArea, csvInput)
  setupDragAndDrop(templatesUploadArea, folderInput)
  
  // Enhanced button control logic
  const pauseResumeBtn = document.getElementById("pause-resume-btn")
  const stopBtn = document.getElementById("stop-btn")
  let isPaused = false
  
  function setButtonStates(state) {
    // Reset all buttons
    pauseResumeBtn.disabled = true
    stopBtn.disabled = true
    pauseResumeBtn.textContent = "Pause"
    pauseResumeBtn.classList.remove("loading")
    stopBtn.classList.remove("loading")
    isPaused = false
  
    if (state === "idle") {
      // All buttons disabled
    } else if (state === "sending") {
      pauseResumeBtn.disabled = false
      stopBtn.disabled = false
      pauseResumeBtn.textContent = "Pause"
      isPaused = false
    } else if (state === "paused") {
      pauseResumeBtn.disabled = false
      stopBtn.disabled = false
      pauseResumeBtn.textContent = "Resume"
      isPaused = true
    }
  }
  
  // Initialize button states
  setButtonStates("idle")
  
  // Enhanced button event handlers with feedback
  pauseResumeBtn.onclick = () => {
    pauseResumeBtn.classList.add("loading")
    if (!isPaused) {
      // Pause
      if (window.electronAPI && window.electronAPI.pauseSending) {
        window.electronAPI.pauseSending()
      }
      showStatus("⏸️ Pausing message sending...", "processing")
      setTimeout(() => {
        setButtonStates("paused")
        showStatus("⏸️ Message sending paused.", "success")
      }, 500)
    } else {
      // Resume
      if (window.electronAPI && window.electronAPI.resumeSending) {
        window.electronAPI.resumeSending()
      }
      showStatus("▶️ Resuming message sending...", "processing")
      setTimeout(() => {
        setButtonStates("sending")
        showStatus("▶️ Message sending resumed.", "success")
      }, 500)
    }
  }
  
  stopBtn.onclick = () => {
    stopBtn.classList.add("loading")
    if (window.electronAPI && window.electronAPI.stopSending) {
      window.electronAPI.stopSending()
    }
    showStatus("⏹️ Stopping message sending...", "processing")
    setTimeout(() => {
      setButtonStates("idle")
      showStatus("⏹️ Message sending stopped.", "success")
    }, 500)
  }
  
  // Input validation and real-time feedback
  const numberInputs = document.querySelectorAll('input[type="number"]')
  numberInputs.forEach((input) => {
    input.addEventListener("input", () => {
      if (input.value < 0) {
        input.value = 0
      }
    })
  })
  
  // Initialize the app
  document.addEventListener("DOMContentLoaded", () => {
    showStatus("Ready to send bulk Instagram messages. Please upload your files to get started.", "processing")
  })
  