# EcoPulse: The Interactive Ecosystem Simulator

![EcoPulse Logo](https://img.shields.io/badge/EcoPulse-Nature%20Lab%20%7C%20BioSim%20Pro-6366f1?style=for-the-badge&logo=visual-studio-code)

**EcoPulse** is an immersive, dual-tier educational platform for exploring the **Lotka-Volterra** mathematical model of predator-prey dynamics. Built with a focus on both accessibility and analytical depth, it offers two distinct environments for learners of all ages.

---

## 🌟 Two Ways to Explore

### 1. 🐰 Nature Lab (Kids Version)
Designed for younger learners, Nature Lab simplifies complex ecological concepts through play and visual storytelling.
- **Emoji-Driven Interface**: Uses playful 🐰 and 🐺 emojis to represent population shifts.
- **Simplified Explanations**: "Happy Balance" and "Magical Sparkles" explain mathematical stability in a kid-friendly way.
- **Sparkles Mode**: A living visualization where animal populations are represented by a dynamic swarm of "sparkling" particles.
- **Safety First**: Larger UI elements and a high-contrast light theme for easy interaction.

### 2. 🧪 BioSim Pro (Professional Version)
A data-heavy suite for students and researchers needing precise control and analysis.
- **Real-Time Analytics**: Insights into peak populations, period estimation (cycle time), and oscillation cycles.
- **Dynamic Stability Engine**: A live monitor that detects "Diverging," "Extinction Imminent," or "Neutrally Stable" system states.
- **Mathematical Depth**: Integrated KaTeX rendering for the original Lotka-Volterra differential equations.
- **Advanced Phase Space**: 3D spiral trajectories and density-mapped particle visualizations for observing biological mass throughout the cycle.

---

## 🚀 Key Features

- **Interactive Parameter Control**: Real-time adjustment of growth rates (α), predation efficiency (β), death rates (γ), and conversion efficiency (δ).
- **Dual-View Visualization**: Real-time population charts (time-series) alongside 2D/3D Phase Space trajectories.
- **Particle Swarm Visualization**: A probabilistic representation of the ecosystem where particle density reflects the instantaneous biological mass of each species.
- **Zero-Scroll Sidebar**: Compact, high-efficiency UI design ensuring all simulation tools are visible on one screen.

---

## 🛠️ Technology Stack

- **Core**: Vanilla JavaScript (ES6+), HTML5, CSS3.
- **Graphics Engine**: [Three.js](https://threejs.org/) for highly performant 2D/3D WebGL visualizations.
- **Post-Processing**: `EffectComposer` for sleek bloom and visual polish (Pro Version).
- **Typography & Icons**: Google Fonts (Inter, Outfit, Nunito, Fira Code) and custom-curated SVG icons.
- **Mathematical Rendering**: [KaTeX](https://katex.org/) for lightning-fast, beautiful equation rendering.

---

## 🌍 Mathematical Foundation

EcoPulse is built on the **Lotka-Volterra** equations:

$$ \frac{dx}{dt} = \alpha x - \beta xy $$
$$ \frac{dy}{dt} = \delta xy - \gamma y $$

Where:
- $x$ = Prey population
- $y$ = Predator population
- $\alpha$ = Prey growth rate
- $\beta$ = Predation rate
- $\gamma$ = Predator death rate
- $\delta$ = Conversion efficiency

---

## 🛠️ How to Run Locally

1. **Clone the repository**:
   ```bash
   git clone https://github.com/your-username/ecopulse-simulator.git
   ```
2. **Open the project**:
   Open `index.html` in any modern web browser.
3. **Navigate**:
   - Start at the **EcoPulse Launcher** (Landing Page).
   - Choose your path: **Nature Lab** or **BioSim Pro**.

---

## ⚖️ License
This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

### *Made with ❤️ for the curious minds of tomorrow.*
