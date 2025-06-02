document.addEventListener('DOMContentLoaded', () => {
    const calendarDays = document.querySelectorAll('.day');
    const currentWeekRange = document.getElementById('currentWeekRange');
    const prevWeekBtn = document.getElementById('prevWeek');
    const nextWeekBtn = document.getElementById('nextWeek');
    const darkModeToggle = document.getElementById('darkModeToggle');
    const exportCsvBtn = document.getElementById('exportCsvBtn'); // NOVO: Botão de exportar CSV
    const body = document.body;

    const entryModal = document.getElementById('entryModal');
    const closeButton = entryModal.querySelector('.close-button');
    const entryForm = document.getElementById('entryForm');
    const modalState = document.getElementById('modalState');
    const modalGuardouTime = document.getElementById('modalGuardouTime');
    const modalRetirouTime = document.getElementById('modalRetirouTime');

    let currentMonday = new Date();
    let currentEditingEntry = null; // Para armazenar a entrada que está sendo editada
    let currentDayElement = null; // Para saber qual dia está sendo preenchido

    // Funções de Utilidade
    function getMonday(d) {
        d = new Date(d);
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Ajusta para a segunda-feira
        return new Date(d.setDate(diff));
    }

    function formatDate(date) {
        return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    }

    function formatTime(timeString) {
        if (!timeString) return '';
        const [hours, minutes] = timeString.split(':');
        return `${hours}:${minutes}`;
    }

    // Carregar dados do Local Storage
    function loadEntries() {
        const entries = localStorage.getItem('pieceEntries');
        return entries ? JSON.parse(entries) : {};
    }

    // Salvar dados no Local Storage
    function saveEntries(entries) {
        localStorage.setItem('pieceEntries', JSON.stringify(entries));
    }

    // Renderizar o calendário
    function renderCalendar() {
        const monday = getMonday(currentMonday);
        const sunday = new Date(monday);
        sunday.setDate(monday.getDate() + 6);

        currentWeekRange.textContent = `${formatDate(monday)} - ${formatDate(sunday)}`;

        calendarDays.forEach((dayElement, index) => {
            const day = new Date(monday);
            day.setDate(monday.getDate() + index);

            const dayDateSpan = dayElement.querySelector('.day-date');
            dayDateSpan.textContent = day.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });

            const entriesContainer = dayElement.querySelector('.entries');
            entriesContainer.innerHTML = '';
            entriesContainer.setAttribute('data-date', day.toISOString().split('T')[0]); // Armazena a data ISO para fácil lookup

            const allEntries = loadEntries();
            const dateKey = day.toISOString().split('T')[0]; // Ex: "2024-05-29"

            if (allEntries[dateKey]) {
                allEntries[dateKey].forEach((entry, entryIndex) => {
                    const entryDiv = document.createElement('div');
                    entryDiv.classList.add('entry-item');
                    entryDiv.innerHTML = `
                        <div>
                            <p><strong>${entry.state}</strong></p>
                            <p>Guardou: ${formatTime(entry.guardouTime)}</p>
                            ${entry.retirouTime ? `<p>Retirou: ${formatTime(entry.retirouTime)}</p>` : ''}
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

    // Abrir o Modal
    function openModal(dayElement) {
        currentDayElement = dayElement;
        currentEditingEntry = null; // Reinicia para nova entrada
        entryForm.reset();
        modalRetirouTime.value = ''; // Limpa o campo de retirada
        entryModal.style.display = 'flex';
    }

    // Abrir o Modal para Edição
    function openModalForEdit(entry, dateKey, entryIndex) {
        currentEditingEntry = { ...entry, dateKey, entryIndex };
        modalState.value = entry.state;
        modalGuardouTime.value = entry.guardouTime;
        modalRetirouTime.value = entry.retirouTime || ''; // Preenche se existir, senão vazio
        entryModal.style.display = 'flex';
    }

    // Fechar o Modal
    function closeModal() {
        entryModal.style.display = 'none';
        currentEditingEntry = null;
        currentDayElement = null;
        entryForm.reset();
    }

    // Salvar Entrada
    entryForm.addEventListener('submit', (e) => {
        e.preventDefault();

        const state = modalState.value;
        const guardouTime = modalGuardouTime.value;
        const retirouTime = modalRetirouTime.value;

        const newEntry = {
            state,
            guardouTime,
            retirouTime
        };

        const allEntries = loadEntries();
        let dateKey;

        if (currentEditingEntry) {
            dateKey = currentEditingEntry.dateKey;
            if (!allEntries[dateKey]) {
                allEntries[dateKey] = [];
            }
            // Atualiza a entrada existente
            allEntries[dateKey][currentEditingEntry.entryIndex] = newEntry;
        } else if (currentDayElement) {
            dateKey = currentDayElement.querySelector('.entries').getAttribute('data-date');
            if (!allEntries[dateKey]) {
                allEntries[dateKey] = [];
            }
            allEntries[dateKey].push(newEntry);
        } else {
            console.error("Erro: Não foi possível determinar o dia para salvar a entrada.");
            return;
        }

        saveEntries(allEntries);
        renderCalendar();
        closeModal();
    });

    // Deletar Entrada
    function deleteEntry(dateKey, entryIndex) {
        if (confirm('Tem certeza que deseja deletar esta entrada?')) {
            const allEntries = loadEntries();
            if (allEntries[dateKey] && allEntries[dateKey].length > entryIndex) {
                allEntries[dateKey].splice(entryIndex, 1);
                saveEntries(allEntries);
                renderCalendar();
            }
        }
    }

    // Funções para Exportar CSV
    function convertToCsv(data) {
        const headers = ["Data", "Estado", "Hora Guardou", "Hora Retirou"];
        let csv = headers.join(";") + "\n"; // Cabeçalho CSV com ponto e vírgula como separador

        // Iterar sobre os dias
        for (const dateKey in data) {
            if (data.hasOwnProperty(dateKey)) {
                const entriesForDay = data[dateKey];
                entriesForDay.forEach(entry => {
                    // Garante que o objeto Date é criado corretamente a partir do dateKey
                    const date = new Date(dateKey + 'T00:00:00'); // Adiciona T00:00:00 para evitar problemas de fuso horário
                    const row = [
                        formatDateToDDMMYYYY(date), // Formata a data para dd/mm/yyyy
                        entry.state,
                        formatTime(entry.guardouTime),
                        entry.retirouTime ? formatTime(entry.retirouTime) : "" // Vazio se não houver hora de retirada
                    ];
                    csv += row.map(item => `"${item}"`).join(";") + "\n"; // Adiciona aspas e separa por ;
                });
            }
        }
        return csv;
    }

    // Função auxiliar para formatar data para CSV (dd/mm/yyyy)
    function formatDateToDDMMYYYY(date) {
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0'); // Mês é base 0
        const year = date.getFullYear();
        return `${day}/${month}/${year}`;
    }

    // Event Listeners
    prevWeekBtn.addEventListener('click', () => {
        currentMonday.setDate(currentMonday.getDate() - 7);
        renderCalendar();
    });

    nextWeekBtn.addEventListener('click', () => {
        currentMonday.setDate(currentMonday.getDate() + 7);
        renderCalendar();
    });

    // Abrir modal ao clicar no botão '+'
    document.querySelectorAll('.add-entry-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            const dayElement = e.target.closest('.day');
            openModal(dayElement);
        });
    });

    // Delegar eventos para botões de editar/deletar (já que são adicionados dinamicamente)
    document.querySelector('.calendar').addEventListener('click', (e) => {
        if (e.target.classList.contains('edit-entry')) {
            const dateKey = e.target.getAttribute('data-date');
            const entryIndex = parseInt(e.target.getAttribute('data-index'));
            const allEntries = loadEntries();
            const entryToEdit = allEntries[dateKey][entryIndex];
            openModalForEdit(entryToEdit, dateKey, entryIndex);
        } else if (e.target.classList.contains('delete-entry')) {
            const dateKey = e.target.getAttribute('data-date');
            const entryIndex = parseInt(e.target.getAttribute('data-index'));
            deleteEntry(dateKey, entryIndex);
        }
    });

    closeButton.addEventListener('click', closeModal);
    window.addEventListener('click', (e) => {
        if (e.target === entryModal) {
            closeModal();
        }
    });

    // Event Listener para o botão de exportar CSV
    exportCsvBtn.addEventListener('click', () => {
        const allEntries = loadEntries(); // Carrega os dados do localStorage
        const csvContent = convertToCsv(allEntries);

        // Cria um Blob com o conteúdo CSV
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });

        // Cria um link temporário para download
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `controle_pecas_${new Date().toISOString().split('T')[0]}.csv`; // Nome do arquivo com data

        document.body.appendChild(a); // Anexa o link ao corpo (necessário para Firefox)
        a.click(); // Simula o clique no link para iniciar o download
        document.body.removeChild(a); // Remove o link
        URL.revokeObjectURL(url); // Libera o URL do objeto
    });


    // Modo Escuro
    darkModeToggle.addEventListener('click', () => {
        body.classList.toggle('dark-mode');
        // Salva a preferência do usuário
        if (body.classList.contains('dark-mode')) {
            localStorage.setItem('darkMode', 'enabled');
        } else {
            localStorage.setItem('darkMode', 'disabled');
        }
    });

    // Carregar preferência de modo escuro ao iniciar
    function loadDarkModePreference() {
        if (localStorage.getItem('darkMode') === 'enabled') {
            body.classList.add('dark-mode');
        }
    }

    // Inicialização
    loadDarkModePreference();
    renderCalendar();
});