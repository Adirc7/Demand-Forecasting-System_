# AI Component Technical Deep Dive

This document details the inner workings of the Artificial Intelligence (AI) and Machine Learning (ML) components in the Smart Inventory System. It explains the mathematical foundations of the algorithms and how the AI integrates—both directly and indirectly—with the broader software architecture.

## 1. Mathematical Foundations of the Forecasting Engine

The predictive capabilities rely on time-series forecasting models and statistical inventory control mathematics.

### 1.1 Demand Forecasting Algorithm (Regression)
The system utilizes a supervised machine learning regression model (e.g., Random Forest or XGBoost). The mathematical goal of the model is to minimize the **Mean Squared Error (MSE)** or **Root Mean Squared Error (RMSE)** during training:

- **MSE Formula:** $MSE = \frac{1}{n} \sum_{i=1}^{n} (y_i - \hat{y}_i)^2$

Where $y_i$ is the actual historical sales volume and $\hat{y}_i$ is the predicted sales volume. By minimizing this loss function, the model learns the complex, non-linear relationships between input features (seasonality, recent sales momentum) and future demand.

### 1.2 Safety Stock Calculation (Z-Scores)
The raw demand forecast ($\hat{y}$) provides an average expected demand, but fails to account for volatility and sudden market shifts. The system uses statistical **Safety Stock** formulas to prevent stockouts:

- **Safety Stock (SS) Formula:** $SS = Z \times \sigma_d \times \sqrt{L}$
  - **$Z$ (Z-Score):** The standard normal deviate corresponding to the desired service level (e.g., $Z = 1.65$ for 95% confidence). This is the "Safety Factor" that administrators can dynamically adjust in the UI.
  - **$\sigma_d$:** The standard deviation of historical demand, representing volatility.
  - **$L$:** The lead time (time it takes to restock).

### 1.3 Reorder Point (ROP) Mathematics
Using the AI's predicted demand and the statistical safety stock, the system calculates exactly when to trigger a low-stock alert:

- **ROP Formula:** $ROP = (\text{Predicted Average Daily Demand} \times \text{Lead Time}) + \text{Safety Stock}$

If $(\text{Current Inventory} + \text{On Order}) \leq \text{ROP}$, the system fires a critical alert.

## 2. Direct and Indirect AI Connections Across Components

The AI engine does not exist in isolation. It is woven into the system architecture through both direct execution pipelines and indirect data dependencies.

### 2.1 Direct Connections (The AI Core)
These components directly execute, trigger, or interface with machine learning code and LLM APIs.
- **Forecast Service (`forecast_service.py`):** The primary execution environment. It loads the `forecast_model_v3.pkl` into memory, processes incoming JSON requests into structured data, runs the `model.predict()` function, and outputs numerical arrays.
- **Retraining Service (`retrain_service.py`):** Directly interacts with the model file. It periodically fetches new historical data, calculates the aforementioned MSE/RMSE, updates model weights/decision trees, and overwrites the `.pkl` file.
- **Gemini Service (`gemini_service.py`):** Acts as the bridge to Google's LLM. It directly constructs system prompts by interpolating data variables and parses the JSON/text responses from the Gemini API.

### 2.2 Indirect Connections (The Supporting Ecosystem)
These components do not run AI code themselves but are fundamentally reliant on AI outputs or provide essential inputs to the AI.
- **Sales & Products Modules (Input Providers):** Every time a sale is logged or a new product is created, the database updates. This indirectly feeds the AI by providing the raw $y_i$ (sales) and feature data required for the next retraining loop.
- **User Management / RBAC (Governance):** User Management doesn't run ML code, but it controls *who* can modify the Z-score variables. Changing a user's role to Admin indirectly changes the AI's aggressiveness by granting them access to the Safety Factor sliders.
- **Inventory & Alert UI (Output Consumers):** The React frontend components do not calculate ROP. They simply poll the backend. However, their entire state (red/yellow/green stock health indicators) is entirely dictated by the upstream ROP and Safety Stock math calculated by the AI pipeline.
- **Analytics Dashboard:** Indirectly connected via the Gemini Service. It provides the visual charts, while the AI provides the "Executive Summary" text block explaining *why* the charts look the way they do.

## 3. Data Preprocessing Pipeline

Before raw data reaches the ML model, it undergoes several transformation steps:
- **Encoding:** Categorical variables (like Product Categories and SKUs) are transformed into numerical formats using a Label Encoder (`label_encoder_v3.json`). 
- **Handling Missing Values:** Specialized backend scripts (like `fix_duplicates.py` and `seed_categories.py`) ensure that the dataset is continuous, normalized, and free of anomalies. 
- **Feature Extraction:** Time-series specific features are extracted from timestamps, such as month, day of the week, and lag variables to capture momentum.

## 4. Large Language Model (LLM) Explainability

### 4.1 Contextual Prompt Engineering
When a user interacts with the Assistant Bot or clicks the "Why" explanation button on a forecast:
- The backend constructs a highly specific, context-rich prompt. It injects the raw mathematical data (e.g., *"Product X has 50 units in stock, forecasted demand is 80, seasonality factor is high, safety Z-score is 1.65"*) into a predefined template.
- This structured prompt is sent securely to the Gemini API, which translates the complex ROP and Z-Score mathematics into a human-readable explanation.

## 5. System Architecture & Data Flow

```text
[Sales / Product UIs] ──(Indirect)──▶ [Firebase Database] 
                                            │
                                            ▼
                                 [Data Preprocessing]
                                            │
                                            ▼
[Retraining Service] ◀──(Direct)── [ML Forecasting Model] ──(Direct)──▶ [Forecast Service]
                                                                                │
                                                                                ▼
[User Management (RBAC)] ──(Indirect)──▶ [Z-Score Math] ◀──────────────── [Raw Forecast Math]
                                            │
                                            ▼
                                  [Reorder Point (ROP)]
                                            │
                                            ▼
[Inventory UI (Alerts)] ◀──(Indirect)───────┴───────(Direct)──────────▶ [Gemini Service (LLM)]
                                                                                │
                                                                                ▼
                                                                  [Human-Readable Explanations]
```
