/**
 * CHAINLANCER — Pipeline Animation
 * Auto-advancing pipeline steps with progress indicators
 */

export function initPipeline() {
  const pipelineSection = document.querySelector('.pipeline-section');
  const nodes = document.querySelectorAll('.pipeline__node');
  const connectors = document.querySelectorAll('.pipeline__connector');

  if (!pipelineSection || !nodes.length) return;

  let activated = false;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting && !activated) {
          activated = true;
          animatePipeline(nodes, connectors);
        }
      });
    },
    { threshold: 0.3 }
  );

  observer.observe(pipelineSection);
}

function animatePipeline(nodes, connectors) {
  const delay = 300; // ms between each step

  nodes.forEach((node, i) => {
    setTimeout(() => {
      node.classList.add('active');

      // Activate preceding connector
      if (i > 0 && connectors[i - 1]) {
        connectors[i - 1].classList.add('active');
      }
    }, i * delay);
  });
}
