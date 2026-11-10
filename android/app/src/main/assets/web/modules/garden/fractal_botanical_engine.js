/**
 * DEEP FOCUS — Exhaustive Fractal L-Systems Botanical Garden & Growth Engine
 * Module: modules/garden/fractal_botanical_engine.js
 * Version: v451.0.0 | Code: 41171
 * Reference: Pillar 9 (M8508 – M8557)
 * 
 * Provides an exhaustive procedural botany and study motivation engine (Zero-Image):
 * 1. Mathematical Lindenmayer Systems (L-Systems) recursive string grammar
 * 2. 4 Botanical Species: Zen Bonsai, Kyoto Bamboo, Flowering Sakura, Scholar Oak
 * 3. Real-time Canvas Rendering with turtle graphics interpretation
 * 4. Temporal Session Bridge: Study focus minutes directly drive tree growth tiers
 * 5. Persistent Botanical Garden Vault (.dfgarden) stored 100% locally
 * 6. Interactive Garden Inspector with tree cultivation metadata (Zero-PII)
 */

(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.BotanicalEngine = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const STORAGE_GARDEN_KEY = 'df_botanical_garden_vault_v1';

  const SPECIES_CONFIG = {
    bonsai: {
      id: 'bonsai',
      name: 'Japanese Zen Bonsai',
      axiom: 'F',
      rules: { 'F': 'FF+[+F-F-F]-[-F+F+F]' },
      angleDeg: 25.0,
      taper: 0.72,
      baseColor: '#3F2E18',
      foliageColor: '#15803D',
      maxIterations: 4
    },
    bamboo: {
      id: 'bamboo',
      name: 'Kyoto Bamboo Grove',
      axiom: 'X',
      rules: { 'X': 'F[+X][-X]FX', 'F': 'FF' },
      angleDeg: 22.5,
      taper: 0.85,
      baseColor: '#166534',
      foliageColor: '#22C55E',
      maxIterations: 4
    },
    sakura: {
      id: 'sakura',
      name: 'Flowering Sakura',
      axiom: 'X',
      rules: { 'X': 'F-[[X]+X]+F[+FX]-X', 'F': 'FF' },
      angleDeg: 24.0,
      taper: 0.70,
      baseColor: '#292524',
      foliageColor: '#F472B6',
      maxIterations: 4
    },
    oak: {
      id: 'oak',
      name: 'Academic Scholar Oak',
      axiom: 'F',
      rules: { 'F': 'F[+F]F[-F][F]' },
      angleDeg: 20.0,
      taper: 0.68,
      baseColor: '#451A03',
      foliageColor: '#047857',
      maxIterations: 4
    }
  };

  class BotanicalEngine {
    constructor(canvasElement = null, options = {}) {
      this.options = Object.assign({
        defaultSpecies: 'bonsai',
        storage: typeof window !== 'undefined' && window.localStorage ? window.localStorage : null
      }, options);

      this.canvas = canvasElement;
      this.ctx = canvasElement && canvasElement.getContext ? canvasElement.getContext('2d') : null;
      this.activeSpeciesKey = this.options.defaultSpecies;
      this.growthStage = 1; // 1 = Sprout, 2 = Sapling, 3 = Maturing, 4 = Full Bloom
      this.gardenVault = [];

      this.loadGardenVault();
    }

    /**
     * Set active tree species
     */
    setSpecies(speciesKey) {
      if (SPECIES_CONFIG[speciesKey]) {
        this.activeSpeciesKey = speciesKey;
        this.renderCurrentTree();
        return SPECIES_CONFIG[speciesKey];
      }
      return null;
    }

    /**
     * Compute recursive L-System string from Axiom and Rules
     */
    deriveLSystemString(axiom, rules, iterations) {
      let current = axiom;
      for (let i = 0; i < iterations; i++) {
        let next = '';
        for (let j = 0; j < current.length; j++) {
          const char = current[j];
          next += (rules && rules[char]) ? rules[char] : char;
        }
        current = next;
      }
      return current;
    }

    /**
     * Update growth stage based on continuous study minutes
     */
    updateGrowthFromSession(minutesStudied) {
      const mins = Math.max(0, parseInt(minutesStudied, 10) || 0);
      if (mins >= 50) {
        this.growthStage = 4; // Full Bloom
      } else if (mins >= 35) {
        this.growthStage = 3; // Maturing
      } else if (mins >= 20) {
        this.growthStage = 2; // Sapling
      } else {
        this.growthStage = 1; // Sprout
      }
      this.renderCurrentTree();
      return this.growthStage;
    }

    /**
     * Render procedural fractal tree using turtle graphics on Canvas
     */
    renderTreeOnCanvas(canvasEl, speciesKey, iterations, heightScale = 1.0) {
      if (!canvasEl) return false;
      const ctx = canvasEl.getContext('2d');
      if (!ctx) return false;

      const conf = SPECIES_CONFIG[speciesKey] || SPECIES_CONFIG.bonsai;
      const grammar = this.deriveLSystemString(conf.axiom, conf.rules, Math.min(conf.maxIterations, iterations));

      const w = canvasEl.width;
      const h = canvasEl.height;

      ctx.clearRect(0, 0, w, h);

      // Draw subtle Zen stone pot / earth base
      ctx.save();
      ctx.fillStyle = '#E2E8F0';
      ctx.beginPath();
      ctx.ellipse(w / 2, h - 16, 60, 14, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#CBD5E1';
      ctx.beginPath();
      ctx.ellipse(w / 2, h - 16, 50, 10, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Turtle Graphics State Stack
      let x = w / 2;
      let y = h - 22;
      let angle = -Math.PI / 2; // Pointing upwards
      let branchLength = Math.max(8, (h * 0.18 * heightScale) / Math.pow(1.6, iterations - 1));
      let branchWidth = Math.max(2, 6 * heightScale);
      const angleRad = (conf.angleDeg * Math.PI) / 180;
      const stateStack = [];

      ctx.save();
      ctx.lineCap = 'round';

      for (let i = 0; i < grammar.length; i++) {
        const cmd = grammar[i];
        if (cmd === 'F') {
          const nx = x + branchLength * Math.cos(angle);
          const ny = y + branchLength * Math.sin(angle);

          ctx.beginPath();
          ctx.strokeStyle = conf.baseColor;
          ctx.lineWidth = Math.max(1.5, branchWidth);
          ctx.moveTo(x, y);
          ctx.lineTo(nx, ny);
          ctx.stroke();

          x = nx;
          y = ny;
        } else if (cmd === '+') {
          angle += angleRad;
        } else if (cmd === '-') {
          angle -= angleRad;
        } else if (cmd === '[') {
          stateStack.push({ x, y, angle, branchLength, branchWidth });
          branchLength *= conf.taper;
          branchWidth = Math.max(1.2, branchWidth * 0.72);
        } else if (cmd === ']') {
          // Draw leaf/foliage cluster at branch tip
          ctx.fillStyle = conf.foliageColor;
          ctx.beginPath();
          ctx.arc(x, y, Math.max(2.5, 4.5 * heightScale), 0, Math.PI * 2);
          ctx.fill();

          if (stateStack.length > 0) {
            const popped = stateStack.pop();
            x = popped.x;
            y = popped.y;
            angle = popped.angle;
            branchLength = popped.branchLength;
            branchWidth = popped.branchWidth;
          }
        }
      }

      ctx.restore();
      return true;
    }

    renderCurrentTree() {
      if (this.canvas) {
        this.renderTreeOnCanvas(this.canvas, this.activeSpeciesKey, this.growthStage);
      }
    }

    /**
     * Harvest and plant completed study tree into the persistent Garden Vault
     */
    plantCurrentTree(subjectStudied = 'Deep Focus Session', durationMinutes = 45) {
      const conf = SPECIES_CONFIG[this.activeSpeciesKey] || SPECIES_CONFIG.bonsai;
      const treeRecord = {
        id: 'tree_' + Date.now().toString(16),
        speciesId: conf.id,
        speciesName: conf.name,
        subject: subjectStudied.trim(),
        durationMins: durationMinutes,
        growthStage: this.growthStage,
        plantedAt: new Date().toISOString()
      };

      this.gardenVault.unshift(treeRecord);
      this.saveGardenVault();

      // Reset growth stage for next study session
      this.growthStage = 1;
      this.renderCurrentTree();

      return {
        plantedTree: treeRecord,
        totalGardenTrees: this.gardenVault.length
      };
    }

    saveGardenVault() {
      if (this.options.storage) {
        try {
          this.options.storage.setItem(STORAGE_GARDEN_KEY, JSON.stringify(this.gardenVault));
        } catch (e) {}
      }
    }

    loadGardenVault() {
      if (this.options.storage) {
        try {
          const raw = this.options.storage.getItem(STORAGE_GARDEN_KEY);
          if (raw) {
            this.gardenVault = JSON.parse(raw);
          }
        } catch (e) {
          this.gardenVault = [];
        }
      }
    }
  }

  return BotanicalEngine;
}));
