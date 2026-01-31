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
        
        this.currentLabel = 'Interviewer';
        this.history = [];
        this.historyIndex = -1;
        this.defaultLabels = ['Interviewer', 'Librarian', 'Question'];
        this.customLabels = [];
        this.maxPageHeight = 9;
        
        this.init();
    }

    init() {
        this.loadTheme();
        this.loadCustomLabels();
        this.setupEventListeners();
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
        
        this.editor.addEventListener('keydown', (e) => this.handleEditorKeydown(e));
        this.editor.addEventListener('input', (e) => this.handleEditorInput(e));
        
        this.attachDefaultLabelButtons();
    }

    attachDefaultLabelButtons() {
        this.labelsContainer.querySelectorAll('.label-button').forEach(button => {
            button.addEventListener('click', () => this.selectLabel(button));
        });
    }

    selectLabel(button) {
        document.querySelectorAll('.label-button, .custom-button').forEach(b => {
            b.classList.remove('active');
        });
        button.classList.add('active');
        this.currentLabel = button.dataset.label;
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
        
        button.appendChild(svg);
        button.appendChild(text);
        button.addEventListener('click', () => this.selectLabel(button));
        
        const removeBtn = document.createElement('button');
        removeBtn.style.cssText = 'position:absolute;right:8px;top:50%;transform:translateY(-50%);background:none;border:none;color:inherit;cursor:pointer;padding:4px;display:flex;align-items:center;justify-content:center;opacity:0.6;';
        removeBtn.innerHTML = '<svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
        removeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.removeCustomLabel(labelName, button);
        });
        
        button.style.position = 'relative';
        button.appendChild(removeBtn);
        this.customLabelsContainer.appendChild(button);
    }

    removeCustomLabel(labelName, buttonElement) {
        this.customLabels = this.customLabels.filter(l => l !== labelName);
        this.saveCustomLabels();
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