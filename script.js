class NotesApp {
    constructor() {
        this.editor = document.getElementById('editor');
        this.pagesContainer = document.getElementById('pages-container');
        this.labelsContainer = document.getElementById('labels-container');
        this.customLabelsContainer = document.getElementById('custom-labels-container');
        this.customLabelInput = document.getElementById('custom-label-input');
        this.addLabelBtn = document.getElementById('add-label-btn');
        this.undoBtn = document.getElementById('undo-btn');
        this.clearBtn = document.getElementById('clear-btn');
        this.copyBtn = document.getElementById('copy-btn');
        this.themeToggle = document.getElementById('theme-toggle');
        this.modal = document.getElementById('modal');
        this.modalOverlay = document.querySelector('.modal-overlay');
        this.modalCancel = document.getElementById('modal-cancel');
        this.modalConfirm = document.getElementById('modal-confirm');
        this.toast = document.getElementById('toast');
        this.toastMessage = document.getElementById('toast-message');
        
        // Keybind modal elements
        this.keybindModal = document.getElementById('keybind-modal');
        this.keybindLabelName = document.getElementById('keybind-label-name');
        this.keybindDisplay = document.getElementById('keybind-display');
        this.keybindCancel = document.getElementById('keybind-cancel');
        this.keybindSave = document.getElementById('keybind-save');
        this.keybindClear = document.getElementById('keybind-clear');
        
        this.currentLabel = 'Interviewer';
        this.history = [];
        this.historyIndex = -1;
        this.defaultLabels = ['Interviewer', 'Question'];
        this.customLabels = [];
        this.maxPageHeight = 9;
        
        // Keybind management
        this.keybinds = {}; // {labelName: {key: 'a', ctrl: true, alt: false, shift: false}}
        this.currentKeybindLabel = null;
        this.tempKeybind = null;
        
        this.init();
    }

    init() {
        this.loadTheme();
        this.loadCustomLabels();
        this.loadKeybinds();
        this.setupEventListeners();
        this.setupGlobalKeybindListener();
        this.updateAllKeybindBadges();
        this.saveState();
    }

    setupEventListeners() {
        this.addLabelBtn.addEventListener('click', () => this.addCustomLabel());
        this.customLabelInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.addCustomLabel();
            }
        });
        this.undoBtn.addEventListener('click', () => this.undo());
        this.clearBtn.addEventListener('click', () => this.showClearModal());
        this.copyBtn.addEventListener('click', () => this.copyToClipboard());
        this.themeToggle.addEventListener('click', () => this.toggleTheme());
        this.modalCancel.addEventListener('click', () => this.closeModal());
        this.modalOverlay.addEventListener('click', () => this.closeModal());
        this.modalConfirm.addEventListener('click', () => this.confirmClear());
        
        // Keybind modal events
        this.keybindCancel.addEventListener('click', () => this.closeKeybindModal());
        this.keybindSave.addEventListener('click', () => this.saveKeybind());
        this.keybindClear.addEventListener('click', () => this.clearKeybind());
        
        this.editor.addEventListener('keydown', (e) => this.handleEditorKeydown(e));
        this.editor.addEventListener('input', (e) => this.handleEditorInput(e));
        
        this.attachDefaultLabelButtons();
    }

    setupGlobalKeybindListener() {
        document.addEventListener('keydown', (e) => {
            // Don't trigger if user is typing in an input or the editor
            if (e.target.tagName === 'INPUT' || e.target === this.editor) {
                return;
            }
            
            // Don't trigger if a modal is open
            if (!this.modal.classList.contains('hidden') || !this.keybindModal.classList.contains('hidden')) {
                return;
            }
            
            // Check if this key combination matches any keybind
            for (const [labelName, binding] of Object.entries(this.keybinds)) {
                if (this.matchesKeybind(e, binding)) {
                    e.preventDefault();
                    this.switchToLabel(labelName);
                    return;
                }
            }
        });
    }

    matchesKeybind(event, binding) {
        return event.key.toLowerCase() === binding.key.toLowerCase() &&
               event.ctrlKey === binding.ctrl &&
               event.altKey === binding.alt &&
               event.shiftKey === binding.shift;
    }

    switchToLabel(labelName) {
        const button = document.querySelector(`[data-label="${labelName}"]`);
        if (button) {
            this.selectLabel(button);
            this.showToast(`Switched to: ${labelName}`);
        }
    }

    attachDefaultLabelButtons() {
        this.labelsContainer.querySelectorAll('.label-button').forEach(button => {
            button.addEventListener('click', (e) => {
                if (!e.target.closest('.keybind-badge')) {
                    this.selectLabel(button);
                }
            });
            
            // Add click handler for keybind badge
            const badge = button.querySelector('.keybind-badge');
            if (badge) {
                badge.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.openKeybindModal(button.dataset.label);
                });
            }
        });
    }

    selectLabel(button) {
        document.querySelectorAll('.label-button, .custom-button').forEach(b => {
            b.classList.remove('active');
        });
        button.classList.add('active');
        this.currentLabel = button.dataset.label;
    }

    openKeybindModal(labelName) {
        this.currentKeybindLabel = labelName;
        this.tempKeybind = null;
        this.keybindLabelName.textContent = `Setting keybind for: ${labelName}`;
        this.keybindDisplay.textContent = '-';
        this.keybindSave.disabled = true;
        this.keybindModal.classList.remove('hidden');
        
        // Add keydown listener for keybind modal
        this.keybindModalKeyHandler = (e) => this.handleKeybindInput(e);
        document.addEventListener('keydown', this.keybindModalKeyHandler);
    }

    handleKeybindInput(e) {
        // Ignore modifier keys alone
        if (['Control', 'Alt', 'Shift', 'Meta'].includes(e.key)) {
            return;
        }
        
        e.preventDefault();
        
        this.tempKeybind = {
            key: e.key,
            ctrl: e.ctrlKey,
            alt: e.altKey,
            shift: e.shiftKey
        };
        
        this.keybindDisplay.textContent = this.formatKeybind(this.tempKeybind);
        this.keybindSave.disabled = false;
    }

    formatKeybind(binding) {
        let parts = [];
        if (binding.ctrl) parts.push('Ctrl');
        if (binding.alt) parts.push('Alt');
        if (binding.shift) parts.push('Shift');
        parts.push(binding.key.toUpperCase());
        return parts.join(' + ');
    }

    saveKeybind() {
        if (!this.tempKeybind) return;
        
        // Check if this keybind is already used
        for (const [label, binding] of Object.entries(this.keybinds)) {
            if (label !== this.currentKeybindLabel && 
                binding.key === this.tempKeybind.key &&
                binding.ctrl === this.tempKeybind.ctrl &&
                binding.alt === this.tempKeybind.alt &&
                binding.shift === this.tempKeybind.shift) {
                this.showToast(`Keybind already used for: ${label}`);
                return;
            }
        }
        
        this.keybinds[this.currentKeybindLabel] = this.tempKeybind;
        this.saveKeybinds();
        this.updateKeybindBadge(this.currentKeybindLabel);
        this.closeKeybindModal();
        this.showToast(`Keybind set: ${this.formatKeybind(this.tempKeybind)}`);
    }

    clearKeybind() {
        if (this.keybinds[this.currentKeybindLabel]) {
            delete this.keybinds[this.currentKeybindLabel];
            this.saveKeybinds();
            this.updateKeybindBadge(this.currentKeybindLabel);
            this.showToast(`Keybind cleared for: ${this.currentKeybindLabel}`);
        }
        this.closeKeybindModal();
    }

    closeKeybindModal() {
        this.keybindModal.classList.add('hidden');
        document.removeEventListener('keydown', this.keybindModalKeyHandler);
        this.currentKeybindLabel = null;
        this.tempKeybind = null;
    }

    updateKeybindBadge(labelName) {
        const badge = document.querySelector(`.keybind-badge[data-label="${labelName}"]`);
        if (badge) {
            const binding = this.keybinds[labelName];
            if (binding) {
                badge.textContent = this.formatKeybind(binding);
                badge.classList.add('has-keybind');
            } else {
                badge.textContent = '';
                badge.classList.remove('has-keybind');
            }
        }
    }

    updateAllKeybindBadges() {
        document.querySelectorAll('.keybind-badge').forEach(badge => {
            const labelName = badge.dataset.label;
            const binding = this.keybinds[labelName];
            if (binding) {
                badge.textContent = this.formatKeybind(binding);
                badge.classList.add('has-keybind');
            } else {
                badge.textContent = '';
                badge.classList.remove('has-keybind');
            }
        });
    }

    saveKeybinds() {
        localStorage.setItem('notes-keybinds', JSON.stringify(this.keybinds));
    }

    loadKeybinds() {
        const saved = localStorage.getItem('notes-keybinds');
        if (saved) {
            this.keybinds = JSON.parse(saved);
        }
    }

    handleEditorKeydown(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            this.insertLabel();
        }
    }

    handleEditorInput(e) {
        this.checkAndMoveOverflow();
        this.saveState();
    }

    checkAndMoveOverflow() {
        const pages = this.pagesContainer.querySelectorAll('.page');
        const lastPage = pages[pages.length - 1];
        const lastEditor = lastPage.querySelector('.editor');
        
        const pageHeight = lastPage.offsetHeight;
        const pageHeightInches = pageHeight / 96;
        
        if (pageHeightInches > this.maxPageHeight) {
            this.moveExcessContentToNewPage();
        }
    }

    moveExcessContentToNewPage() {
        const pages = this.pagesContainer.querySelectorAll('.page');
        const lastPage = pages[pages.length - 1];
        const lastEditor = lastPage.querySelector('.editor');
        
        const nodes = Array.from(lastEditor.childNodes);
        let currentHeight = 0;
        let moveFromIndex = -1;
        
        for (let i = 0; i < nodes.length; i++) {
            const node = nodes[i];
            const tempDiv = document.createElement('div');
            tempDiv.appendChild(node.cloneNode(true));
            const nodeHeight = tempDiv.offsetHeight / 96;
            
            if (currentHeight + nodeHeight > this.maxPageHeight - 0.5) {
                moveFromIndex = i;
                break;
            }
            currentHeight += nodeHeight;
        }
        
        if (moveFromIndex > 0 && moveFromIndex < nodes.length) {
            const newPage = document.createElement('div');
            newPage.className = 'page';
            const newEditor = document.createElement('div');
            newEditor.className = 'editor';
            newEditor.contentEditable = 'true';
            newEditor.spellcheck = 'true';
            newPage.appendChild(newEditor);
            
            for (let i = moveFromIndex; i < nodes.length; i++) {
                newEditor.appendChild(nodes[i]);
            }
            
            this.pagesContainer.appendChild(newPage);
            this.editor = lastEditor;
        }
    }

    insertLabel() {
        const selection = window.getSelection();
        
        if (this.currentLabel === 'Question') {
            const prefix = 'Q. ';
            const text = document.createTextNode(prefix);
            
            const range = selection.getRangeAt(0);
            range.insertNode(text);
            range.setStartAfter(text);
            range.collapse(true);
            selection.removeAllRanges();
            selection.addRange(range);
        } else {
            const heading = document.createElement('div');
            heading.className = 'label-heading';
            heading.textContent = this.currentLabel;
            
            const content = document.createElement('div');
            content.className = 'label-content';
            content.innerHTML = '<br>';
            
            const range = selection.getRangeAt(0);
            range.insertNode(heading);
            heading.parentNode.insertBefore(content, heading.nextSibling);
            
            range.setStart(content, 0);
            range.collapse(true);
            selection.removeAllRanges();
            selection.addRange(range);
        }
        
        this.editor.focus();
        setTimeout(() => this.checkAndMoveOverflow(), 50);
        this.saveState();
    }

    addCustomLabel() {
        const labelName = this.customLabelInput.value.trim();
        
        if (!labelName) {
            this.showToast('Please enter a label name');
            return;
        }
        
        if (this.defaultLabels.includes(labelName) || this.customLabels.includes(labelName)) {
            this.showToast('This label already exists');
            return;
        }
        
        this.customLabels.push(labelName);
        this.saveCustomLabels();
        this.customLabelInput.value = '';
        
        this.createCustomLabelButton(labelName);
        this.showToast(`Label "${labelName}" created`);
    }

    createCustomLabelButton(labelName) {
        const button = document.createElement('button');
        button.className = 'label-button custom-button';
        button.dataset.label = labelName;
        
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('viewBox', '0 0 24 24');
        svg.setAttribute('width', '16');
        svg.setAttribute('height', '16');
        svg.setAttribute('stroke', 'currentColor');
        svg.setAttribute('stroke-width', '2');
        svg.setAttribute('fill', 'none');
        svg.innerHTML = '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>';
        
        const text = document.createElement('span');
        text.textContent = labelName;
        
        const keybindBadge = document.createElement('span');
        keybindBadge.className = 'keybind-badge';
        keybindBadge.dataset.label = labelName;
        
        button.appendChild(svg);
        button.appendChild(text);
        button.appendChild(keybindBadge);
        
        button.addEventListener('click', (e) => {
            if (!e.target.closest('.keybind-badge') && !e.target.closest('.remove-label-btn')) {
                this.selectLabel(button);
            }
        });
        
        // Keybind badge click handler
        keybindBadge.addEventListener('click', (e) => {
            e.stopPropagation();
            this.openKeybindModal(labelName);
        });
        
        const removeBtn = document.createElement('button');
        removeBtn.className = 'remove-label-btn';
        removeBtn.innerHTML = '<svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
        removeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.removeCustomLabel(labelName, button);
        });
        
        button.style.position = 'relative';
        button.appendChild(removeBtn);
        this.customLabelsContainer.appendChild(button);
        
        // Update keybind badge if exists
        this.updateKeybindBadge(labelName);
    }

    removeCustomLabel(labelName, buttonElement) {
        this.customLabels = this.customLabels.filter(l => l !== labelName);
        this.saveCustomLabels();
        
        // Remove keybind if exists
        if (this.keybinds[labelName]) {
            delete this.keybinds[labelName];
            this.saveKeybinds();
        }
        
        buttonElement.remove();
        this.showToast(`Label "${labelName}" removed`);
        
        if (this.currentLabel === labelName) {
            this.currentLabel = 'Interviewer';
            document.querySelector('[data-label="Interviewer"]').classList.add('active');
        }
    }

    saveState() {
        const state = this.pagesContainer.innerHTML;
        
        this.history = this.history.slice(0, this.historyIndex + 1);
        this.history.push(state);
        this.historyIndex = this.history.length - 1;
        
        this.undoBtn.disabled = this.historyIndex <= 0;
    }

    undo() {
        if (this.historyIndex > 0) {
            this.historyIndex--;
            this.pagesContainer.innerHTML = this.history[this.historyIndex];
            this.editor = this.pagesContainer.querySelector('.editor');
            this.showToast('Undo successful');
            this.undoBtn.disabled = this.historyIndex <= 0;
        }
    }

    copyToClipboard() {
        const allEditors = this.pagesContainer.querySelectorAll('.editor');
        let fullText = '';
        
        allEditors.forEach(ed => {
            fullText += ed.innerText + '\n\n';
        });
        
        if (!fullText.trim()) {
            this.showToast('Nothing to copy');
            return;
        }
        
        navigator.clipboard.writeText(fullText.trim()).then(() => {
            this.showToast('Copied to clipboard');
        }).catch(() => {
            this.showToast('Failed to copy');
        });
    }

    showClearModal() {
        document.getElementById('modal-title').textContent = 'Clear all content?';
        document.getElementById('modal-message').textContent = 'This will delete all your notes. You can undo this action afterward.';
        this.modal.classList.remove('hidden');
    }

    closeModal() {
        this.modal.classList.add('hidden');
    }

    confirmClear() {
        this.pagesContainer.innerHTML = '<div class="page"><div id="editor" class="editor" contenteditable="true" spellcheck="true"></div></div>';
        this.editor = document.getElementById('editor');
        this.closeModal();
        this.saveState();
        this.showToast('Notes cleared. You can undo this action.');
    }

    showToast(message) {
        this.toastMessage.textContent = message;
        this.toast.classList.remove('hidden');
        
        setTimeout(() => {
            this.toast.classList.add('hidden');
        }, 3000);
    }

    toggleTheme() {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('notes-theme', newTheme);
    }

    loadTheme() {
        const savedTheme = localStorage.getItem('notes-theme') || 'light';
        document.documentElement.setAttribute('data-theme', savedTheme);
    }

    saveCustomLabels() {
        localStorage.setItem('notes-custom-labels', JSON.stringify(this.customLabels));
    }

    loadCustomLabels() {
        const saved = localStorage.getItem('notes-custom-labels');
        if (saved) {
            this.customLabels = JSON.parse(saved);
            this.customLabels.forEach(label => this.createCustomLabelButton(label));
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new NotesApp();
});