const App = {
  contextMenu: null,
  modal: null,
  settingsModal: null,
  activeBlock: null,

  settings: {
    oip3ThresholdDb: 10,
    iip3ThresholdDb: 10,
    p1dbThresholdDb: 10
  },

  init() {
    this.contextMenu = document.getElementById('context-menu');
    this.modal = document.getElementById('param-modal');
    this.settingsModal = document.getElementById('settings-modal');
    this.helpModal = document.getElementById('help-modal');
    
    window.Workspace.init();
    
    this.setupToolbox();
    this.setupUI();
    
    // Hide context menu on outside click
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.context-menu')) {
        this.hideContextMenu();
      }
    });

    // Keyboard shortcuts (Copy/Paste/Delete/Escape/Enter)
    window.addEventListener('keydown', (e) => {
      const activeTag = document.activeElement ? document.activeElement.tagName : '';
      const inInput = activeTag === 'INPUT' || activeTag === 'TEXTAREA';

      // ESC — close any open overlay regardless of focus
      if (e.key === 'Escape') {
        // Close inline param popover
        const popover = document.getElementById('inline-param-popover');
        if (popover) { popover.remove(); return; }
        // Close settings modal
        if (this.settingsModal && !this.settingsModal.classList.contains('hidden')) {
          this.settingsModal.classList.add('hidden'); return;
        }
        // Close help modal
        if (this.helpModal && !this.helpModal.classList.contains('hidden')) {
          this.helpModal.classList.add('hidden'); return;
        }
        // Close param modal (discard changes)
        if (this.modal && !this.modal.classList.contains('hidden')) {
          this.modal.classList.add('hidden'); return;
        }
        // Hide context menu
        this.hideContextMenu();
        return;
      }

      // Enter inside open param modal → save and close
      if (e.key === 'Enter' && this.modal && !this.modal.classList.contains('hidden')) {
        e.preventDefault();
        if (this.activeBlock) this.saveParamsFromModal();
        window.Workspace.markStale();
        this.modal.classList.add('hidden');
        return;
      }

      // Ignore remaining shortcuts while typing in an input
      if (inInput) return;

      if (e.altKey) {
        if (e.key === '1') {
          e.preventDefault();
          this.toggleLeftSidebar();
        } else if (e.key === '2') {
          e.preventDefault();
          this.toggleRightSidebar();
        }
      }

      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'c' || e.key === 'C') {
          e.preventDefault();
          window.Workspace.copy();
        } else if (e.key === 'v' || e.key === 'V') {
          e.preventDefault();
          window.Workspace.paste(window.Workspace.lastMouseX, window.Workspace.lastMouseY);
        }
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        window.Workspace.deleteSelected();
      }
    });

    this.setupSidebarResizers();
  },
  
  setupToolbox() {
    const items = document.querySelectorAll('.toolbox-item');
    items.forEach(item => {
      item.addEventListener('dragstart', e => {
        e.dataTransfer.setData('application/rf-block', item.dataset.type);
        e.dataTransfer.effectAllowed = 'copy';
      });
    });
  },

  setupSidebarResizers() {
    const leftSidebar = document.getElementById('sidebar-left');
    const rightSidebar = document.getElementById('sidebar-right');
    const resizerLeft = document.getElementById('resizer-left');
    const resizerRight = document.getElementById('resizer-right');
    const mainContainer = document.querySelector('.app-main');

    let isResizingLeft = false;
    let isResizingRight = false;

    resizerLeft.addEventListener('mousedown', (e) => {
      e.preventDefault();
      isResizingLeft = true;
      resizerLeft.classList.add('resizing');
      document.body.style.cursor = 'col-resize';
    });

    resizerRight.addEventListener('mousedown', (e) => {
      e.preventDefault();
      isResizingRight = true;
      resizerRight.classList.add('resizing');
      document.body.style.cursor = 'col-resize';
    });

    window.addEventListener('mousemove', (e) => {
      if (isResizingLeft) {
        const containerRect = mainContainer.getBoundingClientRect();
        let newWidth = e.clientX - containerRect.left;
        newWidth = Math.max(150, Math.min(newWidth, 500));
        leftSidebar.style.width = newWidth + 'px';
      } else if (isResizingRight) {
        const containerRect = mainContainer.getBoundingClientRect();
        let newWidth = containerRect.right - e.clientX;
        newWidth = Math.max(150, Math.min(newWidth, 500));
        rightSidebar.style.width = newWidth + 'px';
      }
    });

    window.addEventListener('mouseup', () => {
      if (isResizingLeft) {
        isResizingLeft = false;
        resizerLeft.classList.remove('resizing');
        document.body.style.cursor = 'default';
      }
      if (isResizingRight) {
        isResizingRight = false;
        resizerRight.classList.remove('resizing');
        document.body.style.cursor = 'default';
      }
    });
  },
  
  setupUI() {
    // Left and Right Sidebar Toggle buttons
    const btnToggleLeft = document.getElementById('btn-toggle-left');
    const btnToggleRight = document.getElementById('btn-toggle-right');
    
    if (btnToggleLeft) {
      btnToggleLeft.addEventListener('click', () => {
        this.toggleLeftSidebar();
      });
    }
    if (btnToggleRight) {
      btnToggleRight.addEventListener('click', () => {
        this.toggleRightSidebar();
      });
    }

    // Help modal triggers
    const btnHelp = document.getElementById('btn-help');
    const btnHelpClose = document.getElementById('help-close');
    if (btnHelp && this.helpModal) {
      btnHelp.addEventListener('click', () => {
        this.helpModal.classList.remove('hidden');
      });
    }
    if (btnHelpClose && this.helpModal) {
      btnHelpClose.addEventListener('click', () => {
        this.helpModal.classList.add('hidden');
      });
    }

    // Save Workspace button
    document.getElementById('btn-save-ws').addEventListener('click', () => {
      window.Workspace.exportWorkspace();
    });

    // Load Workspace button
    const fileInput = document.getElementById('input-load-ws');
    document.getElementById('btn-load-ws').addEventListener('click', () => {
      fileInput.click();
    });

    fileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (evt) => {
        try {
          const data = JSON.parse(evt.target.result);
          window.Workspace.importWorkspace(data);
        } catch (err) {
          alert('Failed to parse workspace file: ' + err.message);
        }
      };
      reader.readAsText(file);
      e.target.value = '';
    });
    
    // Load Example dropdown
    const selectExample = document.getElementById('select-example');
    if (selectExample) {
      selectExample.addEventListener('change', async (e) => {
        const url = e.target.value;
        if (!url) return;
        
        try {
          const response = await fetch(url);
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          const data = await response.json();
          window.Workspace.importWorkspace(data);
        } catch (err) {
          alert('Failed to load example: ' + err.message);
        }
        
        // Reset dropdown to default
        e.target.value = '';
      });
    }

    // Clear button
    document.getElementById('btn-clear').addEventListener('click', () => {
      if(confirm("Are you sure you want to clear the workspace?")) {
        window.Workspace.clear();
      }
    });

    // Close button
    document.getElementById('btn-close').addEventListener('click', () => {
      window.location.href = 'https://xugengyu.github.io/paul-blog/apps.html';
    });

    document.getElementById('btn-calculate').addEventListener('click', (e) => {
      const btn = e.currentTarget;
      const success = this.calculateCascade();
      if (!success) {
        btn.classList.add('app-btn--danger');
        btn.textContent = 'Simulate ⚠';
      } else {
        btn.classList.remove('app-btn--danger');
        btn.textContent = 'Simulate';
      }
    });

    // Settings button
    document.getElementById('btn-settings').addEventListener('click', () => {
      // Populate fields from current settings
      document.getElementById('setting-oip3-threshold').value = this.settings.oip3ThresholdDb;
      document.getElementById('setting-iip3-threshold').value = this.settings.iip3ThresholdDb;
      document.getElementById('setting-p1db-threshold').value = this.settings.p1dbThresholdDb;
      this.settingsModal.classList.remove('hidden');
    });

    document.getElementById('settings-close').addEventListener('click', () => {
      const oip3Val = parseFloat(document.getElementById('setting-oip3-threshold').value);
      const iip3Val = parseFloat(document.getElementById('setting-iip3-threshold').value);
      const p1dbVal = parseFloat(document.getElementById('setting-p1db-threshold').value);
      if (!isNaN(oip3Val)) this.settings.oip3ThresholdDb = oip3Val;
      if (!isNaN(iip3Val)) this.settings.iip3ThresholdDb = iip3Val;
      if (!isNaN(p1dbVal)) this.settings.p1dbThresholdDb = p1dbVal;
      this.settingsModal.classList.add('hidden');
      // Re-run display update so any open results reflect new thresholds
      window.Workspace.blocks.forEach(b => b.updateParamDisplay());
    });

    // Spin buttons inside settings modal
    this.settingsModal.querySelectorAll('.spin-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const targetId = btn.dataset.target;
        const step = parseFloat(btn.dataset.step) || 1;
        const input = document.getElementById(targetId);
        if (!input) return;
        let val = parseFloat(input.value) || 0;
        if (btn.classList.contains('spin-btn--up')) val += step;
        else val -= step;
        const min = input.min !== '' ? parseFloat(input.min) : -Infinity;
        const max = input.max !== '' ? parseFloat(input.max) : Infinity;
        input.value = Math.max(min, Math.min(max, val));
      });
    });

    // Display Options Checkboxes
    const chkBlock = document.getElementById('chk-show-block-params');
    const chkCascGain = document.getElementById('chk-show-cascaded-gain');
    const chkCascPower = document.getElementById('chk-show-cascaded-power');
    const chkCascIP3 = document.getElementById('chk-show-cascaded-ip3');
    const chkCascP1dB = document.getElementById('chk-show-cascaded-p1db');
    const chkCascNF = document.getElementById('chk-show-cascaded-nf');
    const chkFreq = document.getElementById('chk-show-frequency');
    const chkLogs = document.getElementById('chk-show-logs');

    const updateOptions = () => {
      window.Workspace.displayOptions = {
        showBlockParams: chkBlock ? chkBlock.checked : true,
        showCascadedGain: chkCascGain ? chkCascGain.checked : false,
        showCascadedPower: chkCascPower ? chkCascPower.checked : false,
        showCascadedIP3: chkCascIP3 ? chkCascIP3.checked : false,
        showCascadedP1dB: chkCascP1dB ? chkCascP1dB.checked : false,
        showCascadedNF: chkCascNF ? chkCascNF.checked : false,
        showFrequency: chkFreq ? chkFreq.checked : false,
        showLogs: chkLogs ? chkLogs.checked : true
      };
      
      const resultsSec = document.getElementById('results-section');
      if (resultsSec) {
        resultsSec.style.display = window.Workspace.displayOptions.showLogs ? 'block' : 'none';
      }
      
      window.Workspace.blocks.forEach(b => b.updateParamDisplay());
    };

    if (chkBlock) chkBlock.addEventListener('change', updateOptions);
    if (chkCascGain) chkCascGain.addEventListener('change', updateOptions);
    if (chkCascPower) chkCascPower.addEventListener('change', updateOptions);
    if (chkCascIP3) chkCascIP3.addEventListener('change', updateOptions);
    if (chkCascP1dB) chkCascP1dB.addEventListener('change', updateOptions);
    if (chkCascNF) chkCascNF.addEventListener('change', updateOptions);
    if (chkFreq) chkFreq.addEventListener('change', updateOptions);
    if (chkLogs) chkLogs.addEventListener('change', updateOptions);
    
    // Context Menu Items
    document.getElementById('menu-snr-start').addEventListener('click', () => {
      this.hideContextMenu();
      if (this.activeBlock && this.activeBlock.type === 'SignalSource') {
        window.Workspace.snrStartBlockId = this.activeBlock.id;
        window.Workspace.markStale();
        window.Workspace.blocks.forEach(b => b.updateParamDisplay());
      }
    });

    document.getElementById('menu-snr-end').addEventListener('click', () => {
      this.hideContextMenu();
      if (this.activeBlock && this.activeBlock.type === 'Load') {
        window.Workspace.snrEndBlockId = this.activeBlock.id;
        window.Workspace.markStale();
        window.Workspace.blocks.forEach(b => b.updateParamDisplay());
      }
    });

    document.getElementById('menu-view-spectrum').addEventListener('click', () => {
      this.hideContextMenu();
      if (this.activeBlock) {
        this.showPlotModal(this.activeBlock);
      }
    });

    document.getElementById('menu-edit').addEventListener('click', () => {
      this.hideContextMenu();
      if (this.activeBlock) {
        this.openParamModal(this.activeBlock);
      }
    });
    
    document.getElementById('menu-rename').addEventListener('click', () => {
      this.hideContextMenu();
      if (this.activeBlock) {
        const currentName = this.activeBlock.name || this.activeBlock.type;
        const newName = prompt(`Rename block from "${currentName}":`, currentName);
        if (newName !== null) {
          this.activeBlock.rename(newName.trim());
          // Intentionally not calculating cascade automatically
        }
      }
    });
    
    document.getElementById('menu-delete').addEventListener('click', () => {
      this.hideContextMenu();
      if (this.activeBlock) {
        if (window.Workspace.snrStartBlockId === this.activeBlock.id) window.Workspace.snrStartBlockId = null;
        if (window.Workspace.snrEndBlockId === this.activeBlock.id) window.Workspace.snrEndBlockId = null;
        window.Workspace.removeBlock(this.activeBlock.id);
        this.activeBlock = null;
        // Intentionally not calculating cascade automatically
      }
    });

    document.getElementById('menu-copy').addEventListener('click', () => {
      this.hideContextMenu();
      window.Workspace.copy();
    });

    document.getElementById('menu-paste').addEventListener('click', () => {
      this.hideContextMenu();
      window.Workspace.paste(window.Workspace.contextMenuX, window.Workspace.contextMenuY);
    });

    document.getElementById('menu-delete-sel').addEventListener('click', () => {
      this.hideContextMenu();
      window.Workspace.selectedBlocks.forEach(sb => {
        if (window.Workspace.snrStartBlockId === sb.id) window.Workspace.snrStartBlockId = null;
        if (window.Workspace.snrEndBlockId === sb.id) window.Workspace.snrEndBlockId = null;
      });
      window.Workspace.deleteSelected();
    });

    document.getElementById('menu-select-catalog').addEventListener('click', () => {
      this.hideContextMenu();
      if (this.activeBlock) {
        this.openCatalogModal(this.activeBlock);
      }
    });

    document.getElementById('catalog-modal-cancel').addEventListener('click', () => {
      document.getElementById('catalog-modal').classList.add('hidden');
      if (this.activeBlock) {
        this.openParamModal(this.activeBlock);
      }
    });

    // Modal buttons
    document.getElementById('modal-cancel').addEventListener('click', () => {
      this.modal.classList.add('hidden');
    });

    document.getElementById('modal-save').addEventListener('click', () => {
      if (this.activeBlock) {
        this.saveParamsFromModal();
        window.Workspace.markStale();
      }
      this.modal.classList.add('hidden');
      // Intentionally not calculating cascade automatically
    });

    document.getElementById('plot-close-btn').addEventListener('click', () => {
      document.getElementById('plot-modal').classList.add('hidden');
    });
  },

  showContextMenu(x, y, block) {
    this.activeBlock = block;
    this.contextMenu.style.left = x + 'px';
    this.contextMenu.style.top = y + 'px';
    this.contextMenu.classList.remove('hidden');

    const selBlocksCount = window.Workspace.selectedBlocks.size;
    const selWiresCount = window.Workspace.selectedWires.size;
    const hasSelection = selBlocksCount > 0 || selWiresCount > 0;
    const hasCopied = window.Workspace.clipboard && window.Workspace.clipboard.blocks.length > 0;

    const menuSnrStart = document.getElementById('menu-snr-start');
    const menuSnrEnd = document.getElementById('menu-snr-end');
    const menuViewSpectrum = document.getElementById('menu-view-spectrum');
    const menuEdit = document.getElementById('menu-edit');
    const menuDelete = document.getElementById('menu-delete');
    const menuCopy = document.getElementById('menu-copy');
    const menuPaste = document.getElementById('menu-paste');
    const menuDeleteSel = document.getElementById('menu-delete-sel');

    const menuRename = document.getElementById('menu-rename');

    const menuSelectCatalog = document.getElementById('menu-select-catalog');

    if (block && selBlocksCount <= 1 && selWiresCount === 0) {
      menuSnrStart.style.display = block.type === 'SignalSource' ? 'block' : 'none';
      menuSnrEnd.style.display = block.type === 'Load' ? 'block' : 'none';
      menuViewSpectrum.style.display = 'block';
      menuEdit.style.display = 'block';
      menuRename.style.display = 'block';
      menuDelete.style.display = 'block';
      if (menuSelectCatalog) {
        const hasCatalog = window.MiniCircuitsCatalog && window.MiniCircuitsCatalog[block.type];
        menuSelectCatalog.style.display = hasCatalog ? 'block' : 'none';
      }
    } else {
      menuSnrStart.style.display = 'none';
      menuSnrEnd.style.display = 'none';
      menuViewSpectrum.style.display = 'none';
      menuEdit.style.display = 'none';
      menuRename.style.display = 'none';
      menuDelete.style.display = 'none';
      if (menuSelectCatalog) menuSelectCatalog.style.display = 'none';
    }

    if (selBlocksCount > 0) {
      menuCopy.style.display = 'block';
    } else {
      menuCopy.style.display = 'none';
    }

    if (hasCopied) {
      menuPaste.style.display = 'block';
    } else {
      menuPaste.style.display = 'none';
    }

    if (hasSelection) {
      menuDeleteSel.style.display = 'block';
    } else {
      menuDeleteSel.style.display = 'none';
    }
  },

  hideContextMenu() {
    this.contextMenu.classList.add('hidden');
  },

  showPlotModal(block) {
    if (typeof Plotly === 'undefined') {
      alert('Plotly library is not loaded yet.');
      return;
    }
    const modal = document.getElementById('plot-modal');
    modal.classList.remove('hidden');

    const inSpec = block.inputSpectrum || [];
    const outSpec = block.outputSpectrum || [];

    let minPower = Math.min(
      ...inSpec.map(t => t.power_dBm),
      ...outSpec.map(t => t.power_dBm)
    );
    if (!isFinite(minPower) || minPower > -50) minPower = -100;
    
    let maxPower = Math.max(
      ...inSpec.map(t => t.power_dBm),
      ...outSpec.map(t => t.power_dBm)
    );
    if (!isFinite(maxPower) || maxPower < 0) maxPower = 10;
    
    let yMin = minPower - 20;

    let x_in_lines = [], y_in_lines = [];
    inSpec.forEach(t => {
      x_in_lines.push(t.freq, t.freq, null);
      y_in_lines.push(yMin, t.power_dBm, null);
    });
    
    let x_out_lines = [], y_out_lines = [];
    outSpec.forEach(t => {
      x_out_lines.push(t.freq, t.freq, null);
      y_out_lines.push(yMin, t.power_dBm, null);
    });

    const trace1_lines = {
      x: x_in_lines,
      y: y_in_lines,
      type: 'scatter',
      mode: 'lines',
      line: { color: 'rgba(54, 162, 235, 0.7)', width: 2 },
      legendgroup: 'input',
      showlegend: false,
      hoverinfo: 'none'
    };
    const trace1_markers = {
      x: inSpec.map(t => t.freq),
      y: inSpec.map(t => t.power_dBm),
      type: 'scatter',
      mode: 'markers',
      name: 'Input',
      legendgroup: 'input',
      marker: { color: 'rgba(54, 162, 235, 1)', size: 8 }
    };

    const trace2_lines = {
      x: x_out_lines,
      y: y_out_lines,
      type: 'scatter',
      mode: 'lines',
      line: { color: 'rgba(255, 99, 132, 0.7)', width: 2 },
      legendgroup: 'output',
      showlegend: false,
      hoverinfo: 'none'
    };
    const trace2_markers = {
      x: outSpec.map(t => t.freq),
      y: outSpec.map(t => t.power_dBm),
      type: 'scatter',
      mode: 'markers',
      name: 'Output',
      legendgroup: 'output',
      marker: { color: 'rgba(255, 99, 132, 1)', size: 8 }
    };

    const layout = {
      title: `${block.type} Spectrum`,
      xaxis: { title: 'Frequency (MHz)' },
      yaxis: { title: 'Power (dBm)', range: [yMin, maxPower + 10] },
      margin: { l: 50, r: 20, t: 40, b: 40 },
      hovermode: 'closest'
    };

    Plotly.newPlot('plot-container', [trace1_lines, trace1_markers, trace2_lines, trace2_markers], layout, { responsive: true });
  },

  openParamModal(block) {
    document.getElementById('modal-title').textContent = `Edit ${block.type} Parameters`;
    const body = document.getElementById('modal-body');
    body.innerHTML = '';
    
    // Add "Select Real Component" button if catalog exists for this block type
    if (window.MiniCircuitsCatalog && window.MiniCircuitsCatalog[block.type]) {
      const btnWrapper = document.createElement('div');
      btnWrapper.style.cssText = 'margin-bottom: var(--space-md);';
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'app-btn app-btn--primary';
      btn.style.width = '100%';
      btn.textContent = 'Select Real Component';
      btn.addEventListener('click', () => {
        this.modal.classList.add('hidden');
        this.openCatalogModal(block);
      });
      btnWrapper.appendChild(btn);
      body.appendChild(btnWrapper);
    }
    
    Object.keys(block.params).forEach(key => {
      const group = document.createElement('div');
      group.className = 'form-group';
      
      const label = document.createElement('label');
      label.textContent = key.replace(/_/g, ' ');
      
      const val = block.params[key];
      const isNum = typeof val === 'number';
      
      const inputWrapper = document.createElement('div');
      inputWrapper.className = 'param-input-wrapper';
      
      const isFilterTypeSelect = key === 'Type' && block.type === 'Filter';
      const isMixerTypeSelect = key === 'Type' && block.type === 'Mixer';
      
      let input;
      if (isFilterTypeSelect) {
        input = document.createElement('select');
        ['Lowpass', 'Highpass', 'Bandpass', 'Bandstop'].forEach(opt => {
          const option = document.createElement('option');
          option.value = opt;
          option.textContent = opt;
          input.appendChild(option);
        });
        input.value = val;
      } else if (isMixerTypeSelect) {
        input = document.createElement('select');
        ['Downconvertor', 'Upconvertor'].forEach(opt => {
          const option = document.createElement('option');
          option.value = opt;
          option.textContent = opt;
          input.appendChild(option);
        });
        input.value = val;
      } else {
        input = document.createElement('input');
        input.type = isNum ? 'number' : 'text';
        if (isNum) input.step = 'any';
        input.value = val;
      }
      input.dataset.key = key;
      
      inputWrapper.appendChild(input);
      
      if (isNum) {
        const spinButtons = document.createElement('div');
        spinButtons.className = 'param-spin-buttons';
        
        const btnUp = document.createElement('button');
        btnUp.type = 'button';
        btnUp.className = 'spin-btn spin-btn--up';
        btnUp.innerHTML = '▲';
        
        const btnDown = document.createElement('button');
        btnDown.type = 'button';
        btnDown.className = 'spin-btn spin-btn--down';
        btnDown.innerHTML = '▼';
        
        const isInteger = key === 'Number_of_Outputs' || key === 'Number_of_Inputs';
        const stepVal = isInteger ? 1 : 0.5;
        
        btnUp.addEventListener('click', () => {
          let curr = parseFloat(input.value);
          if (isNaN(curr)) curr = 0;
          curr = curr + stepVal;
          input.value = isInteger ? Math.round(curr) : parseFloat(curr.toFixed(2));
        });
        
        btnDown.addEventListener('click', () => {
          let curr = parseFloat(input.value);
          if (isNaN(curr)) curr = 0;
          curr = curr - stepVal;
          if (isInteger) {
            curr = Math.max(1, Math.round(curr));
          }
          input.value = isInteger ? curr : parseFloat(curr.toFixed(2));
        });
        
        spinButtons.appendChild(btnUp);
        spinButtons.appendChild(btnDown);
        inputWrapper.appendChild(spinButtons);
      }
      
      group.appendChild(label);
      group.appendChild(inputWrapper);
      body.appendChild(group);
    });
    
    this.modal.classList.remove('hidden');
  },

  openCatalogModal(block) {
    const modal = document.getElementById('catalog-modal');
    const searchInput = document.getElementById('catalog-search-input');
    const resultsList = document.getElementById('catalog-results-list');
    
    searchInput.value = '';
    
    const parts = (window.MiniCircuitsCatalog && window.MiniCircuitsCatalog[block.type]) || [];
    
    const renderList = (filterText = '') => {
      resultsList.innerHTML = '';
      const query = filterText.toLowerCase().trim();
      
      const filteredParts = parts.filter(p => {
        return p.model.toLowerCase().includes(query) || 
               p.description.toLowerCase().includes(query);
      });
      
      if (filteredParts.length === 0) {
        resultsList.innerHTML = '<div style="color: var(--text-secondary); text-align: center; padding: 12px;">No components found.</div>';
        return;
      }
      
      filteredParts.forEach(p => {
        const item = document.createElement('div');
        item.style.cssText = 'padding: var(--space-sm); border: 1px solid var(--border-color); border-radius: var(--radius-sm); background: var(--bg-primary); cursor: pointer; display: flex; flex-direction: column; gap: 4px; transition: background 0.2s; margin-bottom: 8px;';
        
        item.addEventListener('mouseenter', () => item.style.background = 'var(--border-color)');
        item.addEventListener('mouseleave', () => item.style.background = 'var(--bg-primary)');
        
        // Show parameters
        const paramBadges = Object.entries(p.params).map(([k, v]) => {
          return `<span style="font-size: 11px; background: rgba(255,255,255,0.05); padding: 2px 6px; border-radius: 4px; border: 1px solid var(--border-color);">${k.replace(/_/g, ' ')}: ${v}</span>`;
        }).join(' ');
        
        item.innerHTML = `
          <div style="display: flex; justify-content: space-between; align-items: center; font-weight: bold; color: var(--text-primary);">
            <span>${p.model}</span>
            <a href="${p.datasheet}" target="_blank" style="font-size: 12px; color: #36a2eb; text-decoration: none;" onclick="event.stopPropagation()">Datasheet ↗</a>
          </div>
          <div style="font-size: 12px; color: var(--text-secondary);">${p.description}</div>
          <div style="display: flex; flex-wrap: wrap; gap: 4px; margin-top: 4px;">${paramBadges}</div>
        `;
        
        item.addEventListener('click', () => {
          // Update block parameters
          Object.assign(block.params, p.params);
          
          // Rename the block to the model name
          block.rename(p.model);
          
          // Update display and close modal
          block.updateParamDisplay();
          if (block.updateBody) {
            block.updateBody();
          }
          if (block.updateParamsForType) {
            block.updateParamsForType();
          }
          window.Workspace.markStale();
          modal.classList.add('hidden');
          
          // Re-open parameter modal to show the updated parameters
          this.openParamModal(block);
        });
        
        resultsList.appendChild(item);
      });
    };
    
    // Wire up search event listener
    const onSearch = () => {
      renderList(searchInput.value);
    };
    
    // Clear old search listener if any, then bind
    searchInput.removeEventListener('input', searchInput._onInputHandler);
    searchInput._onInputHandler = onSearch;
    searchInput.addEventListener('input', onSearch);
    
    // Render initially
    renderList();
    
    modal.classList.remove('hidden');
  },
  
  saveParamsFromModal() {
    const inputs = document.querySelectorAll('#modal-body input, #modal-body select');
    inputs.forEach(input => {
      const key = input.dataset.key;
      if (input.type === 'number') {
        const val = parseFloat(input.value);
        if (!isNaN(val)) {
          this.activeBlock.params[key] = val;
        }
      } else {
        this.activeBlock.params[key] = input.value;
      }
    });
    if (this.activeBlock.updateParamsForType) {
      this.activeBlock.updateParamsForType();
    }
    this.activeBlock.updateParamDisplay();
    if (this.activeBlock.updateBody) {
      this.activeBlock.updateBody();
    }
    if (this.activeBlock.rebuildPorts) {
      this.activeBlock.rebuildPorts();
    }
  },

  calculateCascade() {
    window.Workspace.clearStale();
    const blocks = window.Workspace.blocks;
    const simBlocks = blocks.filter(b => b.type !== 'Annotation');
    const wires = window.Workspace.wires;
    const display = document.getElementById('results-display');
    
    // Clear previous calculations
    blocks.forEach(b => {
      b.clearCalculations();
      if (b.element) {
        b.element.classList.remove('snr-path-highlight');
      }
    });
    wires.forEach(w => {
      if (w.element) {
        w.element.classList.remove('wire-path--snr-highlight');
      }
    });

    if (simBlocks.length === 0) {
      display.textContent = 'Workspace is empty.';
      return false;
    }

    // Determine SNR path
    let snrPathInfo = null;
    if (window.Workspace.snrStartBlockId && window.Workspace.snrEndBlockId) {
      snrPathInfo = window.Workspace.findSnrPath(window.Workspace.snrStartBlockId, window.Workspace.snrEndBlockId);
      if (snrPathInfo) {
        // Highlight elements along the path
        snrPathInfo.blocks.forEach(bid => {
          const b = blocks.find(blk => blk.id === bid);
          if (b && b.element) {
            b.element.classList.add('snr-path-highlight');
          }
        });
        snrPathInfo.wires.forEach(wid => {
          const w = wires.find(wr => wr.id === wid);
          if (w && w.element) {
            w.element.classList.add('wire-path--snr-highlight');
          }
        });
      }
    }

    // Only allow SignalSource to act as a valid source for simulation
    let startBlocks = simBlocks.filter(b => b.type === 'SignalSource');

    if (startBlocks.length === 0) {
      display.textContent = 'Error: No Signal Source found in the schematic. Simulation aborted.';
      return false;
    }

    let log = `--- Cascade Analysis ---\n\n`;
    
    let queue = [...startBlocks];
    let processed = new Set();
    
    const wireSignals = {};

    while (queue.length > 0) {
      // Find a block that is ready (all incoming wires have provided signals)
      let readyIdx = queue.findIndex(b => {
        const incomingWires = wires.filter(w => w.targetId === b.id);
        return incomingWires.every(w => wireSignals[w.id] !== undefined);
      });
      
      if (readyIdx === -1) {
        log += `\nError: Cycle detected or unresolved dependency in the graph.\n`;
        display.textContent = log;
        return false;
      }
      
      let block = queue.splice(readyIdx, 1)[0];
      if (processed.has(block.id)) continue;
      
      log += `Block: ${block.type} (${block.id.substring(0, 8)})\n`;
      
      let blockTotalF = 1;
      let blockTotalGainLinear = 1;
      let blockTotalOip3Linear = Infinity;
      let blockTotalP1dbLinear = Infinity;
      let blockSpectrum = [];
      const getP = (spec) => spec.length ? 10 * Math.log10(spec.reduce((acc, t) => acc + Math.pow(10, t.power_dBm/10), 0)) : -100;
      let blockPin = -100;
      
      const incomingWires = wires.filter(w => w.targetId === block.id);
      
      if (incomingWires.length === 0) {
        // Source node
        let pwrParam = block.params.Power_dBm !== undefined ? block.params.Power_dBm : -100;
        let startFreq = block.params.Frequency_MHz !== undefined ? block.params.Frequency_MHz : 2400;
        
        let freqs = String(startFreq).split(',').map(s => parseFloat(s.trim())).filter(n => !isNaN(n));
        let pwrs = String(pwrParam).split(',').map(s => parseFloat(s.trim())).filter(n => !isNaN(n));
        
        if (freqs.length === 0) freqs = [2400];
        if (pwrs.length === 0) pwrs = [-100];
        
        blockSpectrum = freqs.map((f, idx) => ({
           freq: f,
           power_dBm: pwrs[idx] !== undefined ? pwrs[idx] : pwrs[pwrs.length - 1] 
        }));
        
        blockPin = getP(blockSpectrum);
        
        let blockNF = block.params.NF_dB || 0;
        blockTotalF = Math.pow(10, blockNF / 10);
        blockTotalGainLinear = 1;
        blockTotalOip3Linear = Infinity;
        blockTotalP1dbLinear = Infinity;
        
        log += `  Initial Power: ${blockPin.toFixed(2)} dBm\n`;
      } else if (block.type === 'Combiner') {
        // Combiner sums linear power and combines frequencies
        let combinedSpectrumMap = new Map();
        let sumInvOip3 = 0, sumInvP1db = 0;
        incomingWires.forEach(w => {
          let sig = wireSignals[w.id];
          if (sig) {
            if (sig.totalF > blockTotalF) blockTotalF = sig.totalF;
            if (sig.totalGainLinear > blockTotalGainLinear) blockTotalGainLinear = sig.totalGainLinear;
            sumInvOip3 += 1 / (sig.totalOip3Linear || Infinity);
            sumInvP1db += 1 / (sig.totalP1dbLinear || Infinity);
            if (sig.spectrum) {
              sig.spectrum.forEach(t => {
                let mw = Math.pow(10, t.power_dBm / 10);
                combinedSpectrumMap.set(t.freq, (combinedSpectrumMap.get(t.freq) || 0) + mw);
              });
            }
          }
        });
        blockSpectrum = Array.from(combinedSpectrumMap.entries()).map(([freq, mw]) => ({ freq, power_dBm: 10 * Math.log10(mw) }));
        blockPin = getP(blockSpectrum);
        blockTotalOip3Linear = sumInvOip3 > 0 ? 1 / sumInvOip3 : Infinity;
        blockTotalP1dbLinear = sumInvP1db > 0 ? 1 / sumInvP1db : Infinity;
        log += `  Combined Pin: ${blockPin.toFixed(2)} dBm\n`;
      } else if (block.type === 'Mixer') {
        const isUp = block.params.Type === 'Upconvertor';
        const signalPort = isUp ? 'if' : 'rf';
        const sigWires = incomingWires.filter(w => w.targetPort === signalPort);
        const loWires = incomingWires.filter(w => w.targetPort === 'lo');
        const sigIn = sigWires.length > 0 ? wireSignals[sigWires[0].id] : null;
        const sigLO = loWires.length > 0 ? wireSignals[loWires[0].id] : null;
        
        if (sigIn) {
          blockSpectrum = sigIn.spectrum || [];
          blockPin = getP(blockSpectrum);
          blockTotalF = sigIn.totalF;
          blockTotalGainLinear = sigIn.totalGainLinear;
          blockTotalOip3Linear = sigIn.totalOip3Linear || Infinity;
          blockTotalP1dbLinear = sigIn.totalP1dbLinear || Infinity;
        } else {
          blockPin = -100;
          blockTotalF = 1;
          blockTotalGainLinear = 1;
          blockTotalOip3Linear = Infinity;
          blockTotalP1dbLinear = Infinity;
          blockSpectrum = [];
        }
        
        let loFreq = 0;
        if (sigLO && sigLO.spectrum && sigLO.spectrum.length > 0) {
          loFreq = sigLO.spectrum[0].freq;
        }
        log += `  Mixer Signal Pin: ${blockPin.toFixed(2)} dBm\n`;
        log += `  LO Freq: ${loFreq} MHz\n`;
        block.currentLOFreq = loFreq;
        block.isMixerUpconvertor = isUp;
      } else {
        // Standard block (1 input, or we take the first available wire)
        let sig = incomingWires.length > 0 ? wireSignals[incomingWires[0].id] : null;
        if (sig) {
          blockSpectrum = sig.spectrum || [];
          blockPin = getP(blockSpectrum);
          blockTotalF = sig.totalF;
          blockTotalGainLinear = sig.totalGainLinear;
          blockTotalOip3Linear = sig.totalOip3Linear !== undefined ? sig.totalOip3Linear : Infinity;
          blockTotalP1dbLinear = sig.totalP1dbLinear !== undefined ? sig.totalP1dbLinear : Infinity;
        }
        log += `  Pin: ${blockPin.toFixed(2)} dBm\n`;
      }
      
      if (block.type === 'Mixer') {
        const isUp = block.params.Type === 'Upconvertor';
        const signalPort = isUp ? 'if' : 'rf';
        const sigWires = incomingWires.filter(w => w.targetPort === signalPort);
        const sigIn = sigWires.length > 0 ? wireSignals[sigWires[0].id] : null;
        block.calculatedPIn = sigIn ? blockPin : undefined;
        block.inputSpectrum = sigIn ? JSON.parse(JSON.stringify(blockSpectrum)) : [];
      } else {
        block.calculatedPIn = incomingWires.length > 0 ? blockPin : undefined;
        block.inputSpectrum = JSON.parse(JSON.stringify(blockSpectrum));
      }
      let outSpectrum = JSON.parse(JSON.stringify(blockSpectrum));
      
      let nextBlockNF = 0;
      let nextBlockGain = 0;
      
      if (block.type === 'Amplifier') {
        outSpectrum.forEach(t => t.power_dBm += block.params.Gain_dB);
        nextBlockGain = block.params.Gain_dB;
        nextBlockNF = block.params.NF_dB;
        log += `  Gain: ${block.params.Gain_dB} dB\n`;
      } else if (block.type === 'Attenuator') {
        outSpectrum.forEach(t => t.power_dBm -= block.params.Loss_dB);
        nextBlockGain = -block.params.Loss_dB;
        nextBlockNF = block.params.Loss_dB;
        log += `  Loss: ${block.params.Loss_dB} dB\n`;
      } else if (block.type === 'Filter') {
        let loss = block.params.In_Band_Loss_dB !== undefined ? block.params.In_Band_Loss_dB : (block.params.Loss_dB || 0);
        let outBand = block.params.Out_of_Band_Attenuation_dB !== undefined ? block.params.Out_of_Band_Attenuation_dB : 30;
        let filterType = block.params.Type || 'Bandpass';
        outSpectrum.forEach(t => {
          let pass = true;
          if (filterType === 'Lowpass' && t.freq > block.params.Cutoff_Frequency_MHz) pass = false;
          else if (filterType === 'Highpass' && t.freq < block.params.Cutoff_Frequency_MHz) pass = false;
          else if (filterType === 'Bandpass' && (t.freq < block.params.Lower_Cutoff_MHz || t.freq > block.params.Upper_Cutoff_MHz)) pass = false;
          else if (filterType === 'Bandstop' && (t.freq > block.params.Lower_Cutoff_MHz && t.freq < block.params.Upper_Cutoff_MHz)) pass = false;
          t.power_dBm -= pass ? loss : outBand;
        });
        nextBlockGain = -loss;
        nextBlockNF = loss;
      } else if (block.type === 'Combiner') {
        outSpectrum.forEach(t => t.power_dBm -= block.params.Loss_dB);
        nextBlockGain = -block.params.Loss_dB;
        nextBlockNF = block.params.Loss_dB;
      } else if (block.type === 'Splitter') {
        let numOuts = Math.max(2, Math.floor(block.params.Number_of_Outputs));
        let splitLoss = 10 * Math.log10(numOuts);
        outSpectrum.forEach(t => t.power_dBm -= (block.params.Loss_dB + splitLoss));
        nextBlockGain = -(block.params.Loss_dB + splitLoss);
        nextBlockNF = block.params.Loss_dB;
      } else if (block.type === 'Mixer') {
        let convGain = block.params.Conversion_Gain_dB !== undefined ? block.params.Conversion_Gain_dB : -6.0;
        let loFreq = block.currentLOFreq || 0;
        let mixedMap = new Map();
        outSpectrum.forEach(t => {
           let f1 = t.freq + loFreq;
           let f2 = Math.abs(t.freq - loFreq);
           let p = t.power_dBm + convGain;
           let mw = Math.pow(10, p/10);
           mixedMap.set(f1, (mixedMap.get(f1) || 0) + mw);
           mixedMap.set(f2, (mixedMap.get(f2) || 0) + mw);
        });
        outSpectrum = Array.from(mixedMap.entries()).map(([freq, mw]) => ({ freq, power_dBm: 10 * Math.log10(mw) }));
        nextBlockGain = convGain;
        nextBlockNF = block.params.NF_dB !== undefined ? block.params.NF_dB : 6.0;
      } else if (block.type === 'FreeSpaceLink') {
        let distance_km = 1.0;
        if (block.params.Distance_km !== undefined) {
          distance_km = parseFloat(block.params.Distance_km);
        } else if (block.params.Distance_m !== undefined) {
          distance_km = parseFloat(block.params.Distance_m) / 1000;
        }
        let distance = distance_km * 1000;
        let txFreqs = String(block.params.Tx_Gain_Freqs_MHz || "2400").split(',').map(s => parseFloat(s.trim())).filter(n => !isNaN(n));
        let txGains = String(block.params.Tx_Gain_dBi || "0").split(',').map(s => parseFloat(s.trim())).filter(n => !isNaN(n));
        let rxFreqs = String(block.params.Rx_Gain_Freqs_MHz || "2400").split(',').map(s => parseFloat(s.trim())).filter(n => !isNaN(n));
        let rxGains = String(block.params.Rx_Gain_dBi || "0").split(',').map(s => parseFloat(s.trim())).filter(n => !isNaN(n));
        
        // Helper to interpolate gain
        const getGain = (f, freqs, gains) => {
          if (freqs.length === 0 || gains.length === 0) return 0;
          if (freqs.length === 1 || gains.length === 1) return gains[0];
          
          // Clamp to edges
          if (f <= freqs[0]) return gains[0];
          if (f >= freqs[freqs.length - 1]) return gains[Math.min(gains.length - 1, freqs.length - 1)];
          
          // Find the interval
          for (let i = 0; i < freqs.length - 1; i++) {
            if (f >= freqs[i] && f <= freqs[i+1]) {
              let g1 = gains[i] !== undefined ? gains[i] : gains[gains.length - 1];
              let g2 = gains[i+1] !== undefined ? gains[i+1] : gains[gains.length - 1];
              let t = (f - freqs[i]) / (freqs[i+1] - freqs[i]);
              return g1 + t * (g2 - g1);
            }
          }
          return gains[gains.length - 1];
        };

        let totalMwOut = 0;
        let totalMwIn = 0;
        
        outSpectrum.forEach(t => {
           let lambda = 299792458 / (t.freq * 1e6);
           let fspl_dB = 20 * Math.log10((4 * Math.PI * distance) / lambda);
           let tx_gain = getGain(t.freq, txFreqs, txGains);
           let rx_gain = getGain(t.freq, rxFreqs, rxGains);
           
           let loss = fspl_dB - tx_gain - rx_gain;
           
           totalMwIn += Math.pow(10, t.power_dBm/10);
           t.power_dBm -= loss;
           totalMwOut += Math.pow(10, t.power_dBm/10);
        });
        
        let avgLoss = 0;
        if (totalMwIn > 0 && totalMwOut > 0) {
          avgLoss = 10 * Math.log10(totalMwIn) - 10 * Math.log10(totalMwOut);
        } else if (outSpectrum.length > 0) {
           let lambda = 299792458 / (outSpectrum[0].freq * 1e6);
           let fspl_dB = 20 * Math.log10((4 * Math.PI * distance) / lambda);
           let tx_gain = getGain(outSpectrum[0].freq, txFreqs, txGains);
           let rx_gain = getGain(outSpectrum[0].freq, rxFreqs, rxGains);
           avgLoss = fspl_dB - tx_gain - rx_gain;
        }
        
        nextBlockGain = -avgLoss;
        nextBlockNF = avgLoss;
        log += `  Avg Path Loss: ${avgLoss.toFixed(2)} dB\n`;
      }
      
      // ---- IM3 Calculation for Non-Linear Blocks ----
      if (block.type === 'Amplifier' || block.type === 'Mixer') {
        let blockOIP3 = block.params.OIP3_dBm !== undefined ? block.params.OIP3_dBm : (block.type === 'Amplifier' ? 30 : 15);
        let im3Tones = new Map();
        
        // 2-tone IM3
        for (let i = 0; i < outSpectrum.length; i++) {
          for (let j = i + 1; j < outSpectrum.length; j++) {
            let t1 = outSpectrum[i];
            let t2 = outSpectrum[j];
            let f1 = t1.freq; let p1 = t1.power_dBm;
            let f2 = t2.freq; let p2 = t2.power_dBm;
            
            // IM3: 2f1 - f2
            let im3_f1 = Math.abs(2 * f1 - f2);
            let im3_p1 = 2 * p1 + p2 - 2 * blockOIP3;
            if (im3_f1 > 0 && im3_p1 >= -120) {
               let fk = Math.round(im3_f1 * 1e4) / 1e4;
               im3Tones.set(fk, (im3Tones.get(fk) || 0) + Math.pow(10, im3_p1/10));
            }
            
            // IM3: 2f2 - f1
            let im3_f2 = Math.abs(2 * f2 - f1);
            let im3_p2 = 2 * p2 + p1 - 2 * blockOIP3;
            if (im3_f2 > 0 && im3_p2 >= -120) {
               let fk = Math.round(im3_f2 * 1e4) / 1e4;
               im3Tones.set(fk, (im3Tones.get(fk) || 0) + Math.pow(10, im3_p2/10));
            }
          }
        }
        
        // 3-tone IM3
        for (let i = 0; i < outSpectrum.length; i++) {
          for (let j = i + 1; j < outSpectrum.length; j++) {
            for (let k = j + 1; k < outSpectrum.length; k++) {
              let t1 = outSpectrum[i], t2 = outSpectrum[j], t3 = outSpectrum[k];
              let freqs = [
                Math.abs(t1.freq + t2.freq - t3.freq),
                Math.abs(t1.freq - t2.freq + t3.freq),
                Math.abs(-t1.freq + t2.freq + t3.freq)
              ];
              let p_base = t1.power_dBm + t2.power_dBm + t3.power_dBm - 2 * blockOIP3 + 6;
              if (p_base >= -120) {
                let mw = Math.pow(10, p_base/10);
                freqs.forEach(f => {
                  if (f > 0) {
                    let fk = Math.round(f * 1e4) / 1e4;
                    im3Tones.set(fk, (im3Tones.get(fk) || 0) + mw);
                  }
                });
              }
            }
          }
        }
        
        // Merge into outSpectrum
        let mergedMap = new Map();
        outSpectrum.forEach(t => {
           let fk = Math.round(t.freq * 1e4) / 1e4;
           mergedMap.set(fk, (mergedMap.get(fk) || 0) + Math.pow(10, t.power_dBm/10));
        });
        im3Tones.forEach((mw, fk) => {
           mergedMap.set(fk, (mergedMap.get(fk) || 0) + mw);
        });
        outSpectrum = Array.from(mergedMap.entries()).map(([freq, mw]) => ({ freq: Number(freq), power_dBm: 10 * Math.log10(mw) }));
        // Sort spectrum by frequency
        outSpectrum.sort((a, b) => a.freq - b.freq);
      }
      // ---- End IM3 Calculation ----

      block.outputSpectrum = outSpectrum;
      let power_dBm = getP(outSpectrum);
      
      if (block.type === 'Load') {
        log += `  Absorbed Power: ${blockPin.toFixed(2)} dBm\n`;
        block.calculatedPOut = undefined;
        if (snrPathInfo && snrPathInfo.blocks.has(block.id)) {
          let prevSnrBlock = null;
          incomingWires.forEach(w => {
            if (snrPathInfo.blocks.has(w.sourceId)) {
              const pb = blocks.find(blk => blk.id === w.sourceId);
              if (pb && pb.snrNoisePowerW !== undefined) {
                prevSnrBlock = pb;
              }
            }
          });

          if (prevSnrBlock) {
            // A load block has a gain of 1 (0 dB) and noise figure of 1 (0 dB) since it absorbs the power
            const linearGain = 1.0;
            const linearNF = 1.0;
            const thermalNoiseFloorWatts = Math.pow(10, -174 / 10) / 1000;
            
            const outNoiseW = prevSnrBlock.snrNoisePowerW * linearGain + (linearNF - 1) * thermalNoiseFloorWatts * linearGain;
            const outSigW = Math.pow(10, blockPin / 10) / 1000;
            
            block.snrSignalPowerW = outSigW;
            block.snrNoisePowerW = outNoiseW;
            block.calculatedSNR = 10 * Math.log10(outSigW / outNoiseW);
            log += `  Cascaded SNR: ${block.calculatedSNR.toFixed(2)} dB\n`;
          }
        }
        log += `\n`;
        block.updateParamDisplay();
        processed.add(block.id);
        continue;
      } else if (block.type !== 'SignalSource') {
        if (!['Amplifier', 'Attenuator', 'Filter', 'Combiner', 'Splitter', 'Mixer', 'FreeSpaceLink'].includes(block.type)) {
          nextBlockNF = block.params.NF_dB || 0;
          log += `  (No power effect) -> Pout: ${power_dBm.toFixed(2)} dBm\n`;
        }
      }
      
      if (block.type !== 'SignalSource') {
        let f_i = Math.pow(10, nextBlockNF / 10);
        let g_i = Math.pow(10, nextBlockGain / 10);
        blockTotalF = blockTotalF + (f_i - 1) / blockTotalGainLinear;
        blockTotalGainLinear = blockTotalGainLinear * g_i;
        
        let nextBlockOIP3_dBm = 100;
        let nextBlockP1dB_dBm = 100;
        
        if (block.params.OIP3_dBm !== undefined) {
          nextBlockOIP3_dBm = block.params.OIP3_dBm;
        } else if (block.type === 'Amplifier') {
          nextBlockOIP3_dBm = 30;
        } else if (block.type === 'Mixer') {
          nextBlockOIP3_dBm = 15;
        }
        
        if (block.params.P1dB_dBm !== undefined) {
          nextBlockP1dB_dBm = block.params.P1dB_dBm;
        } else if (block.type === 'Amplifier') {
          nextBlockP1dB_dBm = 20;
        } else if (block.type === 'Mixer') {
          nextBlockP1dB_dBm = 5;
        }

        let oip3_i = Math.pow(10, nextBlockOIP3_dBm / 10);
        blockTotalOip3Linear = 1 / ( (1 / oip3_i) + (1 / (g_i * blockTotalOip3Linear)) );

        let p1db_i = Math.pow(10, nextBlockP1dB_dBm / 10);
        blockTotalP1dbLinear = 1 / ( (1 / p1db_i) + (1 / (g_i * blockTotalP1dbLinear)) );
      }
      
      block.calculatedGain = 10 * Math.log10(blockTotalGainLinear);
      block.calculatedPOut = power_dBm;
      block.calculatedNF = 10 * Math.log10(blockTotalF);
      
      block.calculatedOIP3 = blockTotalOip3Linear !== Infinity ? 10 * Math.log10(blockTotalOip3Linear) : Infinity;
      block.calculatedIIP3 = block.calculatedOIP3 !== Infinity ? block.calculatedOIP3 - (10 * Math.log10(blockTotalGainLinear)) : Infinity;
      block.calculatedP1dB_out = blockTotalP1dbLinear !== Infinity ? 10 * Math.log10(blockTotalP1dbLinear) : Infinity;
      block.calculatedFrequencies = outSpectrum.map(t => t.freq);

      // SNR calculation along the path
      if (snrPathInfo && snrPathInfo.blocks.has(block.id)) {
        const startBlock = blocks.find(b => b.id === window.Workspace.snrStartBlockId);
        if (startBlock) {
          let noisePowerW;
          const sigPowerW = Math.pow(10, power_dBm / 10) / 1000;
          
          if (startBlock.params.Noise_Floor_dBm_Hz !== undefined) {
            const noiseFloor = parseFloat(startBlock.params.Noise_Floor_dBm_Hz);
            noisePowerW = Math.pow(10, noiseFloor / 10) / 1000;
          } else {
            const startingSNR = startBlock.params.Starting_SNR_dB !== undefined ? parseFloat(startBlock.params.Starting_SNR_dB) : 50;
            noisePowerW = sigPowerW / Math.pow(10, startingSNR / 10);
          }
          
          if (block.id === window.Workspace.snrStartBlockId) {
            block.calculatedSNR = 10 * Math.log10(sigPowerW / noisePowerW);
            block.snrSignalPowerW = sigPowerW;
            block.snrNoisePowerW = noisePowerW;
          } else {
            // Find incoming block on the SNR path
            let prevSnrBlock = null;
            incomingWires.forEach(w => {
              if (block.type === 'Mixer' && w.targetPort === 'lo') {
                return; // Ignore LO port wire when finding the signal cascade path
              }
              if (snrPathInfo.blocks.has(w.sourceId)) {
                const pb = blocks.find(blk => blk.id === w.sourceId);
                if (pb && pb.snrNoisePowerW !== undefined) {
                  prevSnrBlock = pb;
                }
              }
            });

            if (prevSnrBlock) {
              const linearGain = Math.pow(10, nextBlockGain / 10);
              const linearNF = Math.pow(10, nextBlockNF / 10);
              const thermalNoiseFloorWatts = Math.pow(10, -174 / 10) / 1000; // -174 dBm in Watts
              
              // output noise power = input noise power * block gain + (block noise figure - 1) * 10^(-174/10) * block gain
              const outNoiseW = prevSnrBlock.snrNoisePowerW * linearGain + (linearNF - 1) * thermalNoiseFloorWatts * linearGain;
              const outSigW = Math.pow(10, power_dBm / 10) / 1000;
              
              block.snrSignalPowerW = outSigW;
              block.snrNoisePowerW = outNoiseW;
              block.calculatedSNR = 10 * Math.log10(outSigW / outNoiseW);
            }
          }
        }
      }
      
      let oip3LogVal = block.calculatedOIP3 !== Infinity ? block.calculatedOIP3.toFixed(2) + ' dBm' : 'inf';
      let iip3LogVal = block.calculatedIIP3 !== Infinity ? block.calculatedIIP3.toFixed(2) + ' dBm' : 'inf';
      let p1dbLogVal = block.calculatedP1dB_out !== Infinity ? block.calculatedP1dB_out.toFixed(2) + ' dBm' : 'inf';
      let freqLogVal = outSpectrum.length > 0 ? outSpectrum.map(t => t.freq).join(', ') + ' MHz' : 'none';
      let snrLogVal = block.calculatedSNR !== undefined ? block.calculatedSNR.toFixed(2) + ' dB' : 'N/A';
      log += `  Cascaded Gain: ${block.calculatedGain.toFixed(2)} dB\n`;
      log += `  Cascaded OIP3: ${oip3LogVal}\n`;
      log += `  Cascaded P1dB: ${p1dbLogVal}\n`;
      log += `  Cascaded IIP3: ${iip3LogVal}\n`;
      log += `  Frequencies: ${freqLogVal}\n`;
      if (block.calculatedSNR !== undefined) {
        log += `  Cascaded SNR: ${snrLogVal}\n`;
      }
      
      block.updateParamDisplay();
      
      processed.add(block.id);
      
      const outWires = wires.filter(w => w.sourceId === block.id);
      outWires.forEach(w => {
        wireSignals[w.id] = {
          power_dBm: power_dBm,
          totalF: blockTotalF,
          totalGainLinear: blockTotalGainLinear,
          totalOip3Linear: blockTotalOip3Linear,
          totalP1dbLinear: blockTotalP1dbLinear,
          spectrum: JSON.parse(JSON.stringify(outSpectrum))
        };
        if (!processed.has(w.targetId) && !queue.find(b => b.id === w.targetId)) {
          const tgtBlock = blocks.find(b => b.id === w.targetId);
          if (tgtBlock) queue.push(tgtBlock);
        }
      });
      log += '\n';
    }
    
    display.textContent = log;
    return true;
  },

  toggleLeftSidebar() {
    const sidebar = document.getElementById('sidebar-left');
    const resizer = document.getElementById('resizer-left');
    const btn = document.getElementById('btn-toggle-left');
    if (!sidebar || !resizer) return;

    const isCollapsed = sidebar.classList.contains('collapsed');
    const width = sidebar.offsetWidth || 250;

    if (isCollapsed) {
      sidebar.classList.remove('collapsed');
      resizer.classList.remove('collapsed');
      if (btn) btn.textContent = '◀';
      if (window.Workspace) {
        window.Workspace.panX -= width;
        window.Workspace._applyTransform();
      }
    } else {
      if (window.Workspace) {
        window.Workspace.panX += width;
        window.Workspace._applyTransform();
      }
      sidebar.classList.add('collapsed');
      resizer.classList.add('collapsed');
      if (btn) btn.textContent = '▶';
    }
  },

  toggleRightSidebar() {
    const sidebar = document.getElementById('sidebar-right');
    const resizer = document.getElementById('resizer-right');
    const btn = document.getElementById('btn-toggle-right');
    if (!sidebar || !resizer) return;

    const isCollapsed = sidebar.classList.contains('collapsed');

    if (isCollapsed) {
      sidebar.classList.remove('collapsed');
      resizer.classList.remove('collapsed');
      if (btn) btn.textContent = '▶';
    } else {
      sidebar.classList.add('collapsed');
      resizer.classList.add('collapsed');
      if (btn) btn.textContent = '◀';
    }
  }
};

window.App = App;

// Bootstrap
document.addEventListener('DOMContentLoaded', () => {
  App.init();
});
