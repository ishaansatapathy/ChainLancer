/**
 * CHAINLANCER — Main Entry Point
 * Initializes all modules on DOM ready
 */

import './styles/variables.css';
import './styles/base.css';
import './styles/components.css';
import './styles/sections.css';
import './styles/animations.css';

import { initGlobe } from './globe.js';
import { initScrollAnimations } from './scroll-animations.js';
import { initCounterAnimations } from './counter-animations.js';
import { initAccordion } from './accordion.js';
import { initNav } from './nav.js';
import { initPipeline } from './pipeline.js';
import { initWorldMap } from './world-map.js';
import { initCommandCenter } from './command-center.js';
import { initAuth } from './auth.js';

document.addEventListener('DOMContentLoaded', () => {
  // Initialize navigation
  initNav();
  initAuth();

  // Initialize Thread-inspired command center and dock
  initCommandCenter();

  // Initialize Three.js globe
  const globeContainer = document.getElementById('globe-container');
  if (globeContainer) {
    initGlobe(globeContainer);
  }

  // Initialize 2D Dotted World Map in Deep Dive
  const worldMapContainer = document.getElementById('world-map-panel');
  if (worldMapContainer) {
    initWorldMap(worldMapContainer);
  }

  // Initialize scroll-based reveal animations
  initScrollAnimations();

  // Initialize animated number counters
  initCounterAnimations();

  // Initialize product deep dive accordion
  initAccordion();

  // Initialize pipeline animation
  initPipeline();

  // Floating banner close
  const bannerClose = document.getElementById('banner-close');
  const banner = document.getElementById('floating-banner');
  if (bannerClose && banner) {
    bannerClose.addEventListener('click', () => {
      banner.classList.add('hidden');
    });
  }
});
