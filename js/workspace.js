class Wire {
  constructor(sourceId, sourcePort, targetId, targetPort) {
    this.id = 'wire_' + Date.now() + Math.random().toString(36).substr(2, 9);
    this.sourceId = sourceId;
    this.sourcePort = sourcePort;
    this.targetId = targetId;
    this.targetPort = targetPort;
    this.element = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    this.element.setAttribute('class', 'wire-path');
    this.element.dataset.id = this.id;
  }
}

const Workspace = {
  blocks: [],
  wires: [],
  selectedBlocks: new Set(),
  selectedWires: new Set(),
  clipboard: null,
  container: null,
  canvas: null,
  svgLayer: null,
  gridSize: 20,
  zoom: 1,
  panX: 0,
  panY: 0,
  displayOptions: {
    showBlockParams: true,
    showCascadedPower: true,
    showCascadedIP3: true,
    showCascadedP1dB: true,
    showCascadedNF: true,
    showFrequency: false,
    showLogs: true
  },
  
  dragState: null,
  tempWire: null,
  contextMenuX: 0,
  contextMenuY: 0,
  lastMouseX: 200,
  lastMouseY: 200,
  resultsStale: false,

  init() {
    this.container = document.getElementById('workspace');
    this.svgLayer = document.getElementById('wires-layer');

    // Create a canvas layer that we scale/pan for zoom
    this.canvas = document.createElement('div');
    this.canvas.id = 'workspace-canvas';
    this.canvas.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;transform-origin:0 0;';
    // Move svgLayer into canvas
    this.container.appendChild(this.canvas);
    this.canvas.appendChild(this.svgLayer);
    
    this.container.addEventListener('mousemove', e => {
      const rect = this.container.getBoundingClientRect();
      this.lastMouseX = (e.clientX - rect.left) / this.zoom;
      this.lastMouseY = (e.clientY - rect.top) / this.zoom;
    });
    
    // Scroll-wheel zoom
    this.container.addEventListener('wheel', e => {
      e.preventDefault();
      const rect = this.container.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      
      const zoomFactor = e.deltaY < 0 ? 1.1 : 1 / 1.1;
      const newZoom = Math.max(0.2, Math.min(4, this.zoom * zoomFactor));
      
      // Adjust pan so zoom centres on mouse position
      this.panX = mouseX - (mouseX - this.panX) * (newZoom / this.zoom);
      this.panY = mouseY - (mouseY - this.panY) * (newZoom / this.zoom);
      this.zoom = newZoom;
      this._applyTransform();
    }, { passive: false });
    
    this.container.addEventListener('dragover', e => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
    });
    
    this.container.addEventListener('drop', e => {
      e.preventDefault();
      const type = e.dataTransfer.getData('application/rf-block');
      if (type) {
        const rect = this.container.getBoundingClientRect();
        let x = (e.clientX - rect.left - this.panX) / this.zoom - 60;
        let y = (e.clientY - rect.top - this.panY) / this.zoom - 40;
        
        x = Math.round(x / this.gridSize) * this.gridSize;
        y = Math.round(y / this.gridSize) * this.gridSize;
        
        this.addBlock(type, x, y);
        this.markStale();
      }
    });

    this.container.addEventListener('mousedown', this.onMouseDown.bind(this));
    window.addEventListener('mousemove', this.onMouseMove.bind(this));
    window.addEventListener('mouseup', this.onMouseUp.bind(this));
    this.container.addEventListener('contextmenu', this.onContextMenu.bind(this));

    // Middle-mouse or Right-mouse pan
    this.container.addEventListener('mousedown', (e) => {
      if (e.button !== 1 && e.button !== 2) return;
      if (e.button === 1) {
        e.preventDefault();
      }
      this.dragState = {
        type: 'pan',
        startX: e.clientX,
        startY: e.clientY,
        startPanX: this.panX,
        startPanY: this.panY,
        isRightClick: e.button === 2
      };
      if (e.button === 2) {
        this.rightClickDragged = false;
      }
      this.container.style.cursor = 'grabbing';
    });
  },

  _applyTransform() {
    if (this.canvas) {
      this.canvas.style.transform = `translate(${this.panX}px, ${this.panY}px) scale(${this.zoom})`;
    }
    // Keep the dot-grid in sync with pan and zoom
    if (this.container) {
      const dotSpacing = this.gridSize * this.zoom;
      this.container.style.backgroundSize = `${dotSpacing}px ${dotSpacing}px`;
      this.container.style.backgroundPosition = `${this.panX}px ${this.panY}px`;
    }
  },

  markStale() {
    if (!this.resultsStale) {
      this.resultsStale = true;
      const btn = document.getElementById('btn-calculate');
      if (btn) btn.textContent = '⚠ Simulate';
    }
  },

  clearStale() {
    this.resultsStale = false;
    const btn = document.getElementById('btn-calculate');
    if (btn) btn.textContent = 'Simulate';
  },

  selectBlock(block) {
    this.selectedBlocks.add(block);
    if (block.element) {
      block.element.classList.add('rf-block--selected');
    }
  },

  deselectBlock(block) {
    this.selectedBlocks.delete(block);
    if (block.element) {
      block.element.classList.remove('rf-block--selected');
    }
  },

  selectWire(wire) {
    this.selectedWires.add(wire);
    if (wire.element) {
      wire.element.classList.add('wire-path--selected');
    }
  },

  deselectWire(wire) {
    this.selectedWires.delete(wire);
    if (wire.element) {
      wire.element.classList.remove('wire-path--selected');
    }
  },

  clearSelection() {
    this.selectedBlocks.forEach(b => {
      if (b.element) b.element.classList.remove('rf-block--selected');
    });
    this.selectedWires.forEach(w => {
      if (w.element) w.element.classList.remove('wire-path--selected');
    });
    this.selectedBlocks.clear();
    this.selectedWires.clear();
  },

  addBlock(type, x, y, id) {
    const blockId = id || ('blk_' + Date.now() + Math.floor(Math.random()*1000));
    const BlockClass = window.RFBlocks[type];
    if (!BlockClass) return;
    
    const block = new BlockClass(blockId, type, x, y);
    this.blocks.push(block);
    
    const el = block.render();
    // Append to canvas so blocks scale with zoom
    (this.canvas || this.container).appendChild(el);

    el.addEventListener('dblclick', (e) => {
      e.stopPropagation();
      if (window.App) {
        window.App.activeBlock = block;
        window.App.openParamModal(block);
      }
    });

    return block;
  },

  removeBlock(id) {
    const blockIndex = this.blocks.findIndex(b => b.id === id);
    if (blockIndex === -1) return;
    
    const block = this.blocks[blockIndex];
    if (block.element) block.element.remove();
    this.blocks.splice(blockIndex, 1);
    
    this.wires = this.wires.filter(w => {
      if (w.sourceId === id || w.targetId === id) {
        if (w.element) w.element.remove();
        return false;
      }
      return true;
    });
  },

  removeWire(id) {
    const idx = this.wires.findIndex(w => w.id === id);
    if (idx !== -1) {
      if (this.wires[idx].element) this.wires[idx].element.remove();
      this.wires.splice(idx, 1);
    }
  },

  intersects(r1, r2) {
    return !(r2.left > r1.right || 
             r2.right < r1.left || 
             r2.top > r1.bottom || 
             r2.bottom < r1.top);
  },

  getSelectionBounds() {
    let minX = Infinity, minY = Infinity;
    this.selectedBlocks.forEach(b => {
      if (b.x < minX) minX = b.x;
      if (b.y < minY) minY = b.y;
    });
    return { left: minX === Infinity ? 0 : minX, top: minY === Infinity ? 0 : minY };
  },

  copy() {
    if (this.selectedBlocks.size === 0) return;
    
    const bounds = this.getSelectionBounds();
    this.clipboard = {
      blocks: Array.from(this.selectedBlocks).map(b => ({
        relId: b.id,
        type: b.type,
        name: b.name,
        params: JSON.parse(JSON.stringify(b.params)),
        w: b.element ? b.element.offsetWidth : 120,
        h: b.element ? b.element.offsetHeight : 80,
        relX: b.x - bounds.left,
        relY: b.y - bounds.top
      })),
      wires: Array.from(this.selectedWires)
        .filter(w => {
          const srcBlock = this.blocks.find(b => b.id === w.sourceId);
          const tgtBlock = this.blocks.find(b => b.id === w.targetId);
          return srcBlock && tgtBlock && this.selectedBlocks.has(srcBlock) && this.selectedBlocks.has(tgtBlock);
        })
        .map(w => ({
          sourceRelId: w.sourceId,
          sourcePort: w.sourcePort,
          targetRelId: w.targetId,
          targetPort: w.targetPort
        }))
    };
  },

  paste(x, y) {
    if (!this.clipboard || !this.clipboard.blocks.length) return;
    
    const idMap = {};
    this.clearSelection();
    
    this.clipboard.blocks.forEach(cb => {
      let px = x + cb.relX;
      let py = y + cb.relY;
      
      px = Math.round(px / this.gridSize) * this.gridSize;
      py = Math.round(py / this.gridSize) * this.gridSize;
      
      const newBlock = this.addBlock(cb.type, px, py);
      if (newBlock) {
        newBlock.name = cb.name;
        newBlock.params = JSON.parse(JSON.stringify(cb.params));
        if (newBlock.element) {
          newBlock.element.style.width = cb.w + 'px';
          newBlock.element.style.height = cb.h + 'px';
        }
        newBlock.rebuildPorts();
        newBlock.updateParamDisplay();
        
        idMap[cb.relId] = newBlock.id;
        this.selectBlock(newBlock);
      }
    });
    
    this.clipboard.wires.forEach(cw => {
      const newSourceId = idMap[cw.sourceRelId];
      const newTargetId = idMap[cw.targetRelId];
      if (newSourceId && newTargetId) {
        const wire = new Wire(newSourceId, cw.sourcePort, newTargetId, cw.targetPort);
        this.svgLayer.appendChild(wire.element);
        this.wires.push(wire);
        
        wire.element.addEventListener('dblclick', (ev) => {
          ev.stopPropagation();
          if (confirm('Delete this connection?')) {
            this.removeWire(wire.id);
            this.markStale();
          }
        });
        
        this.selectWire(wire);
      }
    });
    
    this.updateWires();
    this.markStale();
  },

  deleteSelected() {
    this.selectedWires.forEach(w => {
      this.removeWire(w.id);
    });
    this.selectedBlocks.forEach(b => {
      this.removeBlock(b.id);
    });
    this.clearSelection();
    this.markStale();
  },

  exportWorkspace() {
    const data = {
      displayOptions: this.displayOptions,
      blocks: this.blocks.map(b => ({
        id: b.id,
        type: b.type,
        name: b.name,
        x: b.x,
        y: b.y,
        w: b.element ? b.element.offsetWidth : 120,
        h: b.element ? b.element.offsetHeight : 80,
        params: b.params
      })),
      wires: this.wires.map(w => ({
        sourceId: w.sourceId,
        sourcePort: w.sourcePort,
        targetId: w.targetId,
        targetPort: w.targetPort
      }))
    };
    
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = 'rf-workspace.json';
    a.click();
    URL.revokeObjectURL(url);
  },

  importWorkspace(data) {
    if (!data || !Array.isArray(data.blocks)) return;
    
    this.clear();
    
    if (data.displayOptions) {
      const fallbackCasc = data.displayOptions.showCascadedParams !== undefined ? data.displayOptions.showCascadedParams : true;
      this.displayOptions = {
        showBlockParams: data.displayOptions.showBlockParams !== undefined ? data.displayOptions.showBlockParams : true,
        showCascadedPower: data.displayOptions.showCascadedPower !== undefined ? data.displayOptions.showCascadedPower : fallbackCasc,
        showCascadedIP3: data.displayOptions.showCascadedIP3 !== undefined ? data.displayOptions.showCascadedIP3 : fallbackCasc,
        showCascadedP1dB: data.displayOptions.showCascadedP1dB !== undefined ? data.displayOptions.showCascadedP1dB : fallbackCasc,
        showCascadedNF: data.displayOptions.showCascadedNF !== undefined ? data.displayOptions.showCascadedNF : fallbackCasc,
        showFrequency: data.displayOptions.showFrequency !== undefined ? data.displayOptions.showFrequency : true,
        showLogs: data.displayOptions.showLogs !== undefined ? data.displayOptions.showLogs : true
      };
      const chkBlock = document.getElementById('chk-show-block-params');
      const chkCascPower = document.getElementById('chk-show-cascaded-power');
      const chkCascIP3 = document.getElementById('chk-show-cascaded-ip3');
      const chkCascP1dB = document.getElementById('chk-show-cascaded-p1db');
      const chkCascNF = document.getElementById('chk-show-cascaded-nf');
      const chkFreq = document.getElementById('chk-show-frequency');
      const chkLogs = document.getElementById('chk-show-logs');
      if (chkBlock) chkBlock.checked = this.displayOptions.showBlockParams;
      if (chkCascPower) chkCascPower.checked = this.displayOptions.showCascadedPower;
      if (chkCascIP3) chkCascIP3.checked = this.displayOptions.showCascadedIP3;
      if (chkCascP1dB) chkCascP1dB.checked = this.displayOptions.showCascadedP1dB;
      if (chkCascNF) chkCascNF.checked = this.displayOptions.showCascadedNF;
      if (chkFreq) chkFreq.checked = this.displayOptions.showFrequency;
      if (chkLogs) chkLogs.checked = this.displayOptions.showLogs;
      
      const resultsSec = document.getElementById('results-section');
      if (resultsSec) {
        resultsSec.style.display = this.displayOptions.showLogs ? 'block' : 'none';
      }
    }
    
    // 1. Recreate blocks
    data.blocks.forEach(b => {
      const newBlock = this.addBlock(b.type, b.x, b.y, b.id);
      if (newBlock) {
        newBlock.name = b.name;
        newBlock.params = JSON.parse(JSON.stringify(b.params));
        if (b.w && newBlock.element) newBlock.element.style.width = b.w + 'px';
        if (b.h && newBlock.element) newBlock.element.style.height = b.h + 'px';
        newBlock.rebuildPorts();
        newBlock.updateParamDisplay();
      }
    });
    
    // 2. Recreate wires
    if (Array.isArray(data.wires)) {
      data.wires.forEach(w => {
        const wire = new Wire(w.sourceId, w.sourcePort, w.targetId, w.targetPort);
        this.svgLayer.appendChild(wire.element);
        this.wires.push(wire);
        
        wire.element.addEventListener('dblclick', (ev) => {
          ev.stopPropagation();
          if (confirm('Delete this connection?')) {
            this.removeWire(wire.id);
            if (window.App) {
              // Intentionally not calculating cascade automatically
            }
          }
        });
      });
    }
    
    this.updateWires();
    // Intentionally not calculating cascade automatically
  },

  onMouseDown(e) {
    if (e.button !== 0) return; // only left click
    
    if (e.target.classList.contains('port')) {
      if (e.target.classList.contains('port--out')) {
        const blockId = e.target.dataset.blockId;
        const portId = e.target.dataset.portId;
        
        this.dragState = { type: 'wire', sourceId: blockId, sourcePort: portId };
        
        this.tempWire = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        this.tempWire.setAttribute('class', 'wire-path');
        this.tempWire.style.pointerEvents = 'none';
        this.svgLayer.appendChild(this.tempWire);
      }
      return;
    }

    if (e.target.classList.contains('resize-handle')) {
      const blockEl = e.target.closest('.rf-block');
      if (blockEl) {
        const blockId = blockEl.dataset.id;
        const block = this.blocks.find(b => b.id === blockId);
        if (block) {
          this.dragState = {
            type: 'resize',
            block: block,
            startX: e.clientX,
            startY: e.clientY,
            startW: blockEl.offsetWidth,
            startH: blockEl.offsetHeight
          };
          return;
        }
      }
    }

    if (e.target.classList.contains('wire-path')) {
      const wireId = e.target.dataset.id;
      const wire = this.wires.find(w => w.id === wireId);
      if (wire) {
        if (!e.ctrlKey && !e.shiftKey) {
          this.clearSelection();
        }
        if (this.selectedWires.has(wire)) {
          this.deselectWire(wire);
        } else {
          this.selectWire(wire);
        }
      }
      return;
    }

    const blockEl = e.target.closest('.rf-block');
    if (blockEl) {
      const blockId = blockEl.dataset.id;
      const block = this.blocks.find(b => b.id === blockId);
      if (block) {
        if (!this.selectedBlocks.has(block)) {
          if (!e.ctrlKey && !e.shiftKey) {
            this.clearSelection();
          }
          this.selectBlock(block);
        } else if (e.ctrlKey || e.shiftKey) {
          this.deselectBlock(block);
          return;
        }
        
        const rect = this.container.getBoundingClientRect();
        const startX = (e.clientX - rect.left - this.panX) / this.zoom;
        const startY = (e.clientY - rect.top - this.panY) / this.zoom;
        
        const dragBlocks = [];
        this.selectedBlocks.forEach(sb => {
          dragBlocks.push({ block: sb, startX: sb.x, startY: sb.y });
        });
        
        this.dragState = {
          type: 'block',
          clickX: startX,
          clickY: startY,
          dragBlocks: dragBlocks
        };
      }
    } else {
      if (!e.ctrlKey && !e.shiftKey) {
        this.clearSelection();
      }
      window.App.hideContextMenu();
      
      const rect = this.container.getBoundingClientRect();
      // Selection box is in screen space (outside the scaled canvas)
      const startX = e.clientX - rect.left;
      const startY = e.clientY - rect.top;
      
      const selectionBoxEl = document.createElement('div');
      selectionBoxEl.className = 'selection-box';
      selectionBoxEl.style.left = startX + 'px';
      selectionBoxEl.style.top = startY + 'px';
      this.container.appendChild(selectionBoxEl);
      
      this.dragState = {
        type: 'select',
        startX: startX,
        startY: startY,
        element: selectionBoxEl
      };
    }
  },

  onMouseMove(e) {
    if (!this.dragState) return;

    const rect = this.container.getBoundingClientRect();

    // Middle-mouse or Right-mouse pan
    if (this.dragState.type === 'pan') {
      const dx = e.clientX - this.dragState.startX;
      const dy = e.clientY - this.dragState.startY;
      if (this.dragState.isRightClick && Math.sqrt(dx*dx + dy*dy) > 3) {
        this.rightClickDragged = true;
      }
      this.panX = this.dragState.startPanX + dx;
      this.panY = this.dragState.startPanY + dy;
      this._applyTransform();
      return;
    }

    // Convert screen coords to canvas (world) coords
    let x = (e.clientX - rect.left - this.panX) / this.zoom;
    let y = (e.clientY - rect.top - this.panY) / this.zoom;
    // Screen coords (for selection box which lives outside canvas)
    let sx = e.clientX - rect.left;
    let sy = e.clientY - rect.top;

    if (this.dragState.type === 'block') {
      const dx = x - this.dragState.clickX;
      const dy = y - this.dragState.clickY;
      
      this.dragState.dragBlocks.forEach(db => {
        let newX = db.startX + dx;
        let newY = db.startY + dy;
        
        newX = Math.round(newX / this.gridSize) * this.gridSize;
        newY = Math.round(newY / this.gridSize) * this.gridSize;
        
        db.block.x = newX;
        db.block.y = newY;
        db.block.updatePosition();
      });
      this.updateWires();
    } 
    else if (this.dragState.type === 'resize') {
      const block = this.dragState.block;
      let newW = this.dragState.startW + (e.clientX - this.dragState.startX) / this.zoom;
      let newH = this.dragState.startH + (e.clientY - this.dragState.startY) / this.zoom;
      
      newW = Math.round(newW / this.gridSize) * this.gridSize;
      newH = Math.round(newH / this.gridSize) * this.gridSize;
      
      newW = Math.max(60, newW);
      newH = Math.max(40, newH);
      
      block.element.style.width = newW + 'px';
      block.element.style.height = newH + 'px';
      
      if (block.updatePortsBasedOnParams) {
        block.updatePortsBasedOnParams();
      } else {
        block.inputs.forEach((p, index, arr) => {
          p.offsetY = newH / (arr.length + 1) * (index + 1);
        });
        block.outputs.forEach((p, index, arr) => {
          p.offsetY = newH / (arr.length + 1) * (index + 1);
        });
      }
      
      block.inputs.forEach(p => {
        const portEl = block.element.querySelector(`.port--in[data-port-id="${p.id}"]`);
        if (portEl) portEl.style.top = (p.offsetY - 2) + 'px';
      });
      block.outputs.forEach(p => {
        const portEl = block.element.querySelector(`.port--out[data-port-id="${p.id}"]`);
        if (portEl) portEl.style.top = (p.offsetY - 2) + 'px';
      });
      
      this.updateWires();
    }
    else if (this.dragState.type === 'wire') {
      const srcPos = this.getPortCoords(this.dragState.sourceId, this.dragState.sourcePort, 'out');
      if (srcPos) {
        let tgtAlign = 'left';
        if (e.target && e.target.classList.contains('port--top')) {
          tgtAlign = 'top';
        }
        this.drawBezier(this.tempWire, srcPos.x, srcPos.y, x, y, 'right', tgtAlign);
      }
    }
    else if (this.dragState.type === 'select') {
      const x1 = this.dragState.startX;
      const y1 = this.dragState.startY;
      const x2 = sx;
      const y2 = sy;
      
      const left = Math.min(x1, x2);
      const top = Math.min(y1, y2);
      const width = Math.abs(x2 - x1);
      const height = Math.abs(y2 - y1);
      
      this.dragState.element.style.left = left + 'px';
      this.dragState.element.style.top = top + 'px';
      this.dragState.element.style.width = width + 'px';
      this.dragState.element.style.height = height + 'px';
      
      // Convert selection box back to world coords for hit testing
      const wLeft = (left - this.panX) / this.zoom;
      const wTop = (top - this.panY) / this.zoom;
      const wRight = (left + width - this.panX) / this.zoom;
      const wBottom = (top + height - this.panY) / this.zoom;
      const box = { left: wLeft, top: wTop, right: wRight, bottom: wBottom };
      
      this.blocks.forEach(b => {
        const bBox = {
          left: b.x,
          top: b.y,
          right: b.x + (b.element ? b.element.offsetWidth : 120),
          bottom: b.y + (b.element ? b.element.offsetHeight : 80)
        };
        if (this.intersects(box, bBox)) {
          this.selectBlock(b);
        } else {
          this.deselectBlock(b);
        }
      });
      
      this.wires.forEach(w => {
        if (w.element) {
          const bbox = w.element.getBBox();
          const wBox = {
            left: bbox.x,
            top: bbox.y,
            right: bbox.x + bbox.width,
            bottom: bbox.y + bbox.height
          };
          if (this.intersects(box, wBox)) {
            this.selectWire(w);
          } else {
            this.deselectWire(w);
          }
        }
      });
    }
  },

  onMouseUp(e) {
    if (!this.dragState) return;

    if (this.dragState.type === 'wire') {
      if (e.target.classList.contains('port') && e.target.classList.contains('port--in')) {
        const targetId = e.target.dataset.blockId;
        const targetPort = e.target.dataset.portId;
        
        if (targetId !== this.dragState.sourceId) {
          const exists = this.wires.find(w => 
            w.sourceId === this.dragState.sourceId && 
            w.sourcePort === this.dragState.sourcePort && 
            w.targetId === targetId && 
            w.targetPort === targetPort
          );
          
          if (!exists) {
            const wire = new Wire(this.dragState.sourceId, this.dragState.sourcePort, targetId, targetPort);
            this.svgLayer.appendChild(wire.element);
            this.wires.push(wire);
            this.updateWires();
            
            wire.element.addEventListener('dblclick', (ev) => {
              ev.stopPropagation();
              if (confirm('Delete this connection?')) {
                this.removeWire(wire.id);
                this.markStale();
              }
            });
            this.markStale();
          }
        }
      }
      
      if (this.tempWire) {
        this.tempWire.remove();
        this.tempWire = null;
      }
    }
    else if (this.dragState.type === 'block') {
      const rect = this.container.getBoundingClientRect();
      const endX = (e.clientX - rect.left - this.panX) / this.zoom;
      const endY = (e.clientY - rect.top - this.panY) / this.zoom;
      const dx = this.dragState.clickX - endX;
      const dy = this.dragState.clickY - endY;
      
      // Removed left-click plot modal triggering as requested
    }
    else if (this.dragState.type === 'select') {
      if (this.dragState.element) {
        this.dragState.element.remove();
      }
    }
    else if (this.dragState.type === 'pan') {
      this.container.style.cursor = '';
    }

    this.dragState = null;
  },

  onContextMenu(e) {
    e.preventDefault();
    if (this.rightClickDragged) {
      this.rightClickDragged = false;
      return;
    }
    const rect = this.container.getBoundingClientRect();
    // Store world-space coords for paste operations
    this.contextMenuX = (e.clientX - rect.left - this.panX) / this.zoom;
    this.contextMenuY = (e.clientY - rect.top - this.panY) / this.zoom;
    
    const blockEl = e.target.closest('.rf-block');
    let targetBlock = null;
    if (blockEl) {
      const blockId = blockEl.dataset.id;
      targetBlock = this.blocks.find(b => b.id === blockId);
    }
    
    if (targetBlock) {
      if (!this.selectedBlocks.has(targetBlock)) {
        this.clearSelection();
        this.selectBlock(targetBlock);
      }
    }
    
    window.App.showContextMenu(e.clientX, e.clientY, targetBlock);
  },

  getPortCoords(blockId, portId, type) {
    const block = this.blocks.find(b => b.id === blockId);
    if (!block) return null;
    
    const portDef = type === 'out' 
      ? block.outputs.find(p => p.id === portId)
      : block.inputs.find(p => p.id === portId);
      
    if (!portDef) return null;
    
    const w = block.element ? block.element.offsetWidth : 120;
    
    let x, y;
    if (portDef.align === 'top') {
      x = block.x + w / 2;
      y = block.y;
    } else {
      x = type === 'out' ? block.x + w : block.x;
      y = block.y + portDef.offsetY;
    }
    
    return { x, y };
  },

  updateWires() {
    this.wires = this.wires.filter(wire => {
      const srcPos = this.getPortCoords(wire.sourceId, wire.sourcePort, 'out');
      const tgtPos = this.getPortCoords(wire.targetId, wire.targetPort, 'in');
      
      let srcAlign = 'right';
      let tgtAlign = 'left';
      
      const tgtBlock = this.blocks.find(b => b.id === wire.targetId);
      if (tgtBlock) {
         const p = tgtBlock.inputs.find(p => p.id === wire.targetPort);
         if (p && p.align) tgtAlign = p.align;
      }
      
      if (srcPos && tgtPos) {
        this.drawBezier(wire.element, srcPos.x, srcPos.y, tgtPos.x, tgtPos.y, srcAlign, tgtAlign);
        return true;
      } else {
        if (wire.element) wire.element.remove();
        return false;
      }
    });
  },

  drawBezier(pathEl, x1, y1, x2, y2, srcAlign = 'right', tgtAlign = 'left') {
    const dist = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
    const stiffness = Math.max(dist * 0.4, 60);
    
    let cp1x = x1, cp1y = y1;
    let cp2x = x2, cp2y = y2;
    
    if (srcAlign === 'right') {
      cp1x = x1 + stiffness;
    } else if (srcAlign === 'left') {
      cp1x = x1 - stiffness;
    } else if (srcAlign === 'top') {
      cp1y = y1 - stiffness;
    } else if (srcAlign === 'bottom') {
      cp1y = y1 + stiffness;
    }
    
    if (tgtAlign === 'left') {
      cp2x = x2 - stiffness;
    } else if (tgtAlign === 'right') {
      cp2x = x2 + stiffness;
    } else if (tgtAlign === 'top') {
      cp2y = y2 - stiffness;
    } else if (tgtAlign === 'bottom') {
      cp2y = y2 + stiffness;
    }
    
    const d = `M ${x1} ${y1} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${x2} ${y2}`;
    pathEl.setAttribute('d', d);
  },

  clear() {
    this.blocks.forEach(b => { if (b.element) b.element.remove(); });
    this.wires.forEach(w => { if (w.element) w.element.remove(); });
    this.blocks = [];
    this.wires = [];
    this.clearSelection();
  }
};

window.Workspace = Workspace;
