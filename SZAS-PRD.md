# Product Requirements Document (PRD): Sabermetric Calculation App for Strike Zone Analysis

## 1. Document Overview
### 1.1 Purpose
This PRD outlines the requirements for developing a web-based application that calculates a new Sabermetric called the "Strike Zone Alignment Score" (SZAS). The SZAS quantifies the alignment and divergences among three distinct strike zones in MLB games: the textbook rulebook zone, the umpire-called zone, and the batter-swing zone. The app will enable users (e.g., analysts, fans, or teams) to input or fetch pitch data, compute the metric, and visualize results. It addresses advanced baseball analytics by incorporating data-driven models for each zone and exploring potential interactions between umpire calls and batter behaviors.

The app must be built as a containerized web application using Docker Compose, with services exposed on obscure, non-standard container ports (e.g., ports above 10000, randomized or configurable for security and testing purposes) to minimize exposure risks during deployment.

### 1.2 Version History
- Version 1.0: Initial draft, November 30, 2025.
- Authors: Grok 4 (AI-assisted generation based on user specifications).

### 1.3 Scope
- **In Scope**: Data ingestion from MLB sources (e.g., Statcast via API), calculation of SZAS, visualizations of strike zones, basic user interface for queries, Docker-based build and deployment.
- **Out of Scope**: Real-time game integration, mobile app version, advanced machine learning training (use pre-trained models), user authentication beyond basic sessions.

### 1.4 Assumptions and Dependencies
- Access to MLB pitch data (e.g., via public APIs or datasets from Baseball Savant).
- Users have basic knowledge of Sabermetrics.
- Deployment environment supports Docker Compose (e.g., Linux server or cloud like AWS/EC2).
- Data for 2025 season reflects a tighter called strike zone due to MLB's reduced evaluation buffer for umpires (from 2 inches to 0.75 inches around the zone edges), leading to higher overall call accuracy (88%+ in early 2025) and fewer strikes on borderline pitches. This change also influenced batter patterns, with increased walk rates and more takes on outside pitches.
- No evidence from available research indicates umpires are directly influenced by a batter's decision to swing or take a pitch; calls are based on pitch location relative to the zone, though subjective factors like speed and batter stance play a role. However, batters generally show equal or superior accuracy in discriminating balls from strikes compared to umpires, attributed to their motor experience in swinging. For freeswingers specifically, there's no documented umpire bias toward calling takes as balls—umpires maintain independence in calls.
- Batter swing patterns in 2025 showed adaptations to the tighter zone, with league-wide increases in takes on shadow-zone pitches (near edges) and higher walk rates, but no drastic shift in overall swing rates compared to 2024 (e.g., O-Swing% remained stable around 30-32%, per standard metrics).

## 2. Product Objectives
### 2.1 Business Goals
- Provide a tool for Sabermetric enthusiasts to analyze strike zone dynamics, highlighting how umpires and batters interpret the zone differently.
- Quantify potential "influence" or alignment between zones to inform strategies (e.g., for coaching batters on discipline).
- Promote data-driven insights into 2025-specific changes, such as the tighter called zone and batter adaptations.

### 2.2 User Goals
- Analysts: Compute SZAS for specific batter-umpire pairs or seasons.
- Fans: Visualize zone overlaps and divergences.
- Developers: Easy deployment via Docker for local or cloud use.

### 2.3 Success Metrics
- Accurate computation validated against sample Statcast data (e.g., error rate <5% in zone modeling).
- User satisfaction: 80%+ positive feedback on usability.
- Deployment: Successful containerization with no exposed default ports.

## 3. Features and Functional Requirements
### 3.1 Core Feature: SZAS Calculation
The app calculates SZAS by modeling and comparing the three strike zones using pitch data. Here's how to calculate the metric step-by-step:

#### Step 1: Data Ingestion
- Fetch or upload pitch-level data (e.g., CSV from Baseball Savant) including: pitch location (px, pz), call type (called strike/ball, swinging strike, etc.), batter ID, umpire ID, bat side (L/R), season/year.  Use https://billpetti.github.io/baseballr/index.html to find the right data source for this calculation
- Filter for relevant pitches: Takes for umpire zone, Swings for batter zone.
- Adjust for batter height/stance to normalize zones (use average knee/shoulder heights from data).

#### Step 2: Model the Three Strike Zones
Use probabilistic modeling (e.g., logistic regression or kernel density estimation) to define each zone as a 2D probability surface over home plate (x from -0.708 to 0.708 ft, z adjusted per batter).

- **Textbook Strike Zone**:
  - Fixed per MLB rules: Width = 17 inches (1.417 ft) over plate.
  - Height: From sz_bot (below kneecap) to sz_top (midpoint shoulders to belt).
  - Calculation: Binary zone—pitch is strike if any part intersects the 3D cylinder over plate.
  - Formula: Strike if |px| <= 0.708 + ball_radius (0.12 ft) and sz_bot <= pz <= sz_top.
  - No modeling needed; use as baseline.

- **Umpire Called Strike Zone**:
  - Limited to Takes (called pitches only).
  - For each umpire-batter-side combo, fit a model: P(strike | px, pz) = sigmoid(β0 + β1*px + β2*pz + interactions).
  - Define zone boundary as 50% probability contour.
  - Incorporate 2025 tighter calls: Weight recent data higher, noting reduced strikes on edges (e.g., shadow zone accuracy at 82%).
  - Minimum data: 100+ takes per combo for reliable model.

- **Batter Swing Zone**:
  - Limited to Swings (pitches where batter attempts swing).
  - Model P(swing | px, pz) similarly, boundary at 50% swing probability.
  - Research sidebar: Check 2025 adaptations by comparing models year-over-year. In 2025, batters took more edge pitches due to tighter calls, increasing walk rates but not significantly altering O-Swing% (chase rate).
  - Minimum data: 200+ pitches per batter-side.

#### Step 3: Compute Alignments and Divergences
- Calculate area overlap (IoU: Intersection over Union) between zones.
- Divergence scores: Euclidean distance between zone centroids, or KL-divergence between probability distributions.
- Influence check: For takes, regress called strike ~ pitch location + batter's typical swing prob for that location. If coefficient on swing prob is significant, suggests influence (though research shows no direct effect).
- SZAS Formula: SZAS = (IoU_textbook_ump + IoU_textbook_batter + IoU_ump_batter) / 3 * (1 - influence_bias), where influence_bias is abs(coefficient) from regression (0 if insignificant).
- Output: Score from 0-1 (1 = perfect alignment), per batter-umpire-season.

#### Step 4: Visualization
- Plot 2D heatmaps for each zone's probability surface.
- Overlay contours for comparisons.
- Time-series for seasonal changes (e.g., 2025 vs. 2024).

### 3.2 User Interface
- Web dashboard: Input filters (batter, umpire, year), compute button, results display.
- Tech: Frontend (React.js), Backend (Flask/Python for calculations).

### 3.3 Data Processing
- Use libraries: Pandas for data, Scikit-learn for modeling, Matplotlib/Plotly for viz.

## 4. Non-Functional Requirements
### 4.1 Performance
- Compute time: <10s per query (up to 10k pitches).
- Scalability: Handle 100 concurrent users via container scaling.

### 4.2 Security
- Expose services on obscure ports (e.g., web on 12345, API on 23456) configurable in docker-compose.yml.
- No sensitive data storage.

### 4.3 Reliability
- Error handling for insufficient data (e.g., fallback to league averages).

## 5. Technical Requirements
### 5.1 Architecture
- Microservices: Web frontend, API backend, data processor.
- Database: Optional SQLite for caching.

### 5.2 Build and Deployment
- Use Docker Compose: 
  - Services: nginx (frontend, port: obscure e.g., 15000), flask-app (backend, port: 16000), optional db.
  - docker-compose.yml example:
    ```
    version: '3'
    services:
      web:
        image: nginx:latest
        ports:
          - "15000:80"
        volumes:
          - ./frontend:/usr/share/nginx/html
      api:
        build: ./backend
        ports:
          - "16000:5000"
        depends_on:
          - db
      db:
        image: sqlite:latest  # Or Postgres if needed
        ports:
          - "17000:5432"
    ```
- Build: `docker-compose build`.
- Deploy: `docker-compose up -d` on server, with ports firewalled except for obscure ones.
- Obscure ports: Configurable via env vars, default to high-range (10000-20000) to avoid common scans.

### 5.3 Testing
- Unit tests for calculations (e.g., validate SZAS on sample data).
- Integration: Docker end-to-end.

## 6. Risks and Mitigations
- Data availability: Use public sources; fallback to simulated data.
- Model accuracy: Validate against known benchmarks (e.g., Umpire Scorecards).
- 2025-specific: Update models annually for rule changes like impending ABS in 2026.

## 7. Appendix
- Glossary: Takes = non-swung pitches; Swings = attempted hits.
- References: MLB Rulebook for textbook zone; Statcast for data.