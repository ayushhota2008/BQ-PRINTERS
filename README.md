# BQ PRINTERS — Demand Analytics Platform

A professional web application and mathematical demand analyzer for printing shops, built in accordance with the academic project report **"Printing Shop Demand Analyzer"**.

---

## 🚀 Key Features

### 1. Shopkeeper Dashboard (Non-Technical & Actionable)
- **Weekly Demand Overview**: Total weekly demand, average daily demand, peak time slot, and top service.
- **Visual Analytics**:
  - Donut chart with service breakdown (B&W Printing, Colour Printing, Binding, Photocopying).
  - Time slot bar chart comparing 9 AM–11 AM, 11 AM–1 PM, 1 PM–4 PM, and 4 PM–6 PM.
  - Weekly demand trend across 7 operating days.
- **Demand Matrix**: 4×4 tabular matrix showing orders by service and time slot.
- **Key Business Statistics**: Peak arrival hours, dominant service volume, quietest operating windows, and estimated page workload.
- **Operational Equipment Capacity**:
  - HP Laser 303dw rated capacity (30 ppm = 1,800 pages/hr) and weekly load ratio.
  - Canon PIXMA MegaTank G670 rated capacity (3.9 ipm = 234 images/hr) and weekly load ratio.
- **Staff Workload & Utilization**: Scheduled availability (189 staff-hours baseline for 3 staff) vs. handling time workload and utilization percentage.
- **Actionable Business Recommendations**: Automated rules-based recommendations for inventory stocking, midday rush staffing, and off-peak equipment maintenance.

### 2. Academic Mathematical Engine (Python + NumPy/SciPy + FastAPI)
- **Matrix Representation**: Daily demand matrices $D_d$ ($4 \times 4$) and weekly demand matrix $W = \sum_{d=1}^7 D_d$.
- **Duration-Adjusted Arrival Rates**: Normalizes 2-hour and 3-hour slots ($Q_j = C_j / (7 \cdot h_j)$).
- **Matrix Rank**: Flattened 7×16 daily matrix $M$ with $\text{rank}(M) = 7$, verifying linear independence of daily demand patterns.
- **Covariance Analysis**: Sample covariance matrix $S$ with Bessel's correction ($ddof=1$) across $N=28$ observation vectors.
- **Eigenvalue Decomposition**: $S = P \Lambda P^T$, computing eigenvalues $\lambda_k$, variance explained percentages ($E_1 \approx 94.47\%$), and normalized eigenvectors.

### 3. Dedicated Technical Analysis View (`/technical`)
- Accessible for academic auditing and verification.
- Displays raw matrices, rank of $M$, mean vectors, covariance matrices, and eigenvalue distributions.

### 4. Supabase Database & Authentication
- **Authentication**: Supabase Auth with email/password and demo mode.
- **Database Tables**:
  - `datasets`: Week metadata, total demand, timestamps.
  - `observations`: 28 raw observation vectors per week.
  - `assumptions`: Staff counts, operating hours, printer speeds, handling times.
  - `calculations`: Complete mathematical models, matrices, eigenvalues, and recommendations.
- **Row Level Security (RLS)**: Enforced on all tables.
- **Historical Comparison**: Week-to-week comparison computing absolute and percentage differences.
- **PDF Report Generation**: Downloadable executive PDF reports.

---

## 🛠️ Tech Stack

- **Frontend**: Next.js 16 (React, TypeScript), Vanilla CSS design tokens.
- **Backend / Math Engine**: Python 3.12, FastAPI, NumPy, SciPy, Pandas, Uvicorn.
- **Database & Auth**: Supabase (PostgreSQL, Row Level Security, Supabase Auth).
- **Test Suite**: Pytest (8 comprehensive unit tests verifying all mathematical formulas against the paper).

---

## 🏃 Running the Application

### Option A: 1-Click Launch (Recommended)
Double-click [`start-website.bat`](file:///c:/Users/AYUSH/OneDrive/Desktop/project%20mac%20demo/start-website.bat) in the project root. It will start both the FastAPI backend and Next.js frontend in separate terminal windows and open your browser automatically.

---

## 🚂 Deploying to Railway

You can deploy both the backend and frontend to Railway using the GitHub repository:

### Step 1: Deploy Backend (FastAPI)
1. Go to **[railway.com/new/github](https://railway.com/new/github)** and select **`ayushhota2008/BQ-PRINTERS`**.
2. Go to the newly created service **Settings**:
   - Set **Root Directory** to: `/backend`
3. Under **Networking**, click **Generate Domain** (e.g. `https://bq-printers-backend.up.railway.app`).
4. (Optional) In **Variables**, add:
   - `SUPABASE_URL` = your Supabase URL
   - `SUPABASE_KEY` = your Supabase key

### Step 2: Deploy Frontend (Next.js)
1. In the same Railway project canvas, click **+ New** -> **GitHub Repo** -> select **`ayushhota2008/BQ-PRINTERS`** again.
2. In the new service **Settings**:
   - Set **Root Directory** to: `/frontend`
3. In **Variables**, add:
   - `NEXT_PUBLIC_API_URL` = `https://<backend-domain>.up.railway.app` (from Step 1)
4. Under **Networking**, click **Generate Domain** (e.g. `https://bq-printers-web.up.railway.app`).
5. Open your frontend domain in your browser!


---

### Option B: Individual Terminals

#### 1. Start the FastAPI Backend
```cmd
run-backend.bat
```
*Runs on `http://localhost:8000` (API documentation at `http://localhost:8000/docs`).*

#### 2. Start the Next.js Frontend
```cmd
run-frontend.bat
```
*Runs on `http://localhost:3000`.*

