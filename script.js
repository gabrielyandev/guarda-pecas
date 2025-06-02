document.addEventListener("DOMContentLoaded", () => {
  const calendarDays = document.querySelectorAll(".day");
  const currentWeekRange = document.getElementById("currentWeekRange");
  const prevWeekBtn = document.getElementById("prevWeek");
  const nextWeekBtn = document.getElementById("nextWeek");
  const darkModeToggle = document.getElementById("darkModeToggle");
  const exportCsvBtn = document.getElementById("exportCsvBtn");
  const exportXlsxBtn = document.getElementById("exportXlsxBtn");
  const body = document.body;

  const entryModal = document.getElementById("entryModal");
  const closeButton = entryModal.querySelector(".close-button");
  const entryForm = document.getElementById("entryForm");
  const modalState = document.getElementById("modalState");
  const modalGuardouTime = document.getElementById("modalGuardouTime");
  const modalRetirouTime = document.getElementById("modalRetirouTime");

  let currentMonday = new Date();
  let currentEditingEntry = null;
  let currentDayElement = null;

  function getMonday(d) {
    d = new Date(d);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff));
  }

  function formatDate(date) {
    return date.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  }

  function formatTime(timeString) {
    if (!timeString) return "";
    const [hours, minutes] = timeString.split(":");
    return `${hours}:${minutes}`;
  }

  function loadEntries() {
    const entries = localStorage.getItem("pieceEntries");
    return entries ? JSON.parse(entries) : {};
  }

  function saveEntries(entries) {
    localStorage.setItem("pieceEntries", JSON.stringify(entries));
  }

  function renderCalendar() {
    const monday = getMonday(currentMonday);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);

    currentWeekRange.textContent = `${formatDate(monday)} - ${formatDate(
      sunday
    )}`;

    calendarDays.forEach((dayElement, index) => {
      const day = new Date(monday);
      day.setDate(monday.getDate() + index);

      const dayDateSpan = dayElement.querySelector(".day-date");
      dayDateSpan.textContent = day.toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
      });

      const entriesContainer = dayElement.querySelector(".entries");
      entriesContainer.innerHTML = "";
      entriesContainer.setAttribute(
        "data-date",
        day.toISOString().split("T")[0]
      );

      const allEntries = loadEntries();
      const dateKey = day.toISOString().split("T")[0];

      if (allEntries[dateKey]) {
        allEntries[dateKey].forEach((entry, entryIndex) => {
          const entryDiv = document.createElement("div");
          entryDiv.classList.add("entry-item");
          entryDiv.innerHTML = `
                        <div>
                            <p><strong>${entry.state}</strong></p>
                            <p>Guardou: ${formatTime(entry.guardouTime)}</p>
                            ${
                              entry.retirouTime
                                ? `<p>Retirou: ${formatTime(
                                    entry.retirouTime
                                  )}</p>`
                                : ""
                            }
                        </div>
                        <div class="entry-actions">
                            <button class="edit-entry" data-index="${entryIndex}" data-date="${dateKey}">✏️</button>
                            <button class="delete-entry" data-index="${entryIndex}" data-date="${dateKey}">🗑️</button>
                        </div>
                    `;
          entriesContainer.appendChild(entryDiv);
        });
      }
    });
  }

  function openModal(dayElement) {
    currentDayElement = dayElement;
    currentEditingEntry = null;
    entryForm.reset();
    modalRetirouTime.value = "";
    entryModal.style.display = "flex";
  }

  function openModalForEdit(entry, dateKey, entryIndex) {
    currentEditingEntry = { ...entry, dateKey, entryIndex };
    modalState.value = entry.state;
    modalGuardouTime.value = entry.guardouTime;
    modalRetirouTime.value = entry.retirouTime || "";
    entryModal.style.display = "flex";
  }

  function closeModal() {
    entryModal.style.display = "none";
    currentEditingEntry = null;
    currentDayElement = null;
    entryForm.reset();
  }

  entryForm.addEventListener("submit", (e) => {
    e.preventDefault();

    const state = modalState.value;
    const guardouTime = modalGuardouTime.value;
    const retirouTime = modalRetirouTime.value;

    const newEntry = {
      state,
      guardouTime,
      retirouTime,
    };

    const allEntries = loadEntries();
    let dateKey;

    if (currentEditingEntry) {
      dateKey = currentEditingEntry.dateKey;
      if (!allEntries[dateKey]) {
        allEntries[dateKey] = [];
      }
      allEntries[dateKey][currentEditingEntry.entryIndex] = newEntry;
    } else if (currentDayElement) {
      dateKey = currentDayElement
        .querySelector(".entries")
        .getAttribute("data-date");
      if (!allEntries[dateKey]) {
        allEntries[dateKey] = [];
      }
      allEntries[dateKey].push(newEntry);
    } else {
      console.error(
        "Erro: Não foi possível determinar o dia para salvar a entrada."
      );
      return;
    }

    saveEntries(allEntries);
    renderCalendar();
    closeModal();
  });

  function deleteEntry(dateKey, entryIndex) {
    if (confirm("Tem certeza que deseja deletar esta entrada?")) {
      const allEntries = loadEntries();
      if (allEntries[dateKey] && allEntries[dateKey].length > entryIndex) {
        allEntries[dateKey].splice(entryIndex, 1);
        saveEntries(allEntries);
        renderCalendar();
      }
    }
  }

  function convertToCsv(data) {
    const headers = ["Data", "Estado", "Hora Guardou", "Hora Retirou"];
    let csv = headers.join(";") + "\n";

    for (const dateKey in data) {
      if (data.hasOwnProperty(dateKey)) {
        const entriesForDay = data[dateKey];
        entriesForDay.forEach((entry) => {
          const date = new Date(dateKey + "T00:00:00");
          const row = [
            formatDateToDDMMYYYY(date),
            entry.state,
            formatTime(entry.guardouTime),
            entry.retirouTime ? formatTime(entry.retirouTime) : "",
          ];
          csv += row.map((item) => `"${item}"`).join(";") + "\n";
        });
      }
    }
    return csv;
  }

  function formatDateToDDMMYYYY(date) {
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  }

  prevWeekBtn.addEventListener("click", () => {
    currentMonday.setDate(currentMonday.getDate() - 7);
    renderCalendar();
  });

  nextWeekBtn.addEventListener("click", () => {
    currentMonday.setDate(currentMonday.getDate() + 7);
    renderCalendar();
  });

  document.querySelectorAll(".add-entry-btn").forEach((button) => {
    button.addEventListener("click", (e) => {
      const dayElement = e.target.closest(".day");
      openModal(dayElement);
    });
  });

  document.querySelector(".calendar").addEventListener("click", (e) => {
    if (e.target.classList.contains("edit-entry")) {
      const dateKey = e.target.getAttribute("data-date");
      const entryIndex = parseInt(e.target.getAttribute("data-index"));
      const allEntries = loadEntries();
      const entryToEdit = allEntries[dateKey][entryIndex];
      openModalForEdit(entryToEdit, dateKey, entryIndex);
    } else if (e.target.classList.contains("delete-entry")) {
      const dateKey = e.target.getAttribute("data-date");
      const entryIndex = parseInt(e.target.getAttribute("data-index"));
      deleteEntry(dateKey, entryIndex);
    }
  });

  closeButton.addEventListener("click", closeModal);
  window.addEventListener("click", (e) => {
    if (e.target === entryModal) {
      closeModal();
    }
  });

  exportCsvBtn.addEventListener("click", () => {
    const allEntries = loadEntries();
    const csvContent = convertToCsv(allEntries);

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `controle_pecas_${new Date().toISOString().split("T")[0]}.csv`;

    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  });

  exportXlsxBtn.addEventListener("click", () => {
    const allEntriesObj = loadEntries();

    const dataForXLSX = [];
    for (const dateKey in allEntriesObj) {
      if (allEntriesObj.hasOwnProperty(dateKey)) {
        const entriesForDay = allEntriesObj[dateKey];
        entriesForDay.forEach((entry) => {
          const date = new Date(dateKey + "T00:00:00");
          dataForXLSX.push({
            Data: formatDateToDDMMYYYY(date),
            Loja: entry.state,
            "Hora Guardou": formatTime(entry.guardouTime),
            "Hora Retirou": entry.retirouTime
              ? formatTime(entry.retirouTime)
              : "",
          });
        });
      }
    }

    const wb = XLSX.utils.book_new();

    const ws = XLSX.utils.json_to_sheet(dataForXLSX);

    XLSX.utils.book_append_sheet(wb, ws, "Controle de Peças");

    const filename = `controle_pecas_${
      new Date().toISOString().split("T")[0]
    }.xlsx`;
    XLSX.writeFile(wb, filename);
  });

  darkModeToggle.addEventListener("click", () => {
    body.classList.toggle("dark-mode");
    if (body.classList.contains("dark-mode")) {
      localStorage.setItem("darkMode", "enabled");
    } else {
      localStorage.setItem("darkMode", "disabled");
    }
  });

  function loadDarkModePreference() {
    if (localStorage.getItem("darkMode") === "enabled") {
      body.classList.add("dark-mode");
    }
  }

  loadDarkModePreference();
  renderCalendar();
});
