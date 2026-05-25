class Block {
  constructor(id, type, x, y) {
    this.id = id;
    this.type = type;
    this.name = undefined;
    this.x = x;
    this.y = y;
    this.params = {};
    this.element = null;
    this.inputs = []; // array of port info
    this.outputs = [];
    
    this.setupParams();
    this.setupPorts();
  }

  setupParams() {
    // Override in subclasses
  }

  setupPorts() {
    // Override in subclasses
    this.inputs = [{ id: 'in1', offsetY: 40, label: 'In' }];
    this.outputs = [{ id: 'out1', offsetY: 40, label: 'Out' }];
  }

  render() {
    this.element = document.createElement('div');
    this.element.className = 'rf-block';
    if (this.type === 'Annotation') {
      this.element.classList.add('rf-block--annotation');
    }
    this.element.dataset.id = this.id;
    this.updatePosition();

    // Header
    const header = document.createElement('div');
    header.className = 'rf-block__header';
    header.textContent = this.name || this.type;
    this.element.appendChild(header);

    // Body
    const body = document.createElement('div');
    body.className = 'rf-block__body';
    body.innerHTML = this.getBodyHTML();
    this.element.appendChild(body);

    // Params display
    this.paramDisplay = document.createElement('div');
    this.paramDisplay.className = 'rf-block__params';
    
    // Click on a block param line → open a small inline editor for that specific param
    this.paramDisplay.addEventListener('click', (e) => {
      const row = e.target.closest('.rf-block__param-row--block-val');
      if (!row) return;
      e.stopPropagation();

      const paramKey = row.dataset.key;
      if (paramKey === undefined) return;
      const cleanKey = paramKey.replace(/_/g, ' ');

      // Remove any existing popover
      const existing = document.getElementById('inline-param-popover');
      if (existing) existing.remove();

      const currentVal = this.params[paramKey];
      const popover = document.createElement('div');
      popover.id = 'inline-param-popover';
      popover.style.cssText = `
        position: fixed; z-index: 9999;
        background: var(--bg-primary, #fff);
        border: 1px solid var(--border-color, #ccc);
        border-radius: 6px;
        box-shadow: 0 8px 24px rgba(0,0,0,0.18);
        padding: 10px 12px;
        display: flex; flex-direction: column; gap: 6px;
        min-width: 180px;
        font-size: 12px;
      `;

      const label = document.createElement('div');
      label.style.cssText = 'font-weight: 600; color: var(--text-primary, #333); margin-bottom: 2px;';
      label.textContent = cleanKey;
      popover.appendChild(label);

      const inputRow = document.createElement('div');
      inputRow.style.cssText = 'display: flex; gap: 4px; align-items: center;';

      let input;
      const isFilterTypeSelect = paramKey === 'Type' && this.type === 'Filter';
      const isMixerTypeSelect = paramKey === 'Type' && this.type === 'Mixer';

      if (isFilterTypeSelect) {
        input = document.createElement('select');
        ['Lowpass', 'Highpass', 'Bandpass', 'Bandstop'].forEach(opt => {
          const option = document.createElement('option');
          option.value = opt;
          option.textContent = opt;
          input.appendChild(option);
        });
        input.value = currentVal || 'Bandpass';
      } else if (isMixerTypeSelect) {
        input = document.createElement('select');
        ['Downconvertor', 'Upconvertor'].forEach(opt => {
          const option = document.createElement('option');
          option.value = opt;
          option.textContent = opt;
          input.appendChild(option);
        });
        input.value = currentVal || 'Downconvertor';
      } else {
        input = document.createElement('input');
        input.type = typeof currentVal === 'number' ? 'number' : 'text';
        input.value = currentVal;
        if (input.type === 'number') input.step = 'any';
      }

      input.style.cssText = `
        flex: 1; padding: 5px 7px;
        border: 1px solid var(--border-color, #ccc);
        border-radius: 4px;
        font-family: inherit; font-size: 12px;
        background: var(--bg-primary, #fff);
        color: var(--text-primary, #333);
      `;

      const saveBtn = document.createElement('button');
      saveBtn.textContent = '✓';
      saveBtn.title = 'Save';
      saveBtn.style.cssText = `
        padding: 5px 8px; border: none; border-radius: 4px;
        background: #2ecc71; color: white; cursor: pointer; font-size: 13px;
      `;

      inputRow.appendChild(input);
      inputRow.appendChild(saveBtn);
      popover.appendChild(inputRow);

      // Position near the row
      const rowRect = row.getBoundingClientRect();
      document.body.appendChild(popover);
      const popRect = popover.getBoundingClientRect();
      let top = rowRect.bottom + 4;
      let left = rowRect.left;
      if (left + popRect.width > window.innerWidth - 8) left = window.innerWidth - popRect.width - 8;
      if (top + popRect.height > window.innerHeight - 8) top = rowRect.top - popRect.height - 4;
      popover.style.top = top + 'px';
      popover.style.left = left + 'px';

      input.focus();
      if (typeof input.select === 'function') input.select();

      const doSave = () => {
        const valStr = input.value;
        let finalVal;
        if (typeof this.params[paramKey] === 'string' || valStr.includes(',')) {
          finalVal = valStr;
        } else {
          const newVal = parseFloat(valStr);
          finalVal = !isNaN(newVal) ? newVal : this.params[paramKey];
        }
        
        if (finalVal !== undefined) {
          this.params[paramKey] = finalVal;
          if (this.updateParamsForType) this.updateParamsForType();
          this.updateParamDisplay();
          if (this.updateBody) this.updateBody();
          if (this.rebuildPorts) this.rebuildPorts();
          if (window.Workspace) window.Workspace.markStale();
        }
        popover.remove();
      };

      saveBtn.addEventListener('click', doSave);
      input.addEventListener('keydown', (ev) => {
        if (ev.key === 'Enter') doSave();
        if (ev.key === 'Escape') popover.remove();
      });

      // Close on outside click
      setTimeout(() => {
        const closeOnOut = (ev) => {
          if (!popover.contains(ev.target)) {
            popover.remove();
            document.removeEventListener('mousedown', closeOnOut, true);
          }
        };
        document.addEventListener('mousedown', closeOnOut, true);
      }, 0);
    });

    this.element.appendChild(this.paramDisplay);
    if (this.type === 'Annotation') {
      this.paramDisplay.style.display = 'none';
    }
    this.updateParamDisplay();

    // Resize Handle
    const resizeHandle = document.createElement('div');
    resizeHandle.className = 'resize-handle';
    this.element.appendChild(resizeHandle);

    const renderPort = (p, isInput) => {
      const portEl = document.createElement('div');
      portEl.className = 'port ' + (isInput ? 'port--in' : 'port--out');
      if (p.align === 'top') {
        portEl.classList.add('port--top');
        portEl.style.left = (p.offsetX !== undefined ? p.offsetX : 40) + 'px';
      } else {
        portEl.style.top = (p.offsetY - 2) + 'px';
      }
      portEl.dataset.portId = p.id;
      portEl.dataset.blockId = this.id;

      if (p.label) {
        const labelEl = document.createElement('div');
        labelEl.className = 'port-label';
        labelEl.textContent = p.label;
        portEl.appendChild(labelEl);
      }
      return portEl;
    };

    // Ports
    this.inputs.forEach(p => this.element.appendChild(renderPort(p, true)));
    this.outputs.forEach(p => this.element.appendChild(renderPort(p, false)));

    return this.element;
  }

  rebuildPorts() {
    if (this.updatePortsBasedOnParams) {
      this.updatePortsBasedOnParams();
    }
    const oldPorts = this.element.querySelectorAll('.port');
    oldPorts.forEach(p => p.remove());

    const renderPort = (p, isInput) => {
      const portEl = document.createElement('div');
      portEl.className = 'port ' + (isInput ? 'port--in' : 'port--out');
      if (p.align === 'top') {
        portEl.classList.add('port--top');
        portEl.style.left = (p.offsetX !== undefined ? p.offsetX : 40) + 'px';
      } else {
        portEl.style.top = (p.offsetY - 2) + 'px';
      }
      portEl.dataset.portId = p.id;
      portEl.dataset.blockId = this.id;

      if (p.label) {
        const labelEl = document.createElement('div');
        labelEl.className = 'port-label';
        labelEl.textContent = p.label;
        portEl.appendChild(labelEl);
      }
      return portEl;
    };

    this.inputs.forEach(p => this.element.appendChild(renderPort(p, true)));
    this.outputs.forEach(p => this.element.appendChild(renderPort(p, false)));
    
    if (window.Workspace) window.Workspace.updateWires();
  }

  updateBody() {
    const body = this.element.querySelector('.rf-block__body');
    if (body) {
      body.innerHTML = this.getBodyHTML();
    }
  }

  updateParamDisplay() {
    if (!this.paramDisplay) return;
    const lines = [];

    const opts = (window.Workspace && window.Workspace.displayOptions) || {
      showBlockParams: true,
      showCascadedGain: true,
      showCascadedPower: true,
      showCascadedIP3: true,
      showCascadedP1dB: true,
      showCascadedNF: true,
      showFrequency: true
    };

    // Determine if this block is at the end of the RF signal chain (leaf node)
    const isEnd = (window.Workspace && window.Workspace.wires && this.type !== 'Annotation') 
      ? !window.Workspace.wires.some(w => w.sourceId === this.id) 
      : false;

    // Read thresholds from App settings (fallback to 10 dB if App not yet initialized)
    const appSettings = (window.App && window.App.settings) || {};
    const oip3Thresh = appSettings.oip3ThresholdDb !== undefined ? appSettings.oip3ThresholdDb : 10;
    const iip3Thresh = appSettings.iip3ThresholdDb !== undefined ? appSettings.iip3ThresholdDb : 10;
    const p1dbThresh = appSettings.p1dbThresholdDb !== undefined ? appSettings.p1dbThresholdDb : 10;

    // Individual violation flags — each metric gets its own so only the violating one highlights
    let oip3Violated = false;
    let iip3Violated = false;
    let p1dbOutViolated = false;
    let p1dbInViolated = false;

    if (this.calculatedPIn !== undefined || this.calculatedPOut !== undefined) {
      let gain = 0;
      if (this.params.Gain_dB !== undefined) gain = this.params.Gain_dB;
      else if (this.params.Conversion_Gain_dB !== undefined) gain = this.params.Conversion_Gain_dB;
      else if (this.params.Loss_dB !== undefined) gain = -this.params.Loss_dB;

      const oip3 = this.params.OIP3_dBm;
      const p1db = this.params.P1dB_dBm;
      const iip3 = oip3 !== undefined ? oip3 - gain : undefined;
      const inputP1dB = p1db !== undefined ? p1db - gain : undefined;

      if (this.calculatedPIn !== undefined) {
        if (iip3 !== undefined && (iip3 - this.calculatedPIn) < iip3Thresh) iip3Violated = true;
        if (inputP1dB !== undefined && (inputP1dB - this.calculatedPIn) < p1dbThresh) p1dbInViolated = true;
      }
      if (this.calculatedPOut !== undefined) {
        if (oip3 !== undefined && (oip3 - this.calculatedPOut) < oip3Thresh) oip3Violated = true;
        if (p1db !== undefined && (p1db - this.calculatedPOut) < p1dbThresh) p1dbOutViolated = true;
      }
    }

    const addRow = (label, value, rowClass = '', rowStyle = '', labelStyle = '', valueStyle = '', datasetKey = '') => {
      const dataAttr = datasetKey ? `data-key="${datasetKey}"` : '';
      lines.push(`
        <div class="rf-block__param-row ${rowClass}" style="${rowStyle}" ${dataAttr}>
          <span class="rf-block__param-label" style="${labelStyle}">${label}</span>
          <span class="rf-block__param-colon">:</span>
          <span class="rf-block__param-value" style="${valueStyle}">${value}</span>
        </div>
      `);
    };

    if (opts.showBlockParams) {
      Object.entries(this.params).forEach(([key, val]) => {
        const cleanKey = key.replace(/_/g, ' ');
        let style = '';
        if (key === 'OIP3_dBm' && (oip3Violated || iip3Violated)) {
          style = 'color: #ff4444; font-weight: bold;';
        }
        if (key === 'P1dB_dBm' && (p1dbOutViolated || p1dbInViolated)) {
          style = 'color: #ff4444; font-weight: bold;';
        }
        addRow(cleanKey, val, 'rf-block__param-row--block-val', 'cursor: pointer;', style, style, key);
      });
    }

    if (isEnd || opts.showCascadedGain) {
      if (this.calculatedGain !== undefined && !isNaN(this.calculatedGain)) {
        addRow('Cascaded Gain', `${this.calculatedGain.toFixed(2)} dB`, 'rf-block__param-row--cascading-val');
      }
    }

    if (isEnd || opts.showCascadedPower) {
      if (this.calculatedPIn !== undefined) {
        addRow('Cascaded Pin', `${this.calculatedPIn.toFixed(2)} dBm`, 'rf-block__param-row--cascading-val');
      }
      if (this.snrNoisePowerW !== undefined && this.calculatedPIn !== undefined && window.Workspace && window.Workspace.snrStartBlockId && window.Workspace.snrEndBlockId) {
        // If there's an input signal, calculate input noise power
        // prevSnrBlock noise power * linearGain = output noise power of previous block. That is the input noise power to this block.
        // Let's compute input noise power: output noise power / linearGain? Or we can track incoming noise power.
        // Let's retrieve input noise power from previous block output noise power, or we can compute it:
        // prevBlock.snrNoisePowerW is input noise power to this block.
        let inputNoisePowerW = undefined;
        if (window.Workspace.wires) {
          const incoming = window.Workspace.wires.find(w => w.targetId === this.id);
          if (incoming) {
            const pb = window.Workspace.blocks.find(blk => blk.id === incoming.sourceId);
            if (pb && pb.snrNoisePowerW !== undefined) {
              inputNoisePowerW = pb.snrNoisePowerW;
            }
          }
        }
        if (inputNoisePowerW !== undefined) {
          const inputNoisePowerdBm = 10 * Math.log10(inputNoisePowerW * 1000);
          addRow('Cascaded Nin', `${inputNoisePowerdBm.toFixed(2)} dBm`, 'rf-block__param-row--cascading-val');
        }
      }

      if (this.calculatedPOut !== undefined) {
        addRow('Cascaded Pout', `${this.calculatedPOut.toFixed(2)} dBm`, 'rf-block__param-row--cascading-val');
      }
      if (this.snrNoisePowerW !== undefined && this.type !== 'Load' && window.Workspace && window.Workspace.snrStartBlockId && window.Workspace.snrEndBlockId) {
        const outputNoisePowerdBm = 10 * Math.log10(this.snrNoisePowerW * 1000);
        addRow('Cascaded Nout', `${outputNoisePowerdBm.toFixed(2)} dBm`, 'rf-block__param-row--cascading-val');
      }
    }

    if (isEnd || opts.showCascadedNF) {
      if (this.calculatedNF !== undefined) {
        addRow('Cascaded NF', `${this.calculatedNF.toFixed(2)} dB`, 'rf-block__param-row--cascading-val');
      }
    }

    if (isEnd || opts.showCascadedIP3) {
      if (this.calculatedOIP3 !== undefined && !isNaN(this.calculatedOIP3)) {
        const oip3Str = isFinite(this.calculatedOIP3) ? this.calculatedOIP3.toFixed(2) + ' dBm' : 'inf';
        const oip3Style = oip3Violated ? 'color: #ff4444; font-weight: bold;' : '';
        addRow('Cascaded OIP3', oip3Str, 'rf-block__param-row--cascading-val', '', '', oip3Style);
      }
      if (this.calculatedIIP3 !== undefined && !isNaN(this.calculatedIIP3)) {
        const iip3Str = isFinite(this.calculatedIIP3) ? this.calculatedIIP3.toFixed(2) + ' dBm' : 'inf';
        const iip3Style = iip3Violated ? 'color: #ff4444; font-weight: bold;' : '';
        addRow('Cascaded IIP3', iip3Str, 'rf-block__param-row--cascading-val', '', '', iip3Style);
      }
    }

    if (isEnd || opts.showCascadedP1dB) {
      if (this.calculatedP1dB_out !== undefined && !isNaN(this.calculatedP1dB_out)) {
        const p1dbStr = isFinite(this.calculatedP1dB_out) ? this.calculatedP1dB_out.toFixed(2) + ' dBm' : 'inf';
        const p1dbStyle = (p1dbOutViolated || p1dbInViolated) ? 'color: #ff4444; font-weight: bold;' : '';
        addRow('Cascaded P1dB', p1dbStr, 'rf-block__param-row--cascading-val', '', '', p1dbStyle);
      }
    }

    if (this.calculatedSNR !== undefined && !isNaN(this.calculatedSNR)) {
      addRow('Cascaded SNR', `${this.calculatedSNR.toFixed(2)} dB`, 'rf-block__param-row--snr-val');
    }

    if (opts.showFrequency) {
      if (this.calculatedFrequencies !== undefined && this.calculatedFrequencies.length > 0) {
        const freqStr = this.calculatedFrequencies.length > 3 
          ? `${this.calculatedFrequencies.slice(0, 3).join(', ')}...`
          : this.calculatedFrequencies.join(', ');
        addRow('Freq', `${freqStr} MHz`, 'rf-block__param-row--frequency-val');
      }
    }

    // Add marker indicators underneath the parameters for debugging/visual aid (optional, but requested: "highlighted by faint green glow... every block along SNR calculation shows Cascaded SNR")
    if (window.Workspace) {
      if (window.Workspace.snrStartBlockId === this.id) {
        addRow('SNR Start', 'Active', 'rf-block__param-row--snr-val');
      }
      if (window.Workspace.snrEndBlockId === this.id) {
        addRow('SNR End', 'Active', 'rf-block__param-row--snr-val');
      }
    }

    this.paramDisplay.innerHTML = lines.join('');
  }

  clearCalculations() {
    this.calculatedPIn = undefined;
    this.calculatedPOut = undefined;
    this.calculatedNF = undefined;
    this.calculatedOIP3 = undefined;
    this.calculatedIIP3 = undefined;
    this.calculatedP1dB_out = undefined;
    this.calculatedFrequencies = undefined;
    this.calculatedSNR = undefined;
    this.snrNoisePowerW = undefined;
    this.updateParamDisplay();
  }

  updatePosition() {
    if (this.element) {
      this.element.style.left = this.x + 'px';
      this.element.style.top = this.y + 'px';
    }
  }

  rename(newName) {
    this.name = newName || undefined;
    if (this.element) {
      const header = this.element.querySelector('.rf-block__header');
      if (header) {
        header.textContent = this.name || this.type;
      }
    }
  }

  getBodyHTML() {
    // Can override
    return `<span class="block-label">${this.type.substring(0,3).toUpperCase()}</span>`;
  }
}

class Amplifier extends Block {
  setupParams() {
    this.params = {
      Gain_dB: 15,
      NF_dB: 3.0,
      P1dB_dBm: 20,
      OIP3_dBm: 30
    };
  }
  getBodyHTML() {
    return `&#9654;`; // Triangle right
  }
}

class Attenuator extends Block {
  setupParams() {
    this.params = {
      Loss_dB: 3.0
    };
  }
  getBodyHTML() {
    return `<svg width="100%" height="100%" viewBox="0 0 60 40" stroke="currentColor" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="max-height: 40px; display: block; margin: auto;">
  <path d="M 5 20 L 15 20" />
  <circle cx="5" cy="20" r="1.5" fill="currentColor" stroke="none" />
  <path d="M 45 20 L 55 20" />
  <circle cx="55" cy="20" r="1.5" fill="currentColor" stroke="none" />
  <rect x="15" y="5" width="30" height="30" />
  <path d="M 30 10 L 26 12 L 34 16 L 26 20 L 34 24 L 26 28 L 30 30" />
</svg>`;
  }
}

class Filter extends Block {
  setupParams() {
    this.params = {
      Type: 'Bandpass',
      Lower_Cutoff_MHz: 1000,
      Upper_Cutoff_MHz: 2000,
      In_Band_Loss_dB: 1.5,
      Out_of_Band_Attenuation_dB: 30
    };
  }
  updateParamsForType() {
    const type = this.params.Type || 'Bandpass';
    if (type === 'Bandpass' || type === 'Bandstop') {
      if (this.params.Cutoff_Frequency_MHz !== undefined) {
        this.params.Lower_Cutoff_MHz = this.params.Cutoff_Frequency_MHz;
        this.params.Upper_Cutoff_MHz = this.params.Cutoff_Frequency_MHz * 2;
        delete this.params.Cutoff_Frequency_MHz;
      }
    } else {
      if (this.params.Lower_Cutoff_MHz !== undefined) {
        this.params.Cutoff_Frequency_MHz = this.params.Lower_Cutoff_MHz;
        delete this.params.Lower_Cutoff_MHz;
        delete this.params.Upper_Cutoff_MHz;
      }
    }
  }
  getBodyHTML() {
    const type = (this.params.Type || 'Bandpass').toLowerCase();
    let tildes = `
      <path d="M 23 10 Q 26.5 7 30 10 T 37 10" />
      ${['highpass', 'bandpass'].includes(type) ? '<path d="M 24 13 L 36 7" />' : ''}
      <path d="M 23 20 Q 26.5 17 30 20 T 37 20" />
      ${['lowpass', 'highpass', 'bandstop'].includes(type) ? '<path d="M 24 23 L 36 17" />' : ''}
      <path d="M 23 30 Q 26.5 27 30 30 T 37 30" />
      ${['lowpass', 'bandpass'].includes(type) ? '<path d="M 24 33 L 36 27" />' : ''}
    `;

    return `<svg width="100%" height="100%" viewBox="0 0 60 40" stroke="currentColor" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="max-height: 40px; display: block; margin: auto;">
  <path d="M 5 20 L 15 20" />
  <circle cx="5" cy="20" r="1.5" fill="currentColor" stroke="none" />
  <path d="M 45 20 L 55 20" />
  <circle cx="55" cy="20" r="1.5" fill="currentColor" stroke="none" />
  <rect x="15" y="2" width="30" height="36" />
  ${tildes}
</svg>`;
  }
}

class SignalSource extends Block {
  setupParams() {
    this.params = {
      Frequency_MHz: 2400,
      Power_dBm: -50,
      Noise_Floor_dBm_Hz: -174,
      NF_dB: 0
    };
  }
  setupPorts() {
    this.inputs = []; // No input
    this.outputs = [{ id: 'out1', offsetY: 40, label: 'Out' }];
  }
  getBodyHTML() {
    return `<span style="font-size:24px;">&#8767;</span>`; // Sine wave symbol
  }
}

class FreeSpaceLink extends Block {
  setupParams() {
    this.params = {
      Distance_km: 1,
      Tx_Gain_Freqs_MHz: "2400",
      Tx_Gain_dBi: "0",
      Rx_Gain_Freqs_MHz: "2400",
      Rx_Gain_dBi: "0"
    };
  }
  setupPorts() {
    this.inputs = [{ id: 'in1', offsetY: 40, label: 'In' }];
    this.outputs = [{ id: 'out1', offsetY: 40, label: 'Out' }];
  }
  getBodyHTML() {
    return `<svg width="100%" height="100%" viewBox="0 0 100 40" stroke="currentColor" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="max-height: 40px; display: block; margin: auto;">
  <circle cx="10" cy="30" r="1.5" fill="currentColor" stroke="none" />
  <path d="M 10 30 L 25 30 L 25 15" />
  <polygon points="17,5 33,5 25,15" />
  
  <path d="M 40 12 Q 46 20 40 28" />
  <path d="M 46 10 Q 54 20 46 30" />
  <path d="M 52 8 Q 62 20 52 32" />
  
  <circle cx="90" cy="30" r="1.5" fill="currentColor" stroke="none" />
  <path d="M 90 30 L 75 30 L 75 15" />
  <polygon points="67,5 83,5 75,15" />
</svg>`;
  }
}

class Splitter extends Block {
  setupParams() {
    this.params = {
      Number_of_Outputs: 2,
      Loss_dB: 3.0
    };
  }
  setupPorts() {
    this.inputs = [{ id: 'in1', offsetY: 40, label: 'In' }];
    this.updatePortsBasedOnParams();
  }
  updatePortsBasedOnParams() {
    let numOuts = Math.max(2, Math.floor(this.params.Number_of_Outputs));
    this.outputs = [];
    const h = this.element ? this.element.offsetHeight : 80;
    for(let i=0; i<numOuts; i++) {
      this.outputs.push({ id: 'out'+(i+1), offsetY: h / (numOuts + 1) * (i + 1), label: 'Out ' + (i+1) });
    }
  }
  getBodyHTML() {
    return `<svg width="100%" height="100%" viewBox="0 0 60 40" stroke="currentColor" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="max-height: 40px; display: block; margin: auto;">
  <rect x="15" y="5" width="30" height="30" />
  <path d="M 5 20 L 25 20" />
  <circle cx="5" cy="20" r="1.5" fill="currentColor" stroke="none" />
  <polygon points="25,20 35,12 35,28" />
  <path d="M 35 12 L 55 12" />
  <path d="M 35 28 L 55 28" />
  <circle cx="55" cy="12" r="1.5" fill="currentColor" stroke="none" />
  <circle cx="55" cy="28" r="1.5" fill="currentColor" stroke="none" />
</svg>`;
  }
}

class Combiner extends Block {
  setupParams() {
    this.params = {
      Number_of_Inputs: 2,
      Loss_dB: 3.0
    };
  }
  setupPorts() {
    this.outputs = [{ id: 'out1', offsetY: 40, label: 'Out' }];
    this.updatePortsBasedOnParams();
  }
  updatePortsBasedOnParams() {
    let numIns = Math.max(2, Math.floor(this.params.Number_of_Inputs));
    this.inputs = [];
    const h = this.element ? this.element.offsetHeight : 80;
    for(let i=0; i<numIns; i++) {
      this.inputs.push({ id: 'in'+(i+1), offsetY: h / (numIns + 1) * (i + 1), label: 'In ' + (i+1) });
    }
  }
  getBodyHTML() {
    return `<svg width="100%" height="100%" viewBox="0 0 60 40" stroke="currentColor" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="max-height: 40px; display: block; margin: auto;">
  <rect x="15" y="5" width="30" height="30" />
  <path d="M 5 12 L 25 12" />
  <path d="M 5 28 L 25 28" />
  <circle cx="5" cy="12" r="1.5" fill="currentColor" stroke="none" />
  <circle cx="5" cy="28" r="1.5" fill="currentColor" stroke="none" />
  <polygon points="25,12 25,28 35,20" />
  <path d="M 35 20 L 55 20" />
  <circle cx="55" cy="20" r="1.5" fill="currentColor" stroke="none" />
</svg>`;
  }
}

class Load extends Block {
  setupParams() {
    this.params = {};
  }
  setupPorts() {
    this.inputs = [{ id: 'in1', offsetY: 40, label: 'In' }];
    this.outputs = [];
  }
  getBodyHTML() {
    return `<svg width="100%" height="100%" viewBox="0 0 60 64" stroke="currentColor" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="max-height: 50px; display: block; margin: auto;">
  <circle cx="10" cy="20" r="1.5" fill="currentColor" stroke="none" />
  <path d="M 10 20 L 30 20 L 30 25" />
  <path d="M 30 25 L 25 27.5 L 35 32.5 L 25 37.5 L 35 42.5 L 25 47.5 L 30 50 L 30 52" />
  <path d="M 22 52 L 38 52" />
  <path d="M 25 55 L 35 55" />
  <path d="M 28 58 L 32 58" />
</svg>`;
  }
}

class Mixer extends Block {
  setupParams() {
    this.params = {
      Type: 'Downconvertor',
      Conversion_Gain_dB: -6.0,
      NF_dB: 6.0,
      P1dB_dBm: 5.0,
      OIP3_dBm: 15.0
    };
  }
  setupPorts() {
    this.inputs = [
      { id: 'rf', offsetY: 40, label: 'RF' },
      { id: 'lo', offsetY: 0, offsetX: 40, align: 'top', label: 'LO' }
    ];
    this.outputs = [
      { id: 'if', offsetY: 40, label: 'IF' }
    ];
  }
  updatePortsBasedOnParams() {
    if (this.params.Type === 'Upconvertor') {
      this.inputs[0].label = 'IF';
      this.outputs[0].label = 'RF';
    } else {
      this.inputs[0].label = 'RF';
      this.outputs[0].label = 'IF';
    }
  }
  getBodyHTML() {
    return `<span style="font-size:20px; font-weight:bold;">&#8855;</span>`;
  }
}

class Annotation extends Block {
  setupParams() {
    this.params = {
      Text: 'Double-click to edit note',
      Font_Size: 14
    };
  }
  setupPorts() {
    this.inputs = [];
    this.outputs = [];
  }
  getBodyHTML() {
    const fontSize = this.params.Font_Size || 14;
    const txt = this.params.Text || '';
    const escapedText = txt.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    return `<div class="annotation-text" style="font-size: ${fontSize}px; width: 100%; height: 100%; text-align: left; overflow: hidden; white-space: normal; word-break: break-word; padding: 4px; box-sizing: border-box;">${escapedText}</div>`;
  }
  updateParamDisplay() {
    if (this.element) {
      const body = this.element.querySelector('.rf-block__body');
      if (body) {
        body.innerHTML = this.getBodyHTML();
      }
    }
  }
}

window.RFBlocks = {
  Block,
  Amplifier,
  Attenuator,
  Filter,
  SignalSource,
  FreeSpaceLink,
  Splitter,
  Combiner,
  Load,
  Mixer,
  Annotation
};
