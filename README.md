# FreeEnergyLab

**Interactive Active Inference & Free Energy Principle Laboratory**

Explore Karl Friston's Free Energy Principle — the most ambitious unifying theory in neuroscience — through 7 interactive modules. All simulations run entirely in-browser with no backend.

## Modules

### 1. Free Energy Landscape Explorer
3D visualization of the variational free energy surface F(q). Watch particles perform gradient descent to minimize surprise. Adjust observation, prior mean, prior precision, and likelihood precision to see the landscape deform in real-time.

### 2. Markov Blanket Constructor
Build and explore Markov blankets — the statistical boundary between self and world. Three biological presets (Cell, Brain, Organism) with animated information flow. Drag nodes, watch the blanket boundary adapt.

### 3. Predictive Coding Hierarchy
Step through a hierarchical predictive coding network. Top-down predictions (green) meet bottom-up prediction errors (red). Inject expected, surprising, ambiguous, or missing stimuli and watch belief propagation cascade through layers with precision weighting.

### 4. Active Inference Agent Arena
Side-by-side comparison: an Active Inference agent vs. a Q-Learning agent navigating a grid world. The AI agent minimizes expected free energy — curiosity (epistemic drive) and goal-seeking (pragmatic drive) emerge naturally from the math. Adjust drives to see exploration-exploitation trade-offs.

### 5. Bayesian Belief Updater
Interactive Gaussian prior + likelihood = posterior visualization. Drag parameters to see precision-weighted inference in real-time. Run sequential updates to watch beliefs converge as evidence accumulates.

### 6. Expected Free Energy Decomposition
Decompose G(π) into epistemic value (information gain) and pragmatic value (preference satisfaction) across multiple policies. Adjust weights and see which policy minimizes expected free energy. Pie chart shows the exploration-exploitation drive split.

### 7. Information Geometry Manifold
Explore the curved geometry of probability distributions. Visualize Gaussian, Beta, and Categorical manifolds with Fisher information metric, geodesics, and gradient descent. Compare natural gradient (follows manifold curvature) vs. ordinary gradient descent.

## Tech Stack

- **Three.js** — 3D free energy landscapes and information geometry manifolds
- **D3.js v7** — Force-directed Markov blanket graphs
- **KaTeX** — LaTeX math rendering
- **Canvas API** — 2D predictive coding, agent arena, belief dynamics, EFE decomposition
- **Vanilla JS (ES Modules)** — Zero build step, zero dependencies beyond CDN

## Running Locally

```bash
# Any static file server works
python3 -m http.server 8080
# Open http://localhost:8080
```

## Scientific References

- Friston, K. (2006). A free energy principle for the brain. *Journal of Physiology-Paris*
- Friston, K. (2010). The free-energy principle: a unified brain theory? *Nature Reviews Neuroscience*
- Parr, T., Pezzulo, G., & Friston, K. J. (2022). *Active Inference: The Free Energy Principle in Mind, Brain, and Behavior*. MIT Press
- Amari, S. (1998). Natural gradient works efficiently in learning. *Neural Computation*
- Rao, R. P., & Ballard, D. H. (1999). Predictive coding in the visual cortex. *Nature Neuroscience*

## License

MIT
